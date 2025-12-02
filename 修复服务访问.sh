#!/bin/bash

# Agentrix 服务访问修复脚本

echo "=========================================="
echo "🔧 Agentrix 服务访问修复"
echo "=========================================="
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查并启动SDK文档服务器
echo "[1/2] 检查SDK文档服务器..."
SDK_PROCESS=$(ps aux | grep -E 'http-server.*8080' | grep -v grep | head -1)

if [ -z "$SDK_PROCESS" ]; then
    echo "⚠️  SDK文档服务器未运行，正在启动..."
    
    # 检查 sdk-js/docs 目录是否存在
    if [ ! -d "sdk-js/docs" ]; then
        echo "❌ sdk-js/docs 目录不存在"
        echo "   请先生成SDK文档: cd sdk-js && npm run docs"
    else
        # 创建日志目录
        mkdir -p logs
        
        # 启动SDK文档服务器
        cd sdk-js/docs
        nohup npx http-server -p 8080 -a 0.0.0.0 > ../../logs/sdk-docs.log 2>&1 &
        SDK_PID=$!
        cd "$SCRIPT_DIR"
        
        echo $SDK_PID > .sdk-docs.pid
        echo "✅ SDK文档服务器已启动 (PID: $SDK_PID)"
        echo "   访问: http://localhost:8080"
        sleep 2
    fi
else
    echo "✅ SDK文档服务器已在运行"
    echo "$SDK_PROCESS" | awk '{print "   PID:", $2}'
fi

echo ""

# 检查后端服务
echo "[2/2] 检查后端服务..."
BACKEND_PROCESS=$(ps aux | grep -E 'nest start|node.*dist/main' | grep -v grep | head -1)

if [ -z "$BACKEND_PROCESS" ]; then
    echo "⚠️  后端服务未运行"
    echo "   请手动启动: cd backend && npm run start:dev"
else
    echo "✅ 后端服务正在运行"
    echo "$BACKEND_PROCESS" | awk '{print "   PID:", $2}'
    
    # 测试后端连接
    echo ""
    echo "🔍 测试后端连接..."
    sleep 2
    
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "✅ 后端服务可访问"
        echo "   API: http://localhost:3001/api"
        echo "   文档: http://localhost:3001/api/docs"
    elif curl -s http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
        echo "✅ 后端服务可访问 (使用 127.0.0.1)"
        echo "   API: http://127.0.0.1:3001/api"
        echo "   文档: http://127.0.0.1:3001/api/docs"
    else
        echo "❌ 后端服务无法访问"
        echo "   请检查后端日志: tail -f logs/backend.log"
    fi
fi

echo ""
echo "=========================================="
echo "📋 访问地址"
echo "=========================================="
echo ""
echo "🌐 前端应用:    http://localhost:3000"
echo "🔧 后端API:     http://localhost:3001/api"
echo "📖 API文档:     http://localhost:3001/api/docs"
echo "📚 SDK文档:     http://localhost:8080"
echo ""
echo "💡 如果无法访问，请尝试:"
echo "   - http://127.0.0.1:3001/api/docs"
echo "   - http://127.0.0.1:8080"
echo ""

