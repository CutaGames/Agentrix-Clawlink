@echo off
chcp 65001 >nul
echo ========================================
echo 🚀 PayMind 服务启动
echo ========================================
echo.

REM 自动查找项目根目录
set "CURRENT_DIR=%~dp0"
set "PROJECT_ROOT=%CURRENT_DIR%"

REM 向上查找包含 backend 和 paymindfrontend 的目录
:find_root
if exist "%PROJECT_ROOT%backend" if exist "%PROJECT_ROOT%paymindfrontend" goto found_root
set "PARENT=%PROJECT_ROOT%..\"
if "%PARENT%"=="%PROJECT_ROOT%" goto not_found
set "PROJECT_ROOT=%PARENT%"
goto find_root

:found_root
cd /d "%PROJECT_ROOT%"
echo ✅ 项目根目录: %PROJECT_ROOT%
echo.

REM 检查脚本文件
if exist "start.ps1" (
    echo ✅ 找到启动脚本
    echo.
    echo 正在启动服务...
    echo.
    powershell -ExecutionPolicy Bypass -File "start.ps1"
    goto end
)

if exist "启动服务.ps1" (
    echo ✅ 找到启动脚本
    echo.
    echo 正在启动服务...
    echo.
    powershell -ExecutionPolicy Bypass -File "启动服务.ps1"
    goto end
)

echo ❌ 找不到启动脚本
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

