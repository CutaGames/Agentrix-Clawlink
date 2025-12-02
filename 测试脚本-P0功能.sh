#!/bin/bash

# PayMind P0功能测试脚本
# 使用方法: ./测试脚本-P0功能.sh

set -e

echo "🧪 开始测试 PayMind P0功能"
echo ""

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="http://localhost:3001/api"
TEST_USER_ID="test-user-123"
TEST_AGENT_ID="test-agent-456"
TEST_MERCHANT_ID="test-merchant-789"

# 测试函数
test_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo -n "测试: $description ... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_BASE$endpoint" || echo "000")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" || echo "000")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" || echo "000")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ 通过${NC}"
        return 0
    else
        echo -e "${RED}✗ 失败 (HTTP $http_code)${NC}"
        echo "  响应: $body"
        return 1
    fi
}

# 检查服务是否运行
echo "检查服务状态..."
if ! curl -s "$API_BASE/health" > /dev/null 2>&1; then
    echo -e "${RED}错误: 后端服务未运行，请先启动服务${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 后端服务运行中${NC}"
echo ""

# 1. 测试推广功能
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Agent推广商户分成系统测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 注意：这些测试需要JWT认证，实际测试时需要提供有效的token
echo -e "${YELLOW}注意: 以下测试需要JWT认证，请确保已登录${NC}"
echo ""

# 2. 测试优惠券功能
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. 优惠券服务测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_api "GET" "/coupon/merchant/$TEST_MERCHANT_ID" "" "获取商户优惠券列表"
test_api "GET" "/coupon/available?merchantId=$TEST_MERCHANT_ID&orderAmount=100" "" "查找可用优惠券"

# 3. 测试物流跟踪功能
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. 物流跟踪功能测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_api "GET" "/logistics/tracking/test-order-123" "" "获取物流跟踪信息"

# 4. 测试Auto-Earn功能
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Auto-Earn功能测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${YELLOW}注意: Auto-Earn测试需要JWT认证${NC}"
echo ""

# 测试总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "测试完成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 测试说明:"
echo "1. 部分API需要JWT认证，请确保已登录"
echo "2. 部分功能需要数据库中有测试数据"
echo "3. 建议使用Postman或Swagger UI进行完整测试"
echo ""
echo "Swagger文档: http://localhost:3001/api/docs"

