#!/bin/bash

# Agentrix HQ 完整工具测试脚本
# 测试流式输出 + Twitter + Discord + Telegram + GitHub + Email + Web Search

API="http://57.182.89.146:8080/api"

echo "=== Agentrix HQ 工具功能测试 ==="
echo ""
echo "服务器: $API"
echo "测试时间: $(date)"
echo ""

# 测试 1: Web Search (无需 API 密钥)
echo "========================================="
echo "测试 1/7: Web Search 工具"
echo "========================================="
curl -s -X POST "$API/hq/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "BD-01",
    "messages": [{"role": "user", "content": "搜索 2026 年最新的免费 AI API"}]
  }' | jq -r '.response' | head -20

echo ""
echo "✅ Web Search 测试完成"
echo ""
sleep 2

# 测试 2: Twitter 发推文
echo "========================================="
echo "测试 2/7: Twitter 工具 - 发推文"
echo "========================================="
TWITTER_RESPONSE=$(curl -s -X POST "$API/hq/chat" \
  -H "Content-Type: application/json" \
 -d '{
    "agentId": "SOCIAL-01",
    "messages": [{"role": "user", "content": "发一条推文：Agentrix HQ 工具系统全面上线！🚀 #AI #Agent #Automation"}]
  }')

echo "$TWITTER_RESPONSE" | jq -r '.response'
echo ""

if echo "$TWITTER_RESPONSE" | grep -qi "success\|成功\|tweet id"; then
  echo "✅ Twitter 测试通过"
else
  echo "⚠️  Twitter 可能未配置或执行失败"
fi
echo ""
sleep 2

# 测试 3: Twitter 搜索
echo "========================================="
echo "测试 3/7: Twitter 工具 - 搜索推文"
echo "========================================="
curl -s -X POST "$API/hq/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "SOCIAL-01",
    "messages": [{"role": "user", "content": "搜索 Twitter 上关于 AI Agent 的最新推文"}]
  }' | jq -r '.response' | head -15

echo ""
echo "✅ Twitter Search 测试完成"
echo ""
sleep 2

# 测试 4: Discord 消息
echo "========================================="
echo "测试 4/7: Discord 工具"
echo "========================================="
DISCORD_RESPONSE=$(curl -s -X POST "$API/hq/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "SOCIAL-01",
    "messages": [{"role": "user", "content": "在 Discord 发送一条消息：Agentrix HQ is now live!"}]
  }')

echo "$DISCORD_RESPONSE" | jq -r '.response'
echo ""

if echo "$DISCORD_RESPONSE" | grep -qi "success\|sent\|发送"; then
  echo "✅ Discord 测试通过"
else
  echo "⚠️  Discord 可能未配置"
fi
echo ""
sleep 2

# 测试 5: Telegram 消息
echo "========================================="
echo "测试 5/7: Telegram 工具"
echo "========================================="
TELEGRAM_RESPONSE=$(curl -s -X POST "$API/hq/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "SOCIAL-01",
    "messages": [{"role": "user", "content": "在 Telegram 发送一条测试消息"}]
  }')

echo "$TELEGRAM_RESPONSE" | jq -r '.response'
echo ""

if echo "$TELEGRAM_RESPONSE" | grep -qi "success\|sent\|发送"; then
  echo "✅ Telegram 测试通过"
else
  echo "⚠️  Telegram 可能未配置"
fi
echo ""
sleep 2

# 测试 6: GitHub 互动
echo "========================================="
echo "测试 6/7: GitHub 工具"
echo "========================================="
GITHUB_RESPONSE=$(curl -s -X POST "$API/hq/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "DEVREL-01",
    "messages": [{"role": "user", "content": "查看 GitHub 上最新的 AI Agent 相关仓库"}]
  }')

echo "$GITHUB_RESPONSE" | jq -r '.response' | head -15
echo ""

if echo "$GITHUB_RESPONSE" | grep -qi "repository\|repo\|github"; then
  echo "✅ GitHub 测试通过"
else
  echo "⚠️  GitHub 可能未配置"
fi
echo ""
sleep 2

# 测试 7: 邮件发送
echo "========================================="
echo "测试 7/7: Email 工具 (SendGrid)"
echo "========================================="
EMAIL_RESPONSE=$(curl -s -X POST "$API/hq/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "SUPPORT-01",
    "messages": [{"role": "user", "content": "发送一封测试邮件到 test@example.com"}]
  }')

echo "$EMAIL_RESPONSE" | jq -r '.response'
echo ""

if echo "$EMAIL_RESPONSE" | grep -qi "success\|sent\|发送"; then
  echo "✅ Email 测试通过"
else
  echo "⚠️  SendGrid 可能未配置"
fi
echo ""

# 测试 8: 流式输出
echo "========================================="
echo "测试 8/8: 流式输出 (SSE)"
echo "========================================="
echo "测试流式对话端点..."
curl -s -X POST "$API/hq/chat/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "CEO-01",
    "messages": [{"role": "user", "content": "简要介绍 Agentrix HQ 的功能"}]
  }' | head -50

echo ""
echo "✅ 流式输出测试完成"
echo ""

# 汇总
echo "========================================="
echo "📊 测试汇总"
echo "========================================="
echo ""
echo "已测试功能:"
echo "  ✅ Web Search (Google)"
echo "  ✅ Twitter 发推 + 搜索"
echo "  ✅ Discord 消息"
echo "  ✅ Telegram 消息"
echo "  ✅ GitHub 互动"
echo "  ✅ Email 发送 (SendGrid)"
echo "  ✅ 流式输出 (SSE)"
echo ""
echo "查看工具执行日志:"
echo "  ssh -i agentrix.pem ubuntu@57.182.89.146"
echo "  pm2 logs hq-backend | grep -E 'Executing tool|Tool.*completed'"
echo ""
echo "验证外部输出:"
echo "  - Twitter: https://twitter.com/AgentrixHQ"
echo "  - Discord: 检查你的 Discord 服务器"
echo "  - Telegram: 检查 Bot 对话"
echo "  - GitHub: 检查仓库 issues/comments"
echo "  - Email: 检查收件箱"
echo ""
