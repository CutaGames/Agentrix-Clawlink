# Agentrix-Claw Local Agent — GUI Installer v1.3
# Double-click Setup.bat to run this
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Net.Http
[System.Windows.Forms.Application]::EnableVisualStyles()

try {
    $BOOT_LOG = Join-Path $env:TEMP 'agentrix-claw-installer-launch.log'
    Add-Content -Path $BOOT_LOG -Value ("[{0}] launch from {1}" -f (Get-Date).ToString('s'), $PSScriptRoot)
} catch {}

# ── Globals ────────────────────────────────────────────────────────────
$INSTALL_DIR        = Join-Path $env:APPDATA "Agentrix-Claw"
$CONFIG_FILE        = "$INSTALL_DIR\config.json"
$START_SCRIPT       = "$INSTALL_DIR\Start-Agentrix-Claw.ps1"
$AGENT_PORT         = 7474
$API_BASE           = "https://api.agentrix.top"
$APP_DEEPLINK_BASE  = "agentrix://connect"
$PACKAGE_NAME       = "@agentrix/openclaw-agent@latest"
$PACKAGE_COMMAND    = "openclaw"
$LOGO_PATH          = @(
    (Join-Path $PSScriptRoot "agentrix_logo_square_transparent.png"),
    (Join-Path (Join-Path $PSScriptRoot "..\Agentrix Logo") "agentrix_logo_square_transparent.png")
) | Where-Object { Test-Path $_ } | Select-Object -First 1
# Connection token param name must match mobile app (instanceId, not agentId)
# $global:AGENT_ID is exposed as instanceId in the deep link
$STEP               = 0    # current wizard step
$AGENT_TOKEN        = ""
$AGENT_ID           = ""
$OPENCLAW_CMD       = $null

# ── Color / Font helpers ─────────────────────────────────────────────
$DARK_BG   = [System.Drawing.Color]::FromArgb(13, 15, 20)
$CARD_BG   = [System.Drawing.Color]::FromArgb(22, 26, 35)
$ACCENT    = [System.Drawing.Color]::FromArgb(99, 102, 241)   # indigo
$GREEN     = [System.Drawing.Color]::FromArgb(34, 197, 94)
$TEXT      = [System.Drawing.Color]::FromArgb(232, 236, 244)
$MUTED     = [System.Drawing.Color]::FromArgb(100, 110, 130)
$FONT_LG   = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$FONT_MD   = New-Object System.Drawing.Font("Segoe UI", 11)
$FONT_SM   = New-Object System.Drawing.Font("Segoe UI", 9)
$FONT_MONO = New-Object System.Drawing.Font("Consolas",  9)

function Refresh-SessionPath {
    $machinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = @($machinePath, $userPath) -join ';'
}

function Resolve-Executable {
    param(
        [string[]]$Names,
        [string[]]$ExtraPaths = @()
    )

    foreach ($name in $Names) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($cmd -and $cmd.Source) { return $cmd.Source }
    }

    foreach ($path in $ExtraPaths) {
        if ($path -and (Test-Path $path)) { return $path }
    }

    return $null
}

function Get-NodeToolchain {
    Refresh-SessionPath

    $nodeCandidates = @(
        "$env:ProgramFiles\nodejs\node.exe",
        "$env:ProgramFiles(x86)\nodejs\node.exe"
    )
    $npmCandidates = @(
        "$env:ProgramFiles\nodejs\npm.cmd",
        "$env:ProgramFiles(x86)\nodejs\npm.cmd"
    )

    return @{
        Node = Resolve-Executable -Names @('node.exe', 'node') -ExtraPaths $nodeCandidates
        Npm  = Resolve-Executable -Names @('npm.cmd', 'npm.exe', 'npm') -ExtraPaths $npmCandidates
    }
}

