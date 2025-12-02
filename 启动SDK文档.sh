#!/bin/bash

# 启动SDK文档服务器

echo "=========================================="
echo "📚 启动SDK文档服务器"
echo "=========================================="
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查 sdk-js/docs 目录
if [ ! -d "sdk-js/docs" ]; then
    echo "❌ sdk-js/docs 目录不存在"
    echo ""
    echo "请先生成SDK文档:"
    echo "  cd sdk-js"
    echo "  npm install"
    echo "  npm run docs"
    exit 1
fi

# 检查 index.html
if [ ! -f "sdk-js/docs/index.html" ]; then
    echo "❌ sdk-js/docs/index.html 不存在"
    echo ""
    echo "请先生成SDK文档:"
    echo "  cd sdk-js"
    echo "  npm run docs"
    exit 1
fi

# 检查端口是否被占用
if command -v ss &> /dev/null; then
    PORT_CHECK=$(ss -tuln | grep ':8080' || echo "")
elif command -v netstat &> /dev/null; then
    PORT_CHECK=$(netstat -tuln | grep ':8080' || echo "")
else
    PORT_CHECK=""
fi

if [ -n "$PORT_CHECK" ]; then
    echo "⚠️  端口 8080 已被占用"
    echo "   正在尝试停止现有进程..."
    pkill -f "http-server.*8080" 2>/dev/null
    sleep 2
fi

# 创建日志目录
mkdir -p logs

# 启动SDK文档服务器
echo "🚀 启动SDK文档服务器..."
echo "   目录: sdk-js/docs"
echo "   端口: 8080"
echo ""

cd sdk-js/docs
nohup npx http-server -p 8080 -a 0.0.0.0 --cors > ../../logs/sdk-docs.log 2>&1 &
SDK_PID=$!
cd "$SCRIPT_DIR"

echo $SDK_PID > .sdk-docs.pid
echo "✅ SDK文档服务器已启动"
echo "   PID: $SDK_PID"
echo "   访问: http://localhost:8080"
echo "   日志: logs/sdk-docs.log"
echo ""
echo "📝 查看日志: tail -f logs/sdk-docs.log"
echo "🛑 停止服务: kill $SDK_PID"
echo ""

