#!/bin/bash

# JWT Token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6IjUwMDg0ODA5QHFxLmNvbSIsInN1YiI6IjI0NmNkNzg1LTFhNzMtNDgwYi1iNTI4LTIxYjlkNDBkNzJjMiIsImlhdCI6MTc2NDAyMDU5MCwiZXhwIjoxNzY0NjI1MzkwfQ.gipoTfUPJCIZtpzRd00zoqvXgomnwlY68WSN_id3ris"

BASE_URL="http://localhost:3001/api"

echo "=========================================="
echo "V7.0 API 端点测试"
echo "=========================================="
echo ""

# 1. Pre-Flight Check
echo "=== 1. Pre-Flight Check API ==="
echo "GET $BASE_URL/payment/preflight?amount=10&currency=USDC"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE_URL/payment/preflight?amount=10&currency=USDC" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
echo "HTTP Status: $HTTP_CODE"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""
echo ""

# 2. 获取用户的所有Session
echo "=== 2. 获取用户的所有Session ==="
echo "GET $BASE_URL/sessions"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE_URL/sessions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
echo "HTTP Status: $HTTP_CODE"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""
echo ""

# 3. 获取活跃Session
echo "=== 3. 获取活跃Session ==="
echo "GET $BASE_URL/sessions/active"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE_URL/sessions/active" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
echo "HTTP Status: $HTTP_CODE"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""
echo ""

# 4. Relayer队列状态
echo "=== 4. Relayer队列状态 ==="
echo "GET $BASE_URL/relayer/queue/status"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$BASE_URL/relayer/queue/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
echo "HTTP Status: $HTTP_CODE"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="

