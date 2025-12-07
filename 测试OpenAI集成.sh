#!/bin/bash
# 测试 OpenAI 集成

echo "=== 测试 OpenAI 集成 ==="
echo ""

# 1. 测试 Functions 端点（格式化输出）
echo "1. 测试 /api/openai/functions"
echo "----------------------------"
curl -s http://localhost:3001/api/openai/functions | python3 -m json.tool | head -100
echo ""

# 2. 测试 Function Call
echo "2. 测试 /api/openai/function-call"
echo "--------------------------------"
curl -X POST http://localhost:3001/api/openai/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "function": {
      "name": "search_agentrix_products",
      "arguments": {"query": "iPhone"}
    },
    "context": {"sessionId": "test-123"}
  }' | python3 -m json.tool | head -50
echo ""

# 3. 测试对话接口（需要 OPENAI_API_KEY）
echo "3. 测试 /api/openai/chat"
echo "-----------------------"
echo "注意：需要配置 OPENAI_API_KEY 环境变量"
curl -X POST http://localhost:3001/api/openai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "我要买 iPhone 15"}
    ],
    "context": {
      "sessionId": "test-123"
    }
  }' 2>&1 | head -50
echo ""

echo "=== 测试完成 ==="

