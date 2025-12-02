@echo off
chcp 65001 >nul
echo ========================================
echo 🚀 Agentrix 一键安装并启动
echo ========================================
echo.

echo 正在检查环境...
echo.

REM 检查是否在项目根目录
if not exist "backend" (
    echo ❌ 错误: 请在项目根目录中运行此脚本
    echo.
    pause
    exit /b 1
)

echo ✅ 项目目录正确
echo.

REM 检查 WSL
where wsl >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: WSL 未安装或未启用
    echo.
    echo 请先安装 WSL:
    echo   wsl --install
    echo.
    pause
    exit /b 1
)

echo ✅ WSL 可用
echo.

echo ========================================
echo 步骤 1: 安装依赖
echo ========================================
echo.

powershell -ExecutionPolicy Bypass -File "安装依赖.ps1"

if %errorlevel% neq 0 (
    echo.
    echo ❌ 依赖安装失败
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo 步骤 2: 启动服务
echo ========================================
echo.

set /p start=依赖安装完成，是否立即启动服务? (y/n): 

if /i "%start%"=="y" (
    echo.
    echo 正在启动服务...
    echo.
    powershell -ExecutionPolicy Bypass -File "启动服务.ps1"
) else (
    echo.
    echo 您可以稍后运行以下命令启动服务:
    echo   .\启动服务.ps1
    echo   或
    echo   wsl bash WSL启动服务.sh
    echo.
)

pause

