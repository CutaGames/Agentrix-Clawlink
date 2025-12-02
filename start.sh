#!/bin/bash

# PayMind 服务启动脚本 (英文文件名)
# 启动前端、后端、SDK文档服务器

echo "=========================================="
echo "🚀 PayMind Services Startup"
echo "=========================================="
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 创建日志目录
mkdir -p logs

# 启动后端
echo "Starting backend service (http://localhost:3001)..."
cd backend
npm run start:dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd "$SCRIPT_DIR"
echo "Backend PID: $BACKEND_PID"

sleep 5

# 启动前端
echo "Starting frontend service (http://localhost:3000)..."
cd paymindfrontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"
echo "Frontend PID: $FRONTEND_PID"

sleep 3

# 启动SDK文档服务器
echo "Starting SDK docs server (http://localhost:8080)..."
if [ -d "sdk-js/docs" ] && [ -f "sdk-js/docs/index.html" ]; then
    cd sdk-js/docs
    npx http-server -p 8080 -a 0.0.0.0 --cors > ../../../logs/sdk-docs.log 2>&1 &
    SDK_PID=$!
    cd "$SCRIPT_DIR"
    echo "SDK docs PID: $SDK_PID"
else
    echo "⚠️  SDK文档目录不存在，跳过启动"
    echo "   请先生成文档: cd sdk-js && npm run docs"
    SDK_PID=""
fi

# 保存PID
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid
if [ -n "$SDK_PID" ]; then
    echo $SDK_PID > .sdk-docs.pid
fi

echo ""
echo "✅ All services started!"
echo ""
echo "📊 Access URLs:"
echo "  🌐 Frontend:    http://localhost:3000"
echo "  🔧 Backend API: http://localhost:3001/api"
echo "  📖 API Docs:    http://localhost:3001/api/docs"
echo "  📚 SDK Docs:    http://localhost:8080"
echo ""
echo "📋 View logs:"
echo "  tail -f logs/backend.log"
echo "  tail -f logs/frontend.log"
echo "  tail -f logs/sdk-docs.log"
echo ""
echo "🛑 Stop services: bash stop.sh"
echo ""

# 等待用户中断
trap "echo ''; echo 'Stopping services...'; \
      [ -f .backend.pid ] && kill \$(cat .backend.pid) 2>/dev/null; \
      [ -f .frontend.pid ] && kill \$(cat .frontend.pid) 2>/dev/null; \
      [ -f .sdk-docs.pid ] && kill \$(cat .sdk-docs.pid) 2>/dev/null; \
      rm -f .backend.pid .frontend.pid .sdk-docs.pid; \
      echo '✅ All services stopped'; exit" INT TERM

wait

