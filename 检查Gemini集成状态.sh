#!/bin/bash
# 检查 Gemini 集成和 Marketplace 功能的当前状态

echo "=== 检查 Gemini 集成状态 ==="
echo ""
echo "在服务器上执行以下命令："
echo ""

cat << 'EOF'
cd /var/www/agentrix-website/backend

# 1. 检查 Gemini Functions 端点
echo "=== 1. 检查 Gemini Functions ==="
curl -s http://localhost:3001/api/gemini/functions | jq '.' || curl -s http://localhost:3001/api/gemini/functions

# 2. 检查注册的 Skills
echo ""
echo "=== 2. 检查注册的电商 Skills ==="
pm2 logs agentrix-backend --lines 200 --nostream | grep -E "Skill registered|product_search|add_to_cart|checkout|payment" | head -20

# 3. 测试 Function Call 端点
echo ""
echo "=== 3. 测试 Function Call 端点 ==="
curl -X POST http://localhost:3001/api/gemini/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "function": {
      "name": "product_search",
      "arguments": {
        "query": "iPhone"
      }
    },
    "context": {
      "sessionId": "test-session-123"
    }
  }' | jq '.' || echo "测试失败"

# 4. 检查 Gemini 集成模块
echo ""
echo "=== 4. 检查 Gemini 集成模块文件 ==="
find src -name "*gemini*" -type f | head -10

# 5. 检查电商流程相关代码
echo ""
echo "=== 5. 检查电商流程代码 ==="
grep -r "product_search\|add_to_cart\|checkout" src/modules --include="*.ts" | head -10

# 6. 检查 Marketplace 搜索功能
echo ""
echo "=== 6. 检查 Marketplace API ==="
curl -s http://localhost:3001/api/marketplace/products/search?query=test | jq '.' || echo "Marketplace API 测试"

echo ""
echo "=== 检查完成 ==="
EOF

