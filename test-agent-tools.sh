#!/bin/bash

# Agent 工具执行测试脚本
# 测试 Agent 是否能真实调用工具（发推文、搜索资源等）

echo "=== Agent 工具执行测试 ==="
echo ""

TOKYO_API="http://57.182.89.146:8080/api"

echo "1. 测试 SOCIAL-01 发推文..."
RESPONSE=$(curl -s -X POST "${TOKYO_API}/hq/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "agentCode": "SOCIAL-01",
    "message": "发一条推文说：Agentrix HQ 工具执行系统上线了！🚀 #AI #Agent",
    "mode": "staff"
  }')

echo "响应: $RESPONSE" | head -5
echo ""

if echo "$RESPONSE" | grep -q "twitter_post"; then
  echo "✅ SOCIAL-01 调用了 twitter_post 工具"
else
  echo "⚠️  未检测到工具调用，可能是文本回复"
fi
echo ""

echo "2抽测 BD-01 搜索免费资源..."
RESPONSE2=$(curl -s -X POST "${TOKYO_API}/hq/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "agentCode": "BD-01",
    "message": "帮我搜索2026年最新的免费 AI API 资源",
    "mode": "staff"
  }')

echo "响应: $RESPONSE2" | head -5
echo ""

if echo "$RESPONSE2" | grep -q "web_search"; then
  echo "✅ BD-01 调用了 web_search 工具"
else
  echo "⚠️  未检测到工具调用"
fi
echo ""

echo "3. 查看服务器日志（需要 SSH 访问）..."
echo "   执行: ssh -i agentrix.pem ubuntu@57.182.89.146"
echo "   然后: pm2 logs hq-backend --lines 50 | grep -E 'tool|twitter|execute'"
echo ""

echo "4. 检查 Twitter 账号是否有新推文..."
echo "   访问: https://twitter.com/AgentrixHQ"
echo ""

echo "=== 预期结果 ==="
echo "✅ 日志中应看到:"
echo "   [ToolService] Executing tool: twitter_post (agent: SOCIAL-01)"
echo "   [ToolService] Tool twitter_post completed (success: true)"
echo ""
echo "✅ Twitter 账号应有新推文"
echo ""
echo "❌ 如果没有工具调用，检查:"
echo "   1. ToolsModule 是否正确导入"
echo "   2. Twitter API 密钥是否配置"
echo "   3. 后端服务是否重启"
echo ""
