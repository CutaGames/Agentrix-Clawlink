#!/bin/bash

# Agentrix Agent V3.0 完整服务启动脚本 (Linux/WSL)

echo "=========================================="
echo "🚀 Agentrix Agent V3.0 完整服务启动"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到Node.js，请先安装Node.js (v18+)${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ 错误: Node.js 版本过低，需要 v18+${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 版本: $(node -v)${NC}"
echo ""

# 检查依赖
echo "[1/5] 检查依赖..."
if [ ! -d "backend/node_modules" ]; then
    echo "📥 安装后端依赖..."
    cd backend && npm install && cd ..
fi

if [ ! -d "agentrixfrontend/node_modules" ]; then
    echo "📥 安装前端依赖..."
    cd agentrixfrontend && npm install && cd ..
fi
echo -e "${GREEN}✅ 依赖检查完成${NC}"
echo ""

# 检查环境变量
echo "[2/5] 检查环境变量..."
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  警告: backend/.env 不存在${NC}"
    echo "   请从 .env.example 复制并配置"
fi

if [ ! -f "agentrixfrontend/.env.local" ]; then
    echo -e "${YELLOW}⚠️  警告: agentrixfrontend/.env.local 不存在${NC}"
    echo "   请从 .env.local.example 复制"
fi
echo ""

# 运行数据库迁移
echo "[3/5] 运行数据库迁移..."
cd backend
npm run migration:run
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  警告: 迁移可能失败，请检查数据库连接${NC}"
    echo "   继续启动服务..."
fi
cd ..
echo ""

# 创建日志目录
mkdir -p logs

# 确保日志目录存在
if [ ! -d "logs" ]; then
    mkdir -p logs
fi

# 启动后端服务
echo "[4/5] 启动后端服务 (端口 3001)..."
echo -e "${BLUE}   后端将在 http://localhost:3001 启动${NC}"
echo -e "${BLUE}   API文档: http://localhost:3001/api/docs${NC}"
echo ""
cd backend
npm run start:dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo "后端 PID: $BACKEND_PID"
echo $BACKEND_PID > .backend.pid

# 等待后端启动
echo "等待后端启动..."
sleep 8
echo ""

# 启动前端服务
echo "[5/5] 启动前端服务 (端口 3000)..."
echo -e "${BLUE}   前端将在 http://localhost:3000 启动${NC}"
echo -e "${BLUE}   Agent页面: http://localhost:3000/agent${NC}"
echo ""
cd agentrixfrontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "前端 PID: $FRONTEND_PID"
echo $FRONTEND_PID > .frontend.pid

# 等待前端启动
sleep 3

# 启动SDK文档（可选）
if [ -d "sdk-js/docs" ]; then
    echo "[可选] 启动SDK文档服务器 (端口 8080)..."
    cd sdk-js/docs
    npx http-server -p 8080 --cors > ../../../logs/sdk-docs.log 2>&1 &
    SDK_PID=$!
    cd ../../..
    echo "SDK文档 PID: $SDK_PID"
    echo $SDK_PID > .sdk-docs.pid
else
    echo -e "${YELLOW}⚠️  SDK文档目录不存在，跳过${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ 所有服务已启动！${NC}"
echo "=========================================="
echo ""
echo "📊 访问地址:"
echo -e "   ${BLUE}🌐 前端应用:    http://localhost:3000${NC}"
echo -e "   ${BLUE}🤖 Agent页面:   http://localhost:3000/agent${NC}"
echo -e "   ${BLUE}🔧 后端API:     http://localhost:3001/api${NC}"
echo -e "   ${BLUE}📖 API文档:     http://localhost:3001/api/docs${NC}"
echo -e "   ${BLUE}📚 SDK文档:     http://localhost:8080${NC}"
echo ""
echo "💡 提示:"
echo "   - 等待5-10秒让服务完全启动"
echo "   - 查看日志: tail -f logs/backend.log"
echo "   - 停止服务: ./stop-services.sh 或 kill PID"
echo ""
echo "📋 查看日志:"
echo "   tail -f logs/backend.log"
echo "   tail -f logs/frontend.log"
echo "   tail -f logs/sdk-docs.log"
echo ""
echo "🛑 停止服务:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
if [ -n "$SDK_PID" ]; then
    echo "   kill $SDK_PID"
fi
echo ""

# 尝试打开浏览器（如果支持）
if command -v xdg-open &> /dev/null; then
    sleep 2
    xdg-open http://localhost:3000/agent 2>/dev/null &
    xdg-open http://localhost:3001/api/docs 2>/dev/null &
fi

echo "服务正在运行，按 Ctrl+C 停止所有服务..."
echo ""

# 等待用户中断
trap "echo ''; echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; if [ -n \"$SDK_PID\" ]; then kill $SDK_PID 2>/dev/null; fi; exit" INT TERM

# 保持脚本运行
wait

