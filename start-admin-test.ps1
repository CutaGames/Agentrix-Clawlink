# Agentrix 后台管理系统快速启动和测试脚本
# Windows PowerShell版本

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Agentrix 后台管理系统启动和测试" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查服务是否运行
Write-Host "🔍 检查服务状态..." -ForegroundColor Yellow

$backendRunning = $false
$adminRunning = $false
$frontendRunning = $false

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $backendRunning = $true
        Write-Host "✅ 主API服务 (3001) 正在运行" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ 主API服务 (3001) 未运行" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3002/api/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $adminRunning = $true
        Write-Host "✅ 后台管理服务 (3002) 正在运行" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ 后台管理服务 (3002) 未运行" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $frontendRunning = $true
        Write-Host "✅ 前端服务 (3000) 正在运行" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ 前端服务 (3000) 未运行" -ForegroundColor Red
}

Write-Host ""

# 如果服务未运行，提示启动
if (-not $backendRunning) {
    Write-Host "💡 提示: 请启动主API服务" -ForegroundColor Yellow
    Write-Host "   cd backend && npm run start:dev" -ForegroundColor Gray
}

if (-not $adminRunning) {
    Write-Host "💡 提示: 请启动后台管理服务" -ForegroundColor Yellow
    Write-Host "   cd backend && npm run start:admin:dev" -ForegroundColor Gray
}

if (-not $frontendRunning) {
    Write-Host "💡 提示: 请启动前端服务" -ForegroundColor Yellow
    Write-Host "   cd agentrixfrontend && npm run dev" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📚 访问地址" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 官网前端: http://localhost:3000" -ForegroundColor Green
Write-Host "🔧 管理后台: http://localhost:3000/admin" -ForegroundColor Green
Write-Host "📖 API文档 (主): http://localhost:3001/api/docs" -ForegroundColor Green
Write-Host "📖 API文档 (后台): http://localhost:3002/api/docs" -ForegroundColor Green
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🧪 运行API测试" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$runTest = Read-Host "是否运行API测试? (y/n)"
if ($runTest -eq "y" -or $runTest -eq "Y") {
    if ($adminRunning) {
        Write-Host "运行API测试..." -ForegroundColor Yellow
        cd backend
        .\test-admin-api.ps1
    } else {
        Write-Host "❌ 后台管理服务未运行，无法测试" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ 完成！" -ForegroundColor Green

