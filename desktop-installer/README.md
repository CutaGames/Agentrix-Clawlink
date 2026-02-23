# Agentrix OpenClaw AIO Installer

One-click install for the OpenClaw local agent — no technical knowledge required.

## Quick Start

### Linux / macOS
```bash
curl -fsSL https://cdn.agentrix.io/install-aio.sh | bash
# or from source:
bash install-aio.sh
```

### Windows (PowerShell — run as Administrator)
```powershell
irm https://cdn.agentrix.io/install-aio.ps1 | iex
# or from source:
Set-ExecutionPolicy Bypass -Scope Process -Force
.\install-aio.ps1
```

## What it does
1. Checks for Node.js ≥18 (installs if missing)
2. Downloads the OpenClaw agent binary
3. Generates a unique instance ID + connection token
4. Shows QR code / deep-link URL for mobile app scanning
5. Creates auto-start service (systemd on Linux, LaunchAgent on macOS, Task Scheduler on Windows)
6. Starts the agent immediately (port 7474)

## Mobile Connection
After running the installer:
1. Open **Agentrix** mobile app
2. Go to **Agent** tab → **+ New Instance**
3. Tap **Import via QR** and scan, or paste the `agentrix://connect?...` URL
4. Your local agent will appear as a connected instance

## Manual Connection
If QR scanning doesn't work, you can also enter:
- **Host**: `localhost` (or your LAN IP for remote connections)
- **Port**: `7474`
- **Token**: shown during install (also saved in `~/.agentrix/config.json`)

## Files
| File | Description |
|------|-------------|
| `install-aio.sh` | Linux/macOS installer |
| `install-aio.ps1` | Windows PowerShell installer |
| `~/.agentrix/config.json` | Instance config (Linux/macOS) |
| `%APPDATA%\Agentrix\config.json` | Instance config (Windows) |

## Uninstall
**Linux/macOS:**
```bash
systemctl --user stop agentrix-openclaw
systemctl --user disable agentrix-openclaw
rm -rf ~/.agentrix
```

**macOS:**
```bash
launchctl unload ~/Library/LaunchAgents/io.agentrix.openclaw.plist
rm ~/Library/LaunchAgents/io.agentrix.openclaw.plist
rm -rf ~/.agentrix
```

**Windows:**
```powershell
Unregister-ScheduledTask -TaskName AgentrixOpenClaw -Confirm:$false
Remove-Item "$env:APPDATA\Agentrix" -Recurse -Force
```
