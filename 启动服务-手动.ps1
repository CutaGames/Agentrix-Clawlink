# PayMind 手动启动服务脚本 (Windows PowerShell)
# 如果自动启动脚本有问题，可以使用这个脚本

Write-Host "🚀 PayMind 服务启动助手" -ForegroundColor Green
Write-Host ""

# 保存当前目录
$rootDir = $PWD

Write-Host "请选择要启动的服务：" -ForegroundColor Yellow
Write-Host "1. 后端服务 (端口 3001)"
Write-Host "2. 前端服务 (端口 3000)"
Write-Host "3. SDK文档服务器 (端口 8080)"
Write-Host "4. 启动所有服务"
Write-Host "0. 退出"
Write-Host ""

$choice = Read-Host "请输入选项 (0-4)"

switch ($choice) {
    "1" {
        Write-Host "🔧 启动后端服务..." -ForegroundColor Cyan
        Set-Location "$rootDir\backend"
        npm run start:dev
    }
    "2" {
        Write-Host "🎨 启动前端服务..." -ForegroundColor Cyan
        Set-Location "$rootDir\paymindfrontend"
        npm run dev
    }
    "3" {
        Write-Host "📚 启动SDK文档服务器..." -ForegroundColor Cyan
        Set-Location "$rootDir\sdk-js\docs"
        npx http-server -p 8080
    }
    "4" {
        Write-Host "🚀 启动所有服务..." -ForegroundColor Green
        
        # 启动后端
        Write-Host "启动后端服务..." -ForegroundColor Cyan
        $backendScript = "cd '$rootDir\backend'; npm run start:dev"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript
        
        Start-Sleep -Seconds 3
        
        # 启动前端
        Write-Host "启动前端服务..." -ForegroundColor Cyan
        $frontendScript = "cd '$rootDir\paymindfrontend'; npm run dev"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript
        
        Start-Sleep -Seconds 3
        
        # 启动SDK文档
        Write-Host "启动SDK文档服务器..." -ForegroundColor Cyan
        $sdkScript = "cd '$rootDir\sdk-js\docs'; npx http-server -p 8080"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $sdkScript
        
        Write-Host ""
        Write-Host "✅ 所有服务已启动！" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 访问地址:" -ForegroundColor Yellow
        Write-Host "   🌐 前端应用:    http://localhost:3000"
        Write-Host "   🔧 后端API:     http://localhost:3001/api"
        Write-Host "   📖 API文档:     http://localhost:3001/api/docs"
        Write-Host "   📚 SDK文档:     http://localhost:8080"
        Write-Host ""
    }
    "0" {
        Write-Host "退出" -ForegroundColor Yellow
        exit
    }
    default {
        Write-Host "❌ 无效选项" -ForegroundColor Red
    }
}

Set-Location $rootDir

