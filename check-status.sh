#!/bin/bash

# 检查Agentrix服务状态

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔍 检查Agentrix服务状态..."
echo ""

# 检查端口
echo "📡 检查端口占用:"
if lsof -i :3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 端口 3000 (前端) 正在使用${NC}"
    lsof -i :3000 | grep LISTEN
else
    echo -e "${RED}❌ 端口 3000 (前端) 未被占用${NC}"
fi

if lsof -i :3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 端口 3001 (后端) 正在使用${NC}"
    lsof -i :3001 | grep LISTEN
else
    echo -e "${RED}❌ 端口 3001 (后端) 未被占用${NC}"
fi

echo ""

# 检查进程
echo "🔄 检查进程:"
BACKEND_PID=$(ps aux | grep -E "nest start|node.*main" | grep -v grep | awk '{print $2}' | head -1)
FRONTEND_PID=$(ps aux | grep -E "next dev|next-server" | grep -v grep | awk '{print $2}' | head -1)

if [ -n "$BACKEND_PID" ]; then
    echo -e "${GREEN}✅ 后端进程运行中 (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}❌ 后端进程未运行${NC}"
fi

if [ -n "$FRONTEND_PID" ]; then
    echo -e "${GREEN}✅ 前端进程运行中 (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${RED}❌ 前端进程未运行${NC}"
fi

echo ""

# 检查配置文件
echo "⚙️  检查配置文件:"
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✅ backend/.env 存在${NC}"
else
    echo -e "${YELLOW}⚠️  backend/.env 不存在${NC}"
fi

if [ -f "agentrixfrontend/.env.local" ]; then
    echo -e "${GREEN}✅ agentrixfrontend/.env.local 存在${NC}"
else
    echo -e "${YELLOW}⚠️  agentrixfrontend/.env.local 不存在${NC}"
fi

echo ""

# 检查依赖
echo "📦 检查依赖:"
if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✅ 后端依赖已安装${NC}"
else
    echo -e "${RED}❌ 后端依赖未安装${NC}"
fi

if [ -d "agentrixfrontend/node_modules" ]; then
    echo -e "${GREEN}✅ 前端依赖已安装${NC}"
else
    echo -e "${RED}❌ 前端依赖未安装${NC}"
fi

echo ""

# 测试连接
echo "🌐 测试连接:"
if curl -s http://localhost:3001/api > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端API可访问${NC}"
else
    echo -e "${RED}❌ 后端API不可访问${NC}"
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 前端可访问${NC}"
else
    echo -e "${RED}❌ 前端不可访问${NC}"
fi

echo ""
echo "=================================="
echo "💡 如果服务未运行，请执行:"
echo "   ./start-dev.sh"
echo ""

