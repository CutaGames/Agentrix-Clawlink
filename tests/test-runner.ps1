# Agentrix Workbench Test Runner (PowerShell)

Write-Host "======================================"
Write-Host "Agentrix Workbench Test Runner"
Write-Host "======================================"
Write-Host ""

$WSL_ROOT = "/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website"

# Test backend health
Write-Host "[1/3] Testing backend health..."
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get -TimeoutSec 5
    Write-Host "SUCCESS: Backend is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Backend is not running" -ForegroundColor Red
    Write-Host "Please start backend in WSL:" -ForegroundColor Yellow
    Write-Host "  wsl -d Ubuntu-24.04" -ForegroundColor Cyan
    Write-Host "  cd $WSL_ROOT/backend" -ForegroundColor Cyan
    Write-Host "  npm run start:dev" -ForegroundColor Cyan
    exit 1
}

# Run persona verification
Write-Host ""
Write-Host "[2/3] Running persona flow verification..."
wsl -d Ubuntu-24.04 bash -c "cd $WSL_ROOT; bash tests/verify-persona-flows.sh"

# Instructions for manual testing
Write-Host ""
Write-Host "[3/3] Manual testing steps:"
Write-Host "1. Start frontend (new terminal):" -ForegroundColor Yellow
Write-Host "   wsl -d Ubuntu-24.04" -ForegroundColor Cyan
Write-Host "   cd $WSL_ROOT/frontend" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Run E2E tests:" -ForegroundColor Yellow
Write-Host "   npx playwright test tests/e2e/workbench-restructuring.spec.ts" -ForegroundColor Cyan
Write-Host ""
