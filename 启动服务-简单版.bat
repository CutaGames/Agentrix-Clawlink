@echo off
chcp 65001 >nul
echo 🚀 PayMind 服务启动助手
echo.

echo 正在启动所有服务...
echo.

echo [1/3] 启动后端服务 (端口 3001)...
start "PayMind Backend" cmd /k "cd backend && npm run start:dev"

timeout /t 5 /nobreak >nul

echo [2/3] 启动前端服务 (端口 3000)...
start "PayMind Frontend" cmd /k "cd paymindfrontend && npm run dev"

timeout /t 5 /nobreak >nul

echo [3/3] 启动SDK文档服务器 (端口 8080)...
start "PayMind SDK Docs" cmd /k "cd sdk-js\docs && npx http-server -p 8080"

echo.
echo ✅ 所有服务已启动！
echo.
echo 📊 访问地址:
echo    🌐 前端应用:    http://localhost:3000
echo    🔧 后端API:     http://localhost:3001/api
echo    📖 API文档:     http://localhost:3001/api/docs
echo    📚 SDK文档:     http://localhost:8080
echo.
echo 💡 提示: 打开 本地服务导航.html 可以快速访问所有服务
echo.
echo 按任意键退出...
pause >nul

