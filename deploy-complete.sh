#!/bin/bash

# Agentrix HQ 完整部署脚本 - 工具执行 + 任务管理系统
# 包含：
# 1. 工具执行功能（UnifiedChatService、HqAIService等）
# 2. 任务管理系统（TaskManagementController）

set -e

SERVER="ubuntu@57.182.89.146"
PEM_KEY="/c/Users/15279/Desktop/agentrix.pem"
REMOTE_PATH="/home/ubuntu/hq-backend"

echo "=== Agentrix HQ 完整部署 ==="
echo "包含: 工具执行功能 + 任务管理系统"
echo ""

# 检查SSH密钥
if [ ! -f "$PEM_KEY" ]; then
  echo "❌ 找不到SSH密钥文件: $PEM_KEY"
  echo "请将agentrix.pem放在当前目录"
  echo ""
  echo "或者使用密码登录手动部署："
  echo "  ssh ubuntu@57.182.89.146"
  exit 1
fi

# ==================== 步骤 1: 上传工具执行相关文件 ====================
echo "📤 步骤 1/7: 上传工具执行相关文件..."

# AI Service (支持工具调用)
scp -i $PEM_KEY hq-backend/src/modules/ai/hq-ai.service.ts \
  $SERVER:$REMOTE_PATH/src/modules/ai/

# UnifiedChatService (工具执行循环)
scp -i $PEM_KEY hq-backend/src/modules/core/unified-chat.service.ts \
  $SERVER:$REMOTE_PATH/src/modules/core/

# HqCoreService (调用UnifiedChatService)
scp -i $PEM_KEY hq-backend/src/modules/core/hq-core.service.ts \
  $SERVER:$REMOTE_PATH/src/modules/core/

# HqCoreModule (导入ToolsModule)
scp -i $PEM_KEY hq-backend/src/modules/core/hq-core.module.ts \
  $SERVER:$REMOTE_PATH/src/modules/core/

# ToolsModule
ssh -i $PEM_KEY $SERVER "mkdir -p $REMOTE_PATH/src/modules/tools"
scp -i $PEM_KEY hq-backend/src/modules/tools/tools.module.ts \
  $SERVER:$REMOTE_PATH/src/modules/tools/

echo "✅ 工具执行文件上传完成"
echo ""

# ==================== 步骤 2: 上传任务管理相关文件 ====================
echo "📤 步骤 2/7: 上传任务管理相关文件..."

# TaskManagementController
scp -i $PEM_KEY hq-backend/src/hq/tick/task-management.controller.ts \
  $SERVER:$REMOTE_PATH/src/hq/tick/

# TickModule (导入TaskManagementController)
scp -i $PEM_KEY hq-backend/src/hq/tick/tick.module.ts \
  $SERVER:$REMOTE_PATH/src/hq/tick/

echo "✅ 任务管理文件上传完成"
echo ""

# ==================== 步骤 3: 安装依赖 ====================
echo "📦 步骤 3/7: 安装社交媒体工具依赖..."

ssh -i $PEM_KEY $SERVER << 'ENDSSH'
cd /home/ubuntu/agentrix-hq/hq-backend

echo "安装 Twitter API..."
npm install twitter-api-v2 --save

echo "安装 Discord..."
npm install @discordjs/rest discord-api-types --save

echo "安装 Telegram..."
npm install node-telegram-bot-api --save
npm install @types/node-telegram-bot-api --save-dev

echo "安装 GitHub Octokit..."
npm install @octokit/rest --save

echo "安装 SendGrid (Email)..."
npm install @sendgrid/mail --save

echo "✅ 依赖安装完成"
ENDSSH

echo ""

# ==================== 步骤 4: 检查环境变量 ====================
echo "🔑 步骤 4/7: 检查环境变量配置..."

ssh -i $PEM_KEY $SERVER << 'ENDSSH'
cd /home/ubuntu/agentrix-hq/hq-backend

echo "检查 API 密钥配置："
echo ""

