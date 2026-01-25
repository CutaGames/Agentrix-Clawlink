#!/bin/bash
# 自动修复503错误并重新测试

set -e

echo "╔════════════════════════════════════════════════════╗"
echo "║  503错误自动修复脚本                                ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# 1. 启动PostgreSQL
echo "[1/6] 启动 PostgreSQL..."
if sudo service postgresql status | grep -q "offline\|down"; then
    sudo service postgresql start
    sleep 3
    echo "✓ PostgreSQL 已启动"
else
    echo "✓ PostgreSQL 已在运行"
fi
echo ""

# 2. 验证数据库连接
echo "[2/6] 验证数据库连接..."
if PGPASSWORD=agentrix_secure_2024 psql -U agentrix -h localhost -d paymind -c '\conninfo' &>/dev/null; then
    echo "✓ 数据库连接成功"
else
    echo "✗ 数据库连接失败，尝试创建数据库..."
    if PGPASSWORD=agentrix_secure_2024 createdb -U agentrix -h localhost paymind 2>/dev/null; then
        echo "✓ 数据库 paymind 已创建"
    else
        echo "⚠️ 数据库可能已存在或权限不足"
    fi
fi
echo ""

# 3. 停止旧进程
echo "[3/6] 停止旧的后端进程..."
pkill -f "ts-node.*main" 2>/dev/null || true
pkill -f "node.*dist/main" 2>/dev/null || true
sleep 2
echo "✓ 旧进程已清理"
echo ""

# 4. 重新构建后端
echo "[4/6] 重新构建后端..."
cd ../backend
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ 构建成功"
else
    echo "✗ 构建失败，但继续尝试..."
fi
cd ..
echo ""

# 5. 启动后端
echo "[5/6] 启动后端服务..."
cd backend
nohup npm run start:dev > ../backend_fixed.log 2>&1 &
BACKEND_PID=$!
echo "后端 PID: $BACKEND_PID"
cd ..

# 等待后端启动
echo -n "等待后端启动"
for i in {1..40}; do
    if curl -s http://localhost:3001/api/health | grep -q "ok\|status" 2>/dev/null; then
        echo ""
        echo "✓ 后端服务正常启动"
        break
    fi
    echo -n "."
    sleep 1
    
    # 检查日志中的错误
    if [ $i -eq 20 ]; then
        echo ""
        echo "检查启动日志..."
        tail -20 backend_fixed.log | grep -i "error\|fail\|database" || true
    fi
    
    if [ $i -eq 40 ]; then
        echo ""
        echo "✗ 后端启动超时"
        echo ""
        echo "最后的日志："
        tail -30 backend_fixed.log
        exit 1
    fi
done
echo ""

# 6. 运行验证测试
echo "[6/6] 运行路由验证..."
bash tests/verify-persona-flows.sh
RESULT=$?

echo ""
echo "════════════════════════════════════════════════════"
if [ $RESULT -eq 0 ]; then
    echo "✅ 所有测试通过！"
else
    echo "⚠️ 部分测试未通过，查看详细日志："
    echo "   tail -50 backend_fixed.log"
fi
echo "════════════════════════════════════════════════════"

exit $RESULT
