#!/bin/bash

# 部署任务管理系统到Agentrix HQ服务器
# 需要SSH密钥: agentrix.pem

set -e

SERVER="ubuntu@57.182.89.146"
PEM_KEY="agentrix.pem"
REMOTE_PATH="/home/ubuntu/agentrix-hq/hq-backend"

echo "=== 部署任务管理系统 ==="
echo ""

# 检查SSH密钥
if [ ! -f "$PEM_KEY" ]; then
  echo "❌ 找不到SSH密钥文件: $PEM_KEY"
  echo "请将agentrix.pem放在当前目录，或修改PEM_KEY变量"
  exit 1
fi

# 步骤 1: 上传TaskManagementController
echo "📤 步骤 1/5: 上传任务管理Controller..."
scp -i $PEM_KEY hq-backend/src/hq/tick/task-management.controller.ts \
  $SERVER:$REMOTE_PATH/src/hq/tick/

echo "✅ Controller上传完成"
echo ""

# 步骤 2: 上传修改的tick.module.ts
echo "📤 步骤 2/5: 上传tick.module.ts..."
scp -i $PEM_KEY hq-backend/src/hq/tick/tick.module.ts \
  $SERVER:$REMOTE_PATH/src/hq/tick/

echo "✅ Module上传完成"
echo ""

# 步骤 3: 检查entities是否存在
echo "📤 步骤 3/5: 检查必要的entities..."
ssh -i $PEM_KEY $SERVER << 'ENDSSH'
cd /home/ubuntu/agentrix-hq/hq-backend

# 检查agent-task.entity.ts
if [ ! -f "src/entities/agent-task.entity.ts" ]; then
  echo "⚠️  agent-task.entity.ts 不存在，需要上传"
  exit 1
fi

# 检查tick-execution.entity.ts
if [ ! -f "src/entities/tick-execution.entity.ts" ]; then
  echo "⚠️  tick-execution.entity.ts 不存在，需要上传"
  exit 1
fi

echo "✅ Entities检查通过"
ENDSSH

echo ""

# 步骤 4: 编译
echo "🔨 步骤 4/5: 编译TypeScript..."
ssh -i $PEM_KEY $SERVER << 'ENDSSH'
cd /home/ubuntu/agentrix-hq/hq-backend
npm run build

if [ $? -eq 0 ]; then
  echo "✅ 编译成功"
else
  echo "❌ 编译失败"
  exit 1
fi
ENDSSH

echo ""

# 步骤 5: 重启服务
echo "🔄 步骤 5/5: 重启服务..."
ssh -i $PEM_KEY $SERVER << 'ENDSSH'
cd /home/ubuntu/agentrix-hq/hq-backend
pm2 restart hq-backend

sleep 3

if pm2 list | grep -q "hq-backend.*online"; then
  echo "✅ 服务重启成功"
else
  echo "❌ 服务启动失败"
  pm2 logs hq-backend --lines 20
  exit 1
fi
ENDSSH

echo ""
echo "========================================="
echo "🎉 部署完成！"
echo "========================================="
echo ""
echo "测试任务管理API:"
echo "  curl http://57.182.89.146:8080/api/hq/tasks/board/overview"
echo ""
echo "查看日志:"
echo "  ssh -i $PEM_KEY $SERVER"
echo "  pm2 logs hq-backend"
echo ""
