#!/bin/bash

echo "========================================="
echo "HQ Console 完整验证脚本"
echo "========================================="
echo ""

# 停止所有相关进程
echo "1️⃣ 停止旧进程..."
pkill -9 -f "next-server\|npm.*dev\|main-hq\|ts-node.*hq" 2>/dev/null
sleep 3
echo "   ✅ 已清理"

# 设置无代理环境
export NO_PROXY='*'
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
echo "2️⃣ 环境变量已设置（无代理）"

# 启动前端
echo ""
echo "3️⃣ 启动前端服务..."
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/hq-console
nohup npm run dev > /tmp/hq-console-verify.log 2>&1 &
FRONTEND_PID=$!
echo "   PID: $FRONTEND_PID"
echo "   日志: /tmp/hq-console-verify.log"

# 启动后端
echo ""
echo "4️⃣ 启动HQ后端服务..."
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend
nohup npm run start:hq:dev > /tmp/hq-backend-verify.log 2>&1 &
BACKEND_PID=$!
echo "   PID: $BACKEND_PID"
echo "   日志: /tmp/hq-backend-verify.log"

# 等待启动
echo ""
echo "⏳ 等待服务启动 (60秒)..."
for i in {1..60}; do
    echo -n "."
    sleep 1
done
echo ""

# 验证服务
echo ""
echo "========================================="
echo "开始验证服务..."
echo "========================================="

# 检查前端
echo ""
echo "🔍 测试 1: 前端服务 (localhost:4000)"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000 --max-time 5)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "   ✅ 前端正常 (HTTP $FRONTEND_STATUS)"
    FRONTEND_OK=true
else
    echo "   ❌ 前端异常 (HTTP $FRONTEND_STATUS)"
    echo "   日志最后20行:"
    tail -20 /tmp/hq-console-verify.log 2>/dev/null || echo "   (日志文件不存在)"
    FRONTEND_OK=false
fi

# 检查后端健康
echo ""
echo "🔍 测试 2: HQ后端健康检查 (localhost:3005)"
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/api/hq/knowledge-base --max-time 5)
if [ "$BACKEND_STATUS" = "200" ]; then
    echo "   ✅ HQ后端正常 (HTTP $BACKEND_STATUS)"
    BACKEND_OK=true
else
    echo "   ❌ HQ后端异常 (HTTP $BACKEND_STATUS)"
    echo "   日志最后20行:"
    tail -20 /tmp/hq-backend-verify.log 2>/dev/null || echo "   (日志文件不存在)"
    BACKEND_OK=false
fi

# 测试Agent对话
if [ "$BACKEND_OK" = true ]; then
    echo ""
    echo "🔍 测试 3: Agent对话功能"
    CHAT_RESPONSE=$(curl -s -X POST http://localhost:3005/api/hq/chat \
        -H "Content-Type: application/json" \
        -d '{"agentId":"AGENT-GROWTH-001","messages":[{"role":"user","content":"测试"}]}' \
        --max-time 15)
    
    if echo "$CHAT_RESPONSE" | grep -q "所有.*引擎.*不可用"; then
        echo "   ❌ Agent返回错误: AI引擎不可用"
        echo "   响应: $(echo $CHAT_RESPONSE | head -c 200)"
        CHAT_OK=false
    elif echo "$CHAT_RESPONSE" | grep -q "content"; then
        echo "   ✅ Agent对话正常"
        echo "   响应摘要: $(echo $CHAT_RESPONSE | grep -o '"content":"[^"]*"' | head -c 80)..."
        CHAT_OK=true
    else
        echo "   ⚠️  未知响应格式"
        echo "   响应: $(echo $CHAT_RESPONSE | head -c 200)"
        CHAT_OK=false
    fi
fi

# 测试Workspace API  
if [ "$BACKEND_OK" = true ]; then
    echo ""
    echo "🔍 测试 4: Workshop IDE - 工作区信息"
    WORKSPACE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/api/hq/workspace/info --max-time 5)
    if [ "$WORKSPACE_STATUS" = "200" ]; then
        echo "   ✅ 工作区API正常"
        WORKSPACE_OK=true
    else
        echo "   ❌ 工作区API异常 (HTTP $WORKSPACE_STATUS)"
        WORKSPACE_OK=false
    fi
fi

# 最终报告
echo ""
echo "========================================="
echo "📊 验证结果汇总"
echo "========================================="
echo ""
echo "服务状态:"
echo "  前端 (4000):      $(if [ "$FRONTEND_OK" = true ]; then echo '✅ 正常'; else echo '❌ 异常'; fi)"
echo "  后端 (3005):      $(if [ "$BACKEND_OK" = true ]; then echo '✅ 正常'; else echo '❌ 异常'; fi)"
echo ""
echo "功能测试:"
echo "  Agent对话:        $(if [ "$CHAT_OK" = true ]; then echo '✅ 通过'; else echo '❌ 失败'; fi)"
echo "  Workshop IDE:     $(if [ "$WORKSPACE_OK" = true ]; then echo '✅ 通过'; else echo '❌ 失败'; fi)"
echo ""

if [ "$FRONTEND_OK" = true ] && [ "$BACKEND_OK" = true ] && [ "$CHAT_OK" = true ] && [ "$WORKSPACE_OK" = true ]; then
    echo "🎉 全部验证通过！所有功能正常！"
    echo ""
    echo "可以访问: http://localhost:4000"
    exit 0
else
    echo "⚠️  部分测试未通过，请检查日志:"
    echo "  - 前端: /tmp/hq-console-verify.log"
    echo "  - 后端: /tmp/hq-backend-verify.log"
    echo ""
    echo "查看日志命令:"
    echo "  tail -f /tmp/hq-console-verify.log"
    echo "  tail -f /tmp/hq-backend-verify.log"
    exit 1
fi
