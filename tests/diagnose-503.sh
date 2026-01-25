#!/bin/bash
# 后端503错误诊断和修复脚本

echo "======================================"
echo "后端 503 错误诊断"
echo "======================================"
echo ""

# 1. 检查后端日志
echo "[1/5] 检查后端日志（最后50行）..."
if [ -f backend/backend.log ]; then
    echo "--- 后端日志 ---"
    tail -50 backend/backend.log | grep -i "error\|exception\|fail\|database\|postgres" || echo "无明显错误信息"
else
    echo "⚠️ 后端日志文件不存在"
fi
echo ""

# 2. 检查 PostgreSQL 状态
echo "[2/5] 检查 PostgreSQL 数据库..."
if command -v psql &> /dev/null; then
    if sudo service postgresql status | grep -q "online\|active"; then
        echo "✓ PostgreSQL 正在运行"
        
        # 测试数据库连接
        if PGPASSWORD=agentrix_secure_2024 psql -U agentrix -h localhost -d paymind -c '\conninfo' &>/dev/null; then
            echo "✓ 数据库连接正常"
        else
            echo "✗ 数据库连接失败"
            echo "尝试启动 PostgreSQL..."
            sudo service postgresql start
        fi
    else
        echo "✗ PostgreSQL 未运行"
        echo "尝试启动..."
        sudo service postgresql start
        sleep 3
    fi
else
    echo "⚠️ psql 未安装，无法检查数据库"
fi
echo ""

# 3. 检查环境变量
echo "[3/5] 检查 .env 配置..."
if [ -f backend/.env ]; then
    echo "✓ .env 文件存在"
    if grep -q "DATABASE_URL" backend/.env; then
        echo "✓ DATABASE_URL 已配置"
    else
        echo "✗ DATABASE_URL 未配置"
        echo "添加默认配置..."
        echo "DATABASE_URL=postgresql://agentrix:agentrix_secure_2024@localhost:5432/paymind" >> backend/.env
    fi
else
    echo "✗ .env 文件不存在，创建默认配置..."
    cat > backend/.env << 'EOF'
# Database
DATABASE_URL=postgresql://agentrix:agentrix_secure_2024@localhost:5432/paymind
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=agentrix
DB_PASSWORD=agentrix_secure_2024
DB_DATABASE=paymind

# Application
NODE_ENV=development
PORT=3001

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
EOF
    echo "✓ 已创建 .env 文件"
fi
echo ""

# 4. 测试后端健康端点
echo "[4/5] 测试后端健康端点..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null)
if [ "$response" = "200" ]; then
    echo "✓ 后端服务正常 (HTTP 200)"
elif [ "$response" = "503" ]; then
    echo "✗ 后端服务不可用 (HTTP 503)"
    echo "可能原因："
    echo "  1. 数据库连接失败"
    echo "  2. 依赖服务未启动"
    echo "  3. 应用初始化错误"
else
    echo "✗ 后端服务异常 (HTTP $response)"
fi
echo ""

# 5. 提供修复建议
echo "[5/5] 修复建议..."
echo ""
echo "如果数据库连接失败，请执行："
echo "  sudo service postgresql start"
echo "  PGPASSWORD=agentrix_secure_2024 psql -U agentrix -h localhost -d paymind -c 'SELECT version();'"
echo ""
echo "如果需要重启后端："
echo "  cd backend"
echo "  pkill -f 'ts-node.*main'"
echo "  npm run start:dev"
echo ""
echo "查看完整后端日志："
echo "  tail -f backend/backend.log"
echo ""
