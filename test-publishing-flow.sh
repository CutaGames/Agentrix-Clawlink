#!/bin/bash

# 测试脚本：技能发布审核全流程测试

echo "========================================="
echo "Agentrix Skill Publishing Flow Test"
echo "========================================="

BASE_URL="http://localhost:3001"
API_URL="${BASE_URL}/api"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local data=${4:-}
    
    echo -e "\n${YELLOW}Testing: ${name}${NC}"
    echo "URL: ${method} ${url}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "${url}")
    else
        response=$(curl -s -w "\n%{http_code}" -X "${method}" -H "Content-Type: application/json" -d "${data}" "${url}")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ Success (HTTP ${http_code})${NC}"
        echo "Response: ${body}" | jq '.' 2>/dev/null || echo "${body}"
        return 0
    else
        echo -e "${RED}✗ Failed (HTTP ${http_code})${NC}"
        echo "Response: ${body}"
        return 1
    fi
}

echo -e "\n${YELLOW}1. 测试健康检查${NC}"
test_endpoint "Health Check" "${API_URL}/health"

echo -e "\n${YELLOW}2. 测试协议发现端点${NC}"
test_endpoint "Protocol Discovery" "${API_URL}/protocols/discovery"

echo -e "\n${YELLOW}3. 测试 UCP 协议端点${NC}"
test_endpoint "UCP Skills List" "${API_URL}/ucp/skills"

echo -e "\n${YELLOW}4. 测试 MCP 协议端点${NC}"
test_endpoint "MCP Skills List" "${API_URL}/mcp/skills"

echo -e "\n${YELLOW}5. 测试 ACP 协议端点${NC}"
test_endpoint "ACP Skills List" "${API_URL}/acp/skills"

echo -e "\n${YELLOW}6. 测试 X402 协议端点${NC}"
test_endpoint "X402 Skills List" "${API_URL}/x402/skills"

echo -e "\n${YELLOW}7. 测试 Marketplace 端点${NC}"
test_endpoint "Marketplace Skills" "${API_URL}/skills/marketplace"

echo -e "\n${YELLOW}8. 测试入驻引导端点${NC}"
test_data='{"persona":"api_provider","source":"workbench"}'
test_endpoint "Start Onboarding" "${API_URL}/onboarding/start" "POST" "${test_data}"

echo -e "\n========================================="
echo -e "${GREEN}测试完成！${NC}"
echo "========================================="

echo -e "\n${YELLOW}前端访问地址：${NC}"
echo "  - 主页：     http://localhost:3000"
echo "  - 工作台：   http://localhost:3000/workbench"
echo "  - Marketplace: http://localhost:3000/marketplace"
echo "  - SDK文档：  http://localhost:3002"

echo -e "\n${YELLOW}后端 API 地址：${NC}"
echo "  - Health:    ${API_URL}/health"
echo "  - Protocols: ${API_URL}/protocols/discovery"
echo "  - UCP:       ${API_URL}/ucp/skills"
echo "  - MCP:       ${API_URL}/mcp/skills"
echo "  - X402:      ${API_URL}/x402/skills"
