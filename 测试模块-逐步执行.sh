#!/bin/bash

# PayMind 模块化测试脚本
# 用于逐步测试每个功能模块

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置
BACKEND_URL="http://localhost:3001/api"
FRONTEND_URL="http://localhost:3000"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}PayMind 模块化测试工具${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查服务是否运行
check_service() {
    local service=$1
    local url=$2
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service 服务运行正常${NC}"
        return 0
    else
        echo -e "${RED}❌ $service 服务未运行${NC}"
        return 1
    fi
}

# 测试模块菜单
show_menu() {
    echo -e "${YELLOW}请选择要测试的模块:${NC}"
    echo ""
    echo "1. 用户认证系统"
    echo "2. 支付系统"
    echo "3. Agent系统"
    echo "4. Auto-Earn系统"
    echo "5. 商户系统"
    echo "6. Marketplace系统"
    echo "7. 物流系统"
    echo "8. 优惠券系统"
    echo "9. 分润系统"
    echo "10. 第三方服务集成测试"
    echo "11. 端到端流程测试"
    echo "0. 退出"
    echo ""
    read -p "请输入选项 (0-11): " choice
    echo ""
}

# 测试用户认证系统
test_auth() {
    echo -e "${YELLOW}=== 测试用户认证系统 ===${NC}"
    echo ""
    
    echo "1. 测试用户注册..."
    curl -X POST "$BACKEND_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "test@example.com",
            "password": "test123456",
            "username": "testuser"
        }' | jq '.' || echo "注册测试完成"
    
    echo ""
    echo "2. 测试用户登录..."
    TOKEN=$(curl -s -X POST "$BACKEND_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "test@example.com",
            "password": "test123456"
        }' | jq -r '.accessToken' 2>/dev/null)
    
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        echo -e "${GREEN}✅ 登录成功，Token: ${TOKEN:0:20}...${NC}"
        export TEST_TOKEN=$TOKEN
    else
        echo -e "${RED}❌ 登录失败${NC}"
    fi
    
    echo ""
    echo "3. 测试获取用户信息..."
    if [ -n "$TEST_TOKEN" ]; then
        curl -X GET "$BACKEND_URL/user/profile" \
            -H "Authorization: Bearer $TEST_TOKEN" | jq '.' || echo "获取用户信息测试完成"
    fi
    
    echo ""
    echo -e "${GREEN}用户认证系统测试完成${NC}"
    echo ""
}

# 测试支付系统
test_payment() {
    echo -e "${YELLOW}=== 测试支付系统 ===${NC}"
    echo ""
    
    if [ -z "$TEST_TOKEN" ]; then
        echo -e "${RED}❌ 请先测试用户认证系统获取Token${NC}"
        return 1
    fi
    
    echo "1. 测试创建支付意图..."
    INTENT_ID=$(curl -s -X POST "$BACKEND_URL/payments/intent" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TEST_TOKEN" \
        -d '{
            "amount": 100,
            "currency": "USD",
            "paymentMethod": "stripe"
        }' | jq -r '.id' 2>/dev/null)
    
    if [ -n "$INTENT_ID" ] && [ "$INTENT_ID" != "null" ]; then
        echo -e "${GREEN}✅ 支付意图创建成功，ID: $INTENT_ID${NC}"
    else
        echo -e "${RED}❌ 支付意图创建失败${NC}"
    fi
    
    echo ""
    echo "2. 测试查询支付状态..."
    if [ -n "$INTENT_ID" ]; then
        curl -X GET "$BACKEND_URL/payments/$INTENT_ID" \
            -H "Authorization: Bearer $TEST_TOKEN" | jq '.' || echo "查询支付状态测试完成"
    fi
    
    echo ""
    echo -e "${GREEN}支付系统测试完成${NC}"
    echo ""
}

# 测试Agent系统
test_agent() {
    echo -e "${YELLOW}=== 测试Agent系统 ===${NC}"
    echo ""
    
    if [ -z "$TEST_TOKEN" ]; then
        echo -e "${RED}❌ 请先测试用户认证系统获取Token${NC}"
        return 1
    fi
    
    echo "1. 测试Agent对话..."
    curl -X POST "$BACKEND_URL/agent/chat" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TEST_TOKEN" \
        -d '{
            "message": "我想买一台笔记本电脑",
            "sessionId": "test-session-123"
        }' | jq '.' || echo "Agent对话测试完成"
    
    echo ""
    echo "2. 测试商品搜索..."
    curl -X GET "$BACKEND_URL/products/search?q=laptop" \
        -H "Authorization: Bearer $TEST_TOKEN" | jq '.' || echo "商品搜索测试完成"
    
    echo ""
    echo -e "${GREEN}Agent系统测试完成${NC}"
    echo ""
}

