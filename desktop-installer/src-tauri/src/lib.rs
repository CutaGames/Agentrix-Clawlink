use tauri::{Manager, WindowEvent};

mod commands;
mod installer;
mod qr_bridge;

pub use commands::*;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            commands::check_ollama,
            commands::get_os_info,
            commands::install_ollama,
            commands::start_openclaw,
            commands::get_qr_data,
            commands::get_openclaw_status,
            commands::open_url,
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Keep the background service running when window is closed
                // (user can reconnect by reopening the app)
                let _ = api;
                window.hide().ok();
            }
        })
        .setup(|app| {
            // Set window properties
            if let Some(window) = app.get_webview_window("main") {
                window.set_title("Agentrix — Local Agent Setup").ok();
                window.center().ok();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
