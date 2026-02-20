use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::AppHandle;

use crate::installer;
use crate::qr_bridge;

// ─── DTOs ─────────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OsInfo {
    pub platform: String,   // "windows" | "macos" | "linux"
    pub arch: String,       // "x86_64" | "aarch64"
    pub ollama_installed: bool,
    pub ollama_version: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProgressEvent {
    pub step: String,           // "checking" | "downloading" | "installing" | "pulling" | "starting" | "ready"
    pub message: String,
    pub percent: u8,            // 0–100
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QrData {
    pub url: String,
    pub token: String,
    pub qr_base64: String,      // PNG image encoded as base64 data URI
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OpenClawStatus {
    pub running: bool,
    pub port: Option<u16>,
    pub url: Option<String>,
    pub uptime_secs: Option<u64>,
}

// ─── Commands ─────────────────────────────────────────────────────────────────

/// Returns platform info + whether Ollama is already installed
#[tauri::command]
pub async fn get_os_info() -> Result<OsInfo, String> {
    let platform = if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    };

    let arch = if cfg!(target_arch = "x86_64") {
        "x86_64"
    } else {
        "aarch64"
    };

    let (installed, version) = installer::detect_ollama();

    Ok(OsInfo {
        platform: platform.to_string(),
        arch: arch.to_string(),
        ollama_installed: installed,
        ollama_version: version,
    })
}

/// Check if Ollama is installed (quick, no heavy work)
#[tauri::command]
pub async fn check_ollama() -> bool {
    installer::detect_ollama().0
}

/// Download and install Ollama silently, emitting progress events.
/// Progress events are emitted via the `install-progress` event channel.
#[tauri::command]
pub async fn install_ollama(app: AppHandle) -> Result<(), String> {
    installer::install_ollama_with_progress(app).await
}

/// Pull openclaw model via Ollama and start the server.
/// This is done after Ollama is confirmed installed.
#[tauri::command]
pub async fn start_openclaw(app: AppHandle) -> Result<OpenClawStatus, String> {
    // Emit: pulling model
    emit_progress(&app, "pulling", "Pulling OpenClaw model (first run: ~2 GB)…", 10, None);

    // Pull the openclaw model
    let pull_output = Command::new(installer::ollama_binary_path())
        .args(["pull", "openclaw"])
        .output()
        .map_err(|e| format!("Failed to run ollama pull: {e}"))?;

    if !pull_output.status.success() {
        let err = String::from_utf8_lossy(&pull_output.stderr).to_string();
        emit_progress(&app, "error", &format!("Pull failed: {err}"), 0, Some(err.clone()));
        return Err(err);
    }

    emit_progress(&app, "starting", "Starting local agent…", 80, None);

    // Launch OpenClaw via ollama — finds a free port
    let port = find_free_port().unwrap_or(11434);
    let serve_result = Command::new(installer::ollama_binary_path())
        .args(["launch", "openclaw", "--port", &port.to_string()])
        .spawn()
        .map_err(|e| format!("Failed to start OpenClaw: {e}"))?;

    // Give the service 3 seconds to initialise
    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
    let _ = serve_result; // detach

    let url = format!("http://localhost:{port}");
    emit_progress(&app, "ready", "Agent is running!", 100, None);

    Ok(OpenClawStatus {
        running: true,
        port: Some(port),
        url: Some(url),
        uptime_secs: Some(0),
    })
}

/// Fetch the QR code data from the running OpenClaw instance and generate QR image.
#[tauri::command]
pub async fn get_qr_data(port: u16) -> Result<QrData, String> {
    qr_bridge::fetch_qr_data(port).await
}

/// Returns current OpenClaw status (is service healthy?)
#[tauri::command]
pub async fn get_openclaw_status(port: u16) -> OpenClawStatus {
    qr_bridge::check_status(port).await
}

/// Open a URL in the default browser
#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    open::that(url).map_err(|e| e.to_string())
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

fn emit_progress(app: &AppHandle, step: &str, message: &str, percent: u8, error: Option<String>) {
    let event = ProgressEvent {
        step: step.to_string(),
        message: message.to_string(),
        percent,
        error,
    };
    app.emit("install-progress", event).ok();
}

fn find_free_port() -> Option<u16> {
    use std::net::TcpListener;
    TcpListener::bind("127.0.0.1:0")
        .ok()
        .and_then(|l| l.local_addr().ok())
        .map(|a| a.port())
}