# 测试Auto-Earn系统
test_auto_earn() {
    echo -e "${YELLOW}=== 测试Auto-Earn系统 ===${NC}"
    echo ""
    
    if [ -z "$TEST_TOKEN" ]; then
        echo -e "${RED}❌ 请先测试用户认证系统获取Token${NC}"
        return 1
    fi
    
    echo "1. 测试空投查询..."
    curl -X GET "$BACKEND_URL/auto-earn/airdrops" \
        -H "Authorization: Bearer $TEST_TOKEN" | jq '.' || echo "空投查询测试完成"
    
    echo ""
    echo "2. 测试套利扫描..."
    curl -X POST "$BACKEND_URL/auto-earn/arbitrage/scan" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TEST_TOKEN" \
        -d '{
            "chain": "solana",
            "pairs": ["SOL/USDC"]
        }' | jq '.' || echo "套利扫描测试完成"
    
    echo ""
    echo -e "${GREEN}Auto-Earn系统测试完成${NC}"
    echo ""
}

# 测试商户系统
test_merchant() {
    echo -e "${YELLOW}=== 测试商户系统 ===${NC}"
    echo ""
    
    if [ -z "$TEST_TOKEN" ]; then
        echo -e "${RED}❌ 请先测试用户认证系统获取Token${NC}"
        return 1
    fi
    
    echo "1. 测试创建商品..."
    curl -X POST "$BACKEND_URL/products" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TEST_TOKEN" \
        -d '{
            "name": "测试商品",
            "price": 99.99,
            "currency": "USD",
            "description": "这是一个测试商品"
        }' | jq '.' || echo "创建商品测试完成"
    
    echo ""
    echo "2. 测试查询订单..."
    curl -X GET "$BACKEND_URL/orders" \
        -H "Authorization: Bearer $TEST_TOKEN" | jq '.' || echo "查询订单测试完成"
    
    echo ""
    echo -e "${GREEN}商户系统测试完成${NC}"
    echo ""
}

# 测试Marketplace系统
test_marketplace() {
    echo -e "${YELLOW}=== 测试Marketplace系统 ===${NC}"
    echo ""
    
    if [ -z "$TEST_TOKEN" ]; then
        echo -e "${RED}❌ 请先测试用户认证系统获取Token${NC}"
        return 1
    fi
    
    echo "1. 测试Agent搜索..."
    curl -X GET "$BACKEND_URL/marketplace/agents/search?q=shopping" \
        -H "Authorization: Bearer $TEST_TOKEN" | jq '.' || echo "Agent搜索测试完成"
    
    echo ""
    echo "2. 测试Agent推荐..."
    curl -X GET "$BACKEND_URL/marketplace/agents/recommend" \
        -H "Authorization: Bearer $TEST_TOKEN" | jq '.' || echo "Agent推荐测试完成"
    
    echo ""
    echo -e "${GREEN}Marketplace系统测试完成${NC}"
    echo ""
}

# 测试第三方服务集成
test_third_party() {
    echo -e "${YELLOW}=== 测试第三方服务集成 ===${NC}"
    echo ""
    
    echo "1. 检查Stripe配置..."
    if grep -q "STRIPE_SECRET_KEY" backend/.env 2>/dev/null; then
        echo -e "${GREEN}✅ Stripe API密钥已配置${NC}"
    else
        echo -e "${YELLOW}⚠️  Stripe API密钥未配置（需要注册Stripe账号）${NC}"
    fi
    
    echo ""
    echo "2. 检查OpenAI配置..."
    if grep -q "OPENAI_API_KEY" backend/.env 2>/dev/null; then
        echo -e "${GREEN}✅ OpenAI API密钥已配置${NC}"
    else
        echo -e "${YELLOW}⚠️  OpenAI API密钥未配置（需要注册OpenAI账号）${NC}"
    fi
    
    echo ""
    echo "3. 检查数据库连接..."
    if check_service "数据库" "$BACKEND_URL/health" 2>/dev/null; then
        echo -e "${GREEN}✅ 数据库连接正常${NC}"
    else
        echo -e "${RED}❌ 数据库连接失败${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}第三方服务集成检查完成${NC}"
    echo ""
    echo -e "${YELLOW}提示: 查看 PayMind-完整功能实现清单.md 了解第三方服务集成步骤${NC}"
    echo ""
}

# 主循环
main() {
    # 检查服务
    echo "检查服务状态..."
    check_service "后端" "$BACKEND_URL" || {
        echo -e "${RED}请先启动后端服务: cd backend && npm run start:dev${NC}"
        exit 1
    }
    check_service "前端" "$FRONTEND_URL" || {
        echo -e "${YELLOW}前端服务未运行（可选）${NC}"
    }
    echo ""
    
    while true; do
        show_menu
        
        case $choice in
            1)
                test_auth
                ;;
            2)
                test_payment
                ;;
            3)
                test_agent
                ;;
            4)
                test_auto_earn
                ;;
            5)
                test_merchant
                ;;
            6)
                test_marketplace
                ;;
            7)
                echo -e "${YELLOW}物流系统测试（待实现）${NC}"
                ;;
            8)
                echo -e "${YELLOW}优惠券系统测试（待实现）${NC}"
                ;;
            9)
                echo -e "${YELLOW}分润系统测试（待实现）${NC}"
                ;;
            10)
                test_third_party
                ;;
            11)
                echo -e "${YELLOW}端到端流程测试（待实现）${NC}"
                ;;
            0)
                echo -e "${GREEN}退出测试${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}无效选项，请重新选择${NC}"
                ;;
        esac
        
        echo ""
        read -p "按回车键继续..."
        echo ""
    done
}

# 运行主函数
main

