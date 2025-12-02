#!/bin/bash

# PayMind 后端服务状态检查脚本

echo "🔍 检查后端服务状态..."
echo ""

# 检查端口3001是否被占用
echo "📡 检查端口3001..."
if lsof -i :3001 > /dev/null 2>&1 || netstat -ano | grep :3001 > /dev/null 2>&1; then
    echo "✅ 端口3001已被占用（服务可能正在运行）"
    echo ""
    echo "正在运行的进程："
    lsof -i :3001 2>/dev/null || netstat -ano | grep :3001
else
    echo "❌ 端口3001未被占用（服务未运行）"
fi

echo ""
echo "🌐 测试API端点..."
echo ""

# 测试API健康检查
if curl -s http://localhost:3001/api > /dev/null 2>&1; then
    echo "✅ API根路径可访问: http://localhost:3001/api"
else
    echo "❌ API根路径不可访问: http://localhost:3001/api"
fi

# 测试Swagger文档
if curl -s http://localhost:3001/api/docs > /dev/null 2>&1; then
    echo "✅ Swagger文档可访问: http://localhost:3001/api/docs"
else
    echo "❌ Swagger文档不可访问: http://localhost:3001/api/docs"
fi

echo ""
echo "📋 检查后端目录..."
cd backend 2>/dev/null || {
    echo "❌ 无法进入backend目录"
    exit 1
}

if [ -f "package.json" ]; then
    echo "✅ package.json 存在"
else
    echo "❌ package.json 不存在"
fi

if [ -f "src/main.ts" ]; then
    echo "✅ src/main.ts 存在"
else
    echo "❌ src/main.ts 不存在"
fi

echo ""
echo "📦 检查依赖..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules 目录存在"
    
    # 检查关键依赖
    if [ -d "node_modules/@nestjs/swagger" ]; then
        echo "✅ @nestjs/swagger 已安装"
    else
        echo "❌ @nestjs/swagger 未安装"
    fi
else
    echo "❌ node_modules 目录不存在（需要运行 npm install）"
fi

echo ""
echo "✅ 检查完成！"
echo ""
echo "如果服务未运行，请执行："
echo "  cd backend"
echo "  npm run start:dev"

