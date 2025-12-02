#!/bin/bash

echo "🔧 PayMind PostgreSQL 密码修复脚本"
echo "===================================="
echo ""

# 检查PostgreSQL是否运行
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL 未运行"
    echo "   请先启动PostgreSQL: sudo systemctl start postgresql"
    exit 1
fi

echo "✅ PostgreSQL 正在运行"
echo ""

# 尝试使用sudo连接
echo "尝试使用sudo连接到PostgreSQL..."
echo "（如果提示输入密码，请输入你的用户密码）"
echo ""

# 创建SQL脚本
SQL_SCRIPT="/tmp/fix_postgres_password.sql"
cat > "$SQL_SCRIPT" << 'SQL'
-- 设置postgres用户密码
ALTER USER postgres PASSWORD 'postgres';

-- 检查数据库是否存在，不存在则创建
SELECT 'CREATE DATABASE paymind'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'paymind')\gexec

-- 显示结果
\echo '✅ PostgreSQL密码已设置为: postgres'
\echo '✅ 数据库 paymind 已准备就绪'
SQL

# 尝试执行
if sudo -u postgres psql -f "$SQL_SCRIPT" 2>&1; then
    echo ""
    echo "✅ 成功！PostgreSQL密码已设置为 'postgres'"
    echo "✅ 数据库 'paymind' 已创建或已存在"
    rm -f "$SQL_SCRIPT"
    
    # 验证连接
    echo ""
    echo "验证数据库连接..."
    export PGPASSWORD=postgres
    if psql -h localhost -U postgres -d paymind -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ 数据库连接成功！"
        echo ""
        echo "现在可以启动服务了："
        echo "  ./start-dev.sh"
    else
        echo "⚠️  连接验证失败，但密码可能已设置"
        echo "   请手动测试: PGPASSWORD=postgres psql -h localhost -U postgres -d paymind -c 'SELECT 1;'"
    fi
    unset PGPASSWORD
else
    echo ""
    echo "❌ 无法使用sudo连接到PostgreSQL"
    echo ""
    echo "请手动执行以下步骤："
    echo ""
    echo "1. 运行: sudo -u postgres psql"
    echo ""
    echo "2. 在psql中执行："
    echo "   ALTER USER postgres PASSWORD 'postgres';"
    echo "   CREATE DATABASE paymind;"
    echo "   \\q"
    echo ""
    echo "3. 然后运行: ./start-dev.sh"
    echo ""
    rm -f "$SQL_SCRIPT"
    exit 1
fi

