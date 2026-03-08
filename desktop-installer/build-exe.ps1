param(
    [switch]$KeepStage,
    [ValidateSet('all', 'gui', 'standard', 'aio')]
    [string]$Variant = 'all'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$buildRoot   = Join-Path $PSScriptRoot '..\builds'
$logoSource  = Join-Path (Join-Path $PSScriptRoot '..\Agentrix Logo') 'agentrix_logo_square_transparent.png'
New-Item -ItemType Directory -Path $buildRoot -Force | Out-Null

# ── PS5.1 syntax check (Gates the build — catches PS7-only syntax before compile) ───────────
Write-Host '[Agentrix] Checking installer script syntax (PS5.1)...' -ForegroundColor DarkCyan
& (Join-Path $PSScriptRoot '_syntax-check.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Syntax check failed — fix errors before building.' }

# ── Compile a standalone .NET "Windows Application" EXE (no console window) ──────────────────
# The EXE embeds install-gui.ps1 (and optionally the logo) as base64 strings,
# extracts them to a per-run GUID temp dir, then launches PowerShell -STA with
# CreateNoWindow=true so there is ZERO black console flicker.
function New-GuiExe {
    param(
        [string]$OutputPath,
        [string]$Ps1Source,
        [string]$LogoSource,
        [switch]$Console   # show a console window (for terminal-based scripts)
    )

    Write-Host ('[Agentrix] Compiling {0} (.NET {1} launcher)...' -f [IO.Path]::GetFileName($OutputPath), $(if ($Console) {'console'} else {'no-console'})) -ForegroundColor Cyan

    if (-not (Test-Path $Ps1Source)) { throw "PS1 not found: $Ps1Source" }

    $ps1B64  = [Convert]::ToBase64String([IO.File]::ReadAllBytes($Ps1Source))

    # Embed logo only when the file is present (it is cosmetic; installer works without it)
    $logoDecodeCode = ''
    $logoWriteCode  = ''
    if (Test-Path $LogoSource) {
        $logoB64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($LogoSource))
        $logoDecodeCode = "private static readonly string _logob64 = `"$logoB64`";"
        $logoWriteCode  = @'
        var logoPath = System.IO.Path.Combine(tmpDir, "agentrix_logo_square_transparent.png");
        System.IO.File.WriteAllBytes(logoPath, Convert.FromBase64String(_logob64));
'@
    }

    # ── Build two different C# sources depending on -Console mode ─────────────────────────────
    #
    # GUI  (-Console $false): /target:winexe — no console ever allocated; WinForms dialogs shown
    #       on error.  PowerShell runs hidden; stdout/stderr captured and shown in a MessageBox.
    #
    # AIO  (-Console $true):  /target:exe    — the EXE IS a console app so Windows allocates
    #       exactly ONE console for it at startup.  PowerShell is started with UseShellExecute=false
    #       and NO CreateNoWindow flag, so it inherits the launcher's existing console.
    #       Result: one window, zero flicker, user sees Write-Host output in real time.

    if ($Console) {
        # ── Console (AIO) C# source ───────────────────────────────────────────────────────────
        $src = @"
using System;
using System.Diagnostics;
using System.IO;

class AgentrixClawSetup {
    private static readonly string _ps1b64 = "$ps1B64";

    static int Main() {
        string tmpDir = Path.Combine(
            Path.GetTempPath(),
            "AgentrixClaw_" + Guid.NewGuid().ToString("N").Substring(0, 8));
        try {
            Directory.CreateDirectory(tmpDir);

            string ps1Path = Path.Combine(tmpDir, "install-aio.ps1");
            byte[] bom      = new byte[] { 0xEF, 0xBB, 0xBF };
            byte[] ps1Bytes = Convert.FromBase64String(_ps1b64);
            byte[] ps1WithBom = new byte[bom.Length + ps1Bytes.Length];
            Array.Copy(bom, 0, ps1WithBom, 0, bom.Length);
            Array.Copy(ps1Bytes, 0, ps1WithBom, bom.Length, ps1Bytes.Length);
            File.WriteAllBytes(ps1Path, ps1WithBom);

            string sysRoot = Environment.GetFolderPath(Environment.SpecialFolder.System);
            string psExe   = Path.Combine(sysRoot, @"WindowsPowerShell\v1.0\powershell.exe");
            if (!File.Exists(psExe)) psExe = "powershell.exe";

            // UseShellExecute=false: child inherits THIS process's console (no new window).
            // Do NOT set CreateNoWindow or redirect streams — let PS write directly to our console.
            var psi = new ProcessStartInfo(psExe,
                "-NoProfile -ExecutionPolicy Bypass -File \"" + ps1Path + "\"") {
                UseShellExecute = false
            };
            using (var proc = Process.Start(psi)) {
                if (proc != null) {
                    proc.WaitForExit();
                    if (proc.ExitCode != 0) {
                        Console.ForegroundColor = ConsoleColor.Yellow;
                        Console.WriteLine("\n[Agentrix] Exited with code " + proc.ExitCode + ". Check output above.");
                        Console.ResetColor();
                        Console.WriteLine("Press any key to close...");
                        try { Console.ReadKey(true); } catch { System.Threading.Thread.Sleep(5000); }
                    }
                    return proc.ExitCode;
                }
            }
        } catch (Exception ex) {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("[Agentrix] Setup error: " + ex.Message);
            Console.ResetColor();
            Console.WriteLine("Press any key to close...");
            Console.ReadKey();
            return 1;
        } finally {
            try { Directory.Delete(tmpDir, true); } catch { }
        }
        return 0;
    }
}
"@
    } else {
        # ── GUI (WinForms) C# source ──────────────────────────────────────────────────────────
        $src = @"
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

class AgentrixClawSetup {
    private static readonly string _ps1b64 = "$ps1B64";
    $logoDecodeCode

    [System.STAThread]
    static void Main() {
        string tmpDir = Path.Combine(
            Path.GetTempPath(),
            "AgentrixClaw_" + Guid.NewGuid().ToString("N").Substring(0, 8));
        string logPath = Path.Combine(Path.GetTempPath(), "agentrix-claw-setup.log");
        try {
            Directory.CreateDirectory(tmpDir);

            string ps1Path = Path.Combine(tmpDir, "install-gui.ps1");
            byte[] bom      = new byte[] { 0xEF, 0xBB, 0xBF };
            byte[] ps1Bytes = Convert.FromBase64String(_ps1b64);
            byte[] ps1WithBom = new byte[bom.Length + ps1Bytes.Length];
            Array.Copy(bom, 0, ps1WithBom, 0, bom.Length);
            Array.Copy(ps1Bytes, 0, ps1WithBom, bom.Length, ps1Bytes.Length);
            File.WriteAllBytes(ps1Path, ps1WithBom);
            $logoWriteCode

            string sysRoot = Environment.GetFolderPath(Environment.SpecialFolder.System);
            string psExe   = Path.Combine(sysRoot, @"WindowsPowerShell\v1.0\powershell.exe");
            if (!File.Exists(psExe)) psExe = "powershell.exe";

            var psi = new ProcessStartInfo(psExe,
                "-NoProfile -ExecutionPolicy Bypass -STA -File \"" + ps1Path + "\"") {
                UseShellExecute        = false,
                CreateNoWindow         = true,
                RedirectStandardOutput = true,
                RedirectStandardError  = true
            };
            using (var proc = Process.Start(psi)) {
                if (proc != null) {
                    string stdout = proc.StandardOutput.ReadToEnd();
                    string stderr = proc.StandardError.ReadToEnd();
                    proc.WaitForExit();
                    string log = string.Format(
                        "Exit: {0}\r\nPS: {1}\r\nPS1: {2}\r\n\r\n--- STDOUT ---\r\n{3}\r\n--- STDERR ---\r\n{4}",
                        proc.ExitCode, psExe, ps1Path, stdout, stderr);
                    File.WriteAllText(logPath, log);
                    if (proc.ExitCode != 0 || stderr.Length > 0) {
                        string preview = (stderr.Length > 0 ? stderr : stdout);
                        if (preview.Length > 1200) preview = preview.Substring(0, 1200) + "\n...";
                        MessageBox.Show(
                            "Installer error (log: " + logPath + "):\n\n" + preview,
                            "Agentrix-Claw Setup",
                            MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                }
            }
        } catch (Exception ex) {
            try { File.WriteAllText(logPath, "EXCEPTION: " + ex.ToString()); } catch { }
            MessageBox.Show(
                "Agentrix-Claw Setup failed:\n\n" + ex.Message + "\n\nLog: " + logPath,
                "Agentrix-Claw Setup",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
        } finally {
            try { Directory.Delete(tmpDir, true); } catch { }
        }
    }
}
"@
    }

    if (Test-Path $OutputPath) { Remove-Item $OutputPath -Force }

    $provider = New-Object Microsoft.CSharp.CSharpCodeProvider
    $cp = New-Object System.CodeDom.Compiler.CompilerParameters
    $cp.OutputAssembly      = [System.IO.Path]::GetFullPath($OutputPath)
    $cp.GenerateExecutable  = $true
    $cp.GenerateInMemory    = $false
    if ($Console) {
        # /target:exe = real console app; inherits one console window, no flicker
        $cp.CompilerOptions = '/target:exe /optimize+'
        $cp.ReferencedAssemblies.AddRange([string[]]@('System.dll'))
    } else {
        # /target:winexe = GUI app; no console ever allocated
        $cp.CompilerOptions = '/target:winexe /optimize+'
        $cp.ReferencedAssemblies.AddRange([string[]]@('System.dll', 'System.Windows.Forms.dll'))
    }

    $result = $provider.CompileAssemblyFromSource($cp, $src)
    if ($result.Errors.HasErrors) {
        $msgs = ($result.Errors | ForEach-Object { "  $($_.ErrorNumber): $($_.ErrorText) (line $($_.Line))" }) -join "`n"
        throw "C# compile failed:`n$msgs"
    }

    Write-Host "[Agentrix] EXE ready: $($cp.OutputAssembly)" -ForegroundColor Green
}

