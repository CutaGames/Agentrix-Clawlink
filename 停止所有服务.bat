@echo off
chcp 65001 >nul
echo ==========================================
echo 🛑 停止 PayMind 所有服务
echo ==========================================
echo.

REM 停止Node.js进程
echo 正在停止服务...

REM 停止后端
taskkill /FI "WINDOWTITLE eq PayMind Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq PayMind Backend V3.0*" /T /F >nul 2>&1

REM 停止前端
taskkill /FI "WINDOWTITLE eq PayMind Frontend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq PayMind Frontend V3.0*" /T /F >nul 2>&1

REM 停止SDK文档
taskkill /FI "WINDOWTITLE eq PayMind SDK Docs*" /T /F >nul 2>&1

REM 通过端口停止
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080') do taskkill /PID %%a /F >nul 2>&1

echo ✅ 所有服务已停止
echo.
pause

