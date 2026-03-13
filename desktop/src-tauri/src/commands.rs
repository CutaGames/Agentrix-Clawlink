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
            .drag_and_drop(false)
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

/// Snap the floating-ball window to the nearest screen edge (half-hidden).
pub fn snap_ball_to_edge(app: AppHandle) -> Result<(), String> {
    let win = app.get_webview_window("main").ok_or("main window not found")?;
    let pos = win.outer_position().map_err(|e| e.to_string())?;
    let size = win.outer_size().map_err(|e| e.to_string())?;

    // Get monitor the window is on
    let monitor = win.current_monitor().map_err(|e| e.to_string())?
        .ok_or("No monitor found")?;
    let screen_pos = monitor.position();
    let screen_size = monitor.size();

    let wx = pos.x as f64;
    let wy = pos.y as f64;
    let ww = size.width as f64;
    let wh = size.height as f64;
    let sx = screen_pos.x as f64;
    let sy = screen_pos.y as f64;
    let sw = screen_size.width as f64;
    let sh = screen_size.height as f64;

    // Center of the window
    let cx = wx + ww / 2.0;
    let cy = wy + wh / 2.0;

    // Distances to each edge from center
    let d_left = cx - sx;
    let d_right = (sx + sw) - cx;
    let d_top = cy - sy;
    let d_bottom = (sy + sh) - cy;

    let min_d = d_left.min(d_right).min(d_top).min(d_bottom);
    let half_hide = ww * 0.35; // hide 35% of the ball on the edge

    let (snap_x, snap_y) = if min_d == d_left {
        (sx - half_hide, wy) // left edge
    } else if min_d == d_right {
        (sx + sw - ww + half_hide, wy) // right edge
    } else if min_d == d_top {
        (wx, sy - half_hide) // top edge
    } else {
        (wx, sy + sh - wh + half_hide) // bottom edge
    };

    // Clamp vertical within screen bounds
    let final_y = snap_y.max(sy - half_hide).min(sy + sh - wh + half_hide);
    let final_x = snap_x.max(sx - half_hide).min(sx + sw - ww + half_hide);

    win.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
        x: final_x as i32,
        y: final_y as i32,
    })).map_err(|e| e.to_string())?;

    // Also save the snapped position
    let mut ball = BALL_POS.lock().map_err(|e| e.to_string())?;
    *ball = Some(BallPosition { x: final_x, y: final_y });

    Ok(())
}

/// Return a list of all available monitors with positions and sizes.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MonitorInfo {
    pub name: Option<String>,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale: f64,
}

pub fn get_monitors(app: AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    Ok(monitors
        .into_iter()
        .map(|m| MonitorInfo {
            name: m.name().map(|n| n.to_string()),
            x: m.position().x,
            y: m.position().y,
            width: m.size().width,
            height: m.size().height,
            scale: m.scale_factor(),
        })
        .collect())
}

/// Move the floating-ball to the given monitor (by index) and snap to the nearest edge.
pub fn move_ball_to_monitor(app: AppHandle, monitor_index: usize) -> Result<(), String> {
    let monitors: Vec<_> = app.available_monitors().map_err(|e| e.to_string())?;
    let target = monitors.get(monitor_index).ok_or("Monitor index out of range")?;
    let win = app.get_webview_window("main").ok_or("main window not found")?;

    // Place ball at center-right of the target monitor initially
    let mx = target.position().x as f64;
    let my = target.position().y as f64;
    let mw = target.size().width as f64;
    let mh = target.size().height as f64;
    let size = win.outer_size().map_err(|e| e.to_string())?;
    let ww = size.width as f64;

    let new_x = mx + mw - ww * 0.65; // right edge, partially hidden
    let new_y = my + mh / 2.0 - 28.0; // vertically centered

    win.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
        x: new_x as i32,
        y: new_y as i32,
    }))
    .map_err(|e| e.to_string())?;

    let mut ball = BALL_POS.lock().map_err(|e| e.to_string())?;
    *ball = Some(BallPosition { x: new_x, y: new_y });

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

pub fn list_workspace_dir(relative_path: String) -> Result<Vec<FileEntry>, String> {
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
        entries.push(FileEntry {
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
