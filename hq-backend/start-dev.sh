#!/bin/bash
# HQ Backend Development Startup Script

cd "$(dirname "$0")"

# 设置环境变量
export HQ_PORT=3005
export HQ_DB_HOST=localhost
export HQ_DB_PORT=5432
export HQ_DB_USERNAME=agentrix
export HQ_DB_PASSWORD=agentrix_secure_2024
export HQ_DB_DATABASE=paymind

echo "🚀 Starting HQ Backend..."
echo "  - Port: $HQ_PORT"
echo "  - Database: $HQ_DB_DATABASE@$HQ_DB_HOST:$HQ_DB_PORT"

# 运行服务
node dist/main.js
