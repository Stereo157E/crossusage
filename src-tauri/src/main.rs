// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Prefer native Wayland scaling. GDK_BACKEND remains an explicit user override.
    // This must run before GTK/Tauri initializes the display.
    #[cfg(target_os = "linux")]
    gtk::gdk::set_allowed_backends("wayland,x11");

    crossusage_lib::run()
}
