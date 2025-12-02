#!/bin/bash

# PayMind V2.2 自动安装和配置脚本

set -e  # 遇到错误立即退出

echo "🚀 PayMind V2.2 自动安装和配置"
echo "=================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查Node.js
echo "📦 检查Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 Node.js${NC}"
    echo "   请先安装 Node.js (v18+): https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ 错误: Node.js 版本过低 (当前: $(node -v))，需要 v18+${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 版本: $(node -v)${NC}"

# 检查npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到 npm${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm 版本: $(npm -v)${NC}"
echo ""

# 配置后端环境变量
echo "⚙️  配置后端环境变量..."
cd backend

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ 已创建 backend/.env${NC}"
        
        # 生成随机JWT密钥
        JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/your-super-secret-jwt-key-change-in-production/$JWT_SECRET/" .env
        else
            # Linux
            sed -i "s/your-super-secret-jwt-key-change-in-production/$JWT_SECRET/" .env
        fi
        
        echo -e "${YELLOW}⚠️  请编辑 backend/.env 配置数据库连接信息${NC}"
    else
        echo -e "${YELLOW}⚠️  未找到 .env.example，请手动创建 .env 文件${NC}"
    fi
else
    echo -e "${GREEN}✅ backend/.env 已存在${NC}"
fi

cd ..

# 配置前端环境变量
echo "⚙️  配置前端环境变量..."
cd paymindfrontend

if [ ! -f ".env.local" ]; then
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        echo -e "${GREEN}✅ 已创建 paymindfrontend/.env.local${NC}"
    else
        # 创建默认的 .env.local
        cat > .env.local << EOF
# API配置
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Stripe配置（可选，用于测试支付）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# WalletConnect配置（可选）
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
EOF
        echo -e "${GREEN}✅ 已创建 paymindfrontend/.env.local${NC}"
    fi
else
    echo -e "${GREEN}✅ paymindfrontend/.env.local 已存在${NC}"
fi

cd ..

# 安装后端依赖
echo ""
echo "📦 安装后端依赖..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "正在安装后端依赖（这可能需要几分钟）..."
    npm install
    echo -e "${GREEN}✅ 后端依赖安装完成${NC}"
else
    echo -e "${GREEN}✅ 后端依赖已存在，跳过安装${NC}"
    echo "   如需重新安装，请运行: cd backend && rm -rf node_modules && npm install"
fi

cd ..

# 安装前端依赖
echo ""
echo "📦 安装前端依赖..."
cd paymindfrontend

if [ ! -d "node_modules" ]; then
    echo "正在安装前端依赖（这可能需要几分钟）..."
    npm install
    echo -e "${GREEN}✅ 前端依赖安装完成${NC}"
else
    echo -e "${GREEN}✅ 前端依赖已存在，跳过安装${NC}"
    echo "   如需重新安装，请运行: cd paymindfrontend && rm -rf node_modules && npm install"
fi

cd ..

# 检查PostgreSQL（可选）
echo ""
echo "🗄️  检查PostgreSQL..."
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL 已安装${NC}"
    echo -e "${YELLOW}⚠️  请确保PostgreSQL服务正在运行，并创建数据库${NC}"
    echo "   创建数据库命令:"
    echo "   psql -U postgres -c 'CREATE DATABASE paymind;'"
else
    echo -e "${YELLOW}⚠️  未找到 PostgreSQL${NC}"
    echo "   某些功能需要PostgreSQL，请根据需要安装"
fi

echo ""
echo "=================================="
echo -e "${GREEN}✅ 安装和配置完成！${NC}"
echo ""
echo "📝 下一步："
echo ""
echo "1. 配置数据库连接（如果使用PostgreSQL）:"
echo "   编辑 backend/.env，配置以下项："
echo "   - DB_HOST"
echo "   - DB_PORT"
echo "   - DB_USERNAME"
echo "   - DB_PASSWORD"
echo "   - DB_DATABASE"
echo ""
echo "2. 启动服务："
echo "   ./start-dev.sh"
echo "   或手动启动："
echo "   cd backend && npm run start:dev"
echo "   cd paymindfrontend && npm run dev"
echo ""
echo "3. 访问应用："
echo "   前端: http://localhost:3000"
echo "   API文档: http://localhost:3001/api/docs"
echo ""
echo "📚 更多信息请查看:"
echo "   - QUICK_START.md (快速启动指南)"
echo "   - BROWSER_TESTING.md (浏览器测试指南)"
echo ""


