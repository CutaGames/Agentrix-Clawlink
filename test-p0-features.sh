#!/bin/bash
# Agentrix P0 功能测试脚本
# 测试日期: 2026-01-15

BASE_URL="http://localhost:3001"

echo "=========================================="
echo "Agentrix P0 功能完整测试"
echo "测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_count=0
pass_count=0
fail_count=0

# 测试函数
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    test_count=$((test_count + 1))
    echo -e "${YELLOW}[测试 $test_count]${NC} $name"
    echo "  URL: $url"
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>&1)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "  ${GREEN}✓ 通过${NC} (HTTP $http_code)"
        pass_count=$((pass_count + 1))
        
        # 显示前200字符的响应
        if [ -n "$body" ]; then
            echo "  响应预览: $(echo "$body" | head -c 200)..."
        fi
    else
        echo -e "  ${RED}✗ 失败${NC} (期望 $expected_status, 实际 $http_code)"
        fail_count=$((fail_count + 1))
        if [ -n "$body" ]; then
            echo "  错误信息: $(echo "$body" | head -c 200)"
        fi
    fi
    echo ""
}

echo "=========================================="
echo "P0.1 支付系统统一"
echo "=========================================="

test_endpoint "健康检查" "$BASE_URL/api/health"

echo "=========================================="
echo "P0.2 跨协议自动注册"
echo "=========================================="

test_endpoint "X402 Discovery 端点" "$BASE_URL/.well-known/x402"
test_endpoint "X402 Skill详情端点" "$BASE_URL/.well-known/x402/services/test-skill" 404
test_endpoint "UCP 产品目录" "$BASE_URL/ucp/v1/products"
test_endpoint "UCP Skills 目录" "$BASE_URL/ucp/v1/skills"
test_endpoint "OAuth Discovery" "$BASE_URL/.well-known/oauth-authorization-server"
test_endpoint "OpenID Configuration" "$BASE_URL/.well-known/openid-configuration"

echo "=========================================="
echo "P0.3 开发者收益 (需要认证)"
echo "=========================================="

echo -e "${YELLOW}注意:${NC} 以下端点需要JWT认证，预期返回401"
test_endpoint "开发者仪表盘" "$BASE_URL/api/developer/dashboard" 401
test_endpoint "开发者收益汇总" "$BASE_URL/api/developer/revenue/summary" 401
test_endpoint "Skill收益详情" "$BASE_URL/api/developer/revenue/skills/test-skill" 401

echo "=========================================="
echo "MCP 端点"
echo "=========================================="

test_endpoint "MCP SSE 端点" "$BASE_URL/api/mcp/sse" 405
test_endpoint "MCP OpenAPI" "$BASE_URL/api/mcp/openapi.json"

echo "=========================================="
echo "Marketplace 端点"
echo "=========================================="

test_endpoint "Marketplace 搜索" "$BASE_URL/api/marketplace/search"

echo "=========================================="
echo "测试总结"
echo "=========================================="
echo ""
echo "总测试数: $test_count"
echo -e "${GREEN}通过: $pass_count${NC}"
echo -e "${RED}失败: $fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}✗ 部分测试失败${NC}"
    exit 1
fi
