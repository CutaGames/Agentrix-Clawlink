#!/bin/bash

# PayMind V7.0 功能测试脚本

echo "🚀 PayMind V7.0 功能测试"
echo "=========================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
BASE_URL="http://localhost:3001"
JWT_TOKEN="" # 需要先登录获取

# 测试函数
test_preflight() {
    echo -e "${YELLOW}测试 Pre-Flight Check...${NC}"
    
    if [ -z "$JWT_TOKEN" ]; then
        echo -e "${RED}❌ JWT Token 未设置，请先登录${NC}"
        return 1
    fi
    
    response=$(curl -s -X GET "${BASE_URL}/payment/preflight?amount=10&currency=USDC" \
        -H "Authorization: Bearer ${JWT_TOKEN}")
    
    if echo "$response" | grep -q "recommendedRoute"; then
        echo -e "${GREEN}✅ Pre-Flight Check 成功${NC}"
        echo "$response" | jq '.'
        return 0
    else
        echo -e "${RED}❌ Pre-Flight Check 失败${NC}"
        echo "$response"
        return 1
    fi
}

test_create_session() {
    echo -e "${YELLOW}测试创建 Session...${NC}"
    
    if [ -z "$JWT_TOKEN" ]; then
        echo -e "${RED}❌ JWT Token 未设置，请先登录${NC}"
        return 1
    fi
    
    # 生成测试数据
    SIGNER="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    SINGLE_LIMIT=10000000
    DAILY_LIMIT=100000000
    EXPIRY_DAYS=30
    SIGNATURE="0x0000000000000000000000000000000000000000000000000000000000000000"
    
    response=$(curl -s -X POST "${BASE_URL}/sessions" \
        -H "Authorization: Bearer ${JWT_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"signer\": \"${SIGNER}\",
            \"singleLimit\": ${SINGLE_LIMIT},
            \"dailyLimit\": ${DAILY_LIMIT},
            \"expiryDays\": ${EXPIRY_DAYS},
            \"signature\": \"${SIGNATURE}\"
        }")
    
    if echo "$response" | grep -q "sessionId"; then
        echo -e "${GREEN}✅ Session 创建成功${NC}"
        SESSION_ID=$(echo "$response" | jq -r '.sessionId')
        echo "Session ID: $SESSION_ID"
        echo "$response" | jq '.'
        return 0
    else
        echo -e "${RED}❌ Session 创建失败${NC}"
        echo "$response"
        return 1
    fi
}

test_get_sessions() {
    echo -e "${YELLOW}测试获取 Session 列表...${NC}"
    
    if [ -z "$JWT_TOKEN" ]; then
        echo -e "${RED}❌ JWT Token 未设置，请先登录${NC}"
        return 1
    fi
    
    response=$(curl -s -X GET "${BASE_URL}/sessions" \
        -H "Authorization: Bearer ${JWT_TOKEN}")
    
    if echo "$response" | grep -q "sessionId"; then
        echo -e "${GREEN}✅ 获取 Session 列表成功${NC}"
        echo "$response" | jq '.'
        return 0
    else
        echo -e "${RED}❌ 获取 Session 列表失败${NC}"
        echo "$response"
        return 1
    fi
}

test_relayer_queue() {
    echo -e "${YELLOW}测试 Relayer 队列状态...${NC}"
    
    if [ -z "$JWT_TOKEN" ]; then
        echo -e "${RED}❌ JWT Token 未设置，请先登录${NC}"
        return 1
    fi
    
    response=$(curl -s -X GET "${BASE_URL}/relayer/queue/status" \
        -H "Authorization: Bearer ${JWT_TOKEN}")
    
    if echo "$response" | grep -q "queueLength"; then
        echo -e "${GREEN}✅ 获取队列状态成功${NC}"
        echo "$response" | jq '.'
        return 0
    else
        echo -e "${RED}❌ 获取队列状态失败${NC}"
        echo "$response"
        return 1
    fi
}

test_health_check() {
    echo -e "${YELLOW}测试服务健康状态...${NC}"
    
    response=$(curl -s -X GET "${BASE_URL}/health" || curl -s -X GET "${BASE_URL}/")
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 服务运行正常${NC}"
        return 0
    else
        echo -e "${RED}❌ 服务无法访问${NC}"
        return 1
    fi
}

# 主测试流程
main() {
    echo "开始测试..."
    echo ""
    
    # 健康检查
    test_health_check
    echo ""
    
    # 检查 jq 是否安装
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  jq 未安装，部分测试可能无法正常显示 JSON${NC}"
        echo "安装命令: sudo apt-get install jq (Ubuntu) 或 brew install jq (Mac)"
        echo ""
    fi
    
    # 提示设置 JWT Token
    if [ -z "$JWT_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  请先设置 JWT_TOKEN 环境变量${NC}"
        echo "例如: export JWT_TOKEN='your_jwt_token'"
        echo "或编辑此脚本设置 JWT_TOKEN 变量"
        echo ""
    fi
    
    # 运行测试
    test_preflight
    echo ""
    
    test_create_session
    echo ""
    
    test_get_sessions
    echo ""
    
    test_relayer_queue
    echo ""
    
    echo "=========================="
    echo -e "${GREEN}测试完成！${NC}"
}

# 运行主函数
main