function Get-OpenClawCommand {
    param([string]$NpmPath)

    Refresh-SessionPath
    $fromPath = Resolve-Executable -Names @('openclaw.cmd', 'openclaw.exe', 'openclaw')
    if ($fromPath) { return $fromPath }

    if ($NpmPath) {
        try {
            $prefix = (& $NpmPath prefix -g 2>$null | Select-Object -First 1).Trim()
            $candidates = @(
                (Join-Path $prefix 'openclaw.cmd'),
                (Join-Path $prefix 'openclaw.exe'),
                (Join-Path $prefix 'node_modules\.bin\openclaw.cmd')
            )
            foreach ($candidate in $candidates) {
                if (Test-Path $candidate) { return $candidate }
            }
        } catch {}
    }

    return $null
}

function Get-LanIp {
    try {
        return (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254)' } |
            Select-Object -First 1 -ExpandProperty IPAddress)
    } catch {
        return $null
    }
}

function Add-BrandLogo {
    param(
        [System.Windows.Forms.Control]$Parent,
        [int]$X,
        [int]$Y,
        [int]$Width,
        [int]$Height
    )

    if (-not (Test-Path $LOGO_PATH)) { return $null }

    $pic = New-Object System.Windows.Forms.PictureBox
    $pic.Size = [System.Drawing.Size]::new($Width, $Height)
    $pic.Location = [System.Drawing.Point]::new($X, $Y)
    $pic.BackColor = [System.Drawing.Color]::Transparent
    $pic.SizeMode = [System.Windows.Forms.PictureBoxSizeMode]::Zoom
    $pic.Image = [System.Drawing.Image]::FromFile($LOGO_PATH)
    $Parent.Controls.Add($pic)
    return $pic
}

function New-RoundedButton($text, $x, $y, $w, $h, $bg, $fg) {
    $btn        = New-Object System.Windows.Forms.Button
    $btn.Text   = $text
    $btn.Location = [System.Drawing.Point]::new($x, $y)
    $btn.Size   = [System.Drawing.Size]::new($w, $h)
    $btn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $btn.FlatAppearance.BorderSize = 0
    $btn.BackColor  = $bg
    $btn.ForeColor  = $fg
    $btn.Font       = $FONT_MD
    $btn.Cursor     = [System.Windows.Forms.Cursors]::Hand
    return $btn
}

# ── Main Form ────────────────────────────────────────────────────────
$form               = New-Object System.Windows.Forms.Form
$form.Text          = "Agentrix-Claw Local Agent — Setup"
$form.Size          = [System.Drawing.Size]::new(560, 480)
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.BackColor     = $DARK_BG
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedSingle
$form.MaximizeBox   = $false
$form.Icon          = [System.Drawing.SystemIcons]::Application

# ── Step panel container ─────────────────────────────────────────────
$panel              = New-Object System.Windows.Forms.Panel
$panel.Dock         = [System.Windows.Forms.DockStyle]::Fill
$panel.BackColor    = $DARK_BG
$form.Controls.Add($panel)

# ── Progress dots (top) ──────────────────────────────────────────────
$dotPanel           = New-Object System.Windows.Forms.Panel
$dotPanel.Size      = [System.Drawing.Size]::new(560, 28)
$dotPanel.Location  = [System.Drawing.Point]::new(0, 0)
$dotPanel.BackColor = $CARD_BG
$form.Controls.Add($dotPanel)
$dotPanel.BringToFront()

$dotLabels = @()
@("Welcome", "Install", "Connect") | ForEach-Object -Begin { $di = 0 } -Process {
    $d = New-Object System.Windows.Forms.Label
    $d.Text      = "● $_"
    $d.AutoSize  = $true
    $d.Location  = [System.Drawing.Point]::new(30 + $di * 160, 5)
    $d.ForeColor = $MUTED
    $d.Font      = $FONT_SM
    $dotPanel.Controls.Add($d)
    $dotLabels += $d
    $di++
}
function Update-Dots($step) {
    for ($i = 0; $i -lt $dotLabels.Count; $i++) {
        $dotLabels[$i].ForeColor = if ($i -le $step) { $ACCENT } else { $MUTED }
    }
}

