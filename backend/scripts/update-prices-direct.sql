-- 直接更新商品价格为测试友好价格
-- 执行方式：psql -U paymind -d paymind_db -f scripts/update-prices-direct.sql

BEGIN;

-- 更新USDT商品价格为0.01
UPDATE products 
SET price = 0.01,
    "updatedAt" = NOW()
WHERE (metadata->>'currency' = 'USDT' OR (metadata->>'currency' IS NULL AND price > 1))
  AND price > 0.01;

-- 更新USD商品价格为0.1
UPDATE products 
SET price = 0.1,
    "updatedAt" = NOW()
WHERE metadata->>'currency' = 'USD' 
  AND price > 0.1;

-- 更新CNY商品价格为1
UPDATE products 
SET price = 1,
    "updatedAt" = NOW()
WHERE metadata->>'currency' = 'CNY' 
  AND price > 1;

-- 显示更新结果
SELECT 
    id,
    name,
    price,
    COALESCE(metadata->>'currency', 'CNY') as currency,
    stock,
    "productType"
FROM products
ORDER BY "createdAt" DESC;

COMMIT;

