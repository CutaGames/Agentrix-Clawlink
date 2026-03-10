use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use crate::BallPosition;
use std::sync::Mutex;

static BALL_POS: Mutex<Option<BallPosition>> = Mutex::new(None);

#[tauri::command]
pub fn open_chat_panel(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("chat-panel") {
        win.show().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "chat-panel", WebviewUrl::App("index.html".into()))
        .title("Agentrix")
        .inner_size(480.0, 640.0)
        .min_inner_size(360.0, 480.0)
        .decorations(false)
        .always_on_top(true)
        .visible(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn close_chat_panel(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("chat-panel") {
        win.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn set_ball_position(x: f64, y: f64) -> Result<(), String> {
    let mut pos = BALL_POS.lock().map_err(|e| e.to_string())?;
    *pos = Some(BallPosition { x, y });
    Ok(())
}

#[tauri::command]
pub fn get_ball_position() -> Result<Option<BallPosition>, String> {
    let pos = BALL_POS.lock().map_err(|e| e.to_string())?;
    Ok(pos.clone())
}

#[tauri::command]
pub fn set_panel_position_near_ball(app: AppHandle) -> Result<(), String> {
    let pos = BALL_POS.lock().map_err(|e| e.to_string())?;
    if let (Some(ball_pos), Some(panel)) = (pos.as_ref(), app.get_webview_window("chat-panel")) {
        // Position the panel to the left of the ball
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
