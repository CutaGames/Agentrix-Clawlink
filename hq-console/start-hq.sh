#!/bin/bash
# Start the Agentrix CEO HQ Console on Port 4000
echo "🚀 Starting Agentrix CEO HQ Console on http://localhost:4000..."
cd "$(dirname "$0")"
# 使用 PORT=4000 环境变量强制修改端口，避免冲突
PORT=4000 npm run dev
