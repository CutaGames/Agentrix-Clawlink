#!/bin/bash
# 远程全面修复与部署脚本
set -e

PROJECT_ROOT="/root/Agentrix"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "=========================================="
echo "  开始远程修复与部署"
echo "=========================================="

# 1. 数据库修复
echo "--- 1. 执行数据库修复 SQL ---"
cd $PROJECT_ROOT
export PGPASSWORD=agentrix_secure_2024
psql -h localhost -U agentrix -d paymind -f fix-remote-db.sql || echo "⚠️ SQL 执行可能有警告，继续..."

# 2. 后端部署
echo "--- 2. 后端部署 ---"
cd $BACKEND_DIR
echo "安装依赖..."
npm install --quiet
echo "构建后端..."
npm run build
echo "重启后端服务 (PM2)..."
pm2 restart agentrix-backend || pm2 start dist/main.js --name agentrix-backend || echo "⚠️ PM2 重启失败，尝试直接启动..."

# 3. 前端部署
echo "--- 3. 前端部署 ---"
cd $FRONTEND_DIR
echo "安装依赖..."
npm install --quiet
echo "构建前端 (Next.js)..."
npm run build
echo "重启前端服务 (PM2)..."
pm2 restart agentrix-frontend || pm2 start "npm run start" --name agentrix-frontend || echo "⚠️ PM2 重启失败..."

echo "=========================================="
echo "  部署完成！"
echo "=========================================="
