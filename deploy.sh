#!/bin/bash

# PayMind V3.0 部署脚本
# 使用方法: ./deploy.sh [dev|prod]

set -e  # 遇到错误立即退出

ENV=${1:-dev}

echo "🚀 开始部署 PayMind V3.0 (环境: $ENV)"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 版本: $(node -v)${NC}"
echo -e "${GREEN}✅ npm 版本: $(npm -v)${NC}"

# 构建前端
echo -e "\n${YELLOW}📦 构建前端...${NC}"
cd paymindfrontend

if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

if [ "$ENV" = "prod" ]; then
    npm run build
    echo -e "${GREEN}✅ 前端构建完成${NC}"
else
    echo -e "${GREEN}✅ 前端开发模式准备完成${NC}"
fi

cd ..

# 构建后端
echo -e "\n${YELLOW}📦 构建后端...${NC}"
cd backend

if [ ! -d "node_modules" ]; then
    echo "安装后端依赖..."
    npm install
fi

if [ "$ENV" = "prod" ]; then
    npm run build
    echo -e "${GREEN}✅ 后端构建完成${NC}"
    
    # 运行数据库迁移
    echo -e "\n${YELLOW}🗄️  运行数据库迁移...${NC}"
    npm run migration:run || echo -e "${YELLOW}⚠️  数据库迁移失败，请手动检查${NC}"
else
    echo -e "${GREEN}✅ 后端开发模式准备完成${NC}"
fi

cd ..

# 检查服务状态
echo -e "\n${YELLOW}🔍 检查服务状态...${NC}"

# 检查端口占用
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠️  端口 $1 已被占用${NC}"
        return 1
    else
        echo -e "${GREEN}✅ 端口 $1 可用${NC}"
        return 0
    fi
}

check_port 3000
check_port 3001

# 启动服务
if [ "$ENV" = "prod" ]; then
    echo -e "\n${YELLOW}🚀 启动生产服务...${NC}"
    echo -e "${GREEN}前端: npm start (在 paymindfrontend 目录)${NC}"
    echo -e "${GREEN}后端: npm run start:prod (在 backend 目录)${NC}"
else
    echo -e "\n${YELLOW}🚀 启动开发服务...${NC}"
    echo -e "${GREEN}前端: npm run dev (在 paymindfrontend 目录)${NC}"
    echo -e "${GREEN}后端: npm run start:dev (在 backend 目录)${NC}"
fi

echo -e "\n${GREEN}✅ 部署准备完成！${NC}"
echo -e "\n${YELLOW}📝 下一步:${NC}"
echo "1. 配置环境变量 (.env 文件)"
echo "2. 启动服务"
echo "3. 验证功能"

if [ "$ENV" = "prod" ]; then
    echo -e "\n${YELLOW}⚠️  生产环境部署注意事项:${NC}"
    echo "1. 确保所有环境变量已配置"
    echo "2. 确保数据库已备份"
    echo "3. 确保HTTPS证书已配置"
    echo "4. 确保监控和日志已配置"
fi

