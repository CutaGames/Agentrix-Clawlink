# Agentrix WSL2 端口转发配置脚本
# 在Windows PowerShell中运行（以管理员身份）

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Agentrix WSL2 端口转发配置" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 获取WSL2 IP地址
Write-Host "🔍 获取WSL2 IP地址..." -ForegroundColor Yellow
$wslIp = (wsl hostname -I).Split()[0]

if ([string]::IsNullOrEmpty($wslIp)) {
    Write-Host "❌ 无法获取WSL2 IP地址，请确保WSL正在运行" -ForegroundColor Red
    exit 1
}

Write-Host "✅ WSL2 IP地址: $wslIp" -ForegroundColor Green
Write-Host ""

# 检查是否已有端口转发规则
Write-Host "🔍 检查现有端口转发规则..." -ForegroundColor Yellow
$existing3000 = netsh interface portproxy show v4tov4 | Select-String "3000"
$existing3001 = netsh interface portproxy show v4tov4 | Select-String "3001"

# 删除现有规则（如果存在）
if ($existing3000) {
    Write-Host "⚠️  删除现有端口3000转发规则..." -ForegroundColor Yellow
    netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0 2>$null
}

if ($existing3001) {
    Write-Host "⚠️  删除现有端口3001转发规则..." -ForegroundColor Yellow
    netsh interface portproxy delete v4tov4 listenport=3001 listenaddress=0.0.0.0 2>$null
}

# 添加端口转发规则
Write-Host "🔧 配置端口转发..." -ForegroundColor Yellow

# 前端端口转发 (3000)
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIp
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 端口3000转发配置成功" -ForegroundColor Green
} else {
    Write-Host "❌ 端口3000转发配置失败" -ForegroundColor Red
}

# 后端端口转发 (3001)
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=$wslIp
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 端口3001转发配置成功" -ForegroundColor Green
} else {
    Write-Host "❌ 端口3001转发配置失败" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📍 现在可以在Windows浏览器中访问：" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 前端应用: http://localhost:3000" -ForegroundColor Green
Write-Host "🔧 后端API: http://localhost:3001" -ForegroundColor Green
Write-Host "📚 API文档: http://localhost:3001/api/docs" -ForegroundColor Green
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "💡 提示：" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "1. 如果WSL2 IP地址变化，请重新运行此脚本" -ForegroundColor Yellow
Write-Host "2. 查看当前端口转发规则: netsh interface portproxy show v4tov4" -ForegroundColor Yellow
Write-Host "3. 删除端口转发规则: netsh interface portproxy delete v4tov4 listenport=<端口>" -ForegroundColor Yellow
Write-Host ""

