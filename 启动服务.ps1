# PayMind 服务启动脚本 (PowerShell)
# 自动在 WSL 中启动所有服务

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 PayMind 服务启动" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 获取当前目录（Windows 路径）
$currentDir = $PWD.Path
Write-Host "当前目录: $currentDir" -ForegroundColor Blue
Write-Host ""

# 检查脚本文件是否存在（优先使用英文文件名）
$scriptPath = Join-Path $currentDir "start.sh"
if (-not (Test-Path $scriptPath)) {
    # 尝试中文文件名
    $scriptPath = Join-Path $currentDir "WSL启动服务.sh"
    if (-not (Test-Path $scriptPath)) {
        Write-Host "❌ 找不到启动脚本" -ForegroundColor Red
        Write-Host ""
        Write-Host "请确保您在项目根目录中运行此脚本" -ForegroundColor Yellow
        exit 1
    }
}

# 检查 WSL 是否可用
if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) {
    Write-Host "❌ WSL 未安装或未启用" -ForegroundColor Red
    exit 1
}

# 将 Windows 路径转换为 WSL 路径
# D:\wsl\Ubuntu-24.04\Code\Paymind\paymind-website
# 转换为: /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/paymind-website
$driveLetter = $currentDir.Substring(0, 1).ToLower()
$pathWithoutDrive = $currentDir.Substring(2) -replace '\\', '/'
$wslPath = "/mnt/$driveLetter$pathWithoutDrive"

Write-Host "✅ 找到启动脚本" -ForegroundColor Green
Write-Host "WSL 路径: $wslPath" -ForegroundColor Blue
Write-Host ""

Write-Host "启动所有服务..." -ForegroundColor Yellow
Write-Host ""
Write-Host "服务将在以下地址启动:" -ForegroundColor Cyan
Write-Host "  🌐 前端应用:    http://localhost:3000" -ForegroundColor White
Write-Host "  🔧 后端API:     http://localhost:3001/api" -ForegroundColor White
Write-Host "  📖 API文档:     http://localhost:3001/api/docs" -ForegroundColor White
Write-Host "  📚 SDK文档:     http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "按 Ctrl+C 停止所有服务" -ForegroundColor Yellow
Write-Host ""

# 在 WSL 中运行启动脚本
# 优先使用英文文件名，避免编码问题
if (Test-Path (Join-Path $currentDir "start.sh")) {
    wsl bash -c "cd '$wslPath' && bash start.sh"
} else {
    wsl bash -c "cd '$wslPath' && bash WSL启动服务.sh"
}

