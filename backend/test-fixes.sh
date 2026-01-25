#!/bin/bash

echo "=== 测试修复 ==="

# 1. 测试 developer 角色是否添加成功
echo -e "\n1. 检查 developer 角色枚举值:"
PGPASSWORD=postgres psql -h localhost -U postgres -d paymind -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_roles_enum');"

# 2. 检查迁移记录
echo -e "\n2. 检查迁移记录:"
PGPASSWORD=postgres psql -h localhost -U postgres -d paymind -c "SELECT name FROM migrations WHERE name LIKE '%Developer%';"

# 3. 测试用户角色更新
echo -e "\n3. 查看用户 roles 字段类型:"
PGPASSWORD=postgres psql -h localhost -U postgres -d paymind -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'roles';"

echo -e "\n=== 测试完成 ==="
