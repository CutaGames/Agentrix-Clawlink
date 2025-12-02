#!/bin/bash

# PayMind WSL 环境启动脚本
# 适用于在 WSL (Ubuntu) 环境中运行

echo "🚀 启动 PayMind 所有服务 (WSL环境)..."
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js"
    echo "   请运行: sudo apt update && sudo apt install nodejs npm"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo "✅ npm 版本: $(npm -v)"
echo ""

# 检查依赖
echo "📦 检查依赖..."

if [ ! -d "backend/node_modules" ]; then
    echo "📥 安装后端依赖..."
    cd backend && npm install && cd ..
fi

if [ ! -d "paymindfrontend/node_modules" ]; then
    echo "📥 安装前端依赖..."
    cd paymindfrontend && npm install && cd ..
fi

echo ""
echo "🎯 启动服务..."
echo ""

# 启动后端
echo "🔧 启动后端服务 (http://localhost:3001)..."
cd backend
npm run start:dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo "后端 PID: $BACKEND_PID"

# 等待后端启动
sleep 5

# 启动前端
echo "🎨 启动前端服务 (http://localhost:3000)..."
cd paymindfrontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "前端 PID: $FRONTEND_PID"

# 启动SDK文档服务器
echo "📚 启动SDK文档服务器 (http://localhost:8080)..."
cd sdk-js/docs
npx http-server -p 8080 > ../../../logs/sdk-docs.log 2>&1 &
SDK_PID=$!
cd ../../..
echo "SDK文档服务器 PID: $SDK_PID"

# 保存PID
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid
echo $SDK_PID > .sdk-docs.pid

echo ""
echo "✅ 所有服务已启动！"
echo ""
echo "📊 访问地址:"
echo "   🌐 前端应用:    http://localhost:3000"
echo "   🔧 后端API:     http://localhost:3001/api"
echo "   📖 API文档:     http://localhost:3001/api/docs"
echo "   📚 SDK文档:     http://localhost:8080"
echo ""
echo "📋 查看日志:"
echo "   tail -f logs/backend.log"
echo "   tail -f logs/frontend.log"
echo "   tail -f logs/sdk-docs.log"
echo ""
echo "🛑 停止服务: ./stop-services.sh"
echo ""

# 创建停止脚本
cat > stop-services.sh << 'EOF'
#!/bin/bash
echo "🛑 正在停止所有服务..."

if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    kill $BACKEND_PID 2>/dev/null && echo "✅ 后端服务已停止 (PID: $BACKEND_PID)"
    rm .backend.pid
fi

if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    kill $FRONTEND_PID 2>/dev/null && echo "✅ 前端服务已停止 (PID: $FRONTEND_PID)"
    rm .frontend.pid
fi

if [ -f .sdk-docs.pid ]; then
    SDK_PID=$(cat .sdk-docs.pid)
    kill $SDK_PID 2>/dev/null && echo "✅ SDK文档服务器已停止 (PID: $SDK_PID)"
    rm .sdk-docs.pid
fi

echo "✅ 所有服务已停止"
EOF

chmod +x stop-services.sh

# 等待用户中断
trap "echo ''; echo '🛑 正在停止服务...'; \
      [ -f .backend.pid ] && kill \$(cat .backend.pid) 2>/dev/null; \
      [ -f .frontend.pid ] && kill \$(cat .frontend.pid) 2>/dev/null; \
      [ -f .sdk-docs.pid ] && kill \$(cat .sdk-docs.pid) 2>/dev/null; \
      rm -f .backend.pid .frontend.pid .sdk-docs.pid; \
      echo '✅ 所有服务已停止'; exit" INT TERM

wait

