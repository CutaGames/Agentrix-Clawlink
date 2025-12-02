#!/bin/bash

# PayMind 依赖安装脚本 (英文文件名，避免编码问题)
# 自动安装 Node.js、PostgreSQL、Redis 和项目依赖

set -e  # 遇到错误立即退出

echo "=========================================="
echo "🚀 PayMind Dependency Installation"
echo "=========================================="
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Current directory: $SCRIPT_DIR"
echo ""

# 检查 Node.js
echo "[1/5] Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        echo "✅ Node.js installed: $(node -v)"
    else
        echo "⚠️  Node.js version too low ($(node -v)), need v18+"
        read -p "Install Node.js v18+? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
    fi
else
    echo "⚠️  Node.js not installed"
    read -p "Install Node.js? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        echo "❌ Node.js is required, exiting"
        exit 1
    fi
fi

echo ""

# 安装项目依赖
echo "[2/5] Installing project dependencies..."

if [ -f "package.json" ]; then
    echo "Installing root dependencies..."
    npm install
fi

if [ -d "backend" ]; then
    echo "Installing backend dependencies..."
    cd backend && npm install && cd "$SCRIPT_DIR"
fi

if [ -d "paymindfrontend" ]; then
    echo "Installing frontend dependencies..."
    cd paymindfrontend && npm install && cd "$SCRIPT_DIR"
fi

if [ -d "sdk-js" ]; then
    echo "Installing SDK dependencies..."
    cd sdk-js && npm install && cd "$SCRIPT_DIR"
fi

echo ""

# 配置环境变量
echo "[3/5] Configuring environment variables..."

if [ -d "backend" ] && [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-this-secret-key")
        if grep -q "JWT_SECRET=" backend/.env; then
            sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" backend/.env
        else
            echo "JWT_SECRET=$JWT_SECRET" >> backend/.env
        fi
        echo "✅ Backend .env created"
    fi
fi

if [ -d "paymindfrontend" ] && [ ! -f "paymindfrontend/.env.local" ]; then
    if [ -f "paymindfrontend/.env.local.example" ]; then
        cp paymindfrontend/.env.local.example paymindfrontend/.env.local
        echo "✅ Frontend .env.local created"
    fi
fi

echo ""

# PostgreSQL 提示
echo "[4/5] Database setup..."
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL installed"
    read -p "Create database and user? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo -u postgres psql <<EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'paymind') THEN
        CREATE USER paymind WITH PASSWORD 'paymind123';
    END IF;
END
\$\$;
SELECT 'CREATE DATABASE paymind OWNER paymind'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'paymind')\gexec
GRANT ALL PRIVILEGES ON DATABASE paymind TO paymind;
\q
EOF
        echo "✅ Database created"
    fi
else
    echo "⚠️  PostgreSQL not installed"
    echo "Install with: sudo apt-get install postgresql postgresql-contrib"
fi

echo ""

# 完成
echo "[5/5] Installation complete!"
echo ""
echo "=========================================="
echo "✅ Installation Summary"
echo "=========================================="
echo "  ✅ Node.js: $(node -v)"
echo "  ✅ npm: $(npm -v)"
echo ""
echo "📝 Next steps:"
echo "  1. Check environment files: backend/.env"
echo "  2. Run migrations: cd backend && npm run migration:run"
echo "  3. Start services: bash start.sh"
echo ""

