#!/bin/bash

# Agentrix 快速启动脚本（简化版）

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Agentrix 快速启动"
echo "===================="
echo ""

# 检查并创建配置文件
echo "⚙️  检查配置文件..."

cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/agentrix-website

# 后端.env
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo -e "${GREEN}✅ 已创建 backend/.env${NC}"
    else
        cat > backend/.env << EOF
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=agentrix
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "dev-secret-key-$(date +%s)")
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
EOF
        echo -e "${GREEN}✅ 已创建默认 backend/.env${NC}"
    fi
fi

# 前端.env.local
if [ ! -f "agentrixfrontend/.env.local" ]; then
    if [ -f "agentrixfrontend/.env.local.example" ]; then
        cp agentrixfrontend/.env.local.example agentrixfrontend/.env.local
        echo -e "${GREEN}✅ 已创建 agentrixfrontend/.env.local${NC}"
    else
        cat > agentrixfrontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001/api
EOF
        echo -e "${GREEN}✅ 已创建默认 agentrixfrontend/.env.local${NC}"
    fi
fi

# 检查依赖
echo ""
echo "📦 检查依赖..."
if [ ! -d "backend/node_modules" ]; then
    echo "安装后端依赖..."
    cd backend && npm install && cd ..
fi

if [ ! -d "agentrixfrontend/node_modules" ]; then
    echo "安装前端依赖..."
    cd agentrixfrontend && npm install && cd ..
fi

# 停止现有服务
echo ""
echo "🛑 停止现有服务..."
./stop-dev.sh 2>/dev/null || true
sleep 2

# 启动服务
echo ""
echo "🎯 启动服务..."
echo ""

# 启动后端
echo "🔧 启动后端 (http://localhost:3001)..."
cd backend
npm run start:dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo $BACKEND_PID > .backend.pid

# 等待后端启动
echo "等待后端启动..."
sleep 8

# 检查后端是否启动成功
if curl -s http://localhost:3001/api > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端启动成功${NC}"
else
    echo -e "${YELLOW}⚠️  后端可能启动失败，查看日志: tail -f backend.log${NC}"
fi

# 启动前端
echo ""
echo "🎨 启动前端 (http://localhost:3000)..."
cd agentrixfrontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo $FRONTEND_PID > .frontend.pid

# 等待前端启动
echo "等待前端启动..."
sleep 5

# 检查前端是否启动成功
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 前端启动成功${NC}"
else
    echo -e "${YELLOW}⚠️  前端可能启动失败，查看日志: tail -f frontend.log${NC}"
fi

echo ""
echo "===================="
echo -e "${GREEN}✅ 启动完成！${NC}"
echo ""
echo "🌐 访问地址:"
echo "   前端: http://localhost:3000"
echo "   后端API: http://localhost:3001/api"
echo "   API文档: http://localhost:3001/api/docs"
echo ""
echo "📊 查看日志:"
echo "   后端: tail -f backend.log"
echo "   前端: tail -f frontend.log"
echo ""
echo "🛑 停止服务: ./stop-dev.sh"
echo ""

