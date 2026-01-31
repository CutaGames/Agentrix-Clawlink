-- 修复 commissions_payeetype_enum 枚举类型
-- 问题：代码使用 PayeeType.PAYMIND 但实际值应该是 'agentrix'

-- 1. 先将列转为 text 类型
ALTER TABLE "commissions" ALTER COLUMN "payeeType" TYPE text;
ALTER TABLE "commission_settlements" ALTER COLUMN "payeeType" TYPE text;

-- 2. 更新旧数据 paymind -> agentrix
UPDATE "commissions" SET "payeeType" = 'agentrix' WHERE "payeeType" = 'paymind';
UPDATE "commission_settlements" SET "payeeType" = 'agentrix' WHERE "payeeType" = 'paymind';

-- 3. 删除旧枚举类型
DROP TYPE IF EXISTS "public"."commissions_payeetype_enum_old" CASCADE;
DROP TYPE IF EXISTS "public"."commission_settlements_payeetype_enum" CASCADE;
DROP TYPE IF EXISTS "public"."commissions_payeetype_enum" CASCADE;

-- 4. 创建新枚举类型
CREATE TYPE "public"."commissions_payeetype_enum" AS ENUM('agent', 'merchant', 'agentrix');

-- 5. 将列转回枚举类型
ALTER TABLE "commissions" ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" USING "payeeType"::"public"."commissions_payeetype_enum";
ALTER TABLE "commission_settlements" ALTER COLUMN "payeeType" TYPE "public"."commissions_payeetype_enum" USING "payeeType"::"public"."commissions_payeetype_enum";
