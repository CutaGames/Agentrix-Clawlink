#!/bin/bash

# Agentrix Agent V3.0 性能测试脚本

echo "=========================================="
echo "Agentrix Agent V3.0 性能测试"
echo "=========================================="

API_URL="http://localhost:3001/api"
TOKEN="${AGENTRIX_TOKEN:-}"

if [ -z "$TOKEN" ]; then
    echo "警告: 未设置 AGENTRIX_TOKEN 环境变量"
    echo "请先登录获取token，然后设置: export AGENTRIX_TOKEN='your-token'"
    echo ""
    read -p "是否继续测试? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "=== 1. 缓存性能测试 ==="
echo ""

# 测试语义搜索缓存效果
echo "测试1: 语义搜索（第一次，无缓存）"
START_TIME=$(date +%s%N)
curl -s -X GET "$API_URL/search/semantic?q=游戏剑&topK=10" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
END_TIME=$(date +%s%N)
FIRST_TIME=$((($END_TIME - $START_TIME) / 1000000))
echo "第一次响应时间: ${FIRST_TIME}ms"

echo ""
echo "测试2: 语义搜索（第二次，有缓存）"
START_TIME=$(date +%s%N)
curl -s -X GET "$API_URL/search/semantic?q=游戏剑&topK=10" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
END_TIME=$(date +%s%N)
SECOND_TIME=$((($END_TIME - $START_TIME) / 1000000))
echo "第二次响应时间: ${SECOND_TIME}ms"

if [ $SECOND_TIME -lt $FIRST_TIME ]; then
    IMPROVEMENT=$((100 - ($SECOND_TIME * 100 / $FIRST_TIME)))
    echo "✓ 缓存生效，性能提升约 ${IMPROVEMENT}%"
else
    echo "⚠ 缓存可能未生效"
fi

echo ""
echo "=== 2. API响应时间测试 ==="
echo ""

# 测试Agent聊天API
echo "测试Agent聊天API响应时间（10次请求）:"
TIMES=()
for i in {1..10}; do
    START_TIME=$(date +%s%N)
    curl -s -X POST "$API_URL/agent/chat" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"message":"测试消息"}' > /dev/null
    END_TIME=$(date +%s%N)
    TIME=$((($END_TIME - $START_TIME) / 1000000))
    TIMES+=($TIME)
    echo "请求 $i: ${TIME}ms"
done

# 计算平均值
TOTAL=0
for time in "${TIMES[@]}"; do
    TOTAL=$((TOTAL + time))
done
AVG=$((TOTAL / ${#TIMES[@]}))
echo "平均响应时间: ${AVG}ms"

if [ $AVG -lt 500 ]; then
    echo "✓ 响应时间符合要求 (<500ms)"
else
    echo "⚠ 响应时间超过500ms，建议优化"
fi

echo ""
echo "=== 3. 并发测试 ==="
echo ""

if command -v ab &> /dev/null; then
    echo "使用Apache Bench进行并发测试..."
    ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
        -p <(echo '{"message":"测试消息"}') -T application/json \
        "$API_URL/agent/chat" 2>/dev/null | grep -E "(Requests per second|Time per request)"
else
    echo "Apache Bench未安装，跳过并发测试"
    echo "安装方法: sudo apt-get install apache2-utils (Ubuntu/Debian)"
fi

echo ""
echo "=========================================="
echo "性能测试完成"
echo "=========================================="

