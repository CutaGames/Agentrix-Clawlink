# Agentrix 依赖安装脚本 (PowerShell)
# 自动在 WSL 中运行安装脚本

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 Agentrix 依赖安装" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 获取当前目录（Windows 路径）
$currentDir = $PWD.Path
Write-Host "当前目录: $currentDir" -ForegroundColor Blue
Write-Host ""

# 检查脚本文件是否存在（优先使用英文文件名）
$scriptPath = Join-Path $currentDir "install.sh"
if (-not (Test-Path $scriptPath)) {
    # 尝试中文文件名
    $scriptPath = Join-Path $currentDir "安装依赖-WSL.sh"
    if (-not (Test-Path $scriptPath)) {
        Write-Host "❌ 找不到安装脚本" -ForegroundColor Red
        Write-Host ""
        Write-Host "请确保您在项目根目录中运行此脚本" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ 找到安装脚本" -ForegroundColor Green
Write-Host ""

# 检查 WSL 是否可用
if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) {
    Write-Host "❌ WSL 未安装或未启用" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先安装 WSL:" -ForegroundColor Yellow
    Write-Host "  wsl --install" -ForegroundColor White
    exit 1
}

Write-Host "✅ WSL 可用" -ForegroundColor Green
Write-Host ""

# 将 Windows 路径转换为 WSL 路径
# D:\wsl\Ubuntu-24.04\Code\Paymind\agentrix-website
# 转换为: /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/agentrix-website
$driveLetter = $currentDir.Substring(0, 1).ToLower()
$pathWithoutDrive = $currentDir.Substring(2) -replace '\\', '/'
$wslPath = "/mnt/$driveLetter$pathWithoutDrive"
Write-Host "WSL 路径: $wslPath" -ForegroundColor Blue
Write-Host ""

Write-Host "开始安装依赖..." -ForegroundColor Yellow
Write-Host ""

# 在 WSL 中运行安装脚本
# 优先使用英文文件名，避免编码问题
if (Test-Path (Join-Path $currentDir "install.sh")) {
    wsl bash -c "cd '$wslPath' && bash install.sh"
} else {
    wsl bash -c "cd '$wslPath' && bash 安装依赖-WSL.sh"
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "✅ 安装完成！" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 下一步:" -ForegroundColor Yellow
    Write-Host "  运行: .\启动服务.ps1" -ForegroundColor White
    Write-Host "  或: wsl bash WSL启动服务.sh" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ 安装过程中出现错误" -ForegroundColor Red
    Write-Host ""
    Write-Host "请检查:" -ForegroundColor Yellow
    Write-Host "  1. WSL 是否正常运行" -ForegroundColor White
    Write-Host "  2. 网络连接是否正常" -ForegroundColor White
    Write-Host "  3. 是否有足够的权限" -ForegroundColor White
    Write-Host ""
}

