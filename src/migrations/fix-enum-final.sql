-- 最终修复：重建 enum 类型

-- Step 1: 检查当前 enum 类型
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'commissions_payeetype_enum')
ORDER BY enumsortorder;

-- Step 2: 检查 commission_settlements 使用的 enum 类型名称
SELECT 
    t.typname as enum_name,
    e.enumlabel
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%payeetype%'
ORDER BY t.typname, e.enumsortorder;

-- Step 3: 删除旧的 enum 类型（必须先删除，因为列还在使用它）
-- 先将列类型改为 text（如果还不是 text）
ALTER TABLE "commissions" 
ALTER COLUMN "payeeType" TYPE text;

ALTER TABLE "commission_settlements" 
ALTER COLUMN "payeeType" TYPE text;

-- Step 4: 删除所有相关的旧 enum 类型
DROP TYPE IF EXISTS "public"."commissions_payeetype_enum" CASCADE;
DROP TYPE IF EXISTS "public"."commission_settlements_payeetype_enum" CASCADE;
DROP TYPE IF EXISTS "public"."commissions_payeetype_enum_old" CASCADE;

-- Step 5: 创建新的 enum 类型（只包含 agent, merchant, agentrix）
CREATE TYPE "public"."commissions_payeetype_enum" AS ENUM('agent', 'merchant', 'agentrix');

-- Step 6: 将列类型改回 enum
ALTER TABLE "commissions" 
ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
USING "payeeType"::"public"."commissions_payeetype_enum";

ALTER TABLE "commission_settlements" 
ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
USING "payeeType"::"public"."commissions_payeetype_enum";

-- Step 7: 验证修复结果
SELECT 'Enum values:' as info;
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'commissions_payeetype_enum')
ORDER BY enumsortorder;

SELECT 'Data check:' as info;
SELECT 'Commissions with paymind:' as check_type, COUNT(*) as count 
FROM commissions WHERE "payeeType"::text = 'paymind'
UNION ALL
SELECT 'Commissions with agentrix:', COUNT(*) 
FROM commissions WHERE "payeeType"::text = 'agentrix'
UNION ALL
SELECT 'Settlements with paymind:', COUNT(*) 
FROM commission_settlements WHERE "payeeType"::text = 'paymind'
UNION ALL
SELECT 'Settlements with agentrix:', COUNT(*) 
FROM commission_settlements WHERE "payeeType"::text = 'agentrix';

