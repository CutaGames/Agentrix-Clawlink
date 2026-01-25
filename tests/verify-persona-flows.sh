#!/bin/bash
# 五类画像用户流程验证脚本

echo "=== Agentrix 五类画像用户流程验证 ==="
echo ""

BASE_URL="http://localhost:3001"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数
TOTAL=0
PASSED=0
FAILED=0

# 测试函数
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local expected_status=$4
    local data=$5
    
    TOTAL=$((TOTAL + 1))
    echo -n "Testing: $name ... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint" 2>/dev/null)
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint" 2>/dev/null)
    fi
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $response)"
        FAILED=$((FAILED + 1))
    fi
}

# 画像 1: 个人用户 (Personal User)
echo -e "${YELLOW}=== 画像 1: 个人用户 (Personal User) ===${NC}"
test_endpoint "健康检查" "GET" "/api/health" "200"
test_endpoint "获取用户账户" "GET" "/api/accounts/my" "401"  # 未授权时应返回401
test_endpoint "获取Agent列表" "GET" "/api/agent-accounts" "401"

echo ""

# 画像 2: API 提供商 (API Provider / Developer)
echo -e "${YELLOW}=== 画像 2: API 提供商/开发者 (API Provider) ===${NC}"
test_endpoint "获取开发者账户" "GET" "/api/developer-accounts/me" "401"
test_endpoint "获取开发者仪表盘" "GET" "/api/developer-accounts/dashboard" "401"
test_endpoint "创建技能(无授权)" "POST" "/api/skills" "401" '{"name":"Test Skill"}'

echo ""

# 画像 3: 实物/服务商 (Merchant)  
echo -e "${YELLOW}=== 画像 3: 实物/服务商 (Merchant) ===${NC}"
test_endpoint "获取商户信息" "GET" "/api/merchant/profile" "401"
test_endpoint "获取订单列表" "GET" "/api/orders" "401"
test_endpoint "获取商品列表" "GET" "/api/products" "401"

echo ""

# 画像 4: 行业专家 (Expert)
echo -e "${YELLOW}=== 画像 4: 行业专家 (Expert) ===${NC}"
test_endpoint "获取专家档案" "GET" "/api/expert-profiles/my" "401"  # 需要认证
test_endpoint "咨询列表(无授权)" "GET" "/api/expert-profiles/123/consultations" "401"

echo ""

# 画像 5: 数据持有方 (Data Provider)
echo -e "${YELLOW}=== 画像 5: 数据持有方 (Data Provider) ===${NC}"
test_endpoint "数据集列表(无授权)" "GET" "/api/datasets" "401"
test_endpoint "创建数据集(无授权)" "POST" "/api/datasets" "401" '{"name":"Test Dataset"}'

echo ""

# 核心账户系统
echo -e "${YELLOW}=== 核心账户系统 (Account System V2) ===${NC}"
test_endpoint "统一账户API" "GET" "/api/accounts/my" "401"
test_endpoint "Agent账户API" "GET" "/api/agent-accounts" "401"
test_endpoint "KYC状态API" "GET" "/api/kyc/my" "401"
test_endpoint "KYC等级权益" "GET" "/api/kyc/level-benefits" "200"  # 公开接口

echo ""

# 导航与权限
echo -e "${YELLOW}=== 导航与权限检查 ===${NC}"
test_endpoint "工作台路由" "GET" "/api/workbench/config" "404"  # 假设不存在此端点
test_endpoint "画像切换检查" "GET" "/api/user/persona" "404"

echo ""

# 输出统计
echo "======================================"
echo -e "总测试数: ${TOTAL}"
echo -e "${GREEN}通过: ${PASSED}${NC}"
echo -e "${RED}失败: ${FAILED}${NC}"
echo "======================================"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}✗ 部分测试失败${NC}"
    exit 1
fi
