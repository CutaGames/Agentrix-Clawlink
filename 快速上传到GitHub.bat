@echo off
chcp 65001 >nul
echo ========================================
echo    PayMind 项目上传到 GitHub
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] 检查 Git 状态...
git status
echo.

echo [2/5] 添加所有文件...
git add .
echo.

echo [3/5] 提交到本地仓库...
set /p commit_msg="请输入提交信息 (直接回车使用默认): "
if "%commit_msg%"=="" set commit_msg=Update: %date% %time%
git commit -m "%commit_msg%"
echo.

echo [4/5] 检查远程仓库...
git remote -v
echo.

echo 如果还没有关联远程仓库，请执行以下命令：
echo git remote add origin https://github.com/你的用户名/paymind-website.git
echo.

set /p push_confirm="是否立即推送到 GitHub? (Y/N): "
if /i "%push_confirm%"=="Y" (
    echo [5/5] 推送到 GitHub...
    git push -u origin main
    echo.
    echo ✅ 上传完成！
) else (
    echo ⚠️ 跳过推送，请手动执行: git push -u origin main
)

echo.
pause
