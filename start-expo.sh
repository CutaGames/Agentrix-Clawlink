#!/bin/bash
# Expo 启动脚本 - 解决 WSL 代理问题

# 清除所有代理设置
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY no_proxy NO_PROXY

# 进入项目目录
cd "$(dirname "$0")"

# 杀掉占用 8081 端口的进程
echo "🔍 检查端口 8081..."
PID=$(lsof -t -i:8081 2>/dev/null)
if [ -n "$PID" ]; then
  echo "⚠️  终止占用端口 8081 的进程 (PID: $PID)"
  kill -9 $PID 2>/dev/null
  sleep 1
fi

echo "🚀 启动 Expo 开发服务器..."
echo "📱 使用 Expo Go 扫描二维码进行测试"
echo ""

# 直接启动，不使用 CI 模式以便交互
npx expo start --offline --port 8081
