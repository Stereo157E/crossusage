//! Linux StatusNotifierItem tray, independent of GTK/AppIndicator.

use std::sync::OnceLock;

use ksni::blocking::{Handle, TrayMethods};
use ksni::menu::{CheckmarkItem, StandardItem, SubMenu};
use ksni::{Icon, MenuItem, Tray};
use tauri::{AppHandle, Manager, Webview};

use crate::panel::toggle_panel;
use crate::tray;

static TRAY: OnceLock<Handle<LinuxTray>> = OnceLock::new();
const MAX_SUMMARY_LINES: usize = 12;

struct LinuxTray {
    // Callbacks only enqueue main-thread work; never block the D-Bus service on GTK.
    dispatch: Box<dyn Fn(&'static str) + Send + Sync>,
    icon: Icon,
    tooltip: String,
    summary: Vec<String>,
    log_level: log::LevelFilter,
    restart_label: String,
}

impl LinuxTray {
    fn action_item(label: &str, action: &'static str) -> MenuItem<Self> {
        StandardItem {
            label: label.into(),
            activate: Box::new(move |this: &mut Self| (this.dispatch)(action)),
            ..Default::default()
        }
        .into()
    }

    fn log_level_item(
        &self,
        label: &str,
        action: &'static str,
        level: log::LevelFilter,
    ) -> MenuItem<Self> {
        CheckmarkItem {
            label: label.into(),
            checked: self.log_level == level,
            activate: Box::new(move |this: &mut Self| {
                this.log_level = level;
                (this.dispatch)(action);
            }),
            ..Default::default()
        }
        .into()
    }
}

impl Tray for LinuxTray {
    fn id(&self) -> String {
        "crossusage".into()
    }

    fn title(&self) -> String {
        "CrossUsage".into()
    }

    fn activate(&mut self, _x: i32, _y: i32) {
        (self.dispatch)("toggle");
    }

    fn secondary_activate(&mut self, _x: i32, _y: i32) {
        (self.dispatch)("show_stats");
    }

    fn icon_pixmap(&self) -> Vec<Icon> {
        vec![self.icon.clone()]
    }

    fn tool_tip(&self) -> ksni::ToolTip {
        ksni::ToolTip {
            title: "CrossUsage".into(),
            // StatusNotifier tooltips accept markup; provider text is plain text.
            description: self
                .tooltip
                .replace('&', "&amp;")
                .replace('<', "&lt;")
                .replace('>', "&gt;"),
            ..Default::default()
        }
    }

    fn menu(&self) -> Vec<MenuItem<Self>> {
        let mut menu: Vec<_> = self
            .summary
            .iter()
            .map(|line| {
                StandardItem {
                    // D-Bus menu labels use underscores for access keys.
                    label: line.replace('_', "__"),
                    enabled: false,
                    ..Default::default()
                }
                .into()
            })
            .collect();
        menu.extend([
            MenuItem::Separator,
            Self::action_item("Show Stats", "show_stats"),
            Self::action_item("Go to Settings", "go_to_settings"),
            SubMenu {
                label: "Debug Level".into(),
                submenu: vec![
                    self.log_level_item("Error", "log_error", log::LevelFilter::Error),
                    self.log_level_item("Warn", "log_warn", log::LevelFilter::Warn),
                    self.log_level_item("Info", "log_info", log::LevelFilter::Info),
                    self.log_level_item("Debug", "log_debug", log::LevelFilter::Debug),
                    self.log_level_item("Trace", "log_trace", log::LevelFilter::Trace),
                    self.log_level_item("Off", "log_off", log::LevelFilter::Off),
                    MenuItem::Separator,
                    Self::action_item("Copy Log Path", "copy_log_path"),
                ],
                ..Default::default()
            }
            .into(),
            MenuItem::Separator,
            Self::action_item(&self.restart_label, "restart"),
            Self::action_item("About CrossUsage", "about"),
            Self::action_item("Quit", "quit"),
        ]);
        menu
    }

