#!/bin/bash
# 修复所有警告的完整脚本

echo "=== 修复所有警告 ==="
echo ""
echo "在服务器上执行以下命令："
echo ""

cat << 'EOF'
cd /var/www/agentrix-website/backend

# ========== 修复1: permissions 数组序列化问题 ==========
echo "修复 permissions 数组序列化..."

# 备份
cp src/entities/admin-role.entity.ts src/entities/admin-role.entity.ts.bak

# 使用 Python 修复
python3 << 'PYEOF'
import re

file_path = 'src/entities/admin-role.entity.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 查找 permissions 字段定义（支持多种格式）
patterns = [
    (r"@Column\('text',\s*\{\s*array:\s*true,\s*nullable:\s*true\s*\}\)", 
     "@Column({\n    type: 'text',\n    array: true,\n    nullable: true,\n    transformer: {\n      to: (value: string[]) => value ? value : [],\n      from: (value: string[]) => value ? value : [],\n    },\n  })"),
    (r"@Column\(\{\s*type:\s*'text',\s*array:\s*true,\s*nullable:\s*true\s*\}\)",
     "@Column({\n    type: 'text',\n    array: true,\n    nullable: true,\n    transformer: {\n      to: (value: string[]) => value ? value : [],\n      from: (value: string[]) => value ? value : [],\n    },\n  })"),
]

new_content = content
for pattern, replacement in patterns:
    new_content = re.sub(pattern, replacement, new_content)

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('✅ permissions 字段已修复')
else:
    print('⚠️  未找到匹配的模式')
    # 显示当前内容
    for i, line in enumerate(content.split('\n')):
        if 'permissions' in line.lower():
            print(f'第 {i+1} 行: {line.strip()}')
PYEOF

# 验证
echo ""
echo "验证修复："
grep -A 10 "permissions" src/entities/admin-role.entity.ts | head -12

# ========== 修复2: MarketMonitor.strategyGraphId 列缺失 ==========
echo ""
echo "修复 MarketMonitor.strategyGraphId 列..."

# 检查表是否存在，如果存在但列不存在，添加列
docker exec postgresql psql -U agentrix -d paymind << 'SQL'
DO $$
BEGIN
    -- 检查表是否存在
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'market_monitor'
    ) THEN
        -- 检查列是否存在
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'market_monitor' 
            AND column_name = 'strategyGraphId'
        ) THEN
            ALTER TABLE market_monitor ADD COLUMN "strategyGraphId" uuid;
            RAISE NOTICE '✅ 已添加 strategyGraphId 列';
        ELSE
            RAISE NOTICE 'ℹ️  strategyGraphId 列已存在';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️  market_monitor 表不存在，跳过';
    END IF;
END $$;
SQL

# ========== 重新构建和重启 ==========
echo ""
echo "重新构建..."
npm run build

echo ""
echo "重启服务..."
pm2 restart agentrix-backend --update-env

echo ""
echo "等待服务启动..."
sleep 5

echo ""
echo "检查服务状态和日志..."
pm2 status
pm2 logs agentrix-backend --lines 30 --nostream | tail -20

echo ""
echo "=== 修复完成 ==="
EOF

