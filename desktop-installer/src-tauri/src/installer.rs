use std::process::Command;
use tauri::AppHandle;

#[cfg(target_os = "windows")]
const OLLAMA_INSTALLER_URL: &str =
    "https://ollama.com/download/OllamaSetup.exe";

#[cfg(target_os = "macos")]
const OLLAMA_INSTALLER_URL: &str =
    "https://ollama.com/download/Ollama-darwin.zip";

#[cfg(target_os = "linux")]
const OLLAMA_INSTALLER_URL: &str =
    "https://ollama.com/install.sh";

/// Find the ollama binary path based on OS conventions.
pub fn ollama_binary_path() -> &'static str {
    if cfg!(target_os = "windows") {
        "C:\\Users\\Public\\AppData\\Local\\Programs\\Ollama\\ollama.exe"
    } else {
        "/usr/local/bin/ollama"
    }
}

/// Detect if Ollama is installed, returning (is_installed, version_string).
pub fn detect_ollama() -> (bool, Option<String>) {
    // First try system PATH
    let path_check = which::which("ollama").is_ok();
    let binary = if path_check { "ollama" } else { ollama_binary_path() };

    let output = Command::new(binary).arg("--version").output();

    match output {
        Ok(out) if out.status.success() => {
            let version = String::from_utf8_lossy(&out.stdout).trim().to_string();
            (true, Some(version))
        }
        _ => (false, None),
    }
}

/// Install Ollama silently with progress events emitted to the frontend.
pub async fn install_ollama_with_progress(app: AppHandle) -> Result<(), String> {
    app.emit(
        "install-progress",
        crate::commands::ProgressEvent {
            step: "downloading".to_string(),
            message: "Downloading Ollama installer…".to_string(),
            percent: 5,
            error: None,
        },
    )
    .ok();

    #[cfg(target_os = "windows")]
    {
        install_windows(app).await
    }

    #[cfg(target_os = "macos")]
    {
        install_macos(app).await
    }

    #[cfg(target_os = "linux")]
    {
        install_linux(app).await
    }
}

// ─── Platform-specific installers ────────────────────────────────────────────

#[cfg(target_os = "windows")]
async fn install_windows(app: AppHandle) -> Result<(), String> {
    let tmp = std::env::temp_dir().join("OllamaSetup.exe");

    // Download
    download_file(OLLAMA_INSTALLER_URL, &tmp).await?;

    emit_step(&app, "installing", "Running Ollama installer…", 50);

    // Run silent install (/S = NSIS silent flag)
    let status = Command::new(&tmp)
        .arg("/S")
        .status()
        .map_err(|e| format!("Installer failed to start: {e}"))?;

    if !status.success() {
        return Err("Ollama installer exited with non-zero code".into());
    }

    emit_step(&app, "installing", "Ollama installed!", 75);
    Ok(())
}

#[cfg(target_os = "macos")]
async fn install_macos(app: AppHandle) -> Result<(), String> {
    let tmp_zip = std::env::temp_dir().join("Ollama-darwin.zip");
    let app_dest = std::path::Path::new("/Applications/Ollama.app");

    // Download zip
    download_file(OLLAMA_INSTALLER_URL, &tmp_zip).await?;

    emit_step(&app, "installing", "Extracting Ollama.app…", 50);

    // Unzip to /Applications
    let status = Command::new("unzip")
        .args(["-o", tmp_zip.to_str().unwrap(), "-d", "/Applications"])
        .status()
        .map_err(|e| format!("unzip failed: {e}"))?;

    if !status.success() || !app_dest.exists() {
        return Err("Failed to extract Ollama.app to /Applications".into());
    }

    // Start Ollama.app to initialise the CLI symlink
    Command::new("open")
        .args(["-a", "/Applications/Ollama.app"])
        .spawn()
        .ok();

    // Wait briefly for Ollama to register its CLI
    tokio::time::sleep(std::time::Duration::from_secs(3)).await;

    emit_step(&app, "installing", "Ollama installed!", 75);
    Ok(())
}

#[cfg(target_os = "linux")]
async fn install_linux(app: AppHandle) -> Result<(), String> {
    let tmp_script = std::env::temp_dir().join("ollama_install.sh");

    download_file(OLLAMA_INSTALLER_URL, &tmp_script).await?;

    emit_step(&app, "installing", "Installing Ollama via shell script…", 50);

    // Make executable and run with sh (requires sudo — prompt handled by OS)
    let _ = Command::new("chmod").args(["+x", tmp_script.to_str().unwrap()]).status();

    let status = Command::new("pkexec") // GUI sudo prompt on Linux
        .args(["sh", tmp_script.to_str().unwrap()])
        .status()
        .map_err(|e| format!("Install script failed: {e}"))?;

    if !status.success() {
        return Err("Ollama install script failed. Try running manually: curl -fsSL https://ollama.com/install.sh | sh".into());
    }

    emit_step(&app, "installing", "Ollama installed!", 75);
    Ok(())
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

async fn download_file(url: &str, dest: &std::path::Path) -> Result<(), String> {
    use std::io::Write;
    let resp = reqwest::get(url)
        .await
        .map_err(|e| format!("Download failed: {e}"))?;

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Failed to read download: {e}"))?;

    let mut file =
        std::fs::File::create(dest).map_err(|e| format!("Cannot create temp file: {e}"))?;
    file.write_all(&bytes)
        .map_err(|e| format!("Cannot write file: {e}"))?;

    Ok(())
}

fn emit_step(app: &AppHandle, step: &str, message: &str, percent: u8) {
    app.emit(
        "install-progress",
        crate::commands::ProgressEvent {
            step: step.to_string(),
            message: message.to_string(),
            percent,
            error: None,
        },
    )
    .ok();
}
