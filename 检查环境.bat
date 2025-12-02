@echo off
chcp 65001 >nul
echo ========================================
echo Agentrix 环境检查工具
echo ========================================
echo.

echo [1] 检查 Node.js...
where node >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Node.js 已安装
    node --version
    npm --version
) else (
    echo ❌ Node.js 未安装或未添加到 PATH
    echo.
    echo 解决方案：
    echo 1. 下载安装 Node.js: https://nodejs.org/
    echo 2. 安装时选择 "Add to PATH" 选项
    echo 3. 安装后重启终端
)
echo.

echo [2] 检查项目目录...
if exist "backend" (
    echo ✅ backend 目录存在
) else (
    echo ❌ backend 目录不存在
)
if exist "agentrixfrontend" (
    echo ✅ agentrixfrontend 目录存在
) else (
    echo ❌ agentrixfrontend 目录不存在
)
if exist "sdk-js" (
    echo ✅ sdk-js 目录存在
) else (
    echo ❌ sdk-js 目录不存在
)
echo.

echo [3] 检查依赖...
if exist "backend\node_modules" (
    echo ✅ 后端依赖已安装
) else (
    echo ⚠️  后端依赖未安装，运行: cd backend ^&^& npm install
)
if exist "agentrixfrontend\node_modules" (
    echo ✅ 前端依赖已安装
) else (
    echo ⚠️  前端依赖未安装，运行: cd agentrixfrontend ^&^& npm install
)
echo.

echo [4] 检查环境变量文件...
if exist "backend\.env" (
    echo ✅ 后端环境变量文件存在
) else (
    echo ⚠️  后端环境变量文件不存在，运行: copy backend\.env.example backend\.env
)
if exist "agentrixfrontend\.env.local" (
    echo ✅ 前端环境变量文件存在
) else (
    echo ⚠️  前端环境变量文件不存在，运行: copy agentrixfrontend\.env.local.example agentrixfrontend\.env.local
)
echo.

echo ========================================
echo 检查完成！
echo ========================================
pause

