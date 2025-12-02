# PayMind 后端服务启动脚本

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 启动 PayMind 后端服务" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在项目根目录
if (-not (Test-Path "backend")) {
    Write-Host "❌ 错误: 未找到backend目录" -ForegroundColor Red
    Write-Host "   请在项目根目录运行此脚本" -ForegroundColor Yellow
    exit 1
}

# 检查Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 错误: 未找到Node.js" -ForegroundColor Red
    Write-Host "   请先安装Node.js (v18+)" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Node.js 版本: $(node --version)" -ForegroundColor Green
Write-Host ""

# 检查依赖
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "📥 安装后端依赖..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
    Write-Host ""
}

# 检查环境变量
if (-not (Test-Path "backend\.env")) {
    Write-Host "⚠️  警告: backend\.env 不存在" -ForegroundColor Yellow
    Write-Host "   请从 .env.example 复制并配置" -ForegroundColor Yellow
    Write-Host ""
}

# 创建日志目录
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# 启动服务
Write-Host "🔧 启动后端服务..." -ForegroundColor Yellow
Write-Host "   服务将在 http://localhost:3001 启动" -ForegroundColor Gray
Write-Host "   API文档: http://localhost:3001/api/docs" -ForegroundColor Gray
Write-Host ""

Set-Location backend

# 启动服务并输出到日志
$logFile = "..\logs\backend.log"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run start:dev | Tee-Object -FilePath '$logFile'"

Set-Location ..

Write-Host "✅ 后端服务已启动" -ForegroundColor Green
Write-Host ""
Write-Host "📋 查看日志:" -ForegroundColor Yellow
Write-Host "   Get-Content logs\backend.log -Tail 50 -Wait" -ForegroundColor Gray
Write-Host ""
Write-Host "🛑 停止服务: 关闭新打开的PowerShell窗口" -ForegroundColor Yellow
Write-Host ""

# 等待几秒后测试连接
Start-Sleep -Seconds 5

Write-Host "🔍 测试服务连接..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ 服务运行正常！" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 访问地址:" -ForegroundColor Cyan
    Write-Host "   🌐 API:        http://localhost:3001/api" -ForegroundColor White
    Write-Host "   📖 API文档:    http://localhost:3001/api/docs" -ForegroundColor White
    Write-Host "   ❤️  健康检查:  http://localhost:3001/api/health" -ForegroundColor White
} catch {
    Write-Host "⚠️  服务可能还在启动中，请稍候..." -ForegroundColor Yellow
    Write-Host "   查看日志了解详情: Get-Content logs\backend.log -Tail 50" -ForegroundColor Gray
}

Write-Host ""

