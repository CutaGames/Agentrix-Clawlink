#!/bin/bash

# PayMind 服务状态检查脚本

echo "=========================================="
echo "🔍 PayMind 服务状态检查"
echo "=========================================="
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📋 检查端口监听状态..."
echo ""

# 检查端口 3001 (后端)
if command -v ss &> /dev/null; then
    PORT_3001=$(ss -tuln | grep ':3001' || echo "")
elif command -v netstat &> /dev/null; then
    PORT_3001=$(netstat -tuln | grep ':3001' || echo "")
else
    PORT_3001=""
fi

if [ -n "$PORT_3001" ]; then
    echo "✅ 端口 3001 (后端) 正在监听"
    echo "   $PORT_3001"
else
    echo "❌ 端口 3001 (后端) 未监听"
fi

echo ""

# 检查端口 8080 (SDK文档)
if command -v ss &> /dev/null; then
    PORT_8080=$(ss -tuln | grep ':8080' || echo "")
elif command -v netstat &> /dev/null; then
    PORT_8080=$(netstat -tuln | grep ':8080' || echo "")
else
    PORT_8080=""
fi

if [ -n "$PORT_8080" ]; then
    echo "✅ 端口 8080 (SDK文档) 正在监听"
    echo "   $PORT_8080"
else
    echo "❌ 端口 8080 (SDK文档) 未监听"
fi

echo ""
echo "📋 检查进程状态..."
echo ""

# 检查后端进程
BACKEND_PROCESS=$(ps aux | grep -E 'nest start|node.*dist/main' | grep -v grep | head -1)
if [ -n "$BACKEND_PROCESS" ]; then
    echo "✅ 后端进程正在运行"
    echo "   $BACKEND_PROCESS" | awk '{print "   PID:", $2, "CMD:", $11, $12, $13}'
else
    echo "❌ 后端进程未运行"
fi

echo ""

# 检查前端进程
FRONTEND_PROCESS=$(ps aux | grep -E 'next dev' | grep -v grep | head -1)
if [ -n "$FRONTEND_PROCESS" ]; then
    echo "✅ 前端进程正在运行"
    echo "   $FRONTEND_PROCESS" | awk '{print "   PID:", $2, "CMD:", $11, $12, $13}'
else
    echo "❌ 前端进程未运行"
fi

echo ""

# 检查SDK文档服务器进程
SDK_PROCESS=$(ps aux | grep -E 'http-server.*8080' | grep -v grep | head -1)
if [ -n "$SDK_PROCESS" ]; then
    echo "✅ SDK文档服务器进程正在运行"
    echo "   $SDK_PROCESS" | awk '{print "   PID:", $2, "CMD:", $11, $12, $13}'
else
    echo "❌ SDK文档服务器进程未运行"
fi

echo ""
echo "📋 检查日志文件..."
echo ""

if [ -f "logs/backend.log" ]; then
    echo "✅ 后端日志文件存在"
    echo "   最后几行:"
    tail -5 logs/backend.log | sed 's/^/   /'
else
    echo "⚠️  后端日志文件不存在"
fi

echo ""

if [ -f "logs/sdk-docs.log" ]; then
    echo "✅ SDK文档日志文件存在"
    echo "   最后几行:"
    tail -5 logs/sdk-docs.log | sed 's/^/   /'
else
    echo "⚠️  SDK文档日志文件不存在"
fi

echo ""
echo "📋 测试服务连接..."
echo ""

# 测试后端
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ 后端服务可访问 (http://localhost:3001/api/health)"
elif curl -s http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
    echo "✅ 后端服务可访问 (http://127.0.0.1:3001/api/health)"
else
    echo "❌ 后端服务无法访问"
fi

# 测试API文档
if curl -s http://localhost:3001/api/docs > /dev/null 2>&1; then
    echo "✅ API文档可访问 (http://localhost:3001/api/docs)"
elif curl -s http://127.0.0.1:3001/api/docs > /dev/null 2>&1; then
    echo "✅ API文档可访问 (http://127.0.0.1:3001/api/docs)"
else
    echo "❌ API文档无法访问"
fi

# 测试SDK文档
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ SDK文档可访问 (http://localhost:8080)"
elif curl -s http://127.0.0.1:8080 > /dev/null 2>&1; then
    echo "✅ SDK文档可访问 (http://127.0.0.1:8080)"
else
    echo "❌ SDK文档无法访问"
fi

echo ""
echo "=========================================="
echo "💡 建议"
echo "=========================================="
echo ""

if [ -z "$PORT_8080" ] && [ -z "$SDK_PROCESS" ]; then
    echo "⚠️  SDK文档服务器未启动"
    echo "   运行: cd sdk-js/docs && npx http-server -p 8080"
    echo ""
fi

if [ -z "$PORT_3001" ] && [ -z "$BACKEND_PROCESS" ]; then
    echo "⚠️  后端服务未启动"
    echo "   运行: cd backend && npm run start:dev"
    echo ""
fi

echo "📝 查看完整日志:"
echo "   tail -f logs/backend.log"
echo "   tail -f logs/sdk-docs.log"
echo ""

