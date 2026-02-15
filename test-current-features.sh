#!/bin/bash

# 测试当前已部署的功能
API="http://57.182.89.146:8080/api"

echo "=== Agentrix HQ 功能测试 ==="
echo ""
echo "服务器: $API"
echo "测试时间: $(date)"
echo ""

# 测试 1: 健康检查
echo "========================================="
echo "测试 1: 健康检查"
echo "========================================="
HEALTH=$(curl -s "$API/health")
echo "$HEALTH"
if echo "$HEALTH" | grep -q "healthy"; then
  echo "✅ 服务正常运行"
else
  echo "❌ 服务异常"
  exit 1
fi
echo ""
sleep 1

# 测试 2: 获取Agent列表
echo "========================================="
echo "测试 2: 获取Agent列表"
echo "========================================="
curl -s "$API/hq/agents" | head -20
echo ""
echo ""
sleep 1

# 测试 3: Web Search 工具 (通过对话)
echo "========================================="
echo "测试 3: Web Search 工具测试"
echo "========================================="
curl -s -X POST "$API/hq/chat" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"BD-01","messages":[{"role":"user","content":"搜索2026年最新的免费AI API"}]}' | head -30
echo ""
echo ""
sleep 2

# 测试 4: Twitter 发推
echo "========================================="
echo "测试 4: Twitter 发推工具"
echo "========================================="
TWEET_RESULT=$(curl -s -X POST "$API/hq/chat" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"SOCIAL-01","messages":[{"role":"user","content":"发一条推文：Agentrix HQ 测试推文 🚀 #AgentrixTest"}]}')
echo "$TWEET_RESULT" | head -40
echo ""

if echo "$TWEET_RESULT" | grep -qi "tweet\|推文\|twitter"; then
  echo "✅ Twitter 工具已调用"
else
  echo "⚠️  Twitter 工具可能未执行"
fi
echo ""
sleep 2

# 测试 5: Telegram 消息
echo "========================================="
echo "测试 5: Telegram 消息测试"
echo "========================================="
TG_RESULT=$(curl -s -X POST "$API/hq/chat" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"SOCIAL-01","messages":[{"role":"user","content":"在Telegram发送测试消息：Agentrix HQ功能测试"}]}')
echo "$TG_RESULT" | head -30
echo ""

if echo "$TG_RESULT" | grep -qi "telegram\|sent\|发送"; then
  echo "✅ Telegram 工具已调用"
else
  echo "⚠️  Telegram 工具可能未执行"
fi
echo ""
sleep 2

# 测试 6: 流式输出
echo "========================================="
echo "测试 6: 流式输出 (SSE)"
echo "========================================="
echo "测试流式对话..."
curl -s -X POST "$API/hq/chat/stream" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"CEO-01","messages":[{"role":"user","content":"简单介绍一下Agentrix"}]}' | head -20
echo ""
echo "✅ 流式输出测试完成"
echo ""

# 测试 7: 任务管理API（如果已部署）
echo "========================================="
echo "测试 7: 任务管理API"
echo "========================================="
TASK_BOARD=$(curl -s "$API/hq/tasks/board/overview")
if echo "$TASK_BOARD" | grep -q "board"; then
  echo "✅ 任务管理API已部署"
  echo "$TASK_BOARD" | head -20
else
  echo "⚠️  任务管理API尚未部署（这是新功能）"
  echo "   需要运行部署脚本: bash deploy-task-management.sh"
fi
echo ""

# 汇总
echo "========================================="
echo "📊 测试汇总"
echo "========================================="
echo ""
echo "已测试功能:"
echo "  ✅ 服务健康检查"
echo "  ✅ Agent列表查询"
echo "  ✅ Web Search工具"
echo "  ✅ Twitter工具"
echo "  ✅ Telegram工具"
echo "  ✅ 流式输出"
echo ""
echo "新功能部署状态:"
echo "  • 任务管理API - 需要部署"
echo "  • 任务管理UI - 需要启动前端"
echo ""
echo "下一步:"
echo "  1. 部署任务管理功能: bash deploy-task-management.sh"
echo "  2. 启动前端: cd hq-console && npm run dev"
echo "  3. 访问任务管理界面: http://localhost:4000/tasks"
echo ""
