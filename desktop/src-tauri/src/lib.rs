use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

mod commands;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BallPosition {
    pub x: f64,
    pub y: f64,
}

// ── Chat Panel ────────────────────────────────────────────────────────────────

#[tauri::command]
async fn desktop_bridge_open_chat_panel(app: AppHandle) -> Result<(), String> {
    commands::open_chat_panel(app)
}

#[tauri::command]
async fn desktop_bridge_close_chat_panel(app: AppHandle) -> Result<(), String> {
    commands::close_chat_panel(app)
}

// ── Floating Ball / Monitor ───────────────────────────────────────────────────

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

#[tauri::command]
async fn desktop_bridge_snap_ball_to_edge(app: AppHandle) -> Result<(), String> {
    commands::snap_ball_to_edge(app)
}

#[tauri::command]
async fn desktop_bridge_get_monitors(app: AppHandle) -> Result<Vec<commands::MonitorInfo>, String> {
    commands::get_monitors(app)
}

#[tauri::command]
async fn desktop_bridge_move_ball_to_monitor(app: AppHandle, monitor_index: usize) -> Result<(), String> {
    commands::move_ball_to_monitor(app, monitor_index)
}

// ── Workspace (Coding Agent) ─────────────────────────────────────────────────

#[tauri::command]
fn desktop_bridge_set_workspace_dir(path: String) -> Result<String, String> {
    commands::set_workspace_dir(path)
}

#[tauri::command]
async fn desktop_bridge_pick_workspace_dir(app: AppHandle) -> Result<Option<String>, String> {
    commands::pick_workspace_dir(app)
}

#[tauri::command]
fn desktop_bridge_get_workspace_dir() -> Result<Option<String>, String> {
    commands::get_workspace_dir()
}

#[tauri::command]
fn desktop_bridge_list_workspace_dir(relative_path: String) -> Result<Vec<commands::FileEntry>, String> {
    commands::list_workspace_dir(relative_path)
}

#[tauri::command]
fn desktop_bridge_read_workspace_file(relative_path: String) -> Result<String, String> {
    commands::read_workspace_file(relative_path)
}

#[tauri::command]
fn desktop_bridge_write_workspace_file(relative_path: String, content: String) -> Result<(), String> {
    commands::write_workspace_file(relative_path, content)
}

// ── Desktop Bridge: Commands / Files / Context ────────────────────────────────

#[tauri::command]
fn desktop_bridge_run_command(command: String, working_directory: Option<String>, timeout_ms: u64) -> Result<commands::DesktopCommandResult, String> {
    commands::run_command(command, working_directory, timeout_ms)
}

#[tauri::command]
fn desktop_bridge_read_file(path: String) -> Result<commands::DesktopReadFileResult, String> {
    commands::read_file(path)
}

#[tauri::command]
fn desktop_bridge_write_file(path: String, content: String) -> Result<commands::DesktopWriteFileResult, String> {
    commands::write_file(path, content)
}

#[tauri::command]
fn desktop_bridge_open_browser(url: String) -> Result<String, String> {
    commands::open_browser(url)
}

#[tauri::command]
fn desktop_bridge_get_active_window() -> Result<Option<commands::DesktopWindowInfo>, String> {
    commands::get_active_window()
}

#[tauri::command]
fn desktop_bridge_list_windows() -> Result<Vec<commands::DesktopWindowInfo>, String> {
    commands::list_windows()
}

#[tauri::command]
fn desktop_bridge_get_clipboard_text() -> Result<Option<String>, String> {
    commands::get_clipboard_text()
}

#[tauri::command]
fn desktop_bridge_get_context() -> Result<commands::DesktopContextResult, String> {
    commands::get_context()
}

// ── Auth Token (simple file-based persistence) ────────────────────────────────

static AUTH_TOKEN: std::sync::Mutex<Option<String>> = std::sync::Mutex::new(None);

fn auth_token_file() -> Option<std::path::PathBuf> {
    #[cfg(target_os = "windows")]
    {
        return std::env::var_os("APPDATA")
            .map(std::path::PathBuf::from)
            .map(|base| base.join("Agentrix Desktop").join("auth_token"));
    }
    #[cfg(not(target_os = "windows"))]
    {
        if let Some(config_home) = std::env::var_os("XDG_CONFIG_HOME") {
            return Some(std::path::PathBuf::from(config_home).join("agentrix-desktop").join("auth_token"));
        }
        std::env::var_os("HOME")
            .map(std::path::PathBuf::from)
            .map(|home| home.join(".config").join("agentrix-desktop").join("auth_token"))
    }
}

#[tauri::command]
fn desktop_bridge_get_auth_token() -> Result<Option<String>, String> {
    {
        let tok = AUTH_TOKEN.lock().map_err(|e| e.to_string())?;
        if tok.is_some() {
            return Ok(tok.clone());
        }
    }
    if let Some(f) = auth_token_file() {
        if f.is_file() {
            let val = std::fs::read_to_string(&f).map_err(|e| e.to_string())?;
            let trimmed = val.trim().to_string();
            if !trimmed.is_empty() {
                let mut tok = AUTH_TOKEN.lock().map_err(|e| e.to_string())?;
                *tok = Some(trimmed.clone());
                return Ok(Some(trimmed));
            }
        }
    }
    Ok(None)
}

#[tauri::command]
fn desktop_bridge_set_auth_token(token: String) -> Result<(), String> {
    if let Some(f) = auth_token_file() {
        if let Some(parent) = f.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&f, &token).map_err(|e| e.to_string())?;
    }
    let mut tok = AUTH_TOKEN.lock().map_err(|e| e.to_string())?;
    *tok = Some(token);
    Ok(())
}

#[tauri::command]
fn desktop_bridge_delete_auth_token() -> Result<(), String> {
    if let Some(f) = auth_token_file() {
        let _ = std::fs::remove_file(&f);
    }
    let mut tok = AUTH_TOKEN.lock().map_err(|e| e.to_string())?;
    *tok = None;
    Ok(())
}

#[tauri::command]
fn desktop_bridge_log_debug_event(message: String) -> Result<(), String> {
    eprintln!("[agentrix-debug] {}", message);
    Ok(())
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
            // Chat panel
            desktop_bridge_open_chat_panel,
            desktop_bridge_close_chat_panel,
            // Floating ball / monitor
            desktop_bridge_set_ball_position,
            desktop_bridge_get_ball_position,
            desktop_bridge_set_panel_position_near_ball,
            desktop_bridge_snap_ball_to_edge,
            desktop_bridge_get_monitors,
            desktop_bridge_move_ball_to_monitor,
            // Workspace (coding agent)
            desktop_bridge_set_workspace_dir,
            desktop_bridge_pick_workspace_dir,
            desktop_bridge_get_workspace_dir,
            desktop_bridge_list_workspace_dir,
            desktop_bridge_read_workspace_file,
            desktop_bridge_write_workspace_file,
            // Desktop bridge: commands / files / context
            desktop_bridge_run_command,
            desktop_bridge_read_file,
            desktop_bridge_write_file,
            desktop_bridge_open_browser,
            desktop_bridge_get_active_window,
            desktop_bridge_list_windows,
            desktop_bridge_get_clipboard_text,
            desktop_bridge_get_context,
            // Auth token
            desktop_bridge_get_auth_token,
            desktop_bridge_set_auth_token,
            desktop_bridge_delete_auth_token,
            desktop_bridge_log_debug_event,
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

