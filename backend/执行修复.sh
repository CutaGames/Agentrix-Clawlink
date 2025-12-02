#!/bin/bash
# 数据库修复脚本
# 使用方法：bash 执行修复.sh

echo "🔧 开始修复 agent_sessions 表..."

# 如果设置了 PGPASSWORD 环境变量，使用它；否则提示输入
if [ -z "$PGPASSWORD" ]; then
    echo "请输入数据库密码（或设置 PGPASSWORD 环境变量）："
    read -s PGPASSWORD
    export PGPASSWORD
fi

# 执行修复 SQL
psql -U agentrix -d agentrix_db -h localhost <<EOF
-- 1. 删除所有 userId 为 NULL 的记录
DELETE FROM agent_sessions WHERE "userId" IS NULL;

-- 2. 删除外键约束（如果存在）
ALTER TABLE agent_sessions DROP CONSTRAINT IF EXISTS "FK_40a6b0600d60c067ae0f8659ce0";

-- 3. 将 userId 设置为 NOT NULL
ALTER TABLE agent_sessions ALTER COLUMN "userId" SET NOT NULL;

-- 显示结果
SELECT '修复完成！' as status;
EOF

if [ $? -eq 0 ]; then
    echo "✅ 数据库修复成功！"
    echo "现在可以重启后端服务了："
    echo "  cd backend && npm run start:dev"
else
    echo "❌ 修复失败，请检查数据库连接和密码"
fi

