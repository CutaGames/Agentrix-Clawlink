#!/bin/bash
# 添加示例商品并转换为Skills的脚本

# 1. 添加商品到数据库
docker exec -i agentrix-postgres psql -U agentrix paymind << 'EOF'
INSERT INTO products (id, name, description, price, stock, category, product_type, status, merchant_id, created_at, updated_at) 
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'iPhone 15 Pro', '最新款苹果手机，A17 Pro芯片，钛金属机身', 999, 100, '电子产品', 'physical', 'active', '00e1cdad-2c37-4bc8-a72e-4e02b738d80d', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Nike Air Max', '经典运动鞋款，舒适透气', 129, 50, '运动鞋', 'physical', 'active', '00e1cdad-2c37-4bc8-a72e-4e02b738d80d', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'MacBook Pro M3', '性能强劲的专业笔记本电脑', 1999, 30, '电子产品', 'physical', 'active', '00e1cdad-2c37-4bc8-a72e-4e02b738d80d', NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444444', '编程咨询服务', '1小时专业编程指导，覆盖各类技术栈', 100, 999, '咨询服务', 'service', 'active', '00e1cdad-2c37-4bc8-a72e-4e02b738d80d', NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555555', 'UI设计服务', '专业UI/UX设计，提升用户体验', 200, 999, '设计服务', 'service', 'active', '00e1cdad-2c37-4bc8-a72e-4e02b738d80d', NOW(), NOW()),
  ('66666666-6666-6666-6666-666666666666', 'AirPods Pro 2', '主动降噪无线耳机，空间音频', 249, 200, '电子产品', 'physical', 'active', '00e1cdad-2c37-4bc8-a72e-4e02b738d80d', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

SELECT '✅ Products added. Total count:' as message, COUNT(*) as total FROM products;
EOF

# 2. 重启backend容器以触发商品转Skill的自动转换
echo "🔄 Restarting backend to trigger product-to-skill conversion..."
docker restart agentrix-backend

echo "⏳ Waiting for backend to start..."
sleep 15

# 3. 检查Skills数量
docker exec -i agentrix-postgres psql -U agentrix paymind << 'EOF'
SELECT '✅ Skills created. Total count:' as message, COUNT(*) as total FROM skills WHERE status = 'published';
EOF

echo "✅ Done! Check marketplace at http://3.236.193.38/marketplace"
