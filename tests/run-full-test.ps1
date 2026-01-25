# Agentrix Workbench 完整测试流程 (PowerShell版本)
# 适用于 Windows + WSL 环境

Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Agentrix Workbench 完整测试流程 (Windows)          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ROOT_DIR = "D:\wsl\Ubuntu-24.04\Code\Agentrix\Agentrix-website"
$WSL_ROOT = "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website"

# 步骤 1: 启动 WSL 后端服务
Write-Host "[步骤 1/4] 启动后端服务..." -ForegroundColor Blue
Write-Host "在新的 PowerShell 窗口中执行以下命令:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  wsl -d Ubuntu-24.04" -ForegroundColor Green
Write-Host "  cd $WSL_ROOT/backend" -ForegroundColor Green
Write-Host "  npm run start:dev" -ForegroundColor Green
Write-Host ""
Write-Host "按任意键继续（等待后端启动约15秒后）..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# 步骤 2: 测试后端健康
Write-Host ""
Write-Host "[步骤 2/4] 测试后端健康..." -ForegroundColor Blue
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get -TimeoutSec 5
    Write-Host "✓ 后端服务正常运行" -ForegroundColor Green
    Write-Host "  状态: $($health.status)" -ForegroundColor Gray
} catch {
    Write-Host "✗ 后端服务未启动或无响应" -ForegroundColor Red
    Write-Host "  请确保后端服务已在 WSL 中启动" -ForegroundColor Yellow
    exit 1
}

# 步骤 3: 运行五类画像验证
Write-Host ""
Write-Host "[步骤 3/4] 运行五类画像验证..." -ForegroundColor Blue
wsl -d Ubuntu-24.04 bash -c "cd $WSL_ROOT && bash tests/verify-persona-flows.sh"
$verifyResult = $LASTEXITCODE

if ($verifyResult -eq 0) {
    Write-Host "✓ 五类画像验证全部通过" -ForegroundColor Green
} else {
    Write-Host "⚠ 五类画像验证部分失败" -ForegroundColor Yellow
}

# 步骤 4: 启动前端服务
Write-Host ""
Write-Host "[步骤 4/4] 启动前端服务..." -ForegroundColor Blue
Write-Host "在新的 PowerShell 窗口中执行以下命令:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  wsl -d Ubuntu-24.04" -ForegroundColor Green
Write-Host "  cd $WSL_ROOT/frontend" -ForegroundColor Green
Write-Host "  npm run dev" -ForegroundColor Green
Write-Host ""
Write-Host "前端将在 http://localhost:3000 启动" -ForegroundColor Cyan
Write-Host ""

# 总结
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                   测试指南                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "服务状态:" -ForegroundColor White
Write-Host "  • 后端: http://localhost:3001 (在 WSL 运行)" -ForegroundColor Gray
Write-Host "  • 前端: http://localhost:3000 (需手动启动)" -ForegroundColor Gray
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor White
Write-Host "  1. 访问 http://localhost:3000/workbench 测试UI" -ForegroundColor Gray
Write-Host "  2. 运行 E2E 测试:" -ForegroundColor Gray
Write-Host "     cd $ROOT_DIR" -ForegroundColor Green
Write-Host "     npx playwright test tests/e2e/workbench-restructuring.spec.ts" -ForegroundColor Green
Write-Host ""
Write-Host "查看详细日志:" -ForegroundColor White
Write-Host "  • 后端: wsl tail -f $WSL_ROOT/backend/backend.log" -ForegroundColor Gray
Write-Host "  • 前端: wsl tail -f $WSL_ROOT/frontend/frontend.log" -ForegroundColor Gray
Write-Host ""
