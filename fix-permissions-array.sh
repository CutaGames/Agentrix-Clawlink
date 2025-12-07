#!/bin/bash
# 修复 permissions 数组序列化问题

echo "=== 修复 permissions 数组序列化问题 ==="
echo ""
echo "在服务器上执行以下命令："
echo ""

cat << 'EOF'
cd /var/www/agentrix-website/backend

# 备份文件
cp src/entities/admin-role.entity.ts src/entities/admin-role.entity.ts.bak

# 使用 transformer 修复数组序列化
cat > /tmp/fix_permissions.py << 'PYEOF'
import re

file_path = 'src/entities/admin-role.entity.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 查找 permissions 字段定义
pattern = r"@Column\('text',\s*\{\s*array:\s*true,\s*nullable:\s*true\s*\}\)\s+permissions:\s*string\[\];"

# 替换为使用 transformer 的版本
replacement = '''@Column({
    type: 'text',
    array: true,
    nullable: true,
    transformer: {
      to: (value: string[]) => value,
      from: (value: string[]) => value || [],
    },
  })
  permissions: string[];'''

new_content = re.sub(pattern, replacement, content)

# 如果上面的替换没成功，尝试更简单的模式
if new_content == content:
    # 查找 @Column('text', { array: true, nullable: true })
    pattern2 = r"@Column\('text',\s*\{\s*array:\s*true,\s*nullable:\s*true\s*\}\)"
    replacement2 = '''@Column({
    type: 'text',
    array: true,
    nullable: true,
    transformer: {
      to: (value: string[]) => value,
      from: (value: string[]) => value || [],
    },
  })'''
    new_content = re.sub(pattern2, replacement2, content)

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('✅ permissions 字段已修复，添加了 transformer')
else:
    print('⚠️  未找到匹配的模式，请手动检查文件')
    print('当前 permissions 字段定义：')
    for line in content.split('\n'):
        if 'permissions' in line.lower() or 'Column' in line:
            print(line.rstrip())
PYEOF

python3 /tmp/fix_permissions.py

# 验证修复
echo ""
echo "验证修复结果："
grep -A 8 "permissions" src/entities/admin-role.entity.ts | head -10

# 重新构建
npm run build

# 重启服务
pm2 restart agentrix-backend --update-env

# 查看日志
pm2 logs agentrix-backend --lines 20 --nostream
EOF

