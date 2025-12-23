#!/bin/bash
set -e

echo "========================================"
echo "🔧 QuickPay Session 完整修复"
echo "========================================"
echo ""

cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website

# 1. 同步entity文件
echo "📋 步骤 1/5: 同步entity文件..."
cp backend/src/entities/agent-session.entity.ts src/entities/agent-session.entity.ts
echo "   ✅ Entity文件已同步（backend → root）"

# 2. 验证文件一致性
echo ""
echo "🔍 步骤 2/5: 验证文件一致性..."
if diff -q backend/src/entities/agent-session.entity.ts src/entities/agent-session.entity.ts >/dev/null; then
    echo "   ✅ 文件完全一致"
else
    echo "   ❌ 文件仍有差异！"
    exit 1
fi

# 3. 停止后端
echo ""
echo "🛑 步骤 3/5: 停止后端服务..."
pkill -f 'ts-node-dev' || echo "   ℹ️  没有运行中的进程"
sleep 2

# 4. 清理所有缓存
echo ""
echo "🧹 步骤 4/5: 清理缓存..."
cd backend
rm -rf .ts-node-dev
rm -rf node_modules/.cache
rm -rf dist
echo "   ✅ 缓存已清理"

# 5. 重启后端（不在后台）
echo ""
echo "🚀 步骤 5/5: 启动后端..."
echo "   执行: npm run start:dev"
echo ""
npm run start:dev