    fn watcher_offline(&self, reason: ksni::OfflineReason) -> bool {
        log::error!("Linux tray host is offline: {reason:?}");
        // KSNI re-registers the item when the desktop's tray host returns.
        true
    }
}

fn summary_lines(summary: &str) -> Vec<String> {
    let mut lines: Vec<_> = summary
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .take(MAX_SUMMARY_LINES)
        .map(|line| {
            if line.chars().count() > 120 {
                format!("{}…", line.chars().take(120).collect::<String>())
            } else {
                line.to_owned()
            }
        })
        .collect();
    if lines.is_empty() {
        lines.push("CrossUsage".into());
    }
    lines
}

fn icon_from_rgba(image: &tauri::image::Image<'_>) -> Icon {
    let mut data = image.rgba().to_vec();
    for pixel in data.chunks_exact_mut(4) {
        pixel.rotate_right(1); // StatusNotifierItem requires ARGB32 in network byte order.
    }
    Icon {
        width: image.width() as i32,
        height: image.height() as i32,
        data,
    }
}

pub fn create(app_handle: &AppHandle) -> tauri::Result<()> {
    let icon = icon_from_rgba(&tray::icon(app_handle)?);
    let log_level = tray::get_stored_log_level(app_handle);
    log::set_max_level(log_level);
    let dispatch_app = app_handle.clone();
    let handle = LinuxTray {
        dispatch: Box::new(move |action| {
            let app = dispatch_app.clone();
            if let Err(error) = dispatch_app.run_on_main_thread(move || {
                if action == "toggle" {
                    toggle_panel(&app);
                } else {
                    tray::handle_menu_action(&app, action);
                }
            }) {
                log::error!("Failed to dispatch Linux tray action {action}: {error}");
            }
        }),
        icon,
        tooltip: String::new(),
        summary: summary_lines(""),
        log_level,
        restart_label: "Restart".into(),
    }
    .spawn()
    .map_err(|error| tauri::Error::Anyhow(error.into()))?;
    assert!(TRAY.set(handle).is_ok(), "Linux tray was initialized twice");
    Ok(())
}

fn try_update(f: impl FnOnce(&mut LinuxTray)) -> Result<(), String> {
    let handle = TRAY.get().ok_or("Linux tray is not initialized")?;
    handle
        .update(f)
        .ok_or_else(|| "Linux tray service has shut down".into())
}

fn update(f: impl FnOnce(&mut LinuxTray)) {
    if let Err(error) = try_update(f) {
        log::error!("Cannot update Linux tray: {error}");
    }
}

/// Accept the same image resources as Tauri's native tray API; null restores the app icon.
#[tauri::command]
pub fn set_linux_tray_icon(
    webview: Webview,
    icon: Option<tauri::image::JsImage>,
) -> Result<(), String> {
    let resources_table = webview.resources_table();
    let image = match icon {
        Some(icon) => icon
            .into_img(&resources_table)
            .map_err(|error| error.to_string())?,
        None => std::sync::Arc::new(
            tray::icon(webview.app_handle()).map_err(|error| error.to_string())?,
        ),
    };
    let icon = icon_from_rgba(&image);
    try_update(|tray| tray.icon = icon)
}

#[tauri::command]
pub fn set_linux_tray_tooltip(tooltip: Option<String>) -> Result<(), String> {
    try_update(|tray| tray.tooltip = tooltip.unwrap_or_default())
}

pub fn update_tray_usage_summary(summary: &str) {
    update(|tray| tray.summary = summary_lines(summary));
}

pub fn set_tray_restart_menu_text(text: &str) {
    update(|tray| tray.restart_label = text.into());
}

pub fn update_log_level(level: log::LevelFilter) {
    update(|tray| tray.log_level = level);
}

pub fn shutdown() {
    if let Some(handle) = TRAY.get() {
        handle.shutdown().wait();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    fn test_tray(actions: Arc<Mutex<Vec<&'static str>>>) -> LinuxTray {
        LinuxTray {
            dispatch: Box::new(move |action| actions.lock().unwrap().push(action)),
            icon: Icon {
                width: 1,
                height: 1,
                data: vec![255, 1, 2, 3],
            },
            tooltip: String::new(),
            summary: summary_lines(""),
            log_level: log::LevelFilter::Info,
            restart_label: "Restart".into(),
        }
    }

    #[test]
    fn summary_trims_caps_and_truncates_unicode_without_splitting_characters() {
        assert_eq!(summary_lines(" \n\t"), ["CrossUsage"]);
        assert_eq!(summary_lines(" one \n\n two "), ["one", "two"]);
        let long_line = "é".repeat(121);
        let summary = vec![long_line; 14].join("\n");
        let lines = summary_lines(&summary);
        assert_eq!(lines.len(), 12);
        assert!(
            lines
                .iter()
                .all(|line| line == &format!("{}…", "é".repeat(120)))
        );
    }

    #[test]
    fn icon_converts_rgba_to_argb_preserving_alpha() {
        let image = tauri::image::Image::new_owned(vec![1, 2, 3, 4, 5, 6, 7, 8], 2, 1);
        let icon = icon_from_rgba(&image);
        assert_eq!((icon.width, icon.height), (2, 1));
        assert_eq!(icon.data, [4, 1, 2, 3, 8, 5, 6, 7]);
    }

    #[test]
    fn changed_icon_and_tooltip_are_exported_without_recreating_the_tray() {
        let mut tray = test_tray(Arc::new(Mutex::new(Vec::new())));
        let before = tray.icon_pixmap()[0].data.clone();
        let image = tauri::image::Image::new_owned(vec![10, 20, 30, 40], 1, 1);
        tray.icon = icon_from_rgba(&image);
        tray.tooltip = "Provider <weekly> & daily\n50%".into();
        let exported = tray.icon_pixmap();
        assert_ne!(exported[0].data, before);
        assert_eq!(exported[0].data, [40, 10, 20, 30]);
        assert_eq!(
            tray.tool_tip().description,
            "Provider &lt;weekly&gt; &amp; daily\n50%"
        );
    }

    #[test]
    fn native_activations_dispatch_once_and_menu_actions_stay_reachable_after_summary_changes() {
        let actions = Arc::new(Mutex::new(Vec::new()));
        let mut tray = test_tray(actions.clone());
        assert!(!LinuxTray::MENU_ON_ACTIVATE);
        tray.activate(10, 20);
        tray.secondary_activate(10, 20);
        for summary in ["provider_one", "one\ntwo\nthree", ""] {
            tray.summary = summary_lines(summary);
            for item in tray.menu() {
                if let MenuItem::Standard(item) = item {
                    if item.enabled {
                        (item.activate)(&mut tray);
                    } else if summary == "provider_one" {
                        assert_eq!(item.label, "provider__one");
                    }
                }
            }
        }
        let expected_actions = ["show_stats", "go_to_settings", "restart", "about", "quit"];
        let recorded = actions.lock().unwrap();
        assert_eq!(recorded.len(), 2 + 3 * expected_actions.len());
        assert_eq!(&recorded[..2], ["toggle", "show_stats"]);
        for chunk in recorded[2..].chunks(5) {
            assert_eq!(chunk, expected_actions);
        }
    }

    #[test]
    fn debug_menu_has_one_selected_level_and_preserves_copy_log_path() {
        let actions = Arc::new(Mutex::new(Vec::new()));
        let mut tray = test_tray(actions.clone());
        let submenu = tray
            .menu()
            .into_iter()
            .find_map(|item| match item {
                MenuItem::SubMenu(menu) => Some(menu),
                _ => None,
            })
            .unwrap();
        let checks: Vec<_> = submenu
            .submenu
            .iter()
            .filter_map(|item| match item {
                MenuItem::Checkmark(item) => Some(item),
                _ => None,
            })
            .collect();
        assert_eq!(checks.iter().filter(|item| item.checked).count(), 1);
        assert_eq!(
            checks.iter().find(|item| item.checked).unwrap().label,
            "Info"
        );
        (checks
            .iter()
            .find(|item| item.label == "Trace")
            .unwrap()
            .activate)(&mut tray);
        assert_eq!(tray.log_level, log::LevelFilter::Trace);
        let updated_menu = tray
            .menu()
            .into_iter()
            .find_map(|item| match item {
                MenuItem::SubMenu(menu) => Some(menu),
                _ => None,
            })
            .unwrap();
        let selected: Vec<_> = updated_menu
            .submenu
            .iter()
            .filter_map(|item| match item {
                MenuItem::Checkmark(item) if item.checked => Some(item.label.as_str()),
                _ => None,
            })
            .collect();
        assert_eq!(selected, ["Trace"]);
        for item in submenu.submenu {
            if let MenuItem::Standard(item) = item {
                assert_eq!(item.label, "Copy Log Path");
                (item.activate)(&mut tray);
            }
        }
        assert_eq!(*actions.lock().unwrap(), ["log_trace", "copy_log_path"]);
    }

    #[test]
    fn updated_restart_label_keeps_restart_action() {
        let actions = Arc::new(Mutex::new(Vec::new()));
        let mut tray = test_tray(actions.clone());
        tray.restart_label = "Restart to update".into();
        let restart = tray
            .menu()
            .into_iter()
            .find_map(|item| match item {
                MenuItem::Standard(item) if item.label == "Restart to update" => Some(item),
                _ => None,
            })
            .unwrap();
        (restart.activate)(&mut tray);
        assert_eq!(*actions.lock().unwrap(), ["restart"]);
    }
}
