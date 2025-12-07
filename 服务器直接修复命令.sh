#!/bin/bash
# 在服务器上直接修复迁移文件

echo "=== 在服务器上执行以下命令 ==="
echo ""

cat << 'EOF'
# ========== 在服务器上执行 ==========
cd /var/www/agentrix-website/backend

# 1. 备份当前文件
cp src/migrations/1769000000000-CreateAdminTables.ts \
   src/migrations/1769000000000-CreateAdminTables.ts.bak.$(date +%Y%m%d_%H%M%S)

# 2. 检查当前内容
echo "当前 permissions 字段："
grep -A 1 "permissions" src/migrations/1769000000000-CreateAdminTables.ts | head -3

# 3. 使用 sed 直接替换（方法1）
# 注意：需要精确匹配，因为 simple-array 可能在不同位置
sed -i 's/"simple-array"/"text",\n              isArray: true/g' \
    src/migrations/1769000000000-CreateAdminTables.ts

# 4. 如果 sed 替换不完整，使用 Python 脚本（方法2，更可靠）
cat > /tmp/fix_admin_migration.py << 'PYEOF'
import re
import sys

file_path = sys.argv[1]

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 查找并替换 simple-array
# 匹配模式：可能是 "permissions" simple-array, 或类似的格式
pattern = r'("permissions"\s+)simple-array,?'
replacement = r'''{
              name: 'permissions',
              type: 'text',
              isArray: true,
              isNullable: true,
            },'''

new_content = re.sub(pattern, replacement, content)

# 如果替换成功，写回文件
if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('✅ 迁移文件已修复')
else:
    print('⚠️  未找到 simple-array，可能已经修复或格式不同')
    print('请手动检查文件内容')
PYEOF

python3 /tmp/fix_admin_migration.py src/migrations/1769000000000-CreateAdminTables.ts

# 5. 验证修复结果
echo ""
echo "修复后的 permissions 字段："
grep -A 6 "permissions" src/migrations/1769000000000-CreateAdminTables.ts | head -8

# 应该看到类似这样的内容：
# {
#   name: 'permissions',
#   type: 'text',
#   isArray: true,
#   isNullable: true,
# },

# 6. 如果修复成功，运行迁移
echo ""
echo "运行数据库迁移..."
npm run migration:run

# 7. 如果迁移成功，重启服务
if [ $? -eq 0 ]; then
    echo "✅ 迁移成功，重启服务..."
    pm2 restart agentrix-backend --update-env
    pm2 logs agentrix-backend --lines 30 --nostream
else
    echo "❌ 迁移失败，请检查错误信息"
fi
EOF

echo ""
echo "=== 如果上述方法失败，使用手动编辑 ==="
cat << 'MANUAL'
# 手动编辑文件
cd /var/www/agentrix-website/backend
vi src/migrations/1769000000000-CreateAdminTables.ts

# 在 vi 中：
# 1. 按 / 搜索 "permissions"
# 2. 找到包含 simple-array 的行
# 3. 按 i 进入插入模式
# 4. 删除整行，替换为：
#             {
#               name: 'permissions',
#               type: 'text',
#               isArray: true,
#               isNullable: true,
#             },
# 5. 按 Esc，然后输入 :wq 保存退出

# 然后运行迁移
npm run migration:run
pm2 restart agentrix-backend --update-env
MANUAL

