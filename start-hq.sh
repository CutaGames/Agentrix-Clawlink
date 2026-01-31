#!/bin/bash
#
# HQ 独立启动脚本
# 用于开发环境快速启动 HQ 服务
#

set -e

echo "🛸 Starting Agentrix HQ Services..."
echo ""

# 切换到项目根目录
cd "$(dirname "$0")"

# 检查 PostgreSQL 是否运行
echo "📦 Checking PostgreSQL..."
if ! pg_isready -h localhost -p 5432 &>/dev/null; then
    echo "⚠️  PostgreSQL not running on default port, checking port 5433..."
    if ! pg_isready -h localhost -p 5433 &>/dev/null; then
        echo "❌ PostgreSQL not available. Please start it first."
        echo "   For Docker: docker-compose -f docker-compose.hq.yml up hq-database -d"
        exit 1
    fi
fi
echo "✅ PostgreSQL is running"

# 创建 HQ 数据库（如果不存在）
echo ""
echo "📦 Checking HQ database..."
if psql -h localhost -p 5432 -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw hq_database; then
    echo "✅ HQ database exists"
else
    echo "Creating HQ database..."
    psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE hq_database;" 2>/dev/null || true
    psql -h localhost -p 5432 -U postgres -c "CREATE USER hq_admin WITH PASSWORD 'hq_secure_2026';" 2>/dev/null || true
    psql -h localhost -p 5432 -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE hq_database TO hq_admin;" 2>/dev/null || true
    echo "✅ HQ database created"
fi

# 启动 HQ Backend
echo ""
echo "🚀 Starting HQ Backend..."
cd hq-backend

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# 启动开发服务器
echo ""
echo "🛸 Starting HQ Backend on port 3005..."
npm run start:dev &
HQ_BACKEND_PID=$!

# 等待后端启动
sleep 5

# 启动 HQ Console
cd ../hq-console
echo ""
echo "🎮 Starting HQ Console on port 4000..."
npm run dev &
HQ_CONSOLE_PID=$!

echo ""
echo "✅ HQ Services Started!"
echo ""
echo "📊 HQ Backend:  http://localhost:3005"
echo "📚 API Docs:    http://localhost:3005/api/docs"
echo "🎮 HQ Console:  http://localhost:4000"
echo ""
echo "Press Ctrl+C to stop all services"

# 等待并处理退出
trap "kill $HQ_BACKEND_PID $HQ_CONSOLE_PID 2>/dev/null; exit" INT TERM

wait
