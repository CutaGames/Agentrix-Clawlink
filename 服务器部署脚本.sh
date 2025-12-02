#!/bin/bash

echo "========================================"
echo "   Agentrix 服务器部署脚本"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 root 用户或 sudo 运行此脚本${NC}"
    exit 1
fi

# 配置变量
PROJECT_DIR="/var/www/agentrix-website"
GITHUB_REPO="https://github.com/你的用户名/agentrix-website.git"
DB_NAME="agentrix"
DB_USER="agentrix"
DB_PASSWORD="your_secure_password_change_this"

echo -e "${YELLOW}[1/8] 更新系统...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}[2/8] 安装 Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi
node -v
npm -v

echo -e "${YELLOW}[3/8] 安装 Git...${NC}"
apt install -y git

echo -e "${YELLOW}[4/8] 安装 PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi

echo -e "${YELLOW}[5/8] 配置数据库...${NC}"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "数据库已存在"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "用户已存在"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null

echo -e "${YELLOW}[6/8] 安装 PM2...${NC}"
npm install -g pm2

echo -e "${YELLOW}[7/8] 克隆项目...${NC}"
if [ -d "$PROJECT_DIR" ]; then
    echo "项目目录已存在，拉取最新代码..."
    cd "$PROJECT_DIR"
    git pull
else
    echo "克隆项目..."
    cd /var/www
    echo -e "${GREEN}请输入你的 GitHub 用户名:${NC}"
    read github_user
    echo -e "${GREEN}请输入你的 GitHub Token (或密码):${NC}"
    read -s github_token
    git clone "https://${github_user}:${github_token}@${GITHUB_REPO#https://}" agentrix-website
    cd "$PROJECT_DIR"
fi

echo -e "${YELLOW}[8/8] 配置环境变量...${NC}"
echo "请手动配置以下文件："
echo "  1. $PROJECT_DIR/backend/.env"
echo "  2. $PROJECT_DIR/agentrixfrontend/.env.local"
echo ""
echo "配置完成后，运行以下命令启动服务："
echo "  cd $PROJECT_DIR/backend && npm install && npm run build"
echo "  cd $PROJECT_DIR/agentrixfrontend && npm install && npm run build"
echo "  pm2 start ecosystem.config.js"
echo "  pm2 save"
echo "  pm2 startup"
echo ""
echo -e "${GREEN}✅ 基础环境安装完成！${NC}"
