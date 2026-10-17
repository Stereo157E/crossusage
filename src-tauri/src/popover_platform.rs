//! Window placement for tray-style popovers on Windows.
//! `TrayCenter` is used when tray geometry exists (left-click path), with fallback.
//!
//! Call [`move_main_near_tray`] only **after** [`WebviewWindow::show`](tauri::WebviewWindow::show)
//! so `current_monitor()` is usually available.

use tauri::{AppHandle, Manager};

use tauri::{PhysicalPosition, Runtime, WebviewWindow};

/// Move the main window using tray geometry from `on_tray_event`, constrained to the work area.
/// Must run **after** `show()`.
pub fn move_main_near_tray(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    if window.current_monitor().ok().flatten().is_none() {
        log::debug!("popover: no current monitor; centering");
        let _ = window.center();
        return;
    }

    #[cfg(target_os = "windows")]
    {
        use tauri_plugin_positioner::{Position, WindowExt};

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            window.move_window_constrained(Position::TrayCenter)
        }));

        match result {
            Ok(Ok(())) => {}
            Ok(Err(e)) => {
                log::debug!("popover: TrayCenter failed ({}), using monitor fallback", e);
                place_windows_monitor_fallback(&window);
            }
            Err(_) => {
                log::debug!("popover: TrayCenter unavailable; using monitor fallback");
                place_windows_monitor_fallback(&window);
            }
        }
    }
}

/// Windows fallback when tray geometry is unavailable: place near the top edge of the
/// current monitor so it still reads as a tray popover.
#[cfg(target_os = "windows")]
fn place_windows_monitor_fallback<R: Runtime>(window: &WebviewWindow<R>) {
    match (window.current_monitor(), window.outer_size()) {
        (Ok(Some(monitor)), Ok(outer)) => {
            let pos = monitor.position();
            let size = monitor.size();
            let margin = 12i32;
            let width = outer.width as i32;
            let x = pos.x + ((size.width as i32 - width) / 2);
            let y = pos.y + margin;
            let _ = window.set_position(PhysicalPosition::new(x, y));
        }
        _ => {
            let _ = window.center();
        }
    }
}