# ── Helpers for Standard / AIO (still use IExpress .cmd approach) ────────────────────────────
function New-StageFile {
    param([string]$Path, [string]$Content)
    Set-Content -Path $Path -Value $Content -Encoding ASCII
}

function New-IexpressPackage {
    param(
        [string]$Name,
        [string]$FriendlyName,
        [string]$AppLaunched,
        [System.Collections.IEnumerable]$PayloadFiles,
        [hashtable]$GeneratedFiles = @{}
    )

    $iexpressPath = Join-Path $env:WINDIR 'System32\iexpress.exe'
    if (-not (Test-Path $iexpressPath)) { throw 'IExpress not found.' }

    $stageDir = Join-Path $buildRoot ($Name + '-stage')
    if (Test-Path $stageDir) { Remove-Item $stageDir -Recurse -Force }
    New-Item -ItemType Directory -Path $stageDir -Force | Out-Null

    foreach ($file in $PayloadFiles) {
        if (-not (Test-Path $file.Source)) { throw "Payload missing: $($file.Source)" }
        Copy-Item $file.Source (Join-Path $stageDir $file.Target) -Force
    }
    foreach ($gen in $GeneratedFiles.Keys) {
        New-StageFile -Path (Join-Path $stageDir $gen) -Content $GeneratedFiles[$gen]
    }

    $allFileNames  = @($PayloadFiles | ForEach-Object { $_.Target }) + @($GeneratedFiles.Keys)
    $outputPath    = [System.IO.Path]::GetFullPath((Join-Path $buildRoot ($Name + '.exe')))
    if (Test-Path $outputPath) { Remove-Item $outputPath -Force }

    $resolvedStageDir = [System.IO.Path]::GetFullPath($stageDir)
    $sourceLines = @(); $stringLines = @()
    for ($i = 0; $i -lt $allFileNames.Count; $i++) {
        $sourceLines += ('%FILE{0}%=' -f $i)
        $stringLines += ('FILE{0}="{1}"' -f $i, $allFileNames[$i])
    }

    $sedPath    = Join-Path $stageDir ($Name + '.sed')
    $sedContent = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=0
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
ExtractOnly=0
InstallPrompt=
DisplayLicense=
FinishMessage=
TargetName=$outputPath
FriendlyName=$FriendlyName
AppLaunched=$AppLaunched
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[SourceFiles]
SourceFiles0=$resolvedStageDir\
[SourceFiles0]
$(($sourceLines -join "`r`n"))
[Strings]
$(($stringLines -join "`r`n"))
"@
    Set-Content -Path $sedPath -Value $sedContent -Encoding ASCII

    Write-Host ('[Agentrix] Building {0} (IExpress)...' -f [System.IO.Path]::GetFileName($outputPath)) -ForegroundColor Cyan
    $proc = Start-Process -FilePath $iexpressPath -ArgumentList @('/N', '/Q', $sedPath) -Wait -PassThru -NoNewWindow
    if ($proc.ExitCode -ne 0) { throw "IExpress failed for $Name (exit $($proc.ExitCode))." }
    if (-not (Test-Path $outputPath)) { throw "IExpress produced no EXE for $Name." }

    Write-Host "[Agentrix] EXE ready: $outputPath" -ForegroundColor Green
    if (-not $KeepStage) { Remove-Item $stageDir -Recurse -Force }
}

