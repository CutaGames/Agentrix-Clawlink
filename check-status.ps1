Write-Host "==========================================  " -ForegroundColor Cyan
Write-Host "  Agentrix 服务状态检查" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. 测试后端服务 (http://localhost:3001)..." -ForegroundColor Yellow
try {
    $backend = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ 后端服务正常运行" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 后端服务未响应 - 需要启动" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. 测试前端服务 (http://localhost:3000)..." -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ 前端服务正常运行" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 前端服务未响应 - 需要启动" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "💡 如需启动服务，请执行：" -ForegroundColor Yellow
Write-Host ""
Write-Host "后端：wsl -d Ubuntu-24.04 bash -c 'cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend && npm run start:dev'" -ForegroundColor White
Write-Host ""
Write-Host "前端：wsl -d Ubuntu-24.04 bash -c 'cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend && npm run dev'" -ForegroundColor White
Write-Host ""
