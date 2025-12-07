#!/bin/bash
# 检查并完善 Gemini 电商 Functions

echo "=== 检查 Gemini 电商 Functions ==="
echo ""
echo "在服务器上执行以下命令："
echo ""

cat << 'EOF'
cd /var/www/agentrix-website/backend

# 1. 检查 Gemini 集成模块位置
echo "=== 1. 查找 Gemini 集成模块 ==="
find src -name "*gemini*" -type f | head -10
find src -name "*ai-integration*" -type d | head -5

# 2. 检查已注册的电商 Functions
echo ""
echo "=== 2. 检查电商 Functions 注册 ==="
grep -r "search_agentrix_products\|add_to_agentrix_cart\|view_agentrix_cart\|checkout_agentrix_cart\|pay_agentrix_order" src --include="*.ts" | head -20

# 3. 检查 Functions 注册代码
echo ""
echo "=== 3. 查找 Functions 注册代码 ==="
grep -r "registerFunction\|addFunction\|functionDeclarations" src --include="*.ts" | head -10

# 4. 检查电商 Skills 是否已转换为 Gemini Functions
echo ""
echo "=== 4. 检查电商 Skills ==="
pm2 logs agentrix-backend --lines 500 --nostream | grep -E "Skill registered.*product_search|Skill registered.*add_to_cart|Skill registered.*checkout" | head -10

# 5. 测试现有的 Functions
echo ""
echo "=== 5. 测试现有 Functions ==="
echo "测试 search_agentrix_products:"
curl -s -X POST http://localhost:3001/api/gemini/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "function": {
      "name": "search_agentrix_products",
      "arguments": {"query": "test"}
    },
    "context": {"sessionId": "test-123"}
  }' | python3 -m json.tool | head -20

echo ""
echo "测试 buy_agentrix_product (需要有效的 product_id):"
echo "（这个测试可能会失败，因为需要有效的商品ID）"

echo ""
echo "=== 检查完成 ==="
EOF