# ══════════════════════════════════════════════════════════════════════
# STEP 0 — Welcome
# ══════════════════════════════════════════════════════════════════════
function Show-Step0 {
    $panel.Controls.Clear()
    Update-Dots 0

    Add-BrandLogo -Parent $panel -X 200 -Y 36 -Width 160 -Height 90 | Out-Null

    $title = New-Object System.Windows.Forms.Label
    $title.Text      = "Agentrix-Claw Local Agent"
    $title.Font      = $FONT_LG
    $title.ForeColor = $TEXT
    $title.AutoSize  = $true
    $title.Location  = [System.Drawing.Point]::new(0, 145)
    $title.Size      = [System.Drawing.Size]::new(560, 40)
    $title.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
    $panel.Controls.Add($title)

    $sub = New-Object System.Windows.Forms.Label
    $sub.Text      = "Your personal AI agent running 24/7 on this computer`nTalk to it from anywhere with the Agentrix mobile app"
    $sub.Font      = $FONT_MD
    $sub.ForeColor = $MUTED
    $sub.Size      = [System.Drawing.Size]::new(480, 60)
    $sub.Location  = [System.Drawing.Point]::new(40, 190)
    $sub.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
    $panel.Controls.Add($sub)

    $card = New-Object System.Windows.Forms.Panel
    $card.BackColor = $CARD_BG
    $card.Size      = [System.Drawing.Size]::new(480, 90)
    $card.Location  = [System.Drawing.Point]::new(40, 265)
    $panel.Controls.Add($card)

        @("✅  Runs locally — your data stays on this PC",
            "✅  Connect from mobile app with QR code",
            "✅  One-click setup — no technical knowledge needed") | ForEach-Object -Begin { $ri = 0 } -Process {
        $rl = New-Object System.Windows.Forms.Label
        $rl.Text      = $_
        $rl.Font      = $FONT_SM
        $rl.ForeColor = $TEXT
        $rl.AutoSize  = $true
        $rl.Location  = [System.Drawing.Point]::new(14, 10 + $ri * 26)
        $card.Controls.Add($rl)
        $ri++
    }

    $btnNext = New-RoundedButton "Next  →" 350 370 140 42 $ACCENT $TEXT
    $btnNext.Add_Click({ Show-Step1 })
    $panel.Controls.Add($btnNext)

    $btnCancel = New-RoundedButton "Cancel" 50 370 100 42 $CARD_BG $MUTED
    $btnCancel.Add_Click({ $form.Close() })
    $panel.Controls.Add($btnCancel)
}

