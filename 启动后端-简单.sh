#!/bin/bash

# 简单启动后端服务脚本

echo "🚀 启动 PayMind 后端服务..."
echo ""

# 检查是否在项目根目录
if [ ! -d "backend" ]; then
    echo "❌ 错误: 未找到backend目录"
    echo "   请在项目根目录运行此脚本"
    exit 1
fi

# 进入backend目录
cd backend

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📥 安装依赖..."
    npm install
    echo ""
fi

# 创建日志目录
mkdir -p ../logs

# 启动服务
echo "🔧 启动服务..."
echo "   服务将在 http://localhost:3001 启动"
echo "   API文档: http://localhost:3001/api/docs"
echo ""
echo "   按 Ctrl+C 停止服务"
echo ""

# 启动服务（前台运行，方便查看日志）
npm run start:dev

