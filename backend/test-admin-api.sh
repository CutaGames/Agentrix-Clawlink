#!/bin/bash

# Agentrix 后台管理API测试脚本
# 测试所有后台管理API端点

BASE_URL="http://localhost:3002/api/admin"
ADMIN_TOKEN=""

echo "=========================================="
echo "  Agentrix 后台管理API测试"
echo "=========================================="
echo ""

# 1. 管理员登录
echo "1. 测试管理员登录..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

echo "登录响应: $LOGIN_RESPONSE"
ADMIN_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ 登录失败，无法获取token"
  exit 1
fi

echo "✅ 登录成功，Token: ${ADMIN_TOKEN:0:20}..."
echo ""

# 2. 获取当前管理员信息
echo "2. 测试获取当前管理员信息..."
curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
echo ""

# 3. 获取用户列表
echo "3. 测试获取用户列表..."
curl -s -X GET "$BASE_URL/users?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.total, .data[0]'
echo ""

# 4. 获取商户列表
echo "4. 测试获取商户列表..."
curl -s -X GET "$BASE_URL/merchants?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.total, .data[0]'
echo ""

# 5. 获取开发者列表
echo "5. 测试获取开发者列表..."
curl -s -X GET "$BASE_URL/developers?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.total, .data[0]'
echo ""

# 6. 获取推广者列表
echo "6. 测试获取推广者列表..."
curl -s -X GET "$BASE_URL/promoters?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.total, .data[0]'
echo ""

# 7. 获取工单列表
echo "7. 测试获取工单列表..."
curl -s -X GET "$BASE_URL/tickets?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.total, .data[0]'
echo ""

# 8. 获取营销活动列表
echo "8. 测试获取营销活动列表..."
curl -s -X GET "$BASE_URL/marketing/campaigns?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.total, .data[0]'
echo ""

# 9. 获取优惠券列表
echo "9. 测试获取优惠券列表..."
curl -s -X GET "$BASE_URL/marketing/coupons?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.total, .data[0]'
echo ""

# 10. 获取风险评估列表
echo "10. 测试获取风险评估列表..."
curl -s -X GET "$BASE_URL/risk/assessments?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.total, .data[0]'
echo ""

# 11. 获取管理员列表
echo "11. 测试获取管理员列表..."
curl -s -X GET "$BASE_URL/system/admins?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.total, .data[0]'
echo ""

# 12. 获取角色列表
echo "12. 测试获取角色列表..."
curl -s -X GET "$BASE_URL/system/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.[0]'
echo ""

# 13. 获取系统配置列表
echo "13. 测试获取系统配置列表..."
curl -s -X GET "$BASE_URL/system/configs" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.[0]'
echo ""

# 14. 获取仪表盘概览
echo "14. 测试获取仪表盘概览..."
curl -s -X GET "$BASE_URL/dashboard/overview" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
echo ""

# 15. 获取统计信息
echo "15. 测试获取统计信息..."
echo "用户统计:"
curl -s -X GET "$BASE_URL/users/statistics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
echo ""

echo "商户统计:"
curl -s -X GET "$BASE_URL/merchants/statistics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
echo ""

echo "工单统计:"
curl -s -X GET "$BASE_URL/tickets/statistics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
echo ""

echo "风险统计:"
curl -s -X GET "$BASE_URL/risk/statistics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
echo ""

echo "=========================================="
echo "✅ 所有API测试完成"
echo "=========================================="

