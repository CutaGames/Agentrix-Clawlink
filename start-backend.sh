#!/bin/bash

# Agentrix 后端服务启动脚本

echo "🚀 启动 Agentrix 后端服务..."
echo ""

cd backend || {
    echo "❌ 错误: 无法进入backend目录"
    exit 1
}

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 启动服务
echo "▶️  启动开发服务器..."
echo "   等待30-60秒让服务完全启动..."
echo ""

npm run start:dev
