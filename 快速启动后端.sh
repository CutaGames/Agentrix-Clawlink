#!/bin/bash

# PayMind 后端快速启动脚本

echo "🚀 PayMind 后端服务启动脚本"
echo ""

# 进入后端目录
cd backend || {
    echo "❌ 错误: 无法进入backend目录"
    exit 1
}

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 检测到缺少依赖，开始安装..."
    npm install
    echo ""
fi

# 检查PostgreSQL
echo "🔍 检查PostgreSQL连接..."
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "✅ PostgreSQL 正在运行"
else
    echo "⚠️  PostgreSQL 未运行或无法连接"
    echo "   提示: 如果数据库连接失败，服务可能无法启动"
    echo "   解决方案: sudo service postgresql start"
    echo ""
fi

# 检查端口
echo "🔍 检查端口3001..."
if lsof -i :3001 > /dev/null 2>&1; then
    echo "⚠️  端口3001已被占用"
    echo "   正在查找占用进程..."
    lsof -i :3001
    echo ""
    read -p "是否要杀死占用进程并继续? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        PID=$(lsof -ti :3001)
        if [ ! -z "$PID" ]; then
            kill -9 $PID
            echo "✅ 已杀死进程 $PID"
            sleep 2
        fi
    else
        echo "❌ 取消启动"
        exit 1
    fi
else
    echo "✅ 端口3001可用"
fi

echo ""
echo "▶️  启动后端服务..."
echo "   等待30-60秒让服务完全启动..."
echo "   启动成功后，访问: http://localhost:3001/api/docs"
echo ""

# 启动服务
npm run start:dev

