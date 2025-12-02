#!/bin/bash

# PayMind 后台管理系统快速启动和测试脚本
# Linux/WSL版本

echo "=========================================="
echo "  PayMind 后台管理系统启动和测试"
echo "=========================================="
echo ""

# 检查服务是否运行
echo "🔍 检查服务状态..."

BACKEND_RUNNING=false
ADMIN_RUNNING=false
FRONTEND_RUNNING=false

if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    BACKEND_RUNNING=true
    echo "✅ 主API服务 (3001) 正在运行"
else
    echo "❌ 主API服务 (3001) 未运行"
fi

if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
    ADMIN_RUNNING=true
    echo "✅ 后台管理服务 (3002) 正在运行"
else
    echo "❌ 后台管理服务 (3002) 未运行"
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    FRONTEND_RUNNING=true
    echo "✅ 前端服务 (3000) 正在运行"
else
    echo "❌ 前端服务 (3000) 未运行"
fi

echo ""

# 如果服务未运行，提示启动
if [ "$BACKEND_RUNNING" = false ]; then
    echo "💡 提示: 请启动主API服务"
    echo "   cd backend && npm run start:dev"
fi

if [ "$ADMIN_RUNNING" = false ]; then
    echo "💡 提示: 请启动后台管理服务"
    echo "   cd backend && npm run start:admin:dev"
fi

if [ "$FRONTEND_RUNNING" = false ]; then
    echo "💡 提示: 请启动前端服务"
    echo "   cd paymindfrontend && npm run dev"
fi

echo ""
echo "=========================================="
echo "📚 访问地址"
echo "=========================================="
echo ""
echo "🌐 官网前端: http://localhost:3000"
echo "🔧 管理后台: http://localhost:3000/admin"
echo "📖 API文档 (主): http://localhost:3001/api/docs"
echo "📖 API文档 (后台): http://localhost:3002/api/docs"
echo ""
echo "=========================================="
echo "🧪 运行API测试"
echo "=========================================="
echo ""

read -p "是否运行API测试? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ "$ADMIN_RUNNING" = true ]; then
        echo "运行API测试..."
        cd backend
        chmod +x test-admin-api.sh
        ./test-admin-api.sh
    else
        echo "❌ 后台管理服务未运行，无法测试"
    fi
fi

echo ""
echo "✅ 完成！"

