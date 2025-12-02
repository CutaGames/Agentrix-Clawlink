#!/bin/bash

# 修复 agent_stats 表的重复索引问题

echo "正在修复 agent_stats 表的重复索引问题..."

# 尝试不同的数据库连接方式
# 方式1: 使用环境变量中的数据库配置
DB_USER="${DB_USERNAME:-paymind}"
DB_PASSWORD="${DB_PASSWORD:-paymind_password}"
DB_NAME="${DB_DATABASE:-paymind_db}"
DB_HOST="${DB_HOST:-localhost}"

# 方式2: 如果方式1失败，尝试使用 postgres 用户（需要密码）
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "DROP INDEX IF EXISTS \"IDX_d08447b22df0d9e98f5d25e6d0\";" 2>/dev/null; then
    echo "尝试使用 postgres 用户连接..."
    # 提示用户输入 postgres 密码
    read -sp "请输入 postgres 用户密码（如果不需要密码，直接按回车）: " POSTGRES_PASSWORD
    echo
    
    if [ -z "$POSTGRES_PASSWORD" ]; then
        # 尝试无密码连接（使用 peer authentication）
        sudo -u postgres psql -d "$DB_NAME" -c "DROP INDEX IF EXISTS \"IDX_d08447b22df0d9e98f5d25e6d0\";" 2>/dev/null || \
        psql -U postgres -d "$DB_NAME" -c "DROP INDEX IF EXISTS \"IDX_d08447b22df0d9e98f5d25e6d0\";" 2>/dev/null || \
        psql -d "$DB_NAME" -c "DROP INDEX IF EXISTS \"IDX_d08447b22df0d9e98f5d25e6d0\";"
    else
        PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U postgres -d "$DB_NAME" -c "DROP INDEX IF EXISTS \"IDX_d08447b22df0d9e98f5d25e6d0\";"
    fi
fi

echo "✅ 修复完成！现在可以重启后端服务了。"

