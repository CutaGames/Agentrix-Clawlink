#!/bin/bash

# 启动PayMind后端服务脚本

cd "$(dirname "$0")"

echo "🚀 启动PayMind后端服务..."
echo ""

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env 文件不存在，正在创建..."
    cat > .env << EOF
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=paymind

# JWT配置
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
HOST=0.0.0.0
EOF
    echo "✅ 已创建默认 .env 文件"
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📥 安装依赖..."
    npm install
fi

# 编译项目
echo "🔨 编译项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 编译失败，请检查错误信息"
    exit 1
fi

# 检查PostgreSQL
echo "🔍 检查PostgreSQL连接..."
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "⚠️  PostgreSQL未运行，服务可能无法正常工作"
    echo "   请先启动PostgreSQL: sudo service postgresql start"
    echo ""
    read -p "是否继续启动服务? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 启动服务
echo "🚀 启动服务..."
echo "   访问: http://localhost:3001"
echo "   API文档: http://localhost:3001/api/docs"
echo "   健康检查: http://localhost:3001/api/health"
echo "   按 Ctrl+C 停止"
echo ""

# 取消代理设置
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY

npm run start:dev

