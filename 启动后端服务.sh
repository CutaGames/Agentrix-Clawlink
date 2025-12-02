#!/bin/bash

# Agentrix 后端服务启动脚本 (WSL/Linux)

echo "=========================================="
echo "🚀 启动 Agentrix 后端服务"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;37m'
NC='\033[0m'

# 检查是否在项目根目录
if [ ! -d "backend" ]; then
    echo -e "${RED}❌ 错误: 未找到backend目录${NC}"
    echo -e "${YELLOW}   请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到Node.js${NC}"
    echo -e "${YELLOW}   请先安装Node.js (v18+)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 版本: $(node --version)${NC}"
echo ""

# 检查依赖
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}📥 安装后端依赖...${NC}"
    cd backend
    npm install
    cd ..
    echo ""
fi

# 检查环境变量
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  警告: backend/.env 不存在${NC}"
    echo -e "${YELLOW}   请从 .env.example 复制并配置${NC}"
    echo ""
fi

# 创建日志目录
mkdir -p logs

# 启动服务
echo -e "${YELLOW}🔧 启动后端服务...${NC}"
echo -e "${GRAY}   服务将在 http://localhost:3001 启动${NC}"
echo -e "${GRAY}   API文档: http://localhost:3001/api/docs${NC}"
echo ""

cd backend

# 启动服务并输出到日志
npm run start:dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!

cd ..

echo $BACKEND_PID > .backend.pid
echo -e "${GREEN}✅ 后端服务已启动 (PID: $BACKEND_PID)${NC}"
echo ""
echo -e "${YELLOW}📋 查看日志:${NC}"
echo -e "${GRAY}   tail -f logs/backend.log${NC}"
echo ""
echo -e "${YELLOW}🛑 停止服务:${NC}"
echo -e "${GRAY}   kill $BACKEND_PID${NC}"
echo ""

# 等待几秒后测试连接
sleep 5

echo -e "${YELLOW}🔍 测试服务连接...${NC}"
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health --max-time 5 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ 服务运行正常！${NC}"
        echo ""
        echo -e "${YELLOW}📊 访问地址:${NC}"
        echo -e "${GRAY}   🌐 API:        http://localhost:3001/api${NC}"
        echo -e "${GRAY}   📖 API文档:    http://localhost:3001/api/docs${NC}"
        echo -e "${GRAY}   ❤️  健康检查:  http://localhost:3001/api/health${NC}"
    else
        echo -e "${YELLOW}⚠️  服务可能还在启动中，请稍候...${NC}"
        echo -e "${GRAY}   查看日志了解详情: tail -f logs/backend.log${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  curl未安装，无法测试连接${NC}"
    echo -e "${GRAY}   请手动访问 http://localhost:3001/api/health 测试${NC}"
fi

echo ""

