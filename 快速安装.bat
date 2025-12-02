@echo off
chcp 65001 >nul
echo ========================================
echo 🚀 PayMind 快速安装工具
echo ========================================
echo.

echo 检测到您在 Windows 环境中
echo.
echo 请选择安装方式:
echo.
echo [1] 在 WSL 中安装（推荐，自动安装所有依赖）
echo [2] 在 Windows 中安装（需要手动安装 PostgreSQL）
echo [0] 退出
echo.

set /p choice=请输入选项 (0-2): 

if "%choice%"=="1" goto wsl_install
if "%choice%"=="2" goto windows_install
if "%choice%"=="0" goto end
goto invalid

:wsl_install
echo.
echo ========================================
echo 在 WSL 中安装
echo ========================================
echo.
echo 正在打开 WSL 终端...
echo.
echo 请在 WSL 终端中运行以下命令:
echo.
echo   cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/paymind-website
echo   chmod +x 安装依赖-WSL.sh
echo   ./安装依赖-WSL.sh
echo.
echo 或者直接运行:
echo   bash 安装依赖-WSL.sh
echo.
pause
goto end

:windows_install
echo.
echo ========================================
echo 在 Windows 中安装
echo ========================================
echo.
echo 正在运行 Windows 安装脚本...
echo.

powershell -ExecutionPolicy Bypass -File "安装依赖-Windows.ps1"

if %errorlevel% neq 0 (
    echo.
    echo ❌ 安装过程中出现错误
    echo.
    echo 请检查:
    echo 1. Node.js 是否已安装
    echo 2. 是否有足够的权限
    echo 3. 网络连接是否正常
    echo.
    pause
    goto end
)

echo.
echo ✅ 安装完成！
echo.
pause
goto end

:invalid
echo.
echo ❌ 无效选项
echo.
pause
goto end

:end
exit

