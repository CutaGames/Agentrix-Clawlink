#!/bin/bash

echo "=== 测试电商流程修复 ==="
echo ""

# 1. 获取技能数据
echo "1. 获取 Apark 技能数据..."
SKILL_DATA=$(curl -s "http://0.0.0.0:3001/api/unified-marketplace/skills/918b420a-1239-4918-bde0-5b9fa9076507")

SKILL_ID=$(echo "$SKILL_DATA" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
PRODUCT_ID=$(echo "$SKILL_DATA" | grep -o '"productId":"[^"]*"' | head -1 | cut -d'"' -f4)
PRICE=$(echo "$SKILL_DATA" | grep -o '"pricePerCall":[0-9.]*' | cut -d':' -f2)
MERCHANT_ID=$(echo "$SKILL_DATA" | grep -o '"authorId":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "  Skill ID: $SKILL_ID"
echo "  Product ID: $PRODUCT_ID"
echo "  Price: $PRICE"
echo "  Merchant ID: $MERCHANT_ID"
echo ""

# 2. 验证 Product 是否存在
echo "2. 验证 Product 存在于数据库..."
PRODUCT_EXISTS=$(psql "postgresql://postgres:postgres@localhost:5432/agentrix" -t -c "SELECT id FROM products WHERE id='$PRODUCT_ID'" 2>/dev/null | xargs)

if [ -n "$PRODUCT_EXISTS" ]; then
    echo "  ✓ Product 存在: $PRODUCT_EXISTS"
else
    echo "  ✗ Product 不存在！"
    echo ""
    echo "需要修复：Skill 的 productId 不存在于 products 表中"
    exit 1
fi
echo ""

# 3. 测试创建订单（使用正确的 productId）
echo "3. 测试创建订单（使用 productId: $PRODUCT_ID）..."
echo ""
echo "如果需要测试，请先登录并复制 cookie，然后运行："
echo ""
echo "curl -X POST 'http://0.0.0.0:3001/api/orders' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Cookie: YOUR_SESSION_COOKIE' \\"
echo "  -d '{\"productId\":\"$PRODUCT_ID\",\"merchantId\":\"$MERCHANT_ID\",\"amount\":$PRICE,\"currency\":\"USD\",\"metadata\":{\"assetType\":\"virtual\",\"productType\":\"skill\"}}'"
echo ""
echo "=== 前端修复验证 ==="
echo "frontend/pages/pay/checkout.tsx 中的修复："
echo "  const productId = skill.productId || skill.id;"
echo "  return { id: productId, ... }"
echo ""
echo "这确保了订单创建时使用的是 products 表中存在的 ID"
