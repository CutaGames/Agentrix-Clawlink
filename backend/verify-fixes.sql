-- 验证修复
-- 1. 检查 developer 角色
SELECT '1. Developer role in enum:' as test;
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_roles_enum')
ORDER BY enumlabel;

-- 2. 检查迁移记录
SELECT '2. Migration record:' as test;
SELECT name FROM migrations WHERE name LIKE '%Developer%';

-- 3. 检查 commission_settlements 字段映射
SELECT '3. Commission settlements columns:' as test;
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'commission_settlements'
ORDER BY column_name;
