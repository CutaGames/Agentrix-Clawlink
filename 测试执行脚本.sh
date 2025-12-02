#!/bin/bash

# PayMind V3.1 测试执行脚本
# 使用方法: bash 测试执行脚本.sh

BASE_URL="http://localhost:3001/api"
FRONTEND_URL="http://localhost:3000"
TOKEN="" # 需要先登录获取token

echo "=========================================="
echo "PayMind V3.1 完整测试执行脚本"
echo "=========================================="
echo ""

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${BLUE}[测试 $TOTAL_TESTS]${NC} ${description}"
    echo "请求: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        if [ -z "$TOKEN" ]; then
            response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" 2>/dev/null)
        else
            response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE_URL$endpoint" 2>/dev/null)
        fi
    else
        if [ -z "$TOKEN" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint" 2>/dev/null)
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint" 2>/dev/null)
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ 通过 (HTTP $http_code)${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ 失败 (HTTP $http_code)${NC}"
        echo "响应: $body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# 检查服务是否运行
check_services() {
    echo "=========================================="
    echo "检查服务状态"
    echo "=========================================="
    
    # 检查后端
    if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 后端服务运行中${NC}"
    else
        echo -e "${RED}✗ 后端服务未运行，请先启动后端服务${NC}"
        exit 1
    fi
    
    # 检查前端
    if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 前端服务运行中${NC}"
    else
        echo -e "${YELLOW}⚠ 前端服务未运行（可选）${NC}"
    fi
    
    echo ""
}

# 数据库迁移测试
test_database_migration() {
    echo "=========================================="
    echo "1. 数据库迁移测试"
    echo "=========================================="
    echo ""
    
    echo -e "${YELLOW}注意: 数据库迁移测试需要手动执行${NC}"
    echo "执行命令: cd backend && npm run migration:run"
    echo ""
}

# Auto-Earn高级功能测试
test_auto_earn_advanced() {
    echo "=========================================="
    echo "2. Auto-Earn高级功能测试"
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
}

# 商户端自动化测试
test_merchant_automation() {
    echo "=========================================="
    echo "3. 商户端自动化测试"
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
}

# Agent Marketplace测试
test_agent_marketplace() {
    echo "=========================================="
    echo "4. Agent Marketplace测试"
    echo "=========================================="
    echo ""
    
    test_endpoint "GET" "/marketplace/agents/search?keyword=AI&sortBy=popularity&page=1&pageSize=20" "" "搜索Agent"
    
    test_endpoint "GET" "/marketplace/agents/recommend?limit=10" "" "推荐Agent"
    
    test_endpoint "GET" "/marketplace/agents/agent_1/stats" "" "获取Agent统计"
    
    test_endpoint "POST" "/marketplace/agents/agent_1/call" "" "记录Agent调用"
    
    test_endpoint "GET" "/marketplace/agents/rankings?agentIds=agent_1,agent_2,agent_3" "" "获取Agent排行榜"
}

# 打印测试总结
print_summary() {
    echo "=========================================="
    echo "测试总结"
    echo "=========================================="
    echo ""
    echo "总测试数: $TOTAL_TESTS"
    echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
    echo -e "${RED}失败: $FAILED_TESTS${NC}"
    
    if [ $TOTAL_TESTS -gt 0 ]; then
        pass_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
        echo "通过率: ${pass_rate}%"
    fi
    
    echo ""
    echo "注意事项："
    echo "1. 部分测试需要认证，请先设置TOKEN环境变量"
    echo "2. 数据库迁移需要手动执行"
    echo "3. 前端UI测试需要手动在浏览器中验证"
    echo ""
}

# 主函数
main() {
    check_services
    test_database_migration
    test_auto_earn_advanced
    test_merchant_automation
    test_agent_marketplace
    print_summary
}

# 执行主函数
main

