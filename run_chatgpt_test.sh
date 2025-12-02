#!/bin/bash

# PayMind ChatGPT 集成测试脚本

echo "=========================================="
echo "🤖 PayMind ChatGPT 集成测试"
echo "=========================================="

# 1. 检查 Python3
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装: sudo apt install python3 python3-pip"
    exit 1
fi

# 2. 检查依赖
echo ""
echo "📦 检查 Python 依赖..."
python3 -c "import requests, openai" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  缺少依赖，正在安装..."
    pip3 install openai requests
fi

# 3. 检查 API 是否可用
echo ""
echo "🔍 检查 PayMind API..."
API_RESPONSE=$(curl -s http://localhost:3001/api/openai/functions)
if [ $? -ne 0 ] || [ -z "$API_RESPONSE" ]; then
    echo "❌ 无法连接到 PayMind API (http://localhost:3001)"
    echo "   请确保后端服务正在运行: cd backend && npm run start:dev"
    exit 1
fi

FUNCTION_COUNT=$(echo "$API_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('count', 0))" 2>/dev/null)
if [ -z "$FUNCTION_COUNT" ] || [ "$FUNCTION_COUNT" = "0" ]; then
    echo "⚠️  API 响应异常，但继续测试..."
else
    echo "✅ 找到 $FUNCTION_COUNT 个 Functions"
fi

# 4. 检查 OpenAI API Key
echo ""
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  未设置 OPENAI_API_KEY 环境变量"
    echo "   请设置: export OPENAI_API_KEY='sk-your-key'"
    echo ""
    read -p "是否继续测试? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 5. 运行测试
echo ""
echo "🚀 运行测试..."
echo "=========================================="
python3 test_chatgpt_integration.py

