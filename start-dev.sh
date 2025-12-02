#!/bin/bash

# Agentrix V2.2 开发环境启动脚本

echo "🚀 启动 Agentrix V2.2 开发环境..."
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js (v18+)"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ 错误: Node.js 版本过低，需要 v18+"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 检查PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  警告: 未找到 PostgreSQL，某些功能可能无法使用"
else
    echo "✅ PostgreSQL 已安装"
fi

# 检查环境变量文件
if [ ! -f "backend/.env" ]; then
    echo "⚠️  警告: backend/.env 不存在，请从 .env.example 复制并配置"
    echo "   运行: cd backend && cp .env.example .env"
fi

if [ ! -f "agentrixfrontend/.env.local" ]; then
    echo "⚠️  警告: agentrixfrontend/.env.local 不存在，请从 .env.local.example 复制"
    echo "   运行: cd agentrixfrontend && cp .env.local.example .env.local"
fi

echo ""
echo "📦 检查依赖..."

# 检查后端依赖
if [ ! -d "backend/node_modules" ]; then
    echo "📥 安装后端依赖..."
    cd backend && npm install && cd ..
fi

# 检查前端依赖
if [ ! -d "agentrixfrontend/node_modules" ]; then
    echo "📥 安装前端依赖..."
    cd agentrixfrontend && npm install && cd ..
fi

echo ""
echo "🎯 启动服务..."
echo ""
echo "后端将在 http://localhost:3001 启动"
echo "前端将在 http://localhost:3000 启动"
echo "API文档在 http://localhost:3001/api/docs"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 启动后端（后台运行）
echo "🔧 启动后端服务..."
cd backend
npm run start:dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 5

# 启动前端
echo "🎨 启动前端服务..."
cd agentrixfrontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 保存PID到文件
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

echo ""
echo "✅ 服务已启动！"
echo ""
echo "📊 查看日志:"
echo "   后端: tail -f backend.log"
echo "   前端: tail -f frontend.log"
echo ""
echo "🛑 停止服务: ./stop-dev.sh"
echo ""

# 等待用户中断
trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f .backend.pid .frontend.pid; exit" INT TERM

wait


