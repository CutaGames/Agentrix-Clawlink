#!/bin/bash

echo "=== 测试CEO Agent对话 ==="
curl -s -X POST http://localhost:3005/api/hq/chat \
  -H 'Content-Type: application/json' \
  -d '{"agentId":"ceo","messages":[{"role":"user","content":"你好"}]}'

echo ""
echo ""
echo "=== 测试知识库查询 ==="
curl -s -X POST http://localhost:3005/api/hq/chat \
  -H 'Content-Type: application/json' \
  -d '{"agentId":"architect","messages":[{"role":"user","content":"Agentrix的技术架构是什么？"}]}'

echo ""
echo ""
echo "=== 测试健康检查 ==="
curl -s http://localhost:3005/api/health

echo ""
