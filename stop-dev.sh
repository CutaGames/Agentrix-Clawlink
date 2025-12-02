#!/bin/bash

# PayMind V2.2 停止开发环境脚本

echo "🛑 停止 PayMind V2.2 开发环境..."

# 从PID文件读取进程ID
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "停止后端服务 (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        rm .backend.pid
    else
        echo "后端服务未运行"
        rm .backend.pid
    fi
fi

if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "停止前端服务 (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        rm .frontend.pid
    else
        echo "前端服务未运行"
        rm .frontend.pid
    fi
fi

# 也尝试通过端口杀死进程
echo "清理端口占用..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo "✅ 服务已停止"


