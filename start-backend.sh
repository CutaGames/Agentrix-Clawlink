#!/bin/bash
# 启动后端服务的脚本

cd "$(dirname "$0")/backend"

# 检查端口是否被占用
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口 3001 已被占用，尝试关闭现有进程..."
    kill $(lsof -Pi :3001 -sTCP:LISTEN -t) 2>/dev/null
    sleep 2
fi

echo "🚀 启动 Agentrix Backend..."
echo "📝 日志将输出到控制台"
echo ""

# 直接运行，不使用nohup或后台进程
exec npm run start:dev
