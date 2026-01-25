#!/bin/bash
# API 测试脚本

echo "=========================================="
echo "Agentrix Skill Ecosystem Enhancement Tests"
echo "=========================================="

BASE_URL="http://localhost:3001"

echo ""
echo "1. Testing Health Endpoint..."
curl -s "$BASE_URL/api/health" | head -c 200
echo ""

echo ""
echo "2. Testing X402 Discovery Endpoint..."
curl -s "$BASE_URL/.well-known/x402" | head -c 500
echo ""

echo ""
echo "3. Testing UCP Products Endpoint..."
curl -s "$BASE_URL/ucp/v1/products" | head -c 500
echo ""

echo ""
echo "4. Testing UCP Skills Endpoint..."
curl -s "$BASE_URL/ucp/v1/skills" | head -c 500
echo ""

echo ""
echo "5. Testing OAuth Discovery..."
curl -s "$BASE_URL/.well-known/oauth-authorization-server" | head -c 300
echo ""

echo ""
echo "=========================================="
echo "Tests Complete!"
echo "=========================================="
