#!/bin/bash

echo "🔧 PayMind 数据库修复脚本"
echo "=========================="
echo ""

# 检查PostgreSQL是否运行
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL 未运行，请先启动PostgreSQL"
    echo "   运行: sudo systemctl start postgresql"
    exit 1
fi

echo "✅ PostgreSQL 正在运行"
echo ""

# 尝试不同的密码
PASSWORDS=("postgres" "" "password" "admin")

DB_NAME="paymind"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

SUCCESS=false

for PASSWORD in "${PASSWORDS[@]}"; do
    echo "尝试连接数据库 (密码: ${PASSWORD:-空})..."
    
    if [ -z "$PASSWORD" ]; then
        # 尝试无密码连接（peer认证）
        if sudo -u postgres psql -c "\l" > /dev/null 2>&1; then
            echo "✅ 使用peer认证连接成功"
            SUCCESS=true
            AUTH_METHOD="peer"
            break
        fi
    else
        # 尝试密码认证
        export PGPASSWORD="$PASSWORD"
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "\l" > /dev/null 2>&1; then
            echo "✅ 使用密码 '$PASSWORD' 连接成功"
            SUCCESS=true
            AUTH_METHOD="password"
            CORRECT_PASSWORD="$PASSWORD"
            break
        fi
        unset PGPASSWORD
    fi
done

if [ "$SUCCESS" = false ]; then
    echo ""
    echo "❌ 无法连接到PostgreSQL"
    echo ""
    echo "请手动执行以下步骤："
    echo "1. 确认PostgreSQL密码:"
    echo "   sudo -u postgres psql"
    echo "   ALTER USER postgres PASSWORD '你的密码';"
    echo ""
    echo "2. 更新 backend/.env 文件中的 DB_PASSWORD"
    echo ""
    exit 1
fi

echo ""
echo "检查数据库是否存在..."

if [ "$AUTH_METHOD" = "peer" ]; then
    DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null)
else
    export PGPASSWORD="$CORRECT_PASSWORD"
    DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null)
fi

if [ "$DB_EXISTS" = "1" ]; then
    echo "✅ 数据库 '$DB_NAME' 已存在"
else
    echo "⚠️  数据库 '$DB_NAME' 不存在，正在创建..."
    
    if [ "$AUTH_METHOD" = "peer" ]; then
        sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
    else
        export PGPASSWORD="$CORRECT_PASSWORD"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ 数据库 '$DB_NAME' 创建成功"
    else
        echo "❌ 数据库创建失败"
        exit 1
    fi
fi

# 更新 .env 文件
if [ "$AUTH_METHOD" = "password" ] && [ -n "$CORRECT_PASSWORD" ]; then
    echo ""
    echo "更新 backend/.env 文件..."
    cd "$(dirname "$0")/backend"
    
    if [ -f .env ]; then
        # 更新密码
        if grep -q "^DB_PASSWORD=" .env; then
            sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$CORRECT_PASSWORD/" .env
        else
            echo "DB_PASSWORD=$CORRECT_PASSWORD" >> .env
        fi
        echo "✅ .env 文件已更新"
    else
        echo "⚠️  .env 文件不存在，请手动创建"
    fi
fi

echo ""
echo "=========================="
echo "✅ 数据库修复完成！"
echo ""
echo "现在可以运行: ./start-dev.sh"
echo ""

