#!/bin/bash

# PayMind 项目依赖安装脚本 (WSL/Ubuntu)
# 自动安装 Node.js、PostgreSQL、Redis 和项目依赖

set -e  # 遇到错误立即退出

echo "=========================================="
echo "🚀 PayMind 项目依赖安装脚本"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ 请不要使用 root 用户运行此脚本${NC}"
   exit 1
fi

# 保存当前目录
ROOT_DIR=$(pwd)

echo -e "${BLUE}📋 检查系统环境...${NC}"
echo ""

# 1. 检查并安装 Node.js
echo -e "${YELLOW}[1/6] 检查 Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        echo -e "${GREEN}✅ Node.js 已安装: $(node -v)${NC}"
    else
        echo -e "${YELLOW}⚠️  Node.js 版本过低 ($(node -v))，需要 v18+${NC}"
        read -p "是否要安装 Node.js v18+? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "正在安装 Node.js..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
            echo -e "${GREEN}✅ Node.js 安装完成: $(node -v)${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Node.js 未安装${NC}"
    read -p "是否要安装 Node.js? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "正在安装 Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
        echo -e "${GREEN}✅ Node.js 安装完成: $(node -v)${NC}"
    else
        echo -e "${RED}❌ 需要 Node.js 才能继续，退出安装${NC}"
        exit 1
    fi
fi

# 检查 npm
if command -v npm &> /dev/null; then
    echo -e "${GREEN}✅ npm 已安装: $(npm -v)${NC}"
else
    echo -e "${RED}❌ npm 未安装，请先安装 Node.js${NC}"
    exit 1
fi

echo ""

# 2. 检查并安装 PostgreSQL
echo -e "${YELLOW}[2/6] 检查 PostgreSQL...${NC}"
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL 已安装: $(psql --version | head -n1)${NC}"
    read -p "是否要创建数据库和用户? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "创建数据库和用户..."
        sudo -u postgres psql <<EOF
-- 创建用户（如果不存在）
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'paymind') THEN
        CREATE USER paymind WITH PASSWORD 'paymind123';
    END IF;
END
\$\$;

-- 创建数据库（如果不存在）
SELECT 'CREATE DATABASE paymind OWNER paymind'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'paymind')\gexec

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE paymind TO paymind;
\q
EOF
        echo -e "${GREEN}✅ 数据库创建完成${NC}"
        echo -e "${BLUE}   数据库名: paymind${NC}"
        echo -e "${BLUE}   用户名: paymind${NC}"
        echo -e "${BLUE}   密码: paymind123${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PostgreSQL 未安装${NC}"
    read -p "是否要安装 PostgreSQL? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "正在安装 PostgreSQL..."
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        echo -e "${GREEN}✅ PostgreSQL 安装完成${NC}"
        
        # 创建数据库和用户
        echo "创建数据库和用户..."
        sudo -u postgres psql <<EOF
CREATE USER paymind WITH PASSWORD 'paymind123';
CREATE DATABASE paymind OWNER paymind;
GRANT ALL PRIVILEGES ON DATABASE paymind TO paymind;
\q
EOF
        echo -e "${GREEN}✅ 数据库创建完成${NC}"
    fi
fi

echo ""

# 3. 检查并安装 Redis (可选)
echo -e "${YELLOW}[3/6] 检查 Redis (可选)...${NC}"
if command -v redis-server &> /dev/null; then
    echo -e "${GREEN}✅ Redis 已安装: $(redis-server --version | head -n1)${NC}"
else
    echo -e "${YELLOW}⚠️  Redis 未安装（可选，用于缓存）${NC}"
    read -p "是否要安装 Redis? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "正在安装 Redis..."
        sudo apt-get install -y redis-server
        sudo systemctl start redis-server
        sudo systemctl enable redis-server
        echo -e "${GREEN}✅ Redis 安装完成${NC}"
    fi
fi

echo ""

# 4. 安装全局工具
echo -e "${YELLOW}[4/6] 安装全局工具...${NC}"
if ! command -v http-server &> /dev/null; then
    echo "正在安装 http-server..."
    sudo npm install -g http-server
    echo -e "${GREEN}✅ http-server 安装完成${NC}"
else
    echo -e "${GREEN}✅ http-server 已安装${NC}"
fi

echo ""

# 5. 安装项目依赖
echo -e "${YELLOW}[5/6] 安装项目依赖...${NC}"
echo ""

