-- 添加示例商品到数据库
INSERT INTO products (id, name, description, price, stock, category, product_type, status, merchant_id, created_at, updated_at) 
VALUES 
  (gen_random_uuid(), 'iPhone 15 Pro', '最新款苹果手机，A17 Pro芯片，钛金属机身', 999, 100, '电子产品', 'physical', 'active', '00e1cdad-2c37-4bc8-a72e-4e02b738d80d', NOW(), NOW()),
  (gen_random_uuid(), 'Nike Air Max', '经典运动鞋款，舒适透气', 129, 50, '运动鞋', 'physical', 'active', '00e1cdad-2c37-4bc8-a72e-4e02b738d80d', NOW(), NOW()),
  (gen_random_uuid(), 'MacBook Pro M3', '性能强劲的专业笔记本', 1999, 30, '电子产品', 'physical', 'active', '00e1cdad-2c37-4bc8-a72e-4e02b738d80d', NOW(), NOW()),
  (gen_random_uuid(), '编程咨询服务', '1小时专业编程指导，覆盖各类技术栈', 100, 999, '咨询服务', 'service', 'active', '00e1cdad-2c37-4bc8-a72e-4e02b738d80d', NOW(), NOW()),
  (gen_random_uuid(), 'UI设计服务', '专业UI/UX设计，提升用户体验', 200, 999, '设计服务', 'service', 'active', '00e1cdad-2c37-4bc8-a72e-4e02b738d80d', NOW(), NOW()),
  (gen_random_uuid(), 'AirPods Pro 2', '主动降噪无线耳机', 249, 200, '电子产品', 'physical', 'active', '00e1cdad-2c37-4bc8-a72e-4e02b738d80d', NOW(), NOW());

SELECT COUNT(*) as total_products FROM products;
