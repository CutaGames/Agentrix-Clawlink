#!/bin/bash
# ===========================================
# Agentrix - AWS EC2 One-Click Initialization
# ===========================================

set -e

echo "--- 1. 更新系统并安装依赖 ---"
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common git

echo "--- 2. 安装 Docker & Docker Compose ---"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

echo "--- 3. 配置 Swap 虚拟内存 (4GB) 确保 t3.small 编译不崩溃 ---"
if [ ! -f /swapfile ]; then
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "--- 4. 配置 Nginx SSL 目录 ---"
sudo mkdir -p ./nginx/ssl

echo "--- 初始化完成 ---"
echo "请执行以下步骤手动启动项目："
echo "1. git clone git@github.com:CutaGames/Agentrix.git"
echo "2. cd Agentrix"
echo "3. 复制并填充 .env.production"
echo "4. docker-compose -f docker-compose.prod.yml up -d --build"
