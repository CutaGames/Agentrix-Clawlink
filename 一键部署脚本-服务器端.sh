#!/bin/bash

# ========================================
# Agentrix 一键部署脚本（服务器端）
# 用途：在腾讯云轻量服务器上自动安装环境
# ========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================"
echo "   Agentrix 一键部署脚本"
echo "   版本: 1.0"
echo -e "========================================${NC}"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}错误: 请使用 root 用户或 sudo 运行此脚本${NC}"
    echo "使用方法: sudo bash $0"
    exit 1
fi

# 获取服务器信息
SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
echo -e "${BLUE}服务器 IP: $SERVER_IP${NC}"
echo ""

# 配置变量
PROJECT_DIR="/var/www/agentrix-website"
DB_NAME="agentrix"
DB_USER="agentrix"
DB_PASSWORD="agentrix_$(openssl rand -hex 8)"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}即将安装以下组件：${NC}"
echo "  - Node.js 18.x"
echo "  - PostgreSQL 14+"
echo "  - PM2 进程管理器"
echo "  - Nginx (可选)"
echo ""
echo -e "${YELLOW}项目将部署到: $PROJECT_DIR${NC}"
echo -e "${YELLOW}数据库: $DB_NAME (用户: $DB_USER)${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

read -p "确认继续? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo -e "${RED}已取消部署${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}开始部署...${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# ========================================
# 步骤 1: 更新系统
# ========================================
echo -e "${YELLOW}[1/8] 更新系统包...${NC}"
apt update
apt upgrade -y
echo -e "${GREEN}✓ 系统更新完成${NC}"
echo ""

# ========================================
# 步骤 2: 安装 Node.js 18
# ========================================
echo -e "${YELLOW}[2/8] 安装 Node.js 18...${NC}"
if ! command -v node &> /dev/null; then
    echo "下载 Node.js 安装脚本..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    echo "安装 Node.js..."
    apt install -y nodejs
else
    echo "Node.js 已安装，跳过"
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ Node.js $NODE_VERSION${NC}"
echo -e "${GREEN}✓ npm $NPM_VERSION${NC}"
echo ""

# ========================================
# 步骤 3: 安装 Git
# ========================================
echo -e "${YELLOW}[3/8] 安装 Git...${NC}"
if ! command -v git &> /dev/null; then
    apt install -y git
else
    echo "Git 已安装，跳过"
fi
echo -e "${GREEN}✓ Git $(git --version | cut -d' ' -f3)${NC}"
echo ""

# ========================================
# 步骤 4: 安装 PostgreSQL
# ========================================
echo -e "${YELLOW}[4/8] 安装 PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    echo "安装 PostgreSQL..."
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
else
    echo "PostgreSQL 已安装，跳过"
fi
echo -e "${GREEN}✓ PostgreSQL $(psql --version | cut -d' ' -f3)${NC}"
echo ""

# ========================================
# 步骤 5: 配置数据库
# ========================================
echo -e "${YELLOW}[5/8] 配置数据库...${NC}"

# 创建数据库
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null && \
    echo -e "${GREEN}✓ 数据库 '$DB_NAME' 创建成功${NC}" || \
    echo -e "${YELLOW}⚠ 数据库 '$DB_NAME' 已存在${NC}"

# 创建用户
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null && \
    echo -e "${GREEN}✓ 用户 '$DB_USER' 创建成功${NC}" || \
    echo -e "${YELLOW}⚠ 用户 '$DB_USER' 已存在${NC}"

# 授权
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null
sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;" 2>/dev/null

echo -e "${GREEN}✓ 数据库配置完成${NC}"
echo ""

# ========================================
# 步骤 6: 安装 PM2
# ========================================
echo -e "${YELLOW}[6/8] 安装 PM2 进程管理器...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo "PM2 已安装，更新到最新版..."
    npm update -g pm2
fi
echo -e "${GREEN}✓ PM2 $(pm2 -v)${NC}"
echo ""

# ========================================
# 步骤 7: 安装 Nginx (可选)
# ========================================
echo -e "${YELLOW}[7/8] 安装 Nginx (可选)...${NC}"
read -p "是否安装 Nginx 反向代理? (y/N): " install_nginx
if [ "$install_nginx" = "y" ] || [ "$install_nginx" = "Y" ]; then
    if ! command -v nginx &> /dev/null; then
        apt install -y nginx
        systemctl start nginx
        systemctl enable nginx
        echo -e "${GREEN}✓ Nginx $(nginx -v 2>&1 | cut -d'/' -f2)${NC}"
    else
        echo "Nginx 已安装，跳过"
    fi
else
    echo "跳过 Nginx 安装"
fi
echo ""

# ========================================
# 步骤 8: 创建项目目录
# ========================================
echo -e "${YELLOW}[8/8] 创建项目目录...${NC}"
mkdir -p "$PROJECT_DIR"
echo -e "${GREEN}✓ 项目目录: $PROJECT_DIR${NC}"
echo ""

# ========================================
# 保存配置信息
# ========================================
CONFIG_FILE="$HOME/agentrix-deploy-info.txt"
cat > "$CONFIG_FILE" << EOF
========================================
Agentrix 部署信息
生成时间: $(date)
========================================

服务器信息:
  IP 地址: $SERVER_IP
  项目目录: $PROJECT_DIR

数据库配置:
  数据库名: $DB_NAME
  用户名: $DB_USER
  密码: $DB_PASSWORD
  主机: localhost
  端口: 5432

环境变量配置 (backend/.env):
  DB_HOST=localhost
  DB_PORT=5432
  DB_USERNAME=$DB_USER
  DB_PASSWORD=$DB_PASSWORD
  DB_DATABASE=$DB_NAME
  API_URL=http://$SERVER_IP:3001/api

环境变量配置 (agentrixfrontend/.env.local):
  NEXT_PUBLIC_API_URL=http://$SERVER_IP:3001/api
  NEXT_PUBLIC_WS_URL=ws://$SERVER_IP:3001

部署步骤:
  1. 上传项目文件到 $PROJECT_DIR
  2. 配置环境变量 (见上方)
  3. 安装依赖并启动:
     cd $PROJECT_DIR/backend && npm install && npm run build
     cd $PROJECT_DIR/agentrixfrontend && npm install && npm run build
     pm2 start backend/dist/main.js --name agentrix-backend
     pm2 start agentrixfrontend/npm -- start --name agentrix-frontend
     pm2 save
     pm2 startup

访问地址:
  前端: http://$SERVER_IP:3000
  后端: http://$SERVER_IP:3001/api
  API文档: http://$SERVER_IP:3001/api/docs

========================================
EOF

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 环境安装完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}配置信息已保存到: $CONFIG_FILE${NC}"
echo ""
echo -e "${YELLOW}下一步操作：${NC}"
echo ""
echo "1️⃣ 上传项目文件"
echo "   方法 A - 使用 SCP (在本地执行):"
echo "     cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/paymind-website"
echo "     tar --exclude='node_modules' --exclude='.git' -czf agentrix.tar.gz ."
echo "     scp agentrix.tar.gz root@$SERVER_IP:/var/www/"
echo "     ssh root@$SERVER_IP"
echo "     cd /var/www && tar -xzf agentrix.tar.gz -C agentrix-website"
echo ""
echo "   方法 B - 使用 Git:"
echo "     cd $PROJECT_DIR"
echo "     git clone https://github.com/CutaGames/Agentrix.git ."
echo ""
echo "2️⃣ 配置环境变量"
echo "   cd $PROJECT_DIR/backend"
echo "   nano .env"
echo "   (复制上方配置信息)"
echo ""
echo "   cd $PROJECT_DIR/agentrixfrontend"
echo "   nano .env.local"
echo "   (复制上方配置信息)"
echo ""
echo "3️⃣ 安装依赖并启动"
echo "   cd $PROJECT_DIR/backend && npm install && npm run build"
echo "   npm run migration:run"
echo "   cd $PROJECT_DIR/agentrixfrontend && npm install && npm run build"
echo "   cd $PROJECT_DIR"
echo "   pm2 start backend/dist/main.js --name agentrix-backend"
echo "   pm2 start agentrixfrontend/npm -- start --name agentrix-frontend"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}数据库信息:${NC}"
echo -e "  数据库: ${GREEN}$DB_NAME${NC}"
echo -e "  用户名: ${GREEN}$DB_USER${NC}"
echo -e "  密码: ${GREEN}$DB_PASSWORD${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}提示: 请妥善保存数据库密码！${NC}"
echo ""
