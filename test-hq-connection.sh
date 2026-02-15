#!/bin/bash

# HQ Console 连接测试脚本
# 测试本地前端 (localhost:4000) 到云端后端的连接

echo "=== HQ Console 连接诊断 ==="
echo ""

echo "1. 测试 Tokyo 服务器健康状态..."
TOKYO_HEALTH=$(curl -s -m 5 http://57.182.89.146:8080/api/health)
if [ $? -eq 0 ]; then
  echo "✅ Tokyo 服务器在线: $TOKYO_HEALTH"
else
  echo "❌ Tokyo 服务器离线"
fi
echo ""

echo "2. 测试 Agent 列表 API..."
AGENTS=$(curl -s -m 5 http://57.182.89.146:8080/api/hq/agents)
if [ $? -eq 0 ]; then
  AGENT_COUNT=$(echo "$AGENTS" | grep -o '"code"' | wc -l)
  echo "✅ Agent API 正常，共 $AGENT_COUNT 个 Agent"
else
  echo "❌ Agent API 失败"
fi
echo ""

echo "3. 测试 Tick 系统状态..."
TICK_STATUS=$(curl -s -m 5 http://57.182.89.146:8080/api/hq/tick/executions?limit=1)
if [ $? -eq 0 ]; then
  echo "✅ Tick API 正常"
  echo "$TICK_STATUS" | head -5
else
  echo "❌ Tick API 失败"
fi
echo ""

echo "4. 测试聊天流式 API..."
CHAT_TEST=$(curl -s -m 5 -X POST http://57.182.89.146:8080/api/hq/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"agentCode":"CEO-01","message":"Hello","sessionId":"test"}' 2>&1)
if [ $? -eq 0 ]; then
  echo "✅ 聊天 API 可达"
else
  echo "❌ 聊天 API 失败: $CHAT_TEST"
fi
echo ""

echo "5. 检查本地 HQ Console 运行状态..."
LOCAL_HQ=$(curl -s -m 2 http://localhost:4000 2>&1 | head -1)
if [ $? -eq 0 ]; then
  echo "✅ 本地 HQ Console 运行中 (http://localhost:4000)"
else
  echo "❌ 本地 HQ Console 未运行"
  echo "   执行: cd hq-console && npm run dev"
fi
echo ""

echo "6. 浏览器测试指令..."
echo "   打开浏览器访问: http://localhost:4000"
echo "   在浏览器 Console 执行:"
echo ""
echo "   // 测试连接"
echo "   fetch('http://57.182.89.146:8080/api/hq/agents').then(r => r.json()).then(console.log)"
echo ""
echo "   // 测试聊天"
echo "   fetch('http://57.182.89.146:8080/api/hq/chat/stream', {"
echo "     method: 'POST',"
echo "     headers: {'Content-Type': 'application/json'},"
echo "     body: JSON.stringify({agentCode:'CEO-01',message:'测试',sessionId:'test'})"
echo "   }).then(r => console.log(r.status))"
echo""

echo "=== 诊断完成 ==="
