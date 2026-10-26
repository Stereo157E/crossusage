use std::sync::{Mutex, OnceLock};

use super::get_stored_log_level;

use tauri::AppHandle;
use tauri::Wry;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
#[cfg(any(target_os = "macos", target_os = "windows"))]
use tauri::tray::{MouseButton, MouseButtonState, TrayIconEvent};

#[cfg(target_os = "macos")]
use crate::panel::position_panel_at_tray_icon;
#[cfg(target_os = "windows")]
use crate::panel::toggle_panel;

#[cfg(target_os = "macos")]
use crate::panel::get_or_init_panel;
#[cfg(target_os = "macos")]
use tauri_nspanel::ManagerExt;

static TRAY_RESTART_ITEM: OnceLock<Mutex<MenuItem<Wry>>> = OnceLock::new();

fn store_tray_restart_handle(item: MenuItem<Wry>) {
    let _ = TRAY_RESTART_ITEM.set(Mutex::new(item));
}

/// Tray "Restart" / "Restart to update" label (set from the webview when an updater bundle is ready).
pub fn set_tray_restart_menu_text(text: &str) {
    let Some(lock) = TRAY_RESTART_ITEM.get() else {
        return;
    };
    let Ok(guard) = lock.lock() else {
        return;
    };
    let _ = guard.set_text(text);
}

pub fn create(app_handle: &AppHandle) -> tauri::Result<()> {
    let icon = super::icon(app_handle)?;

    // Load persisted log level
    let current_level = get_stored_log_level(app_handle);
    log::set_max_level(current_level);

    let show_stats = MenuItem::with_id(app_handle, "show_stats", "Show Stats", true, None::<&str>)?;
    let go_to_settings = MenuItem::with_id(
        app_handle,
        "go_to_settings",
        "Go to Settings",
        true,
        None::<&str>,
    )?;

    // Log level submenu - clone items for use in event handler
    let log_error = CheckMenuItem::with_id(
        app_handle,
        "log_error",
        "Error",
        true,
        current_level == log::LevelFilter::Error,
        None::<&str>,
    )?;
    let log_warn = CheckMenuItem::with_id(
        app_handle,
        "log_warn",
        "Warn",
        true,
        current_level == log::LevelFilter::Warn,
        None::<&str>,
    )?;
    let log_info = CheckMenuItem::with_id(
        app_handle,
        "log_info",
        "Info",
        true,
        current_level == log::LevelFilter::Info,
        None::<&str>,
    )?;
    let log_debug = CheckMenuItem::with_id(
        app_handle,
        "log_debug",
        "Debug",
        true,
        current_level == log::LevelFilter::Debug,
        None::<&str>,
    )?;
    let log_trace = CheckMenuItem::with_id(
        app_handle,
        "log_trace",
        "Trace",
        true,
        current_level == log::LevelFilter::Trace,
        None::<&str>,
    )?;
    let log_off = CheckMenuItem::with_id(
        app_handle,
        "log_off",
        "Off",
        true,
        current_level == log::LevelFilter::Off,
        None::<&str>,
    )?;
    let log_level_separator = PredefinedMenuItem::separator(app_handle)?;
    let copy_log_path = MenuItem::with_id(
        app_handle,
        "copy_log_path",
        "Copy Log Path",
        true,
        None::<&str>,
    )?;
    let log_level_submenu = Submenu::with_items(
        app_handle,
        "Debug Level",
        true,
        &[
            &log_error,
            &log_warn,
            &log_info,
            &log_debug,
            &log_trace,
            &log_off,
            &log_level_separator,
            &copy_log_path,
        ],
    )?;

    // Clone for capture in event handler
    let log_items = [
        (log_error.clone(), log::LevelFilter::Error),
        (log_warn.clone(), log::LevelFilter::Warn),
        (log_info.clone(), log::LevelFilter::Info),
        (log_debug.clone(), log::LevelFilter::Debug),
        (log_trace.clone(), log::LevelFilter::Trace),
        (log_off.clone(), log::LevelFilter::Off),
    ];

    let separator = PredefinedMenuItem::separator(app_handle)?;
    let restart = MenuItem::with_id(app_handle, "restart", "Restart", true, None::<&str>)?;
    store_tray_restart_handle(restart.clone());
    let about = MenuItem::with_id(app_handle, "about", "About CrossUsage", true, None::<&str>)?;
    let quit = MenuItem::with_id(app_handle, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(
        app_handle,
        &[
            &show_stats,
            &go_to_settings,
            &log_level_submenu,
            &separator,
            &restart,
            &about,
            &quit,
        ],
    )?;

    // Template images are a macOS menu-bar convention (alpha mask + system tint).
    // On Windows use the PNG as a normal color icon so the tray looks correct.
    let mut builder = TrayIconBuilder::with_id("tray")
        .icon(icon)
        .tooltip("CrossUsage");
    #[cfg(target_os = "macos")]
    {
        builder = builder.icon_as_template(true);
    }

    #[cfg(target_os = "macos")]
    {
        builder = builder.menu(&menu).show_menu_on_left_click(false);
    }
    #[cfg(target_os = "windows")]
    {
        // Left click: stats window via on_tray_icon_event. Right click: native context menu.
        builder = builder.menu(&menu).show_menu_on_left_click(false);
    }

    builder
        .on_menu_event(move |app_handle, event| {
            log::debug!("tray menu: {}", event.id.as_ref());
            super::handle_menu_action(app_handle, event.id.as_ref());
            if let Some(level) = event
                .id
                .as_ref()
                .strip_prefix("log_")
                .and_then(super::log_level_from_str)
            {
                for (item, item_level) in &log_items {
                    let _ = item.set_checked(*item_level == level);
                }
            }
        })
        .on_tray_icon_event(|tray, event| {
            // Record tray icon bounds for `tauri-plugin-positioner` (TrayCenter, etc.).
            #[cfg(desktop)]
            tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

            #[cfg(any(target_os = "macos", target_os = "windows"))]
            {
                let app_handle = tray.app_handle();

                if let TrayIconEvent::Click {
                    button,
                    button_state,
                    rect,
                    ..
                } = event
                {
                    #[cfg(not(target_os = "macos"))]
                    let _ = rect;

                    // Secondary click opens the tray menu. Primary press toggles the stats UI
                    // (Down is more reliable than Up on some Windows shells).
                    if button != MouseButton::Left || button_state != MouseButtonState::Down {
                        return;
                    }

                    #[cfg(target_os = "macos")]
                    {
                        let Some(panel) = get_or_init_panel!(app_handle) else {
                            return;
                        };

                        if panel.is_visible() {
                            log::debug!("tray click: hiding panel");
                            panel.hide();
                            return;
                        }
                        log::debug!("tray click: showing panel");

                        // macOS quirk: must show window before positioning to another monitor
                        panel.show_and_make_key();
                        position_panel_at_tray_icon(app_handle, rect.position, rect.size);
                    }

                    #[cfg(target_os = "windows")]
                    {
                        log::debug!("tray click: toggle popover");
                        toggle_panel(app_handle);
                    }
                }
            }
            #[cfg(not(any(target_os = "macos", target_os = "windows")))]
            {
                let _ = (tray, event);
            }
        })
        .build(app_handle)?;

    Ok(())
}
