@echo off
chcp 65001 >nul
echo ==========================================
echo 🚀 Agentrix Agent V3.0 完整服务启动
echo ==========================================
echo.

REM 检查Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到Node.js，请先安装Node.js (v18+)
    pause
    exit /b 1
)

echo ✅ Node.js 版本:
node --version
echo.

REM 检查依赖
echo [1/5] 检查依赖...
if not exist "backend\node_modules" (
    echo 📥 安装后端依赖...
    cd backend
    call npm install
    cd ..
)

if not exist "agentrixfrontend\node_modules" (
    echo 📥 安装前端依赖...
    cd agentrixfrontend
    call npm install
    cd ..
)
echo ✅ 依赖检查完成
echo.

REM 检查环境变量
echo [2/5] 检查环境变量...
if not exist "backend\.env" (
    echo ⚠️  警告: backend\.env 不存在
    echo    请从 .env.example 复制并配置
)
if not exist "agentrixfrontend\.env.local" (
    echo ⚠️  警告: agentrixfrontend\.env.local 不存在
    echo    请从 .env.local.example 复制
)
echo.

REM 运行数据库迁移
echo [3/5] 运行数据库迁移...
cd backend
call npm run migration:run
if %errorlevel% neq 0 (
    echo ⚠️  警告: 迁移可能失败，请检查数据库连接
    echo    继续启动服务...
)
cd ..
echo.

REM 启动后端服务
echo [4/5] 启动后端服务 (端口 3001)...
echo    后端将在 http://localhost:3001 启动
echo    API文档: http://localhost:3001/api/docs
echo.
start "Agentrix Backend V3.0" cmd /k "cd backend && npm run start:dev"
timeout /t 5 /nobreak >nul
echo.

REM 启动前端服务
echo [5/5] 启动前端服务 (端口 3000)...
echo    前端将在 http://localhost:3000 启动
echo    Agent页面: http://localhost:3000/agent
echo.
start "Agentrix Frontend V3.0" cmd /k "cd agentrixfrontend && npm run dev"
timeout /t 3 /nobreak >nul
echo.

REM 启动SDK文档（可选）
echo [可选] 启动SDK文档服务器 (端口 8080)...
if exist "sdk-js\docs" (
    start "Agentrix SDK Docs" cmd /k "cd sdk-js\docs && npx http-server -p 8080 --cors"
    timeout /t 2 /nobreak >nul
) else (
    echo    ⚠️  SDK文档目录不存在，跳过
)
echo.

REM 打开浏览器
echo ==========================================
echo ✅ 所有服务已启动！
echo ==========================================
echo.
echo 📊 访问地址:
echo    🌐 前端应用:    http://localhost:3000
echo    🤖 Agent页面:   http://localhost:3000/agent
echo    🔧 后端API:     http://localhost:3001/api
echo    📖 API文档:     http://localhost:3001/api/docs
echo    📚 SDK文档:     http://localhost:8080
echo.
echo 💡 提示:
echo    - 等待5-10秒让服务完全启动
echo    - 如果端口被占用，请先关闭占用端口的程序
echo    - 查看各终端窗口的日志输出
echo.

timeout /t 3 /nobreak >nul

REM 打开浏览器
start http://localhost:3000/agent
start http://localhost:3001/api/docs

echo 浏览器已自动打开
echo.
echo 按任意键退出...
pause >nul

