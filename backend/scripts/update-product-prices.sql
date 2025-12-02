-- 更新商品价格为测试友好价格
-- 使用方式：psql -U paymind -d paymind_db -f scripts/update-product-prices.sql

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

-- 显示更新后的商品列表
SELECT 
    id,
    name,
    price,
    metadata->>'currency' as currency,
    stock,
    "productType"
FROM products
ORDER BY "createdAt" DESC;

