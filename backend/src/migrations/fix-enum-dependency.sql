-- 修复 enum 依赖问题

-- Step 1: 检查哪些对象依赖 commissions_payeetype_enum_old
SELECT 
    n.nspname as schema_name,
    c.relname as object_name,
    CASE c.relkind
        WHEN 'r' THEN 'table'
        WHEN 'v' THEN 'view'
        WHEN 'm' THEN 'materialized view'
        WHEN 'S' THEN 'sequence'
        WHEN 'f' THEN 'foreign table'
    END as object_type
FROM pg_depend d
JOIN pg_type t ON d.refobjid = t.oid
JOIN pg_class c ON d.objid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE t.typname = 'commissions_payeetype_enum_old'
AND d.deptype = 'n';

-- Step 2: 检查当前 enum 类型状态
SELECT 
    t.typname as enum_name,
    e.enumlabel
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%payeetype%'
ORDER BY t.typname, e.enumsortorder;

-- Step 3: 检查 commissions 表使用的 enum 类型
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name = 'commissions' AND column_name = 'payeeType';

-- Step 4: 如果 commissions 表还在使用 commissions_payeetype_enum_old，需要修复
-- 先将 commissions 表的列类型改为使用正确的 enum
ALTER TABLE "commissions" 
ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
USING "payeeType"::text::"public"."commissions_payeetype_enum";

-- Step 5: 确保 commission_settlements 也使用同一个 enum
ALTER TABLE "commission_settlements" 
ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
USING "payeeType"::text::"public"."commissions_payeetype_enum";

-- Step 6: 删除不需要的 enum 类型
DROP TYPE IF EXISTS "public"."commissions_payeetype_enum_old" CASCADE;
DROP TYPE IF EXISTS "public"."commission_settlements_payeetype_enum" CASCADE;

-- Step 7: 验证最终状态
SELECT 
    t.typname as enum_name,
    e.enumlabel
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%payeetype%'
ORDER BY t.typname, e.enumsortorder;

SELECT 
    table_name,
    column_name,
    udt_name
FROM information_schema.columns 
WHERE table_name IN ('commissions', 'commission_settlements') 
AND column_name = 'payeeType'
ORDER BY table_name;

