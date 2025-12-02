#!/bin/bash

# PostgreSQL 自动安装脚本

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🐘 PostgreSQL 自动安装脚本"
echo "============================"
echo ""

# 检查是否已安装
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | cut -d' ' -f3)
    echo -e "${GREEN}✅ PostgreSQL 已安装 (版本: $PSQL_VERSION)${NC}"
    
    # 检查服务状态
    if sudo service postgresql status &> /dev/null || sudo systemctl is-active --quiet postgresql; then
        echo -e "${GREEN}✅ PostgreSQL 服务正在运行${NC}"
    else
        echo -e "${YELLOW}⚠️  PostgreSQL 服务未运行，正在启动...${NC}"
        sudo service postgresql start || sudo systemctl start postgresql
    fi
    
    echo ""
    echo "跳过安装，直接配置..."
    echo ""
else
    echo "📦 开始安装PostgreSQL..."
    echo ""
    
    # 更新包列表
    echo "1. 更新包列表..."
    sudo apt update
    
    # 安装PostgreSQL
    echo "2. 安装PostgreSQL..."
    sudo apt install postgresql postgresql-contrib -y
    
    # 启动服务
    echo "3. 启动PostgreSQL服务..."
    sudo service postgresql start || sudo systemctl start postgresql
    
    # 设置开机自启
    echo "4. 设置开机自启..."
    sudo systemctl enable postgresql 2>/dev/null || true
    
    echo ""
    echo -e "${GREEN}✅ PostgreSQL 安装完成！${NC}"
    echo ""
fi

# 检查服务状态
if sudo service postgresql status &> /dev/null || sudo systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✅ PostgreSQL 服务运行正常${NC}"
else
    echo -e "${RED}❌ PostgreSQL 服务启动失败${NC}"
    echo "   请手动启动: sudo service postgresql start"
    exit 1
fi

# 创建数据库
echo ""
echo "🗄️  配置数据库..."
echo ""

# 检查数据库是否已存在
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw paymind; then
    echo -e "${GREEN}✅ 数据库 'paymind' 已存在${NC}"
else
    echo "创建数据库 'paymind'..."
    sudo -u postgres psql -c "CREATE DATABASE paymind;" 2>/dev/null || {
        echo -e "${YELLOW}⚠️  无法自动创建数据库${NC}"
        echo "   请手动创建:"
        echo "   sudo -u postgres psql -c \"CREATE DATABASE paymind;\""
    }
fi

# 显示PostgreSQL信息
echo ""
echo "📊 PostgreSQL 信息:"
echo "   版本: $(psql --version)"
echo "   服务状态: 运行中"
echo "   默认端口: 5432"
echo "   数据目录: /var/lib/postgresql"
echo ""

# 提示设置密码
echo -e "${YELLOW}⚠️  重要提示:${NC}"
echo ""
echo "1. 设置postgres用户密码（如果还没有设置）:"
echo "   sudo -u postgres psql"
echo "   ALTER USER postgres PASSWORD 'your_password';"
echo "   \\q"
echo ""
echo "2. 配置PayMind后端环境变量:"
echo "   编辑 backend/.env 文件，设置数据库连接信息"
echo ""
echo "3. 测试连接:"
echo "   psql -U postgres -h localhost -d paymind"
echo ""

# 提供快速配置选项
read -p "是否现在设置postgres用户密码? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    read -sp "请输入新密码: " PASSWORD
    echo ""
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD '$PASSWORD';" 2>/dev/null && {
        echo -e "${GREEN}✅ 密码设置成功${NC}"
        echo ""
        echo "请更新 backend/.env 文件:"
        echo "DB_PASSWORD=$PASSWORD"
    } || {
        echo -e "${YELLOW}⚠️  密码设置失败，请手动设置${NC}"
    }
fi

echo ""
echo "============================"
echo -e "${GREEN}✅ PostgreSQL 配置完成！${NC}"
echo ""
echo "下一步:"
echo "1. 配置 backend/.env 文件中的数据库连接信息"
echo "2. 运行 ./setup.sh 配置PayMind项目"
echo "3. 启动服务: ./start-dev.sh"
echo ""