# 根目录依赖
if [ -f "package.json" ]; then
    echo -e "${BLUE}安装根目录依赖...${NC}"
    npm install
    echo -e "${GREEN}✅ 根目录依赖安装完成${NC}"
fi

# 后端依赖
if [ -d "backend" ]; then
    echo -e "${BLUE}安装后端依赖...${NC}"
    cd backend
    npm install
    cd "$ROOT_DIR"
    echo -e "${GREEN}✅ 后端依赖安装完成${NC}"
else
    echo -e "${RED}❌ backend 目录不存在${NC}"
fi

# 前端依赖
if [ -d "paymindfrontend" ]; then
    echo -e "${BLUE}安装前端依赖...${NC}"
    cd paymindfrontend
    npm install
    cd "$ROOT_DIR"
    echo -e "${GREEN}✅ 前端依赖安装完成${NC}"
else
    echo -e "${RED}❌ paymindfrontend 目录不存在${NC}"
fi

# SDK依赖
if [ -d "sdk-js" ]; then
    echo -e "${BLUE}安装 SDK 依赖...${NC}"
    cd sdk-js
    npm install
    cd "$ROOT_DIR"
    echo -e "${GREEN}✅ SDK 依赖安装完成${NC}"
else
    echo -e "${YELLOW}⚠️  sdk-js 目录不存在（可选）${NC}"
fi

echo ""

# 6. 配置环境变量
echo -e "${YELLOW}[6/6] 配置环境变量...${NC}"

# 后端环境变量
if [ -d "backend" ] && [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        echo "创建后端环境变量文件..."
        cp backend/.env.example backend/.env
        
        # 生成JWT密钥
        JWT_SECRET=$(openssl rand -base64 32)
        
        # 更新.env文件
        if grep -q "JWT_SECRET=" backend/.env; then
            sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" backend/.env
        else
            echo "JWT_SECRET=$JWT_SECRET" >> backend/.env
        fi
        
        # 更新数据库配置
        sed -i "s/DB_USERNAME=.*/DB_USERNAME=paymind/" backend/.env
        sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=paymind123/" backend/.env
        sed -i "s/DB_DATABASE=.*/DB_DATABASE=paymind/" backend/.env
        
        echo -e "${GREEN}✅ 后端环境变量文件已创建${NC}"
        echo -e "${BLUE}   文件位置: backend/.env${NC}"
        echo -e "${YELLOW}   ⚠️  请检查并更新配置（特别是数据库密码）${NC}"
    else
        echo -e "${YELLOW}⚠️  backend/.env.example 不存在，跳过${NC}"
    fi
else
    echo -e "${GREEN}✅ 后端环境变量文件已存在${NC}"
fi

# 前端环境变量
if [ -d "paymindfrontend" ] && [ ! -f "paymindfrontend/.env.local" ]; then
    if [ -f "paymindfrontend/.env.local.example" ]; then
        echo "创建前端环境变量文件..."
        cp paymindfrontend/.env.local.example paymindfrontend/.env.local
        echo -e "${GREEN}✅ 前端环境变量文件已创建${NC}"
    else
        echo -e "${YELLOW}⚠️  paymindfrontend/.env.local.example 不存在，跳过${NC}"
    fi
else
    echo -e "${GREEN}✅ 前端环境变量文件已存在${NC}"
fi

echo ""

# 完成
echo "=========================================="
echo -e "${GREEN}✅ 安装完成！${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}📋 安装总结:${NC}"
echo "  ✅ Node.js: $(node -v)"
echo "  ✅ npm: $(npm -v)"
if command -v psql &> /dev/null; then
    echo "  ✅ PostgreSQL: $(psql --version | head -n1 | cut -d' ' -f3)"
fi
if command -v redis-server &> /dev/null; then
    echo "  ✅ Redis: $(redis-server --version | head -n1 | cut -d' ' -f3)"
fi
echo ""
echo -e "${YELLOW}📝 下一步:${NC}"
echo "  1. 检查环境变量配置: backend/.env 和 paymindfrontend/.env.local"
echo "  2. 运行数据库迁移: cd backend && npm run migration:run"
echo "  3. 启动服务: ./WSL启动服务.sh 或 ./启动服务-简单版.bat"
echo ""
echo -e "${BLUE}💡 提示:${NC}"
echo "  - 数据库默认配置:"
echo "    用户名: paymind"
echo "    密码: paymind123"
echo "    数据库: paymind"
echo "  - 如需修改，请编辑 backend/.env"
echo ""

