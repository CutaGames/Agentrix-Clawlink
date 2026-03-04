-- 修复 paymind 到 agentrix 的迁移脚本（正确顺序）
-- 注意：必须先修改 enum 类型，再更新数据

-- Step 1: 检查当前 enum 类型
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'commissions_payeetype_enum')
ORDER BY enumsortorder;

-- Step 2: 如果 enum 包含 'paymind' 但不包含 'agentrix'，需要重建 enum
-- 先将列类型临时改为 text
ALTER TABLE "commissions" 
ALTER COLUMN "payeeType" TYPE text;

ALTER TABLE "commission_settlements" 
ALTER COLUMN "payeeType" TYPE text;

-- Step 3: 删除旧的 enum 类型
DROP TYPE IF EXISTS "public"."commissions_payeetype_enum_old" CASCADE;
DROP TYPE IF EXISTS "public"."commissions_payeetype_enum" CASCADE;

-- Step 4: 创建新的 enum 类型（只包含 agent, merchant, agentrix）
CREATE TYPE "public"."commissions_payeetype_enum" AS ENUM('agent', 'merchant', 'agentrix');

-- Step 5: 更新数据（现在列是 text 类型，可以更新）
UPDATE commissions 
SET "payeeType" = 'agentrix' 
WHERE "payeeType" = 'paymind';

UPDATE commission_settlements 
SET "payeeType" = 'agentrix' 
WHERE "payeeType" = 'paymind';

-- Step 6: 将列类型改回 enum
ALTER TABLE "commissions" 
ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
USING "payeeType"::"public"."commissions_payeetype_enum";

ALTER TABLE "commission_settlements" 
ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
USING "payeeType"::"public"."commissions_payeetype_enum";

-- Step 7: 验证修复结果
SELECT COUNT(*) as paymind_count FROM commissions WHERE "payeeType"::text = 'paymind';
SELECT COUNT(*) as agentrix_count FROM commissions WHERE "payeeType"::text = 'agentrix';

SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'commissions_payeetype_enum')
ORDER BY enumsortorder;

