# PayMind 完整服务启动脚本 (Windows PowerShell)
# 启动前端、后端、SDK文档服务器

Write-Host "🚀 启动 PayMind 所有服务..." -ForegroundColor Green
Write-Host ""

# 检查Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 错误: 未找到 Node.js，请先安装 Node.js (v18+)" -ForegroundColor Red
    exit 1
}

$nodeVersion = node -v
Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green

# 检查依赖
Write-Host ""
Write-Host "📦 检查依赖..." -ForegroundColor Yellow

if (-not (Test-Path "backend\node_modules")) {
    Write-Host "📥 安装后端依赖..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

if (-not (Test-Path "paymindfrontend\node_modules")) {
    Write-Host "📥 安装前端依赖..." -ForegroundColor Yellow
    Set-Location paymindfrontend
    npm install
    Set-Location ..
}

# 检查环境变量
if (-not (Test-Path "backend\.env")) {
    Write-Host "⚠️  警告: backend\.env 不存在" -ForegroundColor Yellow
    Write-Host "   运行: cd backend && copy .env.example .env" -ForegroundColor Yellow
}

if (-not (Test-Path "paymindfrontend\.env.local")) {
    Write-Host "⚠️  警告: paymindfrontend\.env.local 不存在" -ForegroundColor Yellow
    Write-Host "   运行: cd paymindfrontend && copy .env.local.example .env.local" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 启动服务..." -ForegroundColor Green
Write-Host ""

# 创建日志目录
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# 启动后端
Write-Host "🔧 启动后端服务 (http://localhost:3001)..." -ForegroundColor Cyan
$backendScript = "cd '$PWD\backend'; npm run start:dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript -WindowStyle Normal

# 等待后端启动
Write-Host "等待后端启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# 启动前端
Write-Host "🎨 启动前端服务 (http://localhost:3000)..." -ForegroundColor Cyan
$frontendScript = "cd '$PWD\paymindfrontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript -WindowStyle Normal

# 启动SDK文档服务器
Write-Host "📚 启动SDK文档服务器 (http://localhost:8080)..." -ForegroundColor Cyan
$sdkScript = "cd '$PWD\sdk-js\docs'; npx http-server -p 8080"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $sdkScript -WindowStyle Normal

Write-Host ""
Write-Host "✅ 所有服务已启动！" -ForegroundColor Green
Write-Host ""
Write-Host "📊 访问地址:" -ForegroundColor Yellow
Write-Host "   🌐 前端应用:    http://localhost:3000" -ForegroundColor White
Write-Host "   🔧 后端API:     http://localhost:3001/api" -ForegroundColor White
Write-Host "   📖 API文档:     http://localhost:3001/api/docs" -ForegroundColor White
Write-Host "   📚 SDK文档:     http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "💡 提示: 打开 本地服务导航.html 可以快速访问所有服务" -ForegroundColor Cyan
Write-Host ""
Write-Host "🛑 停止服务: 关闭对应的PowerShell窗口" -ForegroundColor Yellow

