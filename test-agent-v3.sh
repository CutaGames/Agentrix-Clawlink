#!/bin/bash

# PayMind Agent V3.0 功能测试脚本

echo "=========================================="
echo "PayMind Agent V3.0 功能测试"
echo "=========================================="

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
PASSED=0
FAILED=0

# API基础URL
API_URL="http://localhost:3001/api"

# 测试函数
test_api() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5

    echo -e "\n${YELLOW}测试: $name${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ 通过${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ 失败${NC} (期望: HTTP $expected_status, 实际: HTTP $http_code)"
        echo "响应: $body"
        ((FAILED++))
        return 1
    fi
}

# 1. 测试Agent对话（多轮对话）
echo -e "\n${YELLOW}=== 1. Agent对话测试 ===${NC}"
test_api "创建会话并发送消息" POST "/agent/chat" \
    '{"message":"帮我找一把游戏剑，预算20美元"}' 200

SESSION_ID=$(echo "$body" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
echo "会话ID: $SESSION_ID"

# 2. 测试上下文保持
if [ -n "$SESSION_ID" ]; then
    test_api "多轮对话上下文保持" POST "/agent/chat" \
        "{\"message\":\"把刚才那把加入购物车\",\"sessionId\":\"$SESSION_ID\"}" 200
fi

# 3. 测试商品搜索/比价
echo -e "\n${YELLOW}=== 2. 商品搜索/比价测试 ===${NC}"
test_api "商品搜索" POST "/agent/search-products" \
    '{"query":"游戏剑","filters":{"priceMax":20,"currency":"USD"}}' 200

# 4. 测试情景感知推荐
echo -e "\n${YELLOW}=== 3. 情景感知推荐测试 ===${NC}"
test_api "获取推荐" POST "/agent/recommendations" \
    "{\"sessionId\":\"$SESSION_ID\",\"query\":\"游戏装备\"}" 200

# 5. 测试自动下单
echo -e "\n${YELLOW}=== 4. 自动下单测试 ===${NC}"
# 注意：需要先有商品ID
# test_api "自动下单" POST "/agent/create-order" \
#     '{"productId":"prod_123","quantity":1}' 200

# 6. 测试PayIntent
echo -e "\n${YELLOW}=== 5. PayIntent测试 ===${NC}"
test_api "创建PayIntent" POST "/pay-intents" \
    '{"type":"order_payment","amount":100,"currency":"CNY","description":"测试支付"}' 201

PAY_INTENT_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "PayIntent ID: $PAY_INTENT_ID"

if [ -n "$PAY_INTENT_ID" ]; then
    test_api "授权PayIntent" POST "/pay-intents/$PAY_INTENT_ID/authorize" \
        '{"authorizationType":"user"}' 200
fi

# 7. 测试QuickPay授权
echo -e "\n${YELLOW}=== 6. QuickPay授权测试 ===${NC}"
test_api "创建QuickPay授权" POST "/quick-pay-grants" \
    '{"paymentMethod":{"type":"stripe"},"permissions":{"maxAmount":1000,"maxDailyAmount":5000}}' 201

# 8. 测试商户任务
echo -e "\n${YELLOW}=== 7. 商户任务测试 ===${NC}"
# 注意：需要先有商户ID
# test_api "创建任务" POST "/merchant-tasks" \
#     '{"merchantId":"merchant_123","type":"custom_service","title":"定制服务","description":"需要定制服务","budget":5000,"currency":"CNY"}' 201

# 9. 测试链上资产索引
echo -e "\n${YELLOW}=== 8. 链上资产索引测试 ===${NC}"
test_api "索引链上资产" POST "/onchain-indexer/index" \
    '{"asset":{"contract":"0x123","chain":"ethereum","name":"Test NFT","owner":"0xabc"},"price":100,"currency":"USDT"}' 201

# 10. 测试会话管理
echo -e "\n${YELLOW}=== 9. 会话管理测试 ===${NC}"
test_api "获取会话列表" GET "/agent/sessions" "" 200

if [ -n "$SESSION_ID" ]; then
    test_api "获取会话详情" GET "/agent/sessions/$SESSION_ID" "" 200
fi

# 11. 测试沙箱执行
echo -e "\n${YELLOW}=== 10. 沙箱执行测试 ===${NC}"
test_api "执行沙箱代码" POST "/sandbox/execute" \
    '{"code":"const payment = await paymind.payments.create({amount: 100, currency: \"CNY\"});","language":"typescript"}' 200

# 总结
echo -e "\n=========================================="
echo -e "${GREEN}测试完成${NC}"
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo "=========================================="

if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi

