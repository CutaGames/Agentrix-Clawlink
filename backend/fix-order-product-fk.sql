-- 修复 Order.product 外键约束为可选
-- 这允许直接购买 Skill 而不需要关联 Product 记录

-- 1. 删除原有的外键约束
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_8624dad595ae567818ad9983b33";

-- 2. 将 productId 列改为可空
ALTER TABLE "orders" ALTER COLUMN "productId" DROP NOT NULL;

-- 3. 重新添加外键约束，设置为可选
ALTER TABLE "orders" 
  ADD CONSTRAINT "FK_8624dad595ae567818ad9983b33" 
  FOREIGN KEY ("productId") 
  REFERENCES "products"("id") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

-- 4. 为 productId 添加注释
COMMENT ON COLUMN "orders"."productId" IS '关联的商品ID（可选，对于Skill订单可能为空）';
