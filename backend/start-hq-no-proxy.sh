#!/bin/bash

# 禁用所有代理环境变量
unset HTTP_PROXY
unset HTTPS_PROXY
unset http_proxy
unset https_proxy
unset ALL_PROXY
unset all_proxy
export NO_PROXY='*'

echo "🚀 启动 Agentrix HQ Standalone Server (无代理模式)"
echo "📍 端口: 3005"
echo "🌐 网络: 直连模式 (已禁用所有代理)"
echo ""

# 切换到backend目录
cd "$(dirname "$0")"

# 停止旧进程
echo "🔍 检查并停止旧的 HQ 进程..."
pkill -9 -f 'main-hq' 2>/dev/null || true
pkill -9 -f 'ts-node.*hq' 2>/dev/null || true
sleep 3

# 显示环境变量状态
echo "📋 当前代理设置:"
echo "  HTTP_PROXY: ${HTTP_PROXY:-未设置}"
echo "  HTTPS_PROXY: ${HTTPS_PROXY:-未设置}"
echo "  NO_PROXY: ${NO_PROXY}"
echo ""

# 启动服务
echo "✨ 启动 HQ 服务..."
exec npm run start:hq
