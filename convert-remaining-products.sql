-- 将剩余的products转换为skills
-- 只转换那些还没有对应skill的products

INSERT INTO skills (
  id,
  name,
  display_name,
  description,
  version,
  category,
  layer,
  resource_type,
  source,
  status,
  input_schema,
  output_schema,
  executor,
  pricing,
  tags,
  human_accessible,
  compatible_agents,
  permissions,
  author_id,
  product_id,
  image_url,
  thumbnail_url,
  ucp_enabled,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() as id,
  'purchase_' || lower(replace(p.name, ' ', '_')) as name,
  p.name as display_name,
  COALESCE(p.description, 'Purchase ' || p.name) as description,
  '1.0.0' as version,
  'commerce'::skills_category_enum as category,
  'resource'::skills_layer_enum as layer,
  (CASE 
    WHEN p.product_type = 'service' THEN 'service'
    WHEN p.product_type IN ('nft', 'ft', 'game_asset') THEN 'digital'
    ELSE 'physical'
  END)::skills_resource_type_enum as resource_type,
  'converted'::skills_source_enum as source,
  'published'::skills_status_enum as status,
  jsonb_build_object(
    'type', 'object',
    'required', array['quantity', 'shippingAddress', 'recipientName', 'recipientPhone'],
    'properties', jsonb_build_object(
      'quantity', jsonb_build_object('type', 'number', 'default', 1, 'minimum', 1, 'description', '购买数量'),
      'shippingAddress', jsonb_build_object('type', 'string', 'description', '收货地址'),
      'recipientName', jsonb_build_object('type', 'string', 'description', '收件人姓名'),
      'recipientPhone', jsonb_build_object('type', 'string', 'description', '收件人电话')
    )
  ) as input_schema,
  jsonb_build_object(
    'type', 'object',
    'properties', jsonb_build_object(
      'success', jsonb_build_object('type', 'boolean', 'description', '是否成功'),
      'orderId', jsonb_build_object('type', 'string', 'description', '订单 ID'),
      'message', jsonb_build_object('type', 'string', 'description', '提示信息'),
      'paymentUrl', jsonb_build_object('type', 'string', 'description', '支付链接'),
      'totalPrice', jsonb_build_object('type', 'number', 'description', '总价'),
      'currency', jsonb_build_object('type', 'string', 'description', '货币'),
      'estimatedDelivery', jsonb_build_object('type', 'string', 'description', '预计送达时间')
    )
  ) as output_schema,
  jsonb_build_object('type', 'internal', 'internalHandler', 'unified_product_purchase') as executor,
  jsonb_build_object(
    'type', 'revenue_share',
    'pricePerCall', p.price,
    'commissionRate', COALESCE(p.commission_rate, 2.2),
    'currency', 'USD'
  ) as pricing,
  ARRAY[p.category, 'commerce', 'purchase'] as tags,
  true as human_accessible,
  '["all"]'::jsonb as compatible_agents,
  '["read", "payment"]'::jsonb as permissions,
  p.merchant_id as author_id,
  p.id as product_id,
  COALESCE((p.metadata->>'image')::text, (p.metadata->'core'->'media'->'images'->0->>'url')::text) as image_url,
  COALESCE((p.metadata->>'image')::text, (p.metadata->'core'->'media'->'images'->0->>'url')::text) as thumbnail_url,
  true as ucp_enabled,
  NOW() as created_at,
  NOW() as updated_at
FROM products p
WHERE p.status = 'active'
  AND p.id::text NOT IN (SELECT product_id::text FROM skills WHERE product_id IS NOT NULL);

-- 显示转换结果
SELECT 
  'Total Products' as metric, 
  COUNT(*)::text as value 
FROM products 
WHERE status = 'active'
UNION ALL
SELECT 
  'Total Skills' as metric,
  COUNT(*)::text as value
FROM skills
WHERE status = 'published'
UNION ALL
SELECT 
  'Converted Skills' as metric,
  COUNT(*)::text as value
FROM skills
WHERE source = 'converted' AND status = 'published';