# 检查各项配置
if grep -q "TWITTER_API_KEY=" .env 2>/dev/null && grep -q "TWITTER_ACCESS_TOKEN=" .env 2>/dev/null; then
  echo "✅ Twitter API 已配置"
else
  echo "⚠️  Twitter API 未完整配置"
fi

if grep -q "DISCORD_TOKEN=" .env 2>/dev/null; then
  echo "✅ Discord 已配置"
else
  echo "⚠️  Discord 未配置"
fi

if grep -q "TELEGRAM_BOT_TOKEN=" .env 2>/dev/null; then
  echo "✅ Telegram 已配置"
else
  echo "⚠️  Telegram 未配置"
fi

if grep -q "GITHUB_TOKEN=" .env 2>/dev/null; then
  echo "✅ GitHub 已配置"
else
  echo "⚠️  GitHub 未配置"
fi

if grep -q "SMTP_USER=" .env 2>/dev/null; then
  echo "✅ SMTP (邮件) 已配置"
else
  echo "⚠️  SMTP 未配置"
fi

echo ""
ENDSSH

echo ""

# ==================== 步骤 5: 编译 ====================
echo "🔨 步骤 5/7: 编译 TypeScript..."

ssh -i $PEM_KEY $SERVER << 'ENDSSH'
cd /home/ubuntu/agentrix-hq/hq-backend

npm run build

if [ $? -eq 0 ]; then
  echo "✅ 编译成功"
else
  echo "❌ 编译失败，请检查错误"
  npm run build 2>&1 | tail -30
  exit 1
fi
ENDSSH

echo ""

# ==================== 步骤 6: 重启服务 ====================
echo "🔄 步骤 6/7: 重启服务..."

ssh -i $PEM_KEY $SERVER << 'ENDSSH'
cd /home/ubuntu/agentrix-hq/hq-backend

pm2 restart hq-backend

sleep 5

if pm2 list | grep -q "hq-backend.*online"; then
  echo "✅ 服务重启成功"
else
  echo "❌ 服务启动失败"
  echo "查看日志："
  pm2 logs hq-backend --lines 30 --nostream
  exit 1
fi
ENDSSH

echo ""

# ==================== 步骤 7: 验证部署 ====================
echo "✅ 步骤 7/7: 验证部署..."

sleep 3

# 健康检查
echo "1. 健康检查..."
HEALTH=$(curl -s http://57.182.89.146:8080/api/health)
if echo "$HEALTH" | grep -q "healthy"; then
  echo "   ✅ 服务健康"
else
  echo "   ❌ 服务异常"
  exit 1
fi

# 测试任务管理API
echo "2. 测试任务管理API..."
TASK_API=$(curl -s http://57.182.89.146:8080/api/hq/tasks/board/overview)
if echo "$TASK_API" | grep -q "board"; then
  echo "   ✅ 任务管理API正常"
else
  echo "   ⚠️  任务管理API未响应（可能需要先创建Agent）"
fi

# 检查工具注册日志
echo "3. 检查工具注册..."
ssh -i $PEM_KEY $SERVER << 'ENDSSH'
pm2 logs hq-backend --lines 200 --nostream | grep -i "tool.*registered\|tools available" | tail -3
ENDSSH

echo ""
echo "========================================="
echo "🎉 部署完成！"
echo "========================================="
echo ""
echo "下一步："
echo ""
echo "1️⃣ 测试工具执行："
echo "   bash test-all-tools.sh"
echo ""
echo "2️⃣ 查看任务管理界面："
echo "   cd hq-console && npm run dev"
echo "   访问: http://localhost:4000/tasks"
echo ""
echo "3️⃣ 查看实时日志："
echo "   ssh -i $PEM_KEY $SERVER"
echo "   pm2 logs hq-backend --lines 50"
echo ""
echo "4️⃣ 验证Twitter发推："
echo "   访问: https://x.com/AgentrixHQ"
echo ""
