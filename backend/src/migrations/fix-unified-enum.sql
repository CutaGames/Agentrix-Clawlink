-- 修复：统一使用同一个 enum 类型

-- Step 1: 检查当前状态
SELECT 
    t.typname as enum_name,
    e.enumlabel
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%payeetype%'
ORDER BY t.typname, e.enumsortorder;

-- Step 2: 检查两个表使用的 enum 类型
SELECT 
    table_name,
    column_name,
    udt_name
FROM information_schema.columns 
WHERE table_name IN ('commissions', 'commission_settlements') 
AND column_name = 'payeeType'
ORDER BY table_name;

-- Step 3: 如果 commissions 表还在使用 commissions_payeetype_enum_old，先修复它
-- 先将列类型临时改为 text
ALTER TABLE "commissions" 
ALTER COLUMN "payeeType" TYPE text;

-- Step 4: 如果 commission_settlements 使用不同的 enum，也改为 text
ALTER TABLE "commission_settlements" 
ALTER COLUMN "payeeType" TYPE text;

-- Step 5: 删除所有旧的 enum 类型
DROP TYPE IF EXISTS "public"."commissions_payeetype_enum_old" CASCADE;
DROP TYPE IF EXISTS "public"."commissions_payeetype_enum" CASCADE;
DROP TYPE IF EXISTS "public"."commission_settlements_payeetype_enum" CASCADE;

-- Step 6: 创建统一的 enum 类型（两个表共用）
CREATE TYPE "public"."commissions_payeetype_enum" AS ENUM('agent', 'merchant', 'agentrix');

-- Step 7: 将两个表的列都改为使用同一个 enum
ALTER TABLE "commissions" 
ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
USING "payeeType"::"public"."commissions_payeetype_enum";

ALTER TABLE "commission_settlements" 
ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
USING "payeeType"::"public"."commissions_payeetype_enum";

-- Step 8: 验证最终状态
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

