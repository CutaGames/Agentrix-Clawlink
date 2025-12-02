#!/bin/bash

# PayMind 停止所有服务脚本

echo "=========================================="
echo "🛑 停止 PayMind 所有服务"
echo "=========================================="
echo ""

# 读取PID文件
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "停止后端服务 (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        rm .backend.pid
    fi
fi

if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "停止前端服务 (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        rm .frontend.pid
    fi
fi

if [ -f ".sdk-docs.pid" ]; then
    SDK_PID=$(cat .sdk-docs.pid)
    if kill -0 $SDK_PID 2>/dev/null; then
        echo "停止SDK文档服务 (PID: $SDK_PID)..."
        kill $SDK_PID
        rm .sdk-docs.pid
    fi
fi

# 通过端口停止
echo "检查并停止占用端口的进程..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:8080 | xargs kill -9 2>/dev/null

# 停止所有npm进程（谨慎使用）
# pkill -f "npm run start:dev"
# pkill -f "npm run dev"
# pkill -f "http-server"

echo ""
echo "✅ 所有服务已停止"
echo ""

