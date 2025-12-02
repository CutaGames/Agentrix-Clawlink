#!/bin/bash

# 单独启动前端服务

cd /mnt/d/wsl/Ubuntu-24.04/Code/Paymind/paymind-website/paymindfrontend

# 检查.env.local文件
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local 文件不存在，正在创建..."
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        echo "✅ 已从 .env.local.example 创建 .env.local"
    else
        echo "❌ .env.local.example 不存在，创建默认 .env.local..."
        cat > .env.local << EOF
# API配置
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Stripe配置（可选）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# WalletConnect配置（可选）
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
EOF
        echo "✅ 已创建默认 .env.local 文件"
    fi
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📥 安装依赖..."
    npm install
fi

echo "🚀 启动前端服务..."
echo "   访问: http://localhost:3000"
echo "   按 Ctrl+C 停止"
echo ""

npm run dev

