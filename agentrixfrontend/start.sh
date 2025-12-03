#!/bin/bash
# Agentrix 官网快速启动脚本

echo "=========================================="
echo "  Agentrix 官网启动脚本"
echo "=========================================="
echo ""

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    npm install
    echo ""
fi

echo "🚀 启动开发服务器..."
echo ""
echo "服务器启动后，请按照以下步骤在 Cursor 内置浏览器中预览："
echo ""
echo "方法一（推荐）："
echo "  1. 按 Ctrl+Shift+P 打开命令面板"
echo "  2. 输入 'Simple Browser: Show'"
echo "  3. 输入 'http://localhost:3000'"
echo ""
echo "方法二（快捷键）："
echo "  1. 按 Ctrl+Alt+P"
echo "  2. 输入 'localhost:3000'"
echo ""
echo "=========================================="
echo ""

# 启动开发服务器
npm run dev
