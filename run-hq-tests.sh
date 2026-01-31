#!/bin/bash

# Agentrix HQ Workbench 功能测试脚本
# 测试 P0-P2 任务修复后的核心功能

echo "=================================="
echo "  Agentrix HQ 功能测试报告"
echo "  测试时间: $(date)"
echo "=================================="

HQ_URL="http://localhost:3005"
PASS=0
FAIL=0

test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$HQ_URL$endpoint" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$HQ_URL$endpoint" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 400 ]; then
        echo "✅ PASS: $name (HTTP $http_code)"
        PASS=$((PASS + 1))
        return 0
    else
        echo "❌ FAIL: $name (HTTP $http_code)"
        FAIL=$((FAIL + 1))
        return 1
    fi
}

echo ""
echo "📊 [1/5] Dashboard 功能测试"
echo "----------------------------"
test_endpoint "获取健康状态" GET "/api/health"
test_endpoint "Dashboard 统计" GET "/api/hq/dashboard/stats"
test_endpoint "Dashboard 告警" GET "/api/hq/dashboard/alerts"

echo ""
echo "🤖 [2/5] Agent 管理测试"
echo "----------------------------"
test_endpoint "Agent 列表" GET "/api/hq/agents"
test_endpoint "Agent 详情" GET "/api/hq/agents/ARCHITECT-01"

echo ""
echo "🔍 [3/5] 协议扫描测试 (UCP/X402/MCP)"
echo "----------------------------"
test_endpoint "协议摘要" GET "/api/hq/protocols/summary"
test_endpoint "MCP Tools" GET "/api/hq/protocols/mcp"
test_endpoint "UCP Skills" GET "/api/hq/protocols/ucp"
test_endpoint "X402 Paths" GET "/api/hq/protocols/x402"

echo ""
echo "📚 [4/5] 知识库测试"
echo "----------------------------"
test_endpoint "知识库内容" GET "/api/hq/knowledge-base"
test_endpoint "RAG 文件列表" GET "/api/hq/rag-files"
test_endpoint "RAG 搜索" GET "/api/hq/rag-search?query=payment"

echo ""
echo "💻 [5/5] Workspace 测试"
echo "----------------------------"
test_endpoint "工作空间信息" GET "/api/hq/workspace/info"
test_endpoint "工作空间文件列表" GET "/api/hq/workspace/files"

echo ""
echo "=================================="
echo "         测试结果汇总"
echo "=================================="
echo "✅ 通过: $PASS"
echo "❌ 失败: $FAIL"
echo "📊 总计: $((PASS + FAIL))"
echo "📈 通过率: $(echo "scale=1; $PASS * 100 / ($PASS + $FAIL)" | bc)%"
echo "=================================="

if [ $FAIL -gt 0 ]; then
    exit 1
else
    exit 0
fi
