@echo off
chcp 65001 >nul
echo ========================================
echo 🚀 Agentrix 快速开始
echo ========================================
echo.

REM 自动查找项目根目录
set "CURRENT_DIR=%~dp0"
set "PROJECT_ROOT=%CURRENT_DIR%"

REM 向上查找包含 backend 和 agentrixfrontend 的目录
:find_root
if exist "%PROJECT_ROOT%backend" if exist "%PROJECT_ROOT%agentrixfrontend" goto found_root
set "PARENT=%PROJECT_ROOT%..\"
if "%PARENT%"=="%PROJECT_ROOT%" goto not_found
set "PROJECT_ROOT=%PARENT%"
goto find_root

:found_root
cd /d "%PROJECT_ROOT%"
echo ✅ 项目根目录: %PROJECT_ROOT%
echo.

echo 请选择操作:
echo [1] 安装依赖
echo [2] 启动服务
echo [3] 安装依赖并启动服务
echo [0] 退出
echo.

set /p choice=请输入选项 (0-3): 

if "%choice%"=="1" goto install
if "%choice%"=="2" goto start
if "%choice%"=="3" goto install_and_start
if "%choice%"=="0" goto end
goto invalid

:install
echo.
echo ========================================
echo 安装依赖
echo ========================================
echo.
if exist "install.ps1" (
    powershell -ExecutionPolicy Bypass -File "install.ps1"
) else if exist "安装依赖.ps1" (
    powershell -ExecutionPolicy Bypass -File "安装依赖.ps1"
) else (
    echo ❌ 找不到安装脚本
)
goto end

:start
echo.
echo ========================================
echo 启动服务
echo ========================================
echo.
if exist "start.ps1" (
    powershell -ExecutionPolicy Bypass -File "start.ps1"
) else if exist "启动服务.ps1" (
    powershell -ExecutionPolicy Bypass -File "启动服务.ps1"
) else (
    echo ❌ 找不到启动脚本
)
goto end

:install_and_start
echo.
echo ========================================
echo 安装依赖
echo ========================================
echo.
if exist "install.ps1" (
    powershell -ExecutionPolicy Bypass -File "install.ps1"
) else if exist "安装依赖.ps1" (
    powershell -ExecutionPolicy Bypass -File "安装依赖.ps1"
) else (
    echo ❌ 找不到安装脚本
    goto end
)

echo.
set /p start=依赖安装完成，是否立即启动服务? (y/n): 
if /i "%start%"=="y" (
    echo.
    echo ========================================
    echo 启动服务
    echo ========================================
    echo.
    if exist "start.ps1" (
        powershell -ExecutionPolicy Bypass -File "start.ps1"
    ) else if exist "启动服务.ps1" (
        powershell -ExecutionPolicy Bypass -File "启动服务.ps1"
    )
)
goto end

:invalid
echo.
echo ❌ 无效选项
echo.
goto end

:not_found
echo ❌ 无法找到项目根目录
echo    当前目录: %CURRENT_DIR%
echo.
echo 请确保您在项目目录中运行此脚本
echo.

:end
pause

