use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

mod commands;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BallPosition {
    pub x: f64,
    pub y: f64,
}

#[tauri::command]
async fn desktop_bridge_open_chat_panel(app: AppHandle) -> Result<(), String> {
    commands::open_chat_panel(app)
}

#[tauri::command]
async fn desktop_bridge_close_chat_panel(app: AppHandle) -> Result<(), String> {
    commands::close_chat_panel(app)
}

#[tauri::command]
fn desktop_bridge_set_ball_position(x: f64, y: f64) -> Result<(), String> {
    commands::set_ball_position(x, y)
}

#[tauri::command]
fn desktop_bridge_get_ball_position() -> Result<Option<BallPosition>, String> {
    commands::get_ball_position()
}

#[tauri::command]
async fn desktop_bridge_set_panel_position_near_ball(app: AppHandle) -> Result<(), String> {
    commands::set_panel_position_near_ball(app)
}

/// Auto-grant microphone/camera/notification permissions in WebView2.
#[cfg(target_os = "windows")]
pub(crate) fn grant_webview2_permissions(webview: &tauri::WebviewWindow) {
    let _ = webview.with_webview(|platform_webview| {
        unsafe {
            use webview2_com::Microsoft::Web::WebView2::Win32::*;
            use webview2_com::PermissionRequestedEventHandler;

            let controller = platform_webview.controller();
            let core_wv2 = match controller.CoreWebView2() {
                Ok(wv) => wv,
                Err(_) => return,
            };

            let handler = PermissionRequestedEventHandler::create(Box::new(
                move |_sender, args| {
                    if let Some(args) = args {
                        let mut kind =
                            COREWEBVIEW2_PERMISSION_KIND_UNKNOWN_PERMISSION;
                        let _ = args.PermissionKind(&mut kind);
                        // Auto-allow microphone, camera, clipboard, notifications
                        let state = match kind {
                            COREWEBVIEW2_PERMISSION_KIND_MICROPHONE
                            | COREWEBVIEW2_PERMISSION_KIND_CAMERA
                            | COREWEBVIEW2_PERMISSION_KIND_CLIPBOARD_READ
                            | COREWEBVIEW2_PERMISSION_KIND_NOTIFICATIONS => {
                                COREWEBVIEW2_PERMISSION_STATE_ALLOW
                            }
                            _ => COREWEBVIEW2_PERMISSION_STATE_DEFAULT,
                        };
                        let _ = args.SetState(state);
                    }
                    Ok(())
                },
            ));

            // EventRegistrationToken is an i64 output param
            let mut token: i64 = 0;
            let _ = core_wv2.add_PermissionRequested(
                &handler,
                &mut token as *mut i64 as *mut _,
            );
        }
    });
}

/// Ensure WebView2 can find a working browser runtime.
#[cfg(target_os = "windows")]
fn ensure_webview2_runtime() {
    use std::path::Path;

    let tmp = std::env::temp_dir();
    let mut log = String::new();

    if let Some(val) = std::env::var_os("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER") {
        log.push_str(&format!("env already set: {:?}\n", val));
        std::fs::write(tmp.join("tauri_wv2.txt"), &log).ok();
        return;
    }

    let wv2_base = Path::new(r"C:\Program Files (x86)\Microsoft\EdgeWebView\Application");
    let mut version_dirs: Vec<_> = if wv2_base.is_dir() {
        std::fs::read_dir(wv2_base)
            .ok()
            .into_iter()
            .flatten()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().is_dir())
            .filter(|e| {
                e.file_name()
                    .to_str()
                    .map_or(false, |n| n.starts_with(|c: char| c.is_ascii_digit()))
            })
            .collect()
    } else {
        log.push_str("WV2 base dir not found\n");
        Vec::new()
    };
    version_dirs.sort_by(|a, b| b.file_name().cmp(&a.file_name()));

    if let Some(latest) = version_dirs.first() {
        if latest.path().join("msedge.dll").exists() {
            std::fs::write(tmp.join("tauri_wv2.txt"), &log).ok();
            return;
        }
    }

    for dir in version_dirs.iter().skip(1) {
        let p = dir.path();
        if p.join("msedge.dll").exists() && p.join("msedgewebview2.exe").exists() {
            let folder = p.to_string_lossy().to_string();
            log.push_str(&format!("using older WV2 fallback: {}\n", folder));
            std::env::set_var("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER", &folder);
            std::fs::write(tmp.join("tauri_wv2.txt"), &log).ok();
            return;
        }
    }

    std::fs::write(tmp.join("tauri_wv2.txt"), &log).ok();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "windows")]
    ensure_webview2_runtime();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            desktop_bridge_open_chat_panel,
            desktop_bridge_close_chat_panel,
            desktop_bridge_set_ball_position,
            desktop_bridge_get_ball_position,
            desktop_bridge_set_panel_position_near_ball,
        ])
        .setup(|app| {
            // Grant WebView2 permissions (microphone, camera, etc.) on the main window
            #[cfg(target_os = "windows")]
            if let Some(main_window) = app.get_webview_window("main") {
                grant_webview2_permissions(&main_window);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Agentrix Desktop");
}

