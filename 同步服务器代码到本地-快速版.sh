#!/bin/bash

# ========================================
# 快速同步：从服务器复制代码到本地
# ========================================

SERVER="root@129.226.152.88"
SERVER_PATH="/var/www/agentrix-website/backend"

echo "🚀 开始同步代码..."
echo ""

# 确保在 backend 目录
cd "$(dirname "$0")"

# 同步整个 src 目录
echo "📦 同步 src 目录..."
scp -r "$SERVER:$SERVER_PATH/src/*" ./src/

echo ""
echo "✅ 同步完成！"
echo ""
echo "验证文件:"
ls -la src/main.ts 2>/dev/null && echo "  ✅ src/main.ts" || echo "  ❌ src/main.ts 缺失"
ls -la src/app.module.ts 2>/dev/null && echo "  ✅ src/app.module.ts" || echo "  ❌ src/app.module.ts 缺失"
echo ""




