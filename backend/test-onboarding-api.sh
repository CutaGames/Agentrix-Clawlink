#!/bin/bash

# Test Onboarding API Endpoints
# 测试五大用户画像的入驻 API 端点

BASE_URL="http://localhost:3001"
API_TOKEN="your_jwt_token_here"  # 需要替换为实际的 JWT token

echo "🧪 测试五大用户画像入驻 API 端点"
echo "=================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ========== 获取入驻模板 ==========
echo -e "${YELLOW}📋 1. 获取入驻模板${NC}"
curl -X GET "$BASE_URL/api/onboarding/templates" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "=================================="
echo ""

# ========== 测试 1: API 厂商入驻 ==========
echo -e "${YELLOW}📋 2. API 厂商入驻${NC}"
curl -X POST "$BASE_URL/api/onboarding" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{
    "type": "api_vendor",
    "apiName": "Weather Forecast API",
    "description": "Get real-time weather forecasts for any location",
    "apiDocumentUrl": "https://api.weather.example.com/openapi.json",
    "apiKey": "test_api_key_12345",
    "pricingType": "per_call",
    "pricePerCall": 0.005
  }' \
  | jq '.'

echo ""
echo "=================================="
echo ""

# ========== 测试 2: 实物与服务商入驻 ==========
echo -e "${YELLOW}📋 3. 实物与服务商入驻${NC}"
curl -X POST "$BASE_URL/api/onboarding" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{
    "type": "physical_service",
    "products": [
      {
        "name": "Organic Green Tea",
        "description": "Premium organic green tea from Japan",
        "price": 29.99,
        "currency": "USD",
        "imageUrl": "https://example.com/green-tea.jpg",
        "sku": "TEA-GREEN-001"
      }
    ],
    "fulfillmentType": "physical"
  }' \
  | jq '.'

echo ""
echo "=================================="
echo ""

# ========== 测试 3: 行业专家/顾问入驻 ==========
echo -e "${YELLOW}📋 4. 行业专家/顾问入驻${NC}"
curl -X POST "$BASE_URL/api/onboarding" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{
    "type": "expert_consultant",
    "expertise": "Financial Analyst",
    "problemSolving": "Provide detailed financial analysis and investment recommendations",
    "requiredInputs": ["Financial Statements", "Investment Goals", "Risk Tolerance"],
    "slaResponseTime": 180,
    "slaAccuracyRate": 96,
    "outputFormat": "PDF",
    "pricePerSession": 200
  }' \
  | jq '.'

echo ""
echo "=================================="
echo ""

# ========== 测试 4: 专有数据持有方入驻 ==========
echo -e "${YELLOW}📋 5. 专有数据持有方入驻${NC}"
curl -X POST "$BASE_URL/api/onboarding" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{
    "type": "data_provider",
    "dataSourceUrl": "https://data.example.com/api/v1/query",
    "dataFormat": "api",
    "dataSample": {"example": "financial_data"},
    "privacyLevel": "sensitive",
    "sensitiveFields": ["ssn", "account_number"],
    "pricePerQuery": 0.002,
    "pricePerRecord": 0.0001
  }' \
  | jq '.'

echo ""
echo "=================================="
echo ""

# ========== 测试 5: 全能 AI 开发者入驻 ==========
echo -e "${YELLOW}📋 6. 全能 AI 开发者入驻${NC}"
curl -X POST "$BASE_URL/api/onboarding" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{
    "type": "ai_developer",
    "skillName": "Sentiment Analysis Pro",
    "skillDescription": "Advanced sentiment analysis for text, images, and videos",
    "codeLanguage": "python",
    "codeRepository": "https://github.com/user/sentiment-analysis",
    "inputSchema": {
      "type": "object",
      "properties": {
        "content": {"type": "string", "description": "Content to analyze"},
        "contentType": {"type": "string", "enum": ["text", "image", "video"]}
      },
      "required": ["content", "contentType"]
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "sentiment": {"type": "string", "enum": ["positive", "negative", "neutral"]},
        "confidence": {"type": "number"}
      }
    },
    "dependentSkills": [],
    "visibility": "public",
    "pricePerExecution": 0.25
  }' \
  | jq '.'

echo ""
echo "=================================="
echo ""

# ========== 验证协议端点 ==========
echo -e "${YELLOW}🔍 验证协议端点${NC}"
echo ""

echo -e "${GREEN}1. UCP Skills Catalog (Gemini 可检索)${NC}"
curl -X GET "$BASE_URL/ucp/v1/skills" \
  -H "Content-Type: application/json" \
  | jq '.skills | length'

echo ""

echo -e "${GREEN}2. X402 Service Discovery (Agent 支付协议)${NC}"
curl -X GET "$BASE_URL/.well-known/x402" \
  -H "Content-Type: application/json" \
  | jq '.services | length'

echo ""

echo -e "${GREEN}3. Unified Marketplace Search (全部 Skills)${NC}"
curl -X GET "$BASE_URL/api/unified-marketplace/search?status=published" \
  -H "Content-Type: application/json" \
  | jq '.total'

echo ""

echo -e "${GREEN}✅ 测试完成！${NC}"
echo ""
echo "后续步骤:"
echo "1. 检查创建的 Skills 是否都已发布 (status=published)"
echo "2. 验证 UCP/X402 端点返回的 Skills 数量"
echo "3. 在 Claude Desktop 或 ChatGPT 中测试 MCP 调用"
echo "4. 在 Gemini 中测试 UCP 商品检索"
