@echo off
chcp 65001 >nul
echo ========================================
echo    配置 Git 用户信息
echo ========================================
echo.
echo 这是首次使用 Git 必须的配置
echo.

set /p git_name="请输入你的名字 (例如: Zhang San): "
set /p git_email="请输入你的邮箱 (例如: zhangsan@example.com): "

echo.
echo 正在配置...

git config --global user.name "%git_name%"
git config --global user.email "%git_email%"

echo.
echo ✅ Git 用户信息配置完成！
echo.
echo 当前配置:
git config --global user.name
git config --global user.email
echo.
echo 下一步: 运行 "快速上传到GitHub.bat"
echo.
pause
