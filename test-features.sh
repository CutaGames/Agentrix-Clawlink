#!/bin/bash

# Agentrix 26个新功能测试脚本
# 用于快速测试所有新功能页面是否可以正常访问

BASE_URL="http://localhost:3000"
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_NC='\033[0m' # No Color

echo "🧪 Agentrix 26个新功能测试"
echo "================================"
echo ""

# 商户端测试
echo "${COLOR_YELLOW}📊 商户端功能测试 (8个)${COLOR_NC}"
echo ""

merchant_pages=(
  "/app/merchant/analytics"
  "/app/merchant/reports"
  "/app/merchant/customers"
  "/app/merchant/refunds"
  "/app/merchant/payment-settings"
  "/app/merchant/webhooks"
  "/app/merchant/api-keys"
  "/app/merchant/product-analytics"
)

merchant_names=(
  "支付统计与分析"
  "收入报表"
  "客户管理"
  "退款管理"
  "支付渠道配置"
  "Webhook配置"
  "API密钥管理"
  "商品分析"
)

for i in "${!merchant_pages[@]}"; do
  url="${BASE_URL}${merchant_pages[$i]}"
  name="${merchant_names[$i]}"
  
  if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|404"; then
    echo "  ✅ ${name}: ${url}"
  else
    echo "  ❌ ${name}: ${url}"
  fi
done

echo ""
echo "${COLOR_YELLOW}👤 用户端功能测试 (8个)${COLOR_NC}"
echo ""

user_pages=(
  "/app/user/wallets"
  "/app/user/payment-methods"
  "/app/user/subscriptions"
  "/app/user/authorizations"
  "/app/user/security"
  "/app/user/notifications"
  "/app/user/transaction-detail?id=test"
  "/app/user/wishlist"
)

user_names=(
  "钱包管理"
  "支付方式管理"
  "订阅管理"
  "授权管理"
  "安全设置"
  "通知设置"
  "交易详情"
  "收藏与心愿单"
)

for i in "${!user_pages[@]}"; do
  url="${BASE_URL}${user_pages[$i]}"
  name="${user_names[$i]}"
  
  if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|404"; then
    echo "  ✅ ${name}: ${url}"
  else
    echo "  ❌ ${name}: ${url}"
  fi
done

echo ""
echo "${COLOR_YELLOW}🤖 Agent端功能测试 (10个)${COLOR_NC}"
echo ""

agent_pages=(
  "/app/agent/settings"
  "/app/agent/revenue"
  "/app/agent/commission-management"
  "/app/agent/recommendations"
  "/app/agent/api-stats"
  "/app/agent/error-logs"
  "/app/agent/sandbox"
  "/app/agent/performance"
  "/app/agent/user-analytics"
  "/app/agent/docs"
)

agent_names=(
  "配置管理"
  "收入统计"
  "佣金管理"
  "商品推荐统计"
  "API调用统计"
  "错误日志"
  "测试环境"
  "性能监控"
  "用户分析"
  "集成文档"
)

for i in "${!agent_pages[@]}"; do
  url="${BASE_URL}${agent_pages[$i]}"
  name="${agent_names[$i]}"
  
  if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|404"; then
    echo "  ✅ ${name}: ${url}"
  else
    echo "  ❌ ${name}: ${url}"
  fi
done

echo ""
echo "${COLOR_GREEN}✅ 测试完成！${COLOR_NC}"
echo ""
echo "注意: 此脚本仅测试页面是否可以访问，实际功能测试需要在浏览器中进行。"

