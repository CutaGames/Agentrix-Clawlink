#!/bin/bash

# 启动前端服务（自动处理端口占用）

echo "=========================================="
echo "🚀 启动Agentrix前端服务"
echo "=========================================="
echo ""

# 检查并释放3000端口
echo "[1/3] 检查端口3000..."
PID=$(lsof -ti:3000 2>/dev/null)

if [ -n "$PID" ]; then
    echo "发现占用端口的进程: $PID"
    echo "正在终止..."
    kill -9 $PID 2>/dev/null
    sleep 2
    echo "✅ 进程已终止"
else
    echo "✅ 端口3000可用"
fi

# 清除缓存
echo "[2/3] 清除Next.js缓存..."
cd agentrixfrontend
if [ -d ".next" ]; then
    rm -rf .next
    echo "✅ 缓存已清除"
else
    echo "✅ 无需清除缓存"
fi

# 启动服务
echo "[3/3] 启动前端服务..."
echo ""
echo "📊 服务信息:"
echo "   🌐 前端应用:    http://localhost:3000"
echo "   🤖 Agent页面:   http://localhost:3000/agent"
echo ""
echo "正在启动..."
npm run dev

