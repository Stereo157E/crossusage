use tauri::image::Image;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_store::StoreExt;

use crate::log_path;
use crate::panel::show_panel;

#[cfg(not(target_os = "linux"))]
#[path = "tray_native.rs"]
mod native;
#[cfg(target_os = "linux")]
pub use crate::tray_linux::{create, set_tray_restart_menu_text};
#[cfg(not(target_os = "linux"))]
pub use native::{create, set_tray_restart_menu_text};

pub fn update_tray_usage_summary(summary: &str) {
    #[cfg(target_os = "linux")]
    crate::tray_linux::update_tray_usage_summary(summary);
    #[cfg(not(target_os = "linux"))]
    let _ = summary;
}

pub(crate) fn icon(app_handle: &AppHandle) -> tauri::Result<Image<'static>> {
    Ok(
        match app_handle
            .path()
            .resolve("icons/tray-icon.png", BaseDirectory::Resource)
            .ok()
            .and_then(|path| Image::from_path(path).ok())
        {
            Some(icon) => icon,
            None => Image::from_bytes(include_bytes!("../icons/tray-icon.png"))?,
        },
    )
}

const LOG_LEVEL_STORE_KEY: &str = "logLevel";

pub(crate) fn get_stored_log_level(app_handle: &AppHandle) -> log::LevelFilter {
    let store = match app_handle.store("settings.json") {
        Ok(s) => s,
        Err(_) => return log::LevelFilter::Error,
    };
    let value = store.get(LOG_LEVEL_STORE_KEY);
    let level_str = value.and_then(|v| v.as_str().map(|s| s.to_string()));
    match level_str.as_deref() {
        Some("error") => log::LevelFilter::Error,
        Some("warn") => log::LevelFilter::Warn,
        Some("info") => log::LevelFilter::Info,
        Some("debug") => log::LevelFilter::Debug,
        Some("trace") => log::LevelFilter::Trace,
        Some("off") => log::LevelFilter::Off,
        _ => log::LevelFilter::Info, // Default: match upstream 0.7 / #615
    }
}

pub fn apply_log_level(app_handle: &AppHandle, level: log::LevelFilter) {
    set_stored_log_level(app_handle, level);
    #[cfg(target_os = "linux")]
    crate::tray_linux::update_log_level(level);
}

pub fn current_log_level(app_handle: &AppHandle) -> log::LevelFilter {
    get_stored_log_level(app_handle)
}

pub fn log_level_from_str(level: &str) -> Option<log::LevelFilter> {
    match level {
        "error" => Some(log::LevelFilter::Error),
        "warn" => Some(log::LevelFilter::Warn),
        "info" => Some(log::LevelFilter::Info),
        "debug" => Some(log::LevelFilter::Debug),
        "trace" => Some(log::LevelFilter::Trace),
        "off" => Some(log::LevelFilter::Off),
        _ => None,
    }
}

pub fn log_level_to_str(level: log::LevelFilter) -> &'static str {
    match level {
        log::LevelFilter::Error => "error",
        log::LevelFilter::Warn => "warn",
        log::LevelFilter::Info => "info",
        log::LevelFilter::Debug => "debug",
        log::LevelFilter::Trace => "trace",
        log::LevelFilter::Off => "off",
    }
}

pub(crate) fn set_stored_log_level(app_handle: &AppHandle, level: log::LevelFilter) {
    let level_str = match level {
        log::LevelFilter::Error => "error",
        log::LevelFilter::Warn => "warn",
        log::LevelFilter::Info => "info",
        log::LevelFilter::Debug => "debug",
        log::LevelFilter::Trace => "trace",
        log::LevelFilter::Off => "off",
    };
    log::info!("Log level changing to {:?}", level);
    if let Ok(store) = app_handle.store("settings.json") {
        store.set(LOG_LEVEL_STORE_KEY, serde_json::json!(level_str));
        let _ = store.save();
    }
    log::set_max_level(level);
}

/// Latest tray navigation request the frontend has not consumed yet.
/// Tauri app events are not buffered: a menu click made before the webview
/// registers its listeners is dropped, so the click also stores its target
/// here and the frontend retrieves it once via
/// `consume_pending_tray_navigation` on startup.
#[derive(Default)]
pub struct PendingTrayNavigation(std::sync::Mutex<Option<String>>);

impl PendingTrayNavigation {
    pub fn set(&self, target: &str) {
        *self.0.lock().expect("pending tray navigation poisoned") = Some(target.to_string());
    }

    pub fn take(&self) -> Option<String> {
        self.0.lock().expect("pending tray navigation poisoned").take()
    }
}

#[tauri::command]
pub fn consume_pending_tray_navigation(
    state: tauri::State<'_, PendingTrayNavigation>,
) -> Option<String> {
    state.take()
}

pub(crate) fn handle_menu_action(app_handle: &AppHandle, action: &str) {
    match action {
        "show_stats" => {
            app_handle.state::<PendingTrayNavigation>().set("home");
            show_panel(app_handle);
            let _ = app_handle.emit("tray:navigate", "home");
        }
        "go_to_settings" => {
            app_handle.state::<PendingTrayNavigation>().set("settings");
            show_panel(app_handle);
            let _ = app_handle.emit("tray:navigate", "settings");
        }
        "about" => {
            app_handle.state::<PendingTrayNavigation>().set("about");
            show_panel(app_handle);
            let _ = app_handle.emit("tray:show-about", ());
        }
        "restart" => {
            log::info!("restart or apply-update requested via tray");
            let _ = app_handle.emit("tray:restart-or-update", ());
        }
        "quit" => {
            log::info!("quit requested via tray");
            app_handle.exit(0);
        }
        "log_error" | "log_warn" | "log_info" | "log_debug" | "log_trace" | "log_off" => {
            let selected_level = match action {
                "log_error" => log::LevelFilter::Error,
                "log_warn" => log::LevelFilter::Warn,
                "log_info" => log::LevelFilter::Info,
                "log_debug" => log::LevelFilter::Debug,
                "log_trace" => log::LevelFilter::Trace,
                "log_off" => log::LevelFilter::Off,
                _ => unreachable!(),
            };
            set_stored_log_level(app_handle, selected_level);
        }
        "copy_log_path" => match log_path::for_app(app_handle) {
            Ok(path) => {
                if let Err(error) = app_handle
                    .clipboard()
                    .write_text(path.to_string_lossy().to_string())
                {
                    log::error!("failed to copy log path to clipboard: {}", error);
                } else {
                    log::info!("copied log path to clipboard");
                }
            }
            Err(error) => {
                log::error!("failed to resolve log path: {}", error);
            }
        },
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::PendingTrayNavigation;

    #[test]
    fn consume_returns_stored_value_once_then_none() {
        let state = PendingTrayNavigation::default();
        state.set("home");
        assert_eq!(state.take(), Some("home".to_string()));
        assert_eq!(state.take(), None);
    }

    #[test]
    fn later_navigation_replaces_earlier_one() {
        let state = PendingTrayNavigation::default();
        state.set("home");
        state.set("settings");
        assert_eq!(state.take(), Some("settings".to_string()));
        assert_eq!(state.take(), None);
    }
}
