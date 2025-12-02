#!/bin/bash

# Agentrix 后端服务功能测试脚本
# 用于测试定价、税费、支付、佣金等服务的功能

set -e

echo "=========================================="
echo "Agentrix 后端服务功能测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API基础URL
API_URL="${API_URL:-http://localhost:3001}"

# 测试结果
PASSED=0
FAILED=0

# 测试函数
test_api() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo -n "测试: $name ... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint" || echo "000")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" || echo "000")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ 通过${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ 失败${NC} (HTTP $http_code)"
        echo "  响应: $body"
        ((FAILED++))
        return 1
    fi
}

# 检查后端服务是否运行
echo "检查后端服务状态..."
if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo -e "${YELLOW}警告: 后端服务可能未运行，请先启动后端服务${NC}"
    echo "  运行: cd backend && npm run start:dev"
    echo ""
fi

# 1. 定价服务测试
echo "=========================================="
echo "1. 定价服务测试"
echo "=========================================="

# 注意：这些测试需要先有产品数据
echo -e "${BLUE}提示: 定价服务测试需要先创建产品和价格数据${NC}"
echo ""

# 2. 税费服务测试
echo "=========================================="
echo "2. 税费服务测试"
echo "=========================================="

test_api "获取税费率（US）" "GET" "/api/v2/tax/rates/US"
test_api "计算税费" "POST" "/api/v2/tax/calculate" '{"amount":100,"countryCode":"US"}'

echo ""

# 3. 支付服务测试
echo "=========================================="
echo "3. 支付服务测试"
echo "=========================================="

echo -e "${BLUE}提示: 支付服务测试需要认证和产品数据${NC}"
echo ""

# 4. 佣金服务测试
echo "=========================================="
echo "4. 佣金服务测试"
echo "=========================================="

echo -e "${BLUE}提示: 佣金服务测试需要支付记录${NC}"
echo ""

# 5. 资产聚合服务测试
echo "=========================================="
echo "5. 资产聚合服务测试"
echo "=========================================="

echo -e "${BLUE}提示: 资产聚合服务测试需要配置第三方API${NC}"
echo ""

# 总结
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}所有API测试通过！${NC}"
else
    echo -e "${YELLOW}部分测试失败，请检查后端服务是否正常运行${NC}"
fi

echo ""
echo "=========================================="
echo "下一步操作"
echo "=========================================="
echo "1. 运行数据库迁移: cd backend && npm run migration:run"
echo "2. 启动后端服务: cd backend && npm run start:dev"
echo "3. 测试API端点: curl $API_URL/api/v2/tax/rates/US"
echo "4. 查看Swagger文档: $API_URL/api/docs"
echo ""

