-- 立即修复 payeeType 枚举类型依赖问题
-- 这个脚本可以直接在数据库中执行，用于修复 TypeORM synchronize 导致的枚举类型冲突

-- Step 1: 检查当前状态
SELECT 
    table_name,
    column_name,
    udt_name
FROM information_schema.columns 
WHERE table_name IN ('commissions', 'commission_settlements') 
AND column_name = 'payeeType'
ORDER BY table_name;

-- Step 2: 先将两个表的列类型都改为 text（解除对旧枚举类型的依赖）
ALTER TABLE "commissions" 
ALTER COLUMN "payeeType" TYPE text;

ALTER TABLE "commission_settlements" 
ALTER COLUMN "payeeType" TYPE text;

-- Step 3: 删除所有旧的枚举类型（使用 CASCADE 强制删除）
DROP TYPE IF EXISTS "public"."commissions_payeetype_enum_old" CASCADE;
DROP TYPE IF EXISTS "public"."commission_settlements_payeetype_enum" CASCADE;
DROP TYPE IF EXISTS "public"."commissions_payeetype_enum" CASCADE;

-- Step 4: 创建统一的枚举类型
CREATE TYPE "public"."commissions_payeetype_enum" AS ENUM('agent', 'merchant', 'agentrix');

-- Step 5: 将两个表的列都改为使用同一个枚举类型
ALTER TABLE "commissions" 
ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
USING "payeeType"::"public"."commissions_payeetype_enum";

ALTER TABLE "commission_settlements" 
ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
USING "payeeType"::"public"."commissions_payeetype_enum";

-- Step 6: 验证修复结果
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

