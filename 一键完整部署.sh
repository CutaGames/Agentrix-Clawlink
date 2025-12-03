#!/bin/bash

# ========================================
# Agentrix 一键完整部署脚本
# 域名: www.agentrix.top
# ========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================"
echo "  Agentrix 一键完整部署"
echo "  域名: www.agentrix.top"
echo -e "========================================${NC}"
echo ""

# 获取服务器信息
echo -e "${YELLOW}请输入服务器信息：${NC}"
read -p "服务器 IP 地址: " SERVER_IP
read -sp "服务器 root 密码: " SERVER_PASSWORD
echo ""

if [ -z "$SERVER_IP" ]; then
    echo -e "${RED}错误: 服务器 IP 不能为空${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}部署信息确认：${NC}"
echo -e "  服务器 IP: ${GREEN}$SERVER_IP${NC}"
echo -e "  域名: ${GREEN}www.agentrix.top${NC}"
echo -e "  API 域名: ${GREEN}api.agentrix.top${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

read -p "确认开始部署? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo -e "${RED}已取消部署${NC}"
    exit 0
fi

# ========================================
# 步骤 1: 上传部署脚本到服务器
# ========================================
echo ""
echo -e "${YELLOW}[1/5] 上传部署脚本到服务器...${NC}"

# 首次连接，添加主机密钥
ssh-keyscan -H $SERVER_IP >> ~/.ssh/known_hosts 2>/dev/null

sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no 一键部署脚本-服务器端.sh root@$SERVER_IP:~/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 上传成功${NC}"
else
    echo -e "${RED}✗ 上传失败，请检查密码和网络${NC}"
    exit 1
fi

# ========================================
# 步骤 2: 在服务器上运行环境安装
# ========================================
echo ""
echo -e "${YELLOW}[2/5] 在服务器上安装环境...${NC}"
echo -e "${BLUE}(这可能需要 5-10 分钟，请耐心等待)${NC}"
echo ""

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'
cd ~
chmod +x 一键部署脚本-服务器端.sh
echo "y" | sudo bash 一键部署脚本-服务器端.sh
ENDSSH

echo -e "${GREEN}✓ 环境安装完成${NC}"

# ========================================
# 步骤 3: 打包并上传项目
# ========================================
echo ""
echo -e "${YELLOW}[3/5] 打包并上传项目...${NC}"

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 打包项目
echo "正在打包项目..."
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='*.log' \
    --exclude='playwright-report' \
    --exclude='test-results' \
    -czf agentrix.tar.gz .

echo -e "${GREEN}✓ 打包完成${NC}"

# 上传项目
echo "正在上传项目..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no agentrix.tar.gz root@$SERVER_IP:/var/www/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 上传成功${NC}"
    rm agentrix.tar.gz
else
    echo -e "${RED}✗ 上传失败${NC}"
    exit 1
fi

# 解压项目
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'
cd /var/www
mkdir -p agentrix-website
tar -xzf agentrix.tar.gz -C agentrix-website
rm agentrix.tar.gz
ENDSSH

echo -e "${GREEN}✓ 项目解压完成${NC}"

# ========================================
# 步骤 4: 配置环境变量和 Nginx
# ========================================
echo ""
echo -e "${YELLOW}[4/5] 配置环境变量和 Nginx...${NC}"

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << ENDSSH
cd /var/www/agentrix-website

# 配置后端环境变量
cat > backend/.env << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=agentrix
DB_PASSWORD=agentrix123
DB_DATABASE=agentrix
DB_SYNCHRONIZE=false

NODE_ENV=production
PORT=3001
API_URL=https://api.agentrix.top

JWT_SECRET=\$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d

CORS_ORIGIN=https://www.agentrix.top
EOF

# 配置前端环境变量
cat > agentrixfrontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.agentrix.top
NEXT_PUBLIC_WS_URL=wss://api.agentrix.top
NEXT_PUBLIC_APP_NAME=Agentrix
NEXT_PUBLIC_APP_URL=https://www.agentrix.top
EOF

# 配置 Nginx
cat > /etc/nginx/sites-available/agentrix << 'EOF'
server {
    listen 80;
    server_name www.agentrix.top agentrix.top;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

server {
    listen 80;
    server_name api.agentrix.top;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/agentrix /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

ENDSSH

echo -e "${GREEN}✓ 配置完成${NC}"

# ========================================
# 步骤 5: 安装依赖并启动服务
# ========================================
echo ""
echo -e "${YELLOW}[5/5] 安装依赖并启动服务...${NC}"
echo -e "${BLUE}(这可能需要 10-15 分钟，请耐心等待)${NC}"
echo ""

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'ENDSSH'
cd /var/www/agentrix-website

# 安装后端依赖
echo "安装后端依赖..."
cd backend
npm install --production
npm run build

# 运行数据库迁移
npm run migration:run || true

# 安装前端依赖
echo "安装前端依赖..."
cd ../agentrixfrontend
npm install --production
npm run build

# 启动服务
cd ..
pm2 delete all || true
pm2 start backend/dist/main.js --name agentrix-backend
pm2 start agentrixfrontend/npm -- start --name agentrix-frontend
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash

ENDSSH

echo -e "${GREEN}✓ 服务启动完成${NC}"

# ========================================
# 完成
# ========================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}下一步操作：${NC}"
echo ""
echo "1️⃣ 配置域名 DNS 解析"
echo "   登录域名注册商，添加以下记录："
echo "   记录类型: A    主机记录: @      记录值: $SERVER_IP"
echo "   记录类型: A    主机记录: www    记录值: $SERVER_IP"
echo "   记录类型: A    主机记录: api    记录值: $SERVER_IP"
echo ""
echo "2️⃣ 等待 DNS 解析生效（5-30 分钟）"
echo "   验证: ping www.agentrix.top"
echo ""
echo "3️⃣ 配置 HTTPS 证书"
echo "   SSH 登录服务器: ssh root@$SERVER_IP"
echo "   运行: certbot --nginx -d www.agentrix.top -d agentrix.top -d api.agentrix.top"
echo ""
echo "4️⃣ 访问你的网站"
echo "   前端: https://www.agentrix.top"
echo "   后端: https://api.agentrix.top"
echo "   文档: https://api.agentrix.top/api/docs"
echo ""
echo -e "${YELLOW}注意: 如果域名还未解析，可以先通过 IP 访问测试：${NC}"
echo "   前端: http://$SERVER_IP:3000"
echo "   后端: http://$SERVER_IP:3001/api"
echo ""
echo -e "${BLUE}========================================${NC}"
echo ""