# ── GUI (compiled .NET winexe — no IExpress) ─────────────────────────────────────────────────
if ($Variant -in @('all', 'gui')) {
    New-GuiExe `
        -OutputPath (Join-Path $buildRoot 'Agentrix-Claw-Setup.exe') `
        -Ps1Source  (Join-Path $PSScriptRoot 'install-gui.ps1') `
        -LogoSource $logoSource
}


if ($Variant -in @('all', 'standard')) {
    $standardPayload = @(
        @{ Source = (Join-Path $PSScriptRoot 'install-standard.ps1'); Target = 'install-standard.ps1' }
    )

    $launchStandardCmd = @"
@echo off
title Agentrix-Claw Standard Setup
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-standard.ps1"
echo.
echo Agentrix-Claw Standard installer finished. Press any key to close.
pause >nul
"@

    New-IexpressPackage -Name 'Agentrix-Claw-Standard-Setup' -FriendlyName 'Agentrix-Claw Standard Setup' -AppLaunched 'cmd.exe /c Launch-Standard.cmd' -PayloadFiles $standardPayload -GeneratedFiles @{
        'Launch-Standard.cmd' = $launchStandardCmd
    }
}

if ($Variant -in @('all', 'aio')) {
    New-GuiExe `
        -OutputPath (Join-Path $buildRoot 'Agentrix-Claw-AIO-Setup.exe') `
        -Ps1Source  (Join-Path $PSScriptRoot 'install-aio.ps1') `
        -LogoSource $logoSource `
        -Console   # AIO uses Write-Host; show a normal console window, no IExpress
}
