use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use crate::BallPosition;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
}

static BALL_POS: Mutex<Option<BallPosition>> = Mutex::new(None);
static WORKSPACE_DIR: Mutex<Option<PathBuf>> = Mutex::new(None);

pub fn open_chat_panel(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("chat-panel") {
        win.show().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Fire-and-forget: spawn window creation on a separate thread to avoid
    // deadlocking the main thread (WebviewWindowBuilder::build() needs the
    // event loop, which may be blocked by the IPC call).
    let app_clone = app.clone();
    std::thread::spawn(move || {
        if let Ok(win) = WebviewWindowBuilder::new(&app_clone, "chat-panel", WebviewUrl::App("index.html".into()))
            .title("Agentrix")
            .inner_size(480.0, 640.0)
            .min_inner_size(360.0, 480.0)
            .decorations(false)
            .always_on_top(true)
            .visible(true)
            .build()
        {
            // Grant WebView2 permissions (microphone, etc.) to the new chat-panel
            #[cfg(target_os = "windows")]
            crate::grant_webview2_permissions(&win);
        }
    });

    Ok(())
}

pub fn close_chat_panel(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("chat-panel") {
        win.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn set_ball_position(x: f64, y: f64) -> Result<(), String> {
    let mut pos = BALL_POS.lock().map_err(|e| e.to_string())?;
    *pos = Some(BallPosition { x, y });
    Ok(())
}

pub fn get_ball_position() -> Result<Option<BallPosition>, String> {
    let pos = BALL_POS.lock().map_err(|e| e.to_string())?;
    Ok(pos.clone())
}

pub fn set_panel_position_near_ball(app: AppHandle) -> Result<(), String> {
    let pos = BALL_POS.lock().map_err(|e| e.to_string())?;
    if let (Some(ball_pos), Some(panel)) = (pos.as_ref(), app.get_webview_window("chat-panel")) {
        let panel_x = (ball_pos.x - 500.0).max(0.0);
        let panel_y = (ball_pos.y - 320.0).max(0.0);
        panel
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: panel_x as i32,
                y: panel_y as i32,
            }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ─── Workspace / Coding Agent Filesystem Commands ───────

/// Validate that a path is safely within the workspace root (no traversal)
fn validate_path(workspace: &Path, relative: &str) -> Result<PathBuf, String> {
    // Block obvious traversal attempts
    if relative.contains("..") {
        return Err("Path traversal not allowed".into());
    }
    let full = workspace.join(relative);
    let canonical = full.canonicalize().unwrap_or_else(|_| full.clone());
    let ws_canonical = workspace.canonicalize().unwrap_or_else(|_| workspace.to_path_buf());
    if !canonical.starts_with(&ws_canonical) {
        return Err("Path is outside workspace".into());
    }
    Ok(full)
}

pub fn set_workspace_dir(path: String) -> Result<String, String> {
    let p = PathBuf::from(&path);
    if !p.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    let canonical = p.canonicalize().map_err(|e| e.to_string())?;
    let display = canonical.display().to_string();
    let mut ws = WORKSPACE_DIR.lock().map_err(|e| e.to_string())?;
    *ws = Some(canonical);
    Ok(display)
}

pub fn get_workspace_dir() -> Result<Option<String>, String> {
    let ws = WORKSPACE_DIR.lock().map_err(|e| e.to_string())?;
    Ok(ws.as_ref().map(|p| p.display().to_string()))
}

pub fn list_workspace_dir(relative_path: String) -> Result<Vec<crate::FileEntry>, String> {
    let ws = WORKSPACE_DIR.lock().map_err(|e| e.to_string())?;
    let workspace = ws.as_ref().ok_or("No workspace directory set")?;
    let target = if relative_path.is_empty() {
        workspace.clone()
    } else {
        validate_path(workspace, &relative_path)?
    };
    if !target.is_dir() {
        return Err(format!("Not a directory: {}", target.display()));
    }
    let mut entries = Vec::new();
    for entry in std::fs::read_dir(&target).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        let ft = entry.file_type().map_err(|e| e.to_string())?;
        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
        entries.push(crate::FileEntry {
            name,
            is_dir: ft.is_dir(),
            size,
        });
    }
    entries.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name))
    });
    Ok(entries)
}

pub fn read_workspace_file(relative_path: String) -> Result<String, String> {
    let ws = WORKSPACE_DIR.lock().map_err(|e| e.to_string())?;
    let workspace = ws.as_ref().ok_or("No workspace directory set")?;
    let target = validate_path(workspace, &relative_path)?;
    if !target.is_file() {
        return Err(format!("Not a file: {}", target.display()));
    }
    // Limit reads to 2MB to avoid memory issues
    let meta = std::fs::metadata(&target).map_err(|e| e.to_string())?;
    if meta.len() > 2 * 1024 * 1024 {
        return Err("File too large (>2MB). Use a specific range or smaller file.".into());
    }
    std::fs::read_to_string(&target).map_err(|e| e.to_string())
}

pub fn write_workspace_file(relative_path: String, content: String) -> Result<(), String> {
    let ws = WORKSPACE_DIR.lock().map_err(|e| e.to_string())?;
    let workspace = ws.as_ref().ok_or("No workspace directory set")?;
    let target = validate_path(workspace, &relative_path)?;
    // Create parent directories if needed
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&target, &content).map_err(|e| e.to_string())
}
