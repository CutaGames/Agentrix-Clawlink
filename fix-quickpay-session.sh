#!/bin/bash

echo "========================================"
echo "QuickPay Session 修复脚本"
echo "========================================"

# 1. 停止后端服务
echo ""
echo "🛑 步骤 1/5: 停止后端服务..."
pkill -f 'ts-node-dev' || echo "   ℹ️  没有运行中的后端进程"
pkill -f 'node.*main.ts' || echo "   ℹ️  没有运行中的node进程"
sleep 2

# 2. 清理TypeORM缓存和编译缓存
echo ""
echo "🧹 步骤 2/5: 清理缓存..."
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend

# 清理ts-node-dev缓存
rm -rf .ts-node-dev 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# 清理编译输出
rm -rf dist 2>/dev/null || true

echo "   ✅ 缓存已清理"

# 3. 验证数据库Schema
echo ""
echo "🔍 步骤 3/5: 验证数据库Schema..."
PGPASSWORD=agentrix_secure_2024 psql -h 127.0.0.1 -U agentrix -d paymind -c "
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'agent_sessions' 
  AND column_name IN ('user_id', 'userId')
ORDER BY column_name;" 2>/dev/null | grep -E "(user_id|userId)" || echo "   ⚠️  无法验证数据库"

# 4. 验证Entity定义
echo ""
echo "📝 步骤 4/5: 验证Entity定义..."
if grep -q "@Column({ name: 'user_id'" src/entities/agent-session.entity.ts; then
    echo "   ✅ Entity定义正确（使用 user_id）"
else
    echo "   ❌ Entity定义错误，需要修复"
    exit 1
fi

# 5. 重启后端服务
echo ""
echo "🚀 步骤 5/5: 重启后端服务..."
echo "   启动命令: npm run start:dev"
echo ""
echo "========================================"
echo "⚠️  请手动执行以下命令重启后端："
echo "   cd backend"
echo "   npm run start:dev"
echo "========================================"
echo ""
echo "验证步骤:"
echo "1. 等待后端启动（看到 'Nest application successfully started'）"
echo "2. 在前端创建QuickPay Session"
echo "3. 检查后端日志是否有 'Session created' 消息"
echo ""
