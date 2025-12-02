@echo off
chcp 65001 >nul
echo 📚 启动 SDK 文档服务器
echo.

cd sdk-js\docs

echo 正在启动文档服务器 (端口 8080)...
echo.
echo 访问地址: http://localhost:8080
echo.
echo 按 Ctrl+C 停止服务
echo.

npx http-server -p 8080 -a 0.0.0.0 --cors

