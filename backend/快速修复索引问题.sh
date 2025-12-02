#!/bin/bash

# 快速修复 agent_stats 表重复索引问题

echo "正在查找数据库..."

# 方法1: 使用 postgres 用户，列出所有数据库
echo "方法1: 尝试使用 postgres 用户连接..."
sudo -u postgres psql -c "\l" | grep -E "agentrix|Name" || echo "需要密码或权限"

# 方法2: 直接删除表（如果表是空的或可以重建）
echo ""
echo "方法2: 尝试删除 agent_stats 表..."
sudo -u postgres psql -d postgres -c "DROP TABLE IF EXISTS agent_stats CASCADE;" 2>/dev/null || \
sudo -u postgres psql -c "DROP TABLE IF EXISTS agent_stats CASCADE;" 2>/dev/null || \
echo "需要指定正确的数据库名"

echo ""
echo "如果上面的命令都失败，请手动执行："
echo "1. sudo -u postgres psql"
echo "2. 在 psql 中执行: \l (查看数据库列表)"
echo "3. 找到正确的数据库名后执行: \c 数据库名"
echo "4. 然后执行: DROP INDEX IF EXISTS \"IDX_d08447b22df0d9e98f5d25e6d0\";"
echo "5. 或者: DROP TABLE IF EXISTS agent_stats CASCADE;"
echo "6. 退出: \q"

