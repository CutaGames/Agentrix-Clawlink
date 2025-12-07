-- 修复 commission_settlements 表的 payeeType 列

-- Step 1: 检查 commission_settlements 表结构
\d commission_settlements

-- Step 2: 如果 payeeType 列不存在，重新添加
ALTER TABLE "commission_settlements" 
ADD COLUMN IF NOT EXISTS "payeeType" "public"."commissions_payeetype_enum";

-- Step 3: 如果列存在但类型不对，修改类型
-- ALTER TABLE "commission_settlements" 
-- ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" 
-- USING "payeeType"::"public"."commissions_payeetype_enum";

-- Step 4: 验证
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'commission_settlements' AND column_name = 'payeeType';

