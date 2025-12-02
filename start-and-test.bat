@echo off
chcp 65001 >nul
echo ==========================================
echo PayMind Agent V3.0 启动和测试脚本
echo ==========================================
echo.

REM 检查Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

echo [1/5] 检查环境...
node --version
npm --version
echo.

echo [2/5] 运行数据库迁移...
cd backend
if exist node_modules (
    echo 依赖已安装
) else (
    echo 安装依赖...
    call npm install
)

echo 运行迁移...
call npm run migration:run
if %errorlevel% neq 0 (
    echo [警告] 迁移可能失败，请检查数据库连接
    echo 继续启动服务...
)
echo.

echo [3/5] 启动后端服务...
echo 后端服务将在 http://localhost:3001 启动
echo API文档: http://localhost:3001/api/docs
echo.
start "PayMind Backend" cmd /k "npm run start:dev"
timeout /t 5 /nobreak >nul
echo.

echo [4/5] 启动前端服务...
cd ..\paymindfrontend
if exist node_modules (
    echo 依赖已安装
) else (
    echo 安装依赖...
    call npm install
)

echo 前端服务将在 http://localhost:3000 启动
echo.
start "PayMind Frontend" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul
echo.

echo [5/5] 打开浏览器...
timeout /t 2 /nobreak >nul
start http://localhost:3000/agent
start http://localhost:3001/api/docs
echo.

echo ==========================================
echo 启动完成！
echo ==========================================
echo.
echo 后端服务: http://localhost:3001
echo 前端服务: http://localhost:3000
echo API文档: http://localhost:3001/api/docs
echo.
echo 按任意键退出...
pause >nul

