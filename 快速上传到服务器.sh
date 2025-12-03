#!/bin/bash

# ========================================
# 快速上传项目到腾讯云服务器
# ========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================"
echo "  快速上传 Agentrix 到服务器"
echo -e "========================================${NC}"
echo ""

# 获取服务器 IP
read -p "请输入服务器 IP 地址: " SERVER_IP

if [ -z "$SERVER_IP" ]; then
    echo -e "${RED}错误: 服务器 IP 不能为空${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}准备上传到: $SERVER_IP${NC}"
echo ""

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 步骤 1: 打包项目
echo -e "${YELLOW}[1/3] 打包项目...${NC}"
echo "排除: node_modules, .git, dist, build, *.log"

tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='*.log' \
    --exclude='playwright-report' \
    --exclude='test-results' \
    -czf agentrix.tar.gz .

echo -e "${GREEN}✓ 打包完成: agentrix.tar.gz${NC}"
ls -lh agentrix.tar.gz
echo ""

# 步骤 2: 上传到服务器
echo -e "${YELLOW}[2/3] 上传到服务器...${NC}"
echo "目标: root@$SERVER_IP:/var/www/"

scp agentrix.tar.gz root@$SERVER_IP:/var/www/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 上传成功${NC}"
else
    echo -e "${RED}✗ 上传失败${NC}"
    exit 1
fi
echo ""

# 步骤 3: 在服务器上解压
echo -e "${YELLOW}[3/3] 在服务器上解压...${NC}"

ssh root@$SERVER_IP << 'ENDSSH'
cd /var/www
mkdir -p agentrix-website
echo "解压项目文件..."
tar -xzf agentrix.tar.gz -C agentrix-website
echo "✓ 解压完成"
ls -la agentrix-website
ENDSSH

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 上传完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}项目位置: /var/www/agentrix-website${NC}"
echo ""
echo -e "${YELLOW}下一步操作（在服务器上执行）：${NC}"
echo ""
echo "1. SSH 登录服务器:"
echo "   ssh root@$SERVER_IP"
echo ""
echo "2. 配置环境变量:"
echo "   cd /var/www/agentrix-website/backend"
echo "   nano .env"
echo ""
echo "   cd /var/www/agentrix-website/agentrixfrontend"
echo "   nano .env.local"
echo ""
echo "3. 安装依赖并启动:"
echo "   cd /var/www/agentrix-website/backend"
echo "   npm install && npm run build"
echo "   npm run migration:run"
echo ""
echo "   cd /var/www/agentrix-website/agentrixfrontend"
echo "   npm install && npm run build"
echo ""
echo "   cd /var/www/agentrix-website"
echo "   pm2 start backend/dist/main.js --name agentrix-backend"
echo "   pm2 start agentrixfrontend/npm -- start --name agentrix-frontend"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo -e "${BLUE}========================================${NC}"
echo ""

# 清理本地打包文件
read -p "是否删除本地打包文件? (y/N): " cleanup
if [ "$cleanup" = "y" ] || [ "$cleanup" = "Y" ]; then
    rm agentrix.tar.gz
    echo -e "${GREEN}✓ 已删除 agentrix.tar.gz${NC}"
fi

echo ""
echo -e "${GREEN}🎉 完成！${NC}"
echo ""
