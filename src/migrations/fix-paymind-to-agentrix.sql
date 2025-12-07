-- 修复 paymind 到 agentrix 的迁移脚本
-- 在运行迁移之前，先手动执行这个 SQL 脚本来修复数据

-- Step 1: 更新 commissions 表中的 'paymind' 为 'agentrix'
UPDATE commissions 
SET "payeeType" = 'agentrix' 
WHERE "payeeType" = 'paymind';

-- Step 2: 更新 commission_settlements 表中的 'paymind' 为 'agentrix'
UPDATE commission_settlements 
SET "payeeType" = 'agentrix' 
WHERE "payeeType" = 'paymind';

-- Step 3: 删除旧的 enum 类型（如果存在）
DROP TYPE IF EXISTS "public"."commissions_payeetype_enum_old" CASCADE;

-- Step 4: 检查并创建新的 enum 类型（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commissions_payeetype_enum') THEN
        CREATE TYPE "public"."commissions_payeetype_enum" AS ENUM('agent', 'merchant', 'agentrix');
    END IF;
END $$;

-- Step 5: 修改 commissions 表的 payeeType 列
ALTER TABLE "commissions" 
ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
USING "payeeType"::text::"public"."commissions_payeetype_enum";

-- Step 6: 修改 commission_settlements 表的 payeeType 列
ALTER TABLE "commission_settlements" 
ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
USING "payeeType"::text::"public"."commissions_payeetype_enum";

