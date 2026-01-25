#!/bin/bash

echo "=========================================="
echo "  Agentrix 快速启动与测试脚本"
echo "=========================================="

# 进入项目根目录
cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website

echo ""
echo "1️⃣  检查数据库修复状态..."
PGPASSWORD=postgres psql -h localhost -U postgres -d paymind -c "
SELECT '✅ Developer role exists: ' || EXISTS(
  SELECT 1 FROM pg_enum 
  WHERE enumlabel = 'developer' 
  AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_roles_enum')
);
"

echo ""
echo "2️⃣  停止现有服务..."
pkill -f "ts-node-dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 2

echo ""
echo "3️⃣  启动后端服务 (端口 3001)..."
cd backend
npm run start:dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "   后端 PID: $BACKEND_PID"

echo ""
echo "4️⃣  等待后端启动..."
for i in {1..30}; do
  if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "   ✅ 后端服务已就绪"
    break
  fi
  echo -n "."
  sleep 1
done

echo ""
echo "5️⃣  启动前端服务 (端口 3000)..."
cd ../frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   前端 PID: $FRONTEND_PID"

echo ""
echo "6️⃣  等待前端启动..."
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ 前端服务已就绪"
    break
  fi
  echo -n "."
  sleep 1
done

echo ""
echo "=========================================="
echo "  🎉 服务启动完成！"
echo "=========================================="
echo ""
echo "📍 访问地址:"
echo "   前端: http://localhost:3000"
echo "   后端: http://localhost:3001"
echo "   Skill Registry: http://localhost:3000/agent-enhanced"
echo ""
echo "📋 进程 ID:"
echo "   后端 PID: $BACKEND_PID"
echo "   前端 PID: $FRONTEND_PID"
echo ""
echo "📝 日志文件:"
echo "   后端: backend.log"
echo "   前端: frontend.log"
echo ""
echo "🔍 实时查看日志:"
echo "   tail -f backend.log"
echo "   tail -f frontend.log"
echo ""
echo "🛑 停止服务:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   或执行: pkill -f 'ts-node-dev|next-server'"
echo ""
echo "=========================================="
