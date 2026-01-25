#!/bin/bash

# HQ Workspace API 测试脚本
# 测试新增的工作区功能

HQ_URL="http://localhost:3005/api/hq"

echo "=== Agentrix HQ Workspace API Test ==="
echo ""

# 1. 测试项目信息获取
echo "1️⃣ 获取项目概览信息..."
curl -s "${HQ_URL}/workspace/info" | jq .
echo ""

# 2. 测试文件树获取
echo "2️⃣ 获取项目文件树 (depth=2)..."
curl -s "${HQ_URL}/workspace/tree?depth=2" | jq '.[0:3]'  # 只显示前3个
echo ""

# 3. 测试代码搜索
echo "3️⃣ 搜索代码中的'export default'..."
curl -s "${HQ_URL}/workspace/search?query=export%20default&pattern=*.tsx" | jq '.[0:3]'
echo ""

# 4. 测试文件读取
echo "4️⃣ 读取 package.json..."
curl -s "${HQ_URL}/workspace/read" \
  -H "Content-Type: application/json" \
  -d '{"path": "package.json"}' | jq '.content' | head -20
echo ""

# 5. 测试终端执行
echo "5️⃣ 执行命令: git branch --show-current..."
curl -s "${HQ_URL}/workspace/execute" \
  -H "Content-Type: application/json" \
  -d '{"command": "git branch --show-current"}' | jq .
echo ""

# 6. 测试 Agent 对话（让 Coder agent 分析项目）
echo "6️⃣ 让 Coder Agent 分析项目结构..."
curl -s "${HQ_URL}/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "AGENT-CODER-001",
    "messages": [
      {"role": "user", "content": "使用 get_workspace_info 工具查看项目信息，然后告诉我这是什么项目"}
    ]
  }' | jq '.content'
echo ""

echo "✅ 测试完成！"
