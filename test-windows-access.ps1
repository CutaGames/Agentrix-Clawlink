# Windows浏览器访问测试脚本
# 在Windows PowerShell中运行

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Agentrix 服务访问测试" -ForegroundColor Cyan
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

# 测试前端
Write-Host "🔍 测试前端服务 (端口 3000)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://$wslIp:3000" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ 前端服务可访问 (HTTP $($response.StatusCode))" -ForegroundColor Green
    Write-Host "   📍 访问地址: http://$wslIp:3000" -ForegroundColor Cyan
    Write-Host "   📍 或使用: http://localhost:3000 (如果已配置端口转发)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ 前端服务无法访问" -ForegroundColor Red
    Write-Host "   错误: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   请检查服务是否正在运行" -ForegroundColor Yellow
}

Write-Host ""

# 测试后端
Write-Host "🔍 测试后端服务 (端口 3001)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://$wslIp:3001/api/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ 后端服务可访问 (HTTP $($response.StatusCode))" -ForegroundColor Green
    Write-Host "   📍 访问地址: http://$wslIp:3001" -ForegroundColor Cyan
    Write-Host "   📍 API文档: http://$wslIp:3001/api/docs" -ForegroundColor Cyan
    Write-Host "   📍 或使用: http://localhost:3001 (如果已配置端口转发)" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️  后端服务无法访问或还在启动中" -ForegroundColor Yellow
    Write-Host "   错误: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   后端首次启动需要30-60秒，请稍后重试" -ForegroundColor Yellow
}

Write-Host ""

# 检查端口转发
Write-Host "🔍 检查端口转发配置..." -ForegroundColor Yellow
$portForward3000 = netsh interface portproxy show v4tov4 | Select-String "3000"
$portForward3001 = netsh interface portproxy show v4tov4 | Select-String "3001"

if ($portForward3000) {
    Write-Host "✅ 端口3000转发已配置" -ForegroundColor Green
    Write-Host "   可以使用 http://localhost:3000 访问" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  端口3000转发未配置" -ForegroundColor Yellow
    Write-Host "   运行 .\setup-wsl-port-forward.ps1 配置端口转发" -ForegroundColor Yellow
}

if ($portForward3001) {
    Write-Host "✅ 端口3001转发已配置" -ForegroundColor Green
    Write-Host "   可以使用 http://localhost:3001 访问" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  端口3001转发未配置" -ForegroundColor Yellow
    Write-Host "   运行 .\setup-wsl-port-forward.ps1 配置端口转发" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📋 访问地址总结" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "使用WSL2 IP地址（推荐，无需配置）：" -ForegroundColor Yellow
Write-Host "  前端: http://$wslIp:3000" -ForegroundColor Green
Write-Host "  后端: http://$wslIp:3001" -ForegroundColor Green
Write-Host "  API文档: http://$wslIp:3001/api/docs" -ForegroundColor Green
Write-Host ""

if ($portForward3000 -or $portForward3001) {
    Write-Host "使用localhost（如果已配置端口转发）：" -ForegroundColor Yellow
    if ($portForward3000) {
        Write-Host "  前端: http://localhost:3000" -ForegroundColor Green
    }
    if ($portForward3001) {
        Write-Host "  后端: http://localhost:3001" -ForegroundColor Green
        Write-Host "  API文档: http://localhost:3001/api/docs" -ForegroundColor Green
    }
    Write-Host ""
}

Write-Host "💡 提示：" -ForegroundColor Cyan
Write-Host "  - 如果无法访问，检查Windows防火墙设置" -ForegroundColor Yellow
Write-Host "  - 如果返回503，服务可能还在启动，等待30-60秒后重试" -ForegroundColor Yellow
Write-Host "  - WSL重启后IP可能变化，重新运行此脚本获取新IP" -ForegroundColor Yellow
Write-Host ""

