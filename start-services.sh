#!/bin/bash

echo "🚀 Agentrix 快速启动脚本"
echo "=========================="
echo ""

# 切换到项目根目录
cd "$(dirname "$0")"

echo "📍 当前目录: $(pwd)"
echo ""

# 检查Backend构建
if [ ! -f "backend/dist/main.js" ]; then
  echo "❌ Backend未构建，正在构建..."
  cd backend
  npm run build || { echo "❌ Backend构建失败"; exit 1; }
  cd ..
else
  echo "✅ Backend已构建"
fi

# 启动Backend (后台运行)
echo ""
echo "🔧 启动Backend服务 (端口3001)..."
cd backend
npm run start:dev > ../backend_runtime.log 2>&1 &
BACKEND_PID=$!
cd ..
echo "   Backend PID: $BACKEND_PID"
echo "   日志文件: backend_runtime.log"

# 等待Backend启动
echo "   等待Backend就绪..."
sleep 8

# 验证Backend
if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
  echo "   ✅ Backend已启动"
else
  echo "   ⚠️  Backend可能未完全启动，请检查 backend_runtime.log"
fi

# 启动Frontend (后台运行)
echo ""
echo "🎨 启动Frontend服务 (端口3000)..."
cd frontend
npm run dev > ../frontend_runtime.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "   Frontend PID: $FRONTEND_PID"
echo "   日志文件: frontend_runtime.log"

# 等待Frontend启动
echo "   等待Frontend就绪..."
sleep 8

# 验证Frontend  
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
  echo "   ✅ Frontend已启动"
else
  echo "   ⚠️  Frontend可能未完全启动，请检查 frontend_runtime.log"
fi

echo ""
echo "🎉 启动完成！"
echo "=========================="
echo ""
echo "访问地址:"
echo "  🏪 Marketplace:  http://localhost:3000/marketplace"
echo "  🛠️  Workbench:    http://localhost:3000/workbench"
echo "  📡 API Health:   http://localhost:3001/api/health"
echo ""
echo "进程管理:"
echo "  Backend PID:  $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "停止服务:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  或使用: pkill -f 'npm run'"
echo ""
echo "查看日志:"
echo "  tail -f backend_runtime.log"
echo "  tail -f frontend_runtime.log"
echo ""
