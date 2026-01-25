# Agentrix 服务测试脚本

Write-Host "=========================================="
Write-Host "  Agentrix 服务状态检查"
Write-Host "=========================================="
Write-Host ""

# 测试后端
Write-Host "1. 测试后端服务 (http://localhost:3001)..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 5 -UseBasicParsing
    Write-Host "   ✅ 后端服务正常运行" -ForegroundColor Green
    Write-Host "   响应: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ 后端服务未响应" -ForegroundColor Red
    Write-Host "   错误: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# 测试前端
Write-Host "2. 测试前端服务 (http://localhost:3000)..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
    Write-Host "   ✅ 前端服务正常运行" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 前端服务未响应" -ForegroundColor Red
    Write-Host "   错误: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================="
Write-Host ""
Write-Host "💡 启动服务步骤：" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 打开 WSL 终端启动后端：" -ForegroundColor Cyan
Write-Host "   wsl -d Ubuntu-24.04" -ForegroundColor White
Write-Host "   cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend" -ForegroundColor White
Write-Host "   npm run start:dev" -ForegroundColor White
Write-Host ""
Write-Host "2. 打开另一个 WSL 终端启动前端：" -ForegroundColor Cyan
Write-Host "   wsl -d Ubuntu-24.04" -ForegroundColor White
Write-Host "   cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
