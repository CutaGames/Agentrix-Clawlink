#!/bin/bash

echo "📚 启动 SDK 文档服务器"
echo ""

cd sdk-js/docs

if [ ! -f "index.html" ]; then
    echo "❌ index.html 不存在，请先生成文档"
    exit 1
fi

echo "正在启动文档服务器 (端口 8080)..."
echo "访问地址: http://localhost:8080"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 尝试使用 npx http-server，如果失败则使用 Python
if command -v npx &> /dev/null; then
    npx http-server -p 8080 -a 0.0.0.0 --cors
elif command -v python3 &> /dev/null; then
    python3 -m http.server 8080
else
    echo "❌ 未找到 http-server 或 python3"
    exit 1
fi

