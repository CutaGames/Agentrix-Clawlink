#!/bin/bash

# Agentrix 全服务启动脚本
# 同时启动前端(3000)、后端(3001)和SDK文档(3002)

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "  Agentrix 全服务启动"
echo "=========================================="
echo ""

# 获取WSL IP
WSL_IP=$(hostname -I | awk '{print $1}')
echo -e "${BLUE}🌐 WSL IP地址: $WSL_IP${NC}"
echo ""

# 检查端口是否被占用
check_port() {
    local port=$1
    if netstat -tlnp 2>/dev/null | grep -q ":$port " || ss -tlnp 2>/dev/null | grep -q ":$port "; then
        echo -e "${YELLOW}⚠️  端口 $port 已被占用${NC}"
        return 1
    fi
    return 0
}

# 清理函数
cleanup() {
    echo ""
    echo -e "${YELLOW}正在停止所有服务...${NC}"
    kill $FRONTEND_PID $BACKEND_PID $SDK_DOCS_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# 启动前端服务
echo -e "${BLUE}🚀 启动前端服务 (端口 3000)...${NC}"
cd agentrixfrontend
if check_port 3000; then
    npm run dev > /tmp/agentrix-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo -e "${GREEN}✅ 前端服务已启动 (PID: $FRONTEND_PID)${NC}"
else
    echo -e "${YELLOW}⚠️  前端服务可能已在运行${NC}"
    FRONTEND_PID=""
fi
cd ..

# 等待前端启动
sleep 3

# 启动后端服务
echo -e "${BLUE}🚀 启动后端服务 (端口 3001)...${NC}"
cd backend
if check_port 3001; then
    npm run start:dev > /tmp/agentrix-backend.log 2>&1 &
    BACKEND_PID=$!
    echo -e "${GREEN}✅ 后端服务已启动 (PID: $BACKEND_PID)${NC}"
else
    echo -e "${YELLOW}⚠️  后端服务可能已在运行${NC}"
    BACKEND_PID=""
fi
cd ..

# 等待后端启动
sleep 5

# 检查并生成SDK文档
echo -e "${BLUE}📚 准备SDK文档服务 (端口 3002)...${NC}"
cd sdk-js

# 检查是否已安装typedoc
if [ ! -d "node_modules/typedoc" ]; then
    echo -e "${YELLOW}⚠️  TypeDoc未安装，正在安装...${NC}"
    npm install --save-dev typedoc 2>&1 | tail -5
fi

# 检查文档是否已生成
if [ ! -d "docs" ] || [ "src/index.ts" -nt "docs/index.html" ]; then
    echo -e "${YELLOW}📝 生成SDK文档...${NC}"
    npm run docs:generate 2>&1 | tail -10 || {
        echo -e "${RED}❌ SDK文档生成失败，跳过文档服务${NC}"
        SDK_DOCS_PID=""
        cd ..
    }
fi

# 启动文档服务
if check_port 3002; then
    npx serve docs -p 3002 > /tmp/agentrix-sdk-docs.log 2>&1 &
    SDK_DOCS_PID=$!
    echo -e "${GREEN}✅ SDK文档服务已启动 (PID: $SDK_DOCS_PID)${NC}"
else
    echo -e "${YELLOW}⚠️  文档服务可能已在运行${NC}"
    SDK_DOCS_PID=""
fi
cd ..

# 等待服务启动
sleep 3

# 显示访问地址
echo ""
echo "=========================================="
echo -e "${GREEN}✅ 所有服务已启动！${NC}"
echo "=========================================="
echo ""

echo -e "${BLUE}📍 在WSL中访问：${NC}"
echo ""
echo -e "  前端: ${GREEN}http://localhost:3000${NC}"
echo -e "  后端: ${GREEN}http://localhost:3001${NC}"
echo -e "  API文档: ${GREEN}http://localhost:3001/api/docs${NC}"
echo -e "  SDK文档: ${GREEN}http://localhost:3002${NC}"
echo ""

echo -e "${BLUE}📍 在Windows浏览器中访问：${NC}"
echo ""
echo -e "  方法1: 使用WSL IP地址${NC}"
echo -e "    前端: ${GREEN}http://$WSL_IP:3000${NC}"
echo -e "    后端: ${GREEN}http://$WSL_IP:3001${NC}"
echo -e "    API文档: ${GREEN}http://$WSL_IP:3001/api/docs${NC}"
echo -e "    SDK文档: ${GREEN}http://$WSL_IP:3002${NC}"
echo ""

echo -e "${YELLOW}💡 方法2: 配置Windows端口转发（使用localhost）${NC}"
echo ""
echo "  在Windows PowerShell中运行（以管理员身份）："
echo ""
echo "  \$wslIp = (wsl hostname -I).Split()[0]"
echo "  netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=\$wslIp"
echo "  netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=\$wslIp"
echo "  netsh interface portproxy add v4tov4 listenport=3002 listenaddress=0.0.0.0 connectport=3002 connectaddress=\$wslIp"
echo ""
echo "  或运行: .\\setup-all-ports.ps1"
echo ""
echo -e "  配置后访问: ${GREEN}http://localhost:3000${NC}"
echo -e "  配置后访问: ${GREEN}http://localhost:3001${NC}"
echo -e "  配置后访问: ${GREEN}http://localhost:3002${NC}"
echo ""

echo "=========================================="
echo -e "${YELLOW}📋 服务日志：${NC}"
echo "=========================================="
echo ""
echo "  前端日志: tail -f /tmp/agentrix-frontend.log"
echo "  后端日志: tail -f /tmp/agentrix-backend.log"
echo "  SDK文档日志: tail -f /tmp/agentrix-sdk-docs.log"
echo ""

echo "=========================================="
echo -e "${YELLOW}按 Ctrl+C 停止所有服务${NC}"
echo "=========================================="
echo ""

# 等待用户中断
wait

