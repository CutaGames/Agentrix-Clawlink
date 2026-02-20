use crate::commands::{OpenClawStatus, QrData};
use base64::Engine;
use qrcode::{QrCode, EcLevel};
use image::Luma;
use std::io::Cursor;

/// Fetch the QR code payload (url + token) from the running OpenClaw instance,
/// then generate a PNG QR code image as a base64 data URI.
pub async fn fetch_qr_data(port: u16) -> Result<QrData, String> {
    let base_url = format!("http://localhost:{port}");

    // OpenClaw exposes /api/connect-info when running.
    // Response: { "url": "http://192.168.x.x:11434", "token": "oc_xxx" }
    let info_url = format!("{base_url}/api/connect-info");

    // Try up to 10 times with 1s delay (OpenClaw might need a moment to start)
    let mut last_err = String::from("Timed out waiting for OpenClaw to start");
    for attempt in 0..10 {
        tokio::time::sleep(std::time::Duration::from_millis(
            if attempt == 0 { 500 } else { 1000 },
        ))
        .await;

        match reqwest::get(&info_url).await {
            Ok(resp) if resp.status().is_success() => {
                let body: serde_json::Value = resp
                    .json()
                    .await
                    .map_err(|e| format!("Invalid response from OpenClaw: {e}"))?;

                let url = body["url"]
                    .as_str()
                    .ok_or("Missing 'url' in connect-info")?
                    .to_string();
                let token = body["token"]
                    .as_str()
                    .unwrap_or("")
                    .to_string();

                // Build QR payload as JSON
                let qr_payload = serde_json::json!({
                    "url": url,
                    "token": token,
                })
                .to_string();

                // Generate QR code image
                let qr_base64 = generate_qr_base64(&qr_payload)
                    .unwrap_or_else(|_| String::new());

                return Ok(QrData {
                    url,
                    token,
                    qr_base64,
                });
            }
            Ok(resp) => {
                last_err = format!("OpenClaw returned HTTP {}", resp.status());
            }
            Err(e) => {
                last_err = format!("Connection refused (attempt {}): {e}", attempt + 1);
            }
        }
    }

    Err(last_err)
}

/// Check if the OpenClaw service is healthy.
pub async fn check_status(port: u16) -> OpenClawStatus {
    let url = format!("http://localhost:{port}/api/health");
    match reqwest::get(&url).await {
        Ok(resp) if resp.status().is_success() => OpenClawStatus {
            running: true,
            port: Some(port),
            url: Some(format!("http://localhost:{port}")),
            uptime_secs: None,
        },
        _ => OpenClawStatus {
            running: false,
            port: Some(port),
            url: None,
            uptime_secs: None,
        },
    }
}

/// Render a string into a QR code PNG, return as base64-encoded data URI.
fn generate_qr_base64(data: &str) -> Result<String, String> {
    let code = QrCode::with_error_correction_level(data, EcLevel::M)
        .map_err(|e| format!("QR generation failed: {e}"))?;

    // Render to image (scale 8x for visibility on retina)
    let image = code.render::<Luma<u8>>()
        .min_dimensions(400, 400)
        .quiet_zone(true)
        .build();

    // Encode PNG to bytes
    let mut png_bytes: Vec<u8> = Vec::new();
    image
        ::DynamicImage::ImageLuma8(image)
        .write_to(&mut Cursor::new(&mut png_bytes), image::ImageFormat::Png)
        .map_err(|e| format!("PNG encode failed: {e}"))?;

    let b64 = base64::engine::general_purpose::STANDARD.encode(&png_bytes);
    Ok(format!("data:image/png;base64,{b64}"))
}
