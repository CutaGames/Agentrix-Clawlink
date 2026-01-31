#!/bin/bash

# 测试 HQ Backend 启动

cd "$(dirname "$0")"

echo "=== HQ Backend Test Run ==="
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo ""

# 检查 dist 是否存在
if [ ! -f "dist/main.js" ]; then
    echo "ERROR: dist/main.js not found. Run 'npm run build' first."
    exit 1
fi

echo "Starting HQ Backend..."
echo ""

# 设置环境变量并运行
export NODE_ENV=development
export HQ_PORT=3005
export HQ_DB_HOST=localhost
export HQ_DB_PORT=5432
export HQ_DB_USERNAME=agentrix
export HQ_DB_PASSWORD=agentrix_secure_2024
export HQ_DB_DATABASE=paymind

# 运行并捕获所有输出
node dist/main.js 2>&1

echo ""
echo "=== Process Exited ==="
