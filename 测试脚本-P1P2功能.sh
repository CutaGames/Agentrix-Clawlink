#!/bin/bash

# Agentrix P1/P2功能测试脚本
# 使用方法: bash 测试脚本-P1P2功能.sh

BASE_URL="http://localhost:3001/api"
TOKEN="" # 需要先登录获取token

echo "=========================================="
echo "Agentrix P1/P2功能测试脚本"
echo "=========================================="
echo ""

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查token
if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}警告: 请先设置TOKEN变量${NC}"
    echo "示例: export TOKEN='your-jwt-token'"
    echo ""
fi

# 测试函数
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${YELLOW}测试: ${description}${NC}"
    echo "请求: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        if [ -z "$TOKEN" ]; then
            response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE_URL$endpoint")
        fi
    else
        if [ -z "$TOKEN" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ 成功 (HTTP $http_code)${NC}"
        echo "响应: $body" | head -c 200
        echo "..."
    else
        echo -e "${RED}✗ 失败 (HTTP $http_code)${NC}"
        echo "响应: $body"
    fi
    echo ""
}

echo "=========================================="
echo "1. Auto-Earn高级功能测试"
echo "=========================================="
echo ""

# 套利功能
test_endpoint "GET" "/auto-earn/arbitrage/opportunities?chains=solana,ethereum&pairs=SOL/USDC,ETH/USDT" "" "扫描套利机会"

test_endpoint "POST" "/auto-earn/arbitrage/execute" '{"opportunityId":"arb_123","amount":100,"agentId":"agent_1"}' "执行套利交易"

test_endpoint "POST" "/auto-earn/arbitrage/auto-strategy" '{"config":{"enabled":true,"minProfitRate":1,"maxAmount":1000,"chains":["solana"],"pairs":["SOL/USDC"]},"agentId":"agent_1"}' "启动自动套利策略"

# Launchpad功能
test_endpoint "GET" "/auto-earn/launchpad/projects?platforms=pump.fun,raydium" "" "发现Launchpad项目"

test_endpoint "POST" "/auto-earn/launchpad/participate" '{"projectId":"lp_1","amount":100,"agentId":"agent_1"}' "参与Launchpad项目"

test_endpoint "POST" "/auto-earn/launchpad/auto-strategy" '{"config":{"enabled":true,"platforms":["pump.fun"],"minAmount":10,"maxAmount":1000,"autoSniping":true,"takeProfitRate":50},"agentId":"agent_1"}' "启动自动参与Launchpad策略"

# 策略管理
test_endpoint "POST" "/auto-earn/strategies/create" '{"type":"dca","config":{"pair":"SOL/USDC","amount":100,"frequency":"daily"},"agentId":"agent_1"}' "创建策略"

test_endpoint "GET" "/auto-earn/strategies?agentId=agent_1" "" "获取策略列表"

test_endpoint "POST" "/auto-earn/strategies/strategy_123/start" "" "启动策略"

test_endpoint "POST" "/auto-earn/strategies/strategy_123/stop" "" "停止策略"

echo "=========================================="
echo "2. 商户端自动化能力测试"
echo "=========================================="
echo ""

# 自动接单
test_endpoint "POST" "/merchant/auto-order/configure" '{"enabled":true,"autoAcceptThreshold":1000,"aiDecisionEnabled":true,"workingHours":{"start":"09:00","end":"18:00"}}' "配置自动接单"

test_endpoint "GET" "/merchant/auto-order/config" "" "获取自动接单配置"

test_endpoint "POST" "/merchant/auto-order/process" '{"orderId":"order_123","orderData":{"amount":500,"currency":"USDC","customerId":"user_1","items":[{"productId":"product_1","quantity":1}]}}' "处理订单"

# AI客服
test_endpoint "POST" "/merchant/ai-customer/configure" '{"enabled":true,"language":"zh-CN","tone":"friendly","autoReplyEnabled":true,"workingHours":{"start":"09:00","end":"18:00"}}' "配置AI客服"

test_endpoint "GET" "/merchant/ai-customer/config" "" "获取AI客服配置"

test_endpoint "POST" "/merchant/ai-customer/message" '{"id":"msg_123","customerId":"user_1","message":"你好，我想查询订单状态","timestamp":"2024-01-01T00:00:00Z"}' "处理客户消息"

# 自动营销
test_endpoint "POST" "/merchant/auto-marketing/configure" '{"enabled":true,"strategies":{"abandonedCart":{"enabled":true,"delayHours":24,"discountPercent":10},"newCustomer":{"enabled":true,"welcomeDiscount":15}}}' "配置自动营销"

test_endpoint "GET" "/merchant/auto-marketing/config" "" "获取自动营销配置"

test_endpoint "POST" "/merchant/auto-marketing/trigger" "" "触发营销活动"

echo "=========================================="
echo "3. Agent Marketplace增强测试"
echo "=========================================="
echo ""

# Agent搜索和推荐
test_endpoint "GET" "/marketplace/agents/search?keyword=AI&sortBy=popularity&page=1&pageSize=20" "" "搜索Agent"

test_endpoint "GET" "/marketplace/agents/recommend?limit=10" "" "推荐Agent"

test_endpoint "GET" "/marketplace/agents/agent_1/stats" "" "获取Agent统计"

test_endpoint "POST" "/marketplace/agents/agent_1/call" "" "记录Agent调用"

test_endpoint "GET" "/marketplace/agents/rankings?agentIds=agent_1,agent_2,agent_3" "" "获取Agent排行榜"

echo "=========================================="
echo "测试完成！"
echo "=========================================="
echo ""
echo "注意事项："
echo "1. 请确保后端服务运行在 http://localhost:3001"
echo "2. 需要认证的接口请先设置TOKEN环境变量"
echo "3. 部分功能使用Mock实现，实际效果可能不同"
echo ""