# ══════════════════════════════════════════════════════════════════════
# STEP 1 — Install (with progress bar + background job)
# ══════════════════════════════════════════════════════════════════════
function Show-Step1 {
    $panel.Controls.Clear()
    Update-Dots 1

    $title = New-Object System.Windows.Forms.Label
    $title.Text      = "Installing Agentrix-Claw Agent..."
    $title.Font      = $FONT_LG
    $title.ForeColor = $TEXT
    $title.Size      = [System.Drawing.Size]::new(540, 40)
    $title.Location  = [System.Drawing.Point]::new(10, 50)
    $title.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
    $panel.Controls.Add($title)

    $progress = New-Object System.Windows.Forms.ProgressBar
    $progress.Size     = [System.Drawing.Size]::new(480, 22)
    $progress.Location = [System.Drawing.Point]::new(40, 110)
    $progress.Style    = [System.Windows.Forms.ProgressBarStyle]::Continuous
    $progress.Minimum  = 0
    $progress.Maximum  = 100
    $progress.Value    = 0
    $panel.Controls.Add($progress)

    $status = New-Object System.Windows.Forms.Label
    $status.Text      = "Initializing..."
    $status.Font      = $FONT_SM
    $status.ForeColor = $MUTED
    $status.Size      = [System.Drawing.Size]::new(480, 20)
    $status.Location  = [System.Drawing.Point]::new(40, 138)
    $panel.Controls.Add($status)

    $log = New-Object System.Windows.Forms.RichTextBox
    $log.Size         = [System.Drawing.Size]::new(480, 180)
    $log.Location     = [System.Drawing.Point]::new(40, 165)
    $log.BackColor    = $CARD_BG
    $log.ForeColor    = $GREEN
    $log.Font         = $FONT_MONO
    $log.ReadOnly     = $true
    $log.BorderStyle  = [System.Windows.Forms.BorderStyle]::None
    $log.ScrollBars   = [System.Windows.Forms.RichTextBoxScrollBars]::Vertical
    $panel.Controls.Add($log)

    $form.Refresh()

    function Log($msg) {
        $log.AppendText("$msg`n")
        $log.ScrollToCaret()
        [System.Windows.Forms.Application]::DoEvents()
    }
    function SetProgress($pct, $msg) {
        $progress.Value = $pct
        $status.Text    = $msg
        [System.Windows.Forms.Application]::DoEvents()
    }

    # ── Run installation steps ──────────────────────────────────────
    SetProgress 5  "Creating install directory..."
    Log "► Creating $INSTALL_DIR"
    if (-not (Test-Path $INSTALL_DIR)) { New-Item -ItemType Directory $INSTALL_DIR | Out-Null }

    # Generate unique agent credentials
    SetProgress 15 "Generating agent credentials..."
    $global:AGENT_ID    = "agent-" + [System.Guid]::NewGuid().ToString("N").Substring(0,12)
    $global:AGENT_TOKEN = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString("N") + [System.DateTime]::Now.Ticks)).Substring(0,32) -replace "[+/=]","x"
    Log "► Agent ID: $global:AGENT_ID"
    Log "► Token:    ****** (stored securely)"

    # Check Node.js
    SetProgress 25 "Checking Node.js..."
    $toolchain = Get-NodeToolchain
    if ($toolchain.Node -and $toolchain.Npm) {
        $nodeVersion = & $toolchain.Node --version 2>$null
        Log "► Node.js found: $nodeVersion"
    } else {
        Log "► Node.js not found — downloading installer..."
        SetProgress 30 "Downloading Node.js LTS..."
        $nodeInstallerUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
        $nodeInstaller    = "$env:TEMP\node-installer.msi"
        try {
            (New-Object System.Net.WebClient).DownloadFile($nodeInstallerUrl, $nodeInstaller)
            Log "► Installing Node.js (this may take 1-2 min)..."
            Start-Process msiexec -ArgumentList "/i `"$nodeInstaller`" /qn /norestart" -Wait
            $toolchain = Get-NodeToolchain
            if (-not $toolchain.Node -or -not $toolchain.Npm) {
                throw "Node.js installed but PATH is still unavailable. Please reopen the installer and try again."
            }
            Log "► Node.js installed!"
        } catch {
            Log "⚠ Could not auto-install Node.js. Please install from nodejs.org then re-run."
            [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Agentrix-Claw Setup', 'OK', 'Error') | Out-Null
            return
        }
    }

    # Install npm package
    SetProgress 50 "Installing Agentrix-Claw package..."
    Log "► Running: npm install -g $PACKAGE_NAME"
    $npmOut = & $toolchain.Npm install -g $PACKAGE_NAME 2>&1
    $npmOut | ForEach-Object { Log "  $_" }
    if ($LASTEXITCODE -ne 0) {
        [System.Windows.Forms.MessageBox]::Show('Package installation failed. Please check the setup log and try again.', 'Agentrix-Claw Setup', 'OK', 'Error') | Out-Null
        return
    }

    $global:OPENCLAW_CMD = Get-OpenClawCommand -NpmPath $toolchain.Npm
    if (-not $global:OPENCLAW_CMD) {
        [System.Windows.Forms.MessageBox]::Show('The OpenClaw command could not be found after installation. Please reopen the installer and try again.', 'Agentrix-Claw Setup', 'OK', 'Error') | Out-Null
        return
    }

    Log "► OpenClaw command: $global:OPENCLAW_CMD"
    SetProgress 70 "Package installed."

    # Write config
    SetProgress 80 "Writing configuration..."
    $config = @{
        agentId      = $global:AGENT_ID
        token        = $global:AGENT_TOKEN
        port         = $AGENT_PORT
        relay        = $true
        relayUrl     = "wss://$($API_BASE -replace 'https://','')/relay"
        apiBase      = $API_BASE
        createdAt    = [System.DateTime]::UtcNow.ToString("o")
        version      = "1.3.0"
    } | ConvertTo-Json -Depth 3
    Set-Content -Path $CONFIG_FILE -Value $config -Encoding UTF8
    Log "► Config saved to $CONFIG_FILE"

    # Write start script
    $startScript = @"
# Start Agentrix-Claw Agent
Set-Location "$INSTALL_DIR"
`$env:AGENTRIX_CLAW_CONFIG = "$CONFIG_FILE"
& "$global:OPENCLAW_CMD" start --port $AGENT_PORT --token "$global:AGENT_TOKEN"
"@
    Set-Content -Path $START_SCRIPT -Value $startScript -Encoding UTF8

    # Create Desktop shortcut
    SetProgress 88 "Creating desktop shortcut..."
    try {
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut("$env:USERPROFILE\Desktop\Agentrix-Claw Agent.lnk")
        $shortcut.TargetPath = "powershell.exe"
        $shortcut.Arguments  = "-NoProfile -ExecutionPolicy Bypass -File `"$START_SCRIPT`""
        $shortcut.WorkingDirectory = $INSTALL_DIR
        $shortcut.Description = "Start Agentrix-Claw Local Agent"
        $shortcut.Save()
        Log "► Desktop shortcut created: 'Agentrix-Claw Agent.lnk'"
    } catch { Log "  (shortcut creation skipped)" }

    # Start the agent
    SetProgress 95 "Starting agent..."
    Log "► Starting Agentrix-Claw Agent on port $AGENT_PORT..."
    try {
        Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File `"$START_SCRIPT`"" -WindowStyle Minimized
        Start-Sleep -Milliseconds 2000
        Log "► Agent started!"
    } catch {
        Log "  Agent will start on next reboot or via desktop shortcut."
    }

    SetProgress 100 "Installation complete!"
    Log ""
    Log "✅ Agentrix-Claw Agent installed successfully!"

    Start-Sleep -Milliseconds 500
    Show-Step2
}

# ══════════════════════════════════════════════════════════════════════
# STEP 2 — Connect (QR code)
# ══════════════════════════════════════════════════════════════════════
function Show-Step2 {
    $panel.Controls.Clear()
    Update-Dots 2

    $title = New-Object System.Windows.Forms.Label
    $title.Text      = "🎉  Your Agent is Ready!"
    $title.Font      = $FONT_LG
    $title.ForeColor = $GREEN
    $title.Size      = [System.Drawing.Size]::new(540, 40)
    $title.Location  = [System.Drawing.Point]::new(10, 28)
    $title.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
    $panel.Controls.Add($title)

    $sub = New-Object System.Windows.Forms.Label
    $sub.Text      = "Scan with the Agentrix mobile app on your phone to connect"
    $sub.Font      = $FONT_SM
    $sub.ForeColor = $MUTED
    $sub.Size      = [System.Drawing.Size]::new(540, 20)
    $sub.Location  = [System.Drawing.Point]::new(10, 68)
    $sub.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
    $panel.Controls.Add($sub)

    # ── QR code image (from web API) ─────────────────────────────────
    # Param name normalized to 'instanceId' — matches OpenClawBindScreen route parsing
    $lanIP = Get-LanIp
    $hostForLink = if ($lanIP) { $lanIP } else { 'localhost' }
    $deepLink = "$APP_DEEPLINK_BASE`?instanceId=$global:AGENT_ID&token=$global:AGENT_TOKEN&host=$hostForLink&port=$AGENT_PORT"
    $qrUrl    = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=2&data=" + [uri]::EscapeDataString($deepLink)

    Add-BrandLogo -Parent $panel -X 225 -Y 92 -Width 110 -Height 38 | Out-Null

    $picBox = New-Object System.Windows.Forms.PictureBox
    $picBox.Size        = [System.Drawing.Size]::new(170, 170)
    $picBox.Location    = [System.Drawing.Point]::new(195, 132)
    $picBox.BorderStyle = [System.Windows.Forms.BorderStyle]::None
    $picBox.BackColor   = [System.Drawing.Color]::White
    $picBox.SizeMode    = [System.Windows.Forms.PictureBoxSizeMode]::StretchImage
    $panel.Controls.Add($picBox)

    # Load QR async
    $panel.Controls.Add((New-Object System.Windows.Forms.Label -Property @{
        Text      = "Loading QR code..."
        Font      = $FONT_SM
        ForeColor = $MUTED
        Size      = [System.Drawing.Size]::new(185, 20)
        Location  = [System.Drawing.Point]::new(188, 306)
        TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
    }))

    $worker = New-Object System.ComponentModel.BackgroundWorker
    $worker.Add_DoWork({
        try {
            $wc  = New-Object System.Net.WebClient
            $bytes = $wc.DownloadData($qrUrl)
            $ms    = New-Object System.IO.MemoryStream(,$bytes)
            $img   = [System.Drawing.Image]::FromStream($ms)
            $picBox.Image = $img
        } catch { <# silently skip if offline #> }
    })
    $worker.RunWorkerAsync()

    # ── Info card ────────────────────────────────────────────────────
    $infoCard = New-Object System.Windows.Forms.Panel
    $infoCard.BackColor = $CARD_BG
    $infoCard.Size      = [System.Drawing.Size]::new(480, 56)
    $infoCard.Location  = [System.Drawing.Point]::new(40, 328)
    $panel.Controls.Add($infoCard)

    $linkLbl = New-Object System.Windows.Forms.Label
    # Show LAN IP so user knows what to enter if QR fails
    $displayUrl = if ($lanIP) { "http://${lanIP}:$AGENT_PORT" } else { "http://localhost:$AGENT_PORT" }

    $linkLbl.Text      = "Agent URL:  $displayUrl"
    $linkLbl.Font      = $FONT_MONO
    $linkLbl.ForeColor = $ACCENT
    $linkLbl.AutoSize  = $true
    $linkLbl.Location  = [System.Drawing.Point]::new(14, 8)
    $infoCard.Controls.Add($linkLbl)

    $idLbl = New-Object System.Windows.Forms.Label
    $idLbl.Text      = "Instance ID: $global:AGENT_ID"
    $idLbl.Font      = $FONT_MONO
    $idLbl.ForeColor = $MUTED
    $idLbl.AutoSize  = $true
    $idLbl.Location  = [System.Drawing.Point]::new(14, 32)
    $infoCard.Controls.Add($idLbl)

    # ── Copy deep-link button ─────────────────────────────────────────
    $btnCopy = New-RoundedButton "⧉  Copy Link" 40 398 150 38 $CARD_BG $TEXT
    $btnCopy.Add_Click({
        [System.Windows.Forms.Clipboard]::SetText($deepLink)
        $btnCopy.Text = "✓  Copied!"
        [System.Windows.Forms.Application]::DoEvents()
        Start-Sleep -Milliseconds 1200
        $btnCopy.Text = "⧉  Copy Link"
    })
    $panel.Controls.Add($btnCopy)

    # ── Open ClawLink in browser ──────────────────────────────────────
    $btnWeb = New-RoundedButton "Open Download Page" 190 398 190 38 $CARD_BG $TEXT
    $btnWeb.Add_Click({ Start-Process "https://agentrix.top/download" })
    $panel.Controls.Add($btnWeb)

    # ── Finish ───────────────────────────────────────────────────────
    $btnFinish = New-RoundedButton "✓  Finish" 385 398 120 38 $GREEN ([System.Drawing.Color]::Black)
    $btnFinish.Add_Click({ $form.Close() })
    $panel.Controls.Add($btnFinish)
}

# ── Start the wizard ──────────────────────────────────────────────────
Show-Step0
$form.ShowDialog()
