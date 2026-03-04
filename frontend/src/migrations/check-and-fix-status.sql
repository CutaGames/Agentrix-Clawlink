-- 检查当前状态并修复

-- Step 1: 检查 enum 类型是否包含 agentrix
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'commissions_payeetype_enum')
ORDER BY enumsortorder;

-- Step 2: 检查是否有 paymind 值的数据
SELECT COUNT(*) as paymind_commissions FROM commissions WHERE "payeeType"::text = 'paymind';
SELECT COUNT(*) as paymind_settlements FROM commission_settlements WHERE "payeeType"::text = 'paymind';

-- Step 3: 如果 enum 已经包含 agentrix，但数据还没有更新，需要临时转换为 text 来更新
-- 先将列类型临时改为 text
ALTER TABLE "commissions" 
ALTER COLUMN "payeeType" TYPE text;

ALTER TABLE "commission_settlements" 
ALTER COLUMN "payeeType" TYPE text;

-- Step 4: 更新数据
UPDATE commissions 
SET "payeeType" = 'agentrix' 
WHERE "payeeType" = 'paymind';

UPDATE commission_settlements 
SET "payeeType" = 'agentrix' 
WHERE "payeeType" = 'paymind';

-- Step 5: 将列类型改回 enum
ALTER TABLE "commissions" 
ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
USING "payeeType"::"public"."commissions_payeetype_enum";

ALTER TABLE "commission_settlements" 
ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
USING "payeeType"::"public"."commissions_payeetype_enum";

-- Step 6: 验证修复结果
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

