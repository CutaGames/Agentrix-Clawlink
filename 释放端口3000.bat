@echo off
echo ==========================================
echo 释放端口3000
echo ==========================================
echo.

echo [1/3] 查找占用3000端口的进程...
wsl bash -c "lsof -ti:3000" > temp_pid.txt 2>nul
set /p PID=<temp_pid.txt
del temp_pid.txt 2>nul

if "%PID%"=="" (
    echo 端口3000未被占用
    goto :end
)

echo 找到进程: %PID%

echo [2/3] 进程信息:
wsl bash -c "ps -p %PID% -o pid,cmd 2>/dev/null || echo 无法获取进程信息"

echo [3/3] 杀死进程...
wsl bash -c "kill -9 %PID% 2>/dev/null"

timeout /t 2 /nobreak >nul

echo [验证] 检查端口状态...
wsl bash -c "lsof -ti:3000 >/dev/null 2>&1 && echo 端口仍被占用 || echo 端口已释放"

:end
echo.
echo 现在可以启动前端服务了:
echo   cd agentrixfrontend
echo   npm run dev
echo.

