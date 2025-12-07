#!/bin/bash
# 快速修复迁移文件中的 simple-array 问题

echo "=== 快速修复迁移文件 ==="
echo ""
echo "问题：服务器上的迁移文件使用了 simple-array（PostgreSQL 不支持）"
echo "解决：将 simple-array 改为 type: 'text', isArray: true"
echo ""
echo "请在服务器上执行以下命令："
echo ""
cat << 'SERVER_FIX'
# ========== 在服务器上执行 ==========
cd /var/www/agentrix-website/backend

# 1. 备份当前迁移文件
if [ -f "src/migrations/1769000000000-CreateAdminTables.ts" ]; then
    cp src/migrations/1769000000000-CreateAdminTables.ts \
       src/migrations/1769000000000-CreateAdminTables.ts.bak
    echo "✅ 已备份迁移文件"
fi

# 2. 检查当前内容
echo "检查当前 permissions 字段定义..."
grep -A 2 "permissions" src/migrations/1769000000000-CreateAdminTables.ts | head -5

# 3. 修复文件（使用 sed 替换）
# 查找并替换 simple-array 为正确的格式
sed -i 's/"simple-array"/"text",\n              isArray: true/g' \
    src/migrations/1769000000000-CreateAdminTables.ts

# 或者使用更精确的替换（推荐）
# 先找到包含 simple-array 的行，然后替换整个字段定义
cat > /tmp/fix_migration.js << 'JSFIX'
const fs = require('fs');
const filePath = process.argv[2];
let content = fs.readFileSync(filePath, 'utf8');

// 替换 simple-array 为正确的格式
content = content.replace(
  /"permissions"\s+simple-array,?/g,
  `{
              name: 'permissions',
              type: 'text',
              isArray: true,
              isNullable: true,
            },`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ 迁移文件已修复');
JSFIX

node /tmp/fix_migration.js src/migrations/1769000000000-CreateAdminTables.ts

# 4. 验证修复结果
echo ""
echo "验证修复结果..."
grep -A 5 "permissions" src/migrations/1769000000000-CreateAdminTables.ts | head -8

# 应该看到：
# {
#   name: 'permissions',
#   type: 'text',
#   isArray: true,
#   isNullable: true,
# },

# 5. 如果修复成功，运行迁移
echo ""
echo "运行数据库迁移..."
npm run migration:run

# 6. 重启服务
pm2 restart agentrix-backend --update-env

# 7. 查看日志
pm2 logs agentrix-backend --lines 30 --nostream
SERVER_FIX

echo ""
echo "=== 或者使用手动编辑方式 ==="
cat << 'MANUAL_FIX'
# 手动编辑文件
cd /var/www/agentrix-website/backend
nano src/migrations/1769000000000-CreateAdminTables.ts

# 找到这一行（大约第 57 行）：
# "permissions" simple-array,

# 替换为：
# {
#   name: 'permissions',
#   type: 'text',
#   isArray: true,
#   isNullable: true,
# },

# 保存并退出（Ctrl+X, Y, Enter）

# 然后运行迁移
npm run migration:run
pm2 restart agentrix-backend --update-env
MANUAL_FIX

