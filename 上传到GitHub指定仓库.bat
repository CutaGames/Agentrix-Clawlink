@echo off
chcp 65001 >nul
echo ========================================
echo    上传 Agentrix 到 GitHub 仓库
echo    仓库: https://github.com/CutaGames/Agentrix
echo ========================================
echo.

cd /d "%~dp0"

echo [步骤 1/6] 检查 Git 配置...
git config user.name
git config user.email
echo.

echo [步骤 2/6] 检查远程仓库...
git remote -v
echo.

REM 检查是否已经添加了远程仓库
git remote | findstr "origin" >nul
if %errorlevel% neq 0 (
    echo 添加远程仓库: https://github.com/CutaGames/Agentrix.git
    git remote add origin https://github.com/CutaGames/Agentrix.git
) else (
    echo 远程仓库已存在，更新地址...
    git remote set-url origin https://github.com/CutaGames/Agentrix.git
)
echo.

echo [步骤 3/6] 拉取远程代码（如果有）...
git pull origin main --allow-unrelated-histories
echo.

echo [步骤 4/6] 查看将要上传的文件...
echo ----------------------------------------
git status
echo ----------------------------------------
echo.

echo ⚠️ 请确认以下文件已被忽略:
echo   - *.md 文件（文档）
echo   - *.log 文件（日志）
echo   - .env 文件（环境变量）
echo.

set /p confirm="确认以上文件正确？继续上传？(Y/N): "
if /i not "%confirm%"=="Y" (
    echo ❌ 取消上传
    pause
    exit /b
)

echo.
echo [步骤 5/6] 添加并提交文件...
git add .
set /p commit_msg="请输入提交信息 (直接回车使用默认): "
if "%commit_msg%"=="" set commit_msg=Update: Agentrix project %date% %time%
git commit -m "%commit_msg%"
echo.

echo [步骤 6/6] 推送到 GitHub...
git push -u origin main
echo.

if %errorlevel% equ 0 (
    echo ✅ 上传成功！
    echo 仓库地址: https://github.com/CutaGames/Agentrix
) else (
    echo ❌ 上传失败，请检查网络或权限
)

echo.
pause
