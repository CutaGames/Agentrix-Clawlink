#!/bin/bash

# V7.0 统一支付流程验证脚本

echo "🚀 开始验证 V7.0 统一支付流程"
echo "================================"
echo ""

BASE_URL="http://localhost:3001"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 步骤1: 尝试注册或登录获取JWT
echo -e "${YELLOW}步骤1: 尝试注册/登录获取JWT Token...${NC}"

# 先尝试注册
REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"testv7@paymind.com\",\"password\":\"Test123456\",\"paymindId\":\"test-v7-user\"}")

# 尝试登录
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"testv7@paymind.com\",\"password\":\"Test123456\"}")

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✅ 登录成功${NC}"
    echo "Token: ${JWT_TOKEN:0:50}..."
elif echo "$REGISTER_RESPONSE" | grep -q "access_token"; then
    JWT_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✅ 注册并登录成功${NC}"
    echo "Token: ${JWT_TOKEN:0:50}..."
else
    echo -e "${RED}❌ 登录/注册失败${NC}"
    echo "注册响应: $REGISTER_RESPONSE"
    echo "登录响应: $LOGIN_RESPONSE"
    exit 1
fi

echo ""

# 步骤2: 测试Pre-Flight Check
echo -e "${YELLOW}步骤2: 测试 Pre-Flight Check API...${NC}"
PREFLIGHT_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/payment/preflight?amount=10&currency=USDC" \
  -H "Authorization: Bearer ${JWT_TOKEN}")

if echo "$PREFLIGHT_RESPONSE" | grep -q "recommendedRoute"; then
    echo -e "${GREEN}✅ Pre-Flight Check 成功${NC}"
    echo "$PREFLIGHT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PREFLIGHT_RESPONSE"
else
    echo -e "${RED}❌ Pre-Flight Check 失败${NC}"
    echo "$PREFLIGHT_RESPONSE"
fi

echo ""

# 步骤3: 测试Session创建
echo -e "${YELLOW}步骤3: 测试创建 Session...${NC}"
SESSION_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/sessions" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "singleLimit": 10000000,
    "dailyLimit": 100000000,
    "expiryDays": 30
  }')

if echo "$SESSION_RESPONSE" | grep -q "sessionId"; then
    SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✅ Session 创建成功${NC}"
    echo "Session ID: $SESSION_ID"
    echo "$SESSION_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SESSION_RESPONSE"
else
    echo -e "${RED}❌ Session 创建失败${NC}"
    echo "$SESSION_RESPONSE"
fi

echo ""

# 步骤4: 测试获取Session列表
echo -e "${YELLOW}步骤4: 测试获取 Session 列表...${NC}"
SESSIONS_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/sessions" \
  -H "Authorization: Bearer ${JWT_TOKEN}")

if echo "$SESSIONS_RESPONSE" | grep -q "sessionId"; then
    echo -e "${GREEN}✅ 获取 Session 列表成功${NC}"
    echo "$SESSIONS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SESSIONS_RESPONSE"
else
    echo -e "${YELLOW}⚠️  获取 Session 列表（可能为空）${NC}"
    echo "$SESSIONS_RESPONSE"
fi

echo ""

# 步骤5: 测试Relayer队列状态
echo -e "${YELLOW}步骤5: 测试 Relayer 队列状态...${NC}"
QUEUE_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/relayer/queue/status" \
  -H "Authorization: Bearer ${JWT_TOKEN}")

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Relayer 队列状态查询成功${NC}"
    echo "$QUEUE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$QUEUE_RESPONSE"
else
    echo -e "${YELLOW}⚠️  Relayer 队列状态查询（可能未实现）${NC}"
    echo "$QUEUE_RESPONSE"
fi

echo ""
echo "================================"
echo -e "${GREEN}✅ V7.0 统一支付流程验证完成！${NC}"
echo ""
echo "📋 验证结果总结："
echo "- 登录认证: ✅"
echo "- Pre-Flight Check: 见上方结果"
echo "- Session 创建: 见上方结果"
echo "- Session 列表: 见上方结果"
echo "- Relayer 队列: 见上方结果"

