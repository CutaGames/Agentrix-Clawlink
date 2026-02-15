#!/bin/bash

# Agentrix HQ 完整部署脚本
# 包含流式输出 + 全部工具测试

set -e  # 遇到错误立即退出

SERVER="ubuntu@57.182.89.146"
PEM_KEY="agentrix.pem"
REMOTE_PATH="/home/ubuntu/agentrix-hq/hq-backend"

echo "=== Agentrix HQ 完整部署 ==="
echo ""

# 步骤 1: 上传修改的文件
echo "📤 步骤 1/6: 上传修改的文件..."
scp -i $PEM_KEY hq-backend/src/modules/ai/hq-ai.service.ts \
  $SERVER:$REMOTE_PATH/src/modules/ai/

scp -i $PEM_KEY hq-backend/src/modules/core/unified-chat.service.ts \
  $SERVER:$REMOTE_PATH/src/modules/core/

scp -i $PEM_KEY hq-backend/src/modules/core/hq-core.service.ts \
  $SERVER:$REMOTE_PATH/src/modules/core/

scp -i $PEM_KEY hq-backend/src/modules/core/hq-core.module.ts \
  $SERVER:$REMOTE_PATH/src/modules/core/

scp -i $PEM_KEY hq-backend/src/modules/tools/tools.module.ts \
  $SERVER:$REMOTE_PATH/src/modules/tools/

scp -i $PEM_KEY hq-backend/src/hq/tick/tick.module.ts \
  $SERVER:$REMOTE_PATH/src/hq/tick/

scp -i $PEM_KEY hq-backend/src/app.module.ts \
  $SERVER:$REMOTE_PATH/src/app.module.ts

# 创建并上传任务管理模块
ssh -i $PEM_KEY $SERVER "mkdir -p $REMOTE_PATH/src/hq/task"
scp -i $PEM_KEY hq-backend/src/hq/task/* \
  $SERVER:$REMOTE_PATH/src/hq/task/

# 上传前端任务页面
ssh -i $PEM_KEY $SERVER "mkdir -p /home/ubuntu/agentrix-hq/hq-console/src/app/tasks"
scp -i $PEM_KEY hq-console/src/app/tasks/page.tsx \
  $SERVER:/home/ubuntu/agentrix-hq/hq-console/src/app/tasks/page.tsx

echo "✅ 文件上传完成"
echo ""

# 步骤 2: 安装依赖
echo "📦 步骤 2/6: 安装依赖..."
ssh -i $PEM_KEY $SERVER << 'ENDSSH'
cd /home/ubuntu/agentrix-hq/hq-backend

# 安装 Twitter API 包
npm install twitter-api-v2

# 检查其他社交媒体包
npm install @discordjs/rest discord-api-types
npm install node-telegram-bot-api
npm install @sendgrid/mail
npm install @octokit/rest

echo "✅ 依赖安装完成"
ENDSSH

echo ""

# 步骤 3: 编译
echo "🔨 步骤 3/6: TypeScript 编译..."
ssh -i $PEM_KEY $SERVER << 'ENDSSH'
cd /home/ubuntu/agentrix-hq/hq-backend
npm run build

if [ $? -eq 0 ]; then
  echo "✅ 编译成功"
else
  echo "❌ 编译失败，请检查错误"
  exit 1
fi
ENDSSH

echo ""

# 步骤 4: 检查环境变量
echo "🔑 步骤 4/6: 检查环境变量..."
ssh -i $PEM_KEY $SERVER << 'ENDSSH'
cd /home/ubuntu/agentrix-hq/hq-backend

echo "检查必要的 API 密钥:"
echo ""

# Twitter
if grep -q "TWITTER_API_KEY=" .env 2>/dev/null; then
  echo "✅ Twitter API 已配置"
else
  echo "⚠️  Twitter API 未配置（需要 4 个变量）"
  echo "   TWITTER_API_KEY"
  echo "   TWITTER_API_SECRET"
  echo "   TWITTER_ACCESS_TOKEN"
  echo "   TWITTER_ACCESS_SECRET"
fi

# Discord
if grep -q "DISCORD_BOT_TOKEN=" .env 2>/dev/null; then
  echo "✅ Discord 已配置"
else
  echo "⚠️  Discord 未配置"
fi

# Telegram
if grep -q "TELEGRAM_BOT_TOKEN=" .env 2>/dev/null; then
  echo "✅ Telegram 已配置"
else
  echo "⚠️  Telegram 未配置"
fi

# GitHub
if grep -q "GITHUB_TOKEN=" .env 2>/dev/null; then
  echo "✅ GitHub 已配置"
else
  echo "⚠️  GitHub 未配置"
fi

# SendGrid (Email)
if grep -q "SENDGRID_API_KEY=" .env 2>/dev/null; then
  echo "✅ SendGrid (邮件) 已配置"
else
  echo "⚠️  SendGrid 未配置"
fi

echo ""
echo "提示: 未配置的 API 将无法使用对应工具"
echo "可以稍后在 .env 文件中添加"
ENDSSH

echo ""

# 步骤 5: 重启服务
echo "🔄 步骤 5/6: 重启服务..."
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

# 步骤 6: 验证部署
echo "✅ 步骤 6/6: 验证部署..."
sleep 2

# 测试健康检查
HEALTH=$(curl -s http://57.182.89.146:8080/api/health)
if echo "$HEALTH" | grep -q "ok"; then
  echo "✅ 健康检查通过"
else
  echo "❌ 健康检查失败"
  exit 1
fi

# 测试工具注册
echo ""
echo "查看工具注册日志:"
ssh -i $PEM_KEY $SERVER << 'ENDSSH'
pm2 logs hq-backend --lines 100 | grep -i "Tool Registry\|tools available" | tail -5
ENDSSH

echo ""
echo "🎨 步骤 7: 重启前端 Console..."
ssh -i $PEM_KEY $SERVER << 'ENDSSH'
cd /home/ubuntu/agentrix-hq/hq-console
npm run build
pm2 restart hq-console || pm2 start npm --name "hq-console" -- start
ENDSSH

echo "✅ 部署完成！"
echo "任务看板地址: http://57.182.89.146:4000/tasks"

echo ""
echo "========================================="
echo "🎉 部署完成！"
echo "========================================="
echo ""
echo "接下来测试功能："
echo "  bash test-all-tools.sh"
echo ""
echo "查看实时日志："
echo "  ssh -i $PEM_KEY $SERVER"
echo "  pm2 logs hq-backend"
echo ""
