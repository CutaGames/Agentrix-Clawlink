#!/bin/bash

# PayMind 服务启动助手 (WSL/Linux版本)

echo "=========================================="
echo "🚀 PayMind 服务启动助手"
echo "=========================================="
echo ""

echo "正在启动所有服务..."
echo ""

# 创建日志目录
mkdir -p logs

# 启动后端服务
echo "[1/3] 启动后端服务 (端口 3001)..."
cd backend
npm run start:dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo "后端 PID: $BACKEND_PID"
echo $BACKEND_PID > .backend.pid

# 等待后端启动
sleep 5

# 启动前端服务
echo "[2/3] 启动前端服务 (端口 3000)..."
cd paymindfrontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "前端 PID: $FRONTEND_PID"
echo $FRONTEND_PID > .frontend.pid

# 等待前端启动
sleep 3

# 启动SDK文档服务器
echo "[3/3] 启动SDK文档服务器 (端口 8080)..."
if [ -d "sdk-js/docs" ] && [ -f "sdk-js/docs/index.html" ]; then
    cd sdk-js/docs
    npx http-server -p 8080 -a 0.0.0.0 --cors > ../../../logs/sdk-docs.log 2>&1 &
    SDK_PID=$!
    cd ../../..
    echo "SDK文档 PID: $SDK_PID"
    echo $SDK_PID > .sdk-docs.pid
else
    echo "⚠️  SDK文档目录不存在，跳过启动"
    echo "   请先生成文档: cd sdk-js && npm run docs"
    SDK_PID=""
fi

echo ""
echo "✅ 所有服务已启动！"
echo ""
echo "📊 访问地址:"
echo "   🌐 前端应用:    http://localhost:3000"
echo "   🔧 后端API:     http://localhost:3001/api"
echo "   📖 API文档:     http://localhost:3001/api/docs"
echo "   📚 SDK文档:     http://localhost:8080"
echo ""
echo "💡 提示: 打开 本地服务导航.html 可以快速访问所有服务"
echo ""
echo "📋 查看日志:"
echo "   tail -f logs/backend.log"
echo "   tail -f logs/frontend.log"
if [ -n "$SDK_PID" ]; then
    echo "   tail -f logs/sdk-docs.log"
fi
echo ""
echo "🛑 停止服务:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
if [ -n "$SDK_PID" ]; then
    echo "   kill $SDK_PID"
fi
echo ""

