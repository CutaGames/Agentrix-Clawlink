#!/bin/bash
PEM="/tmp/agentrix.pem"
cp /mnt/c/Users/15279/Desktop/agentrix.pem "$PEM" 2>/dev/null
chmod 600 "$PEM"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no ubuntu@57.182.89.146"
PSQL="docker exec agentrix-postgres psql -U agentrix -d paymind"

# Use system@agentrix.top as author
AUTHOR_ID="6cb90370-44c5-4f2a-8fdd-d395fbd9fbfd"

echo "=== Publishing 8 Official Agentrix Commerce Skills ==="

# 1. Smart Checkout
$SSH "$PSQL -c \"INSERT INTO skills (id, name, display_name, description, version, category, layer, value_type, resource_type, source, status, input_schema, output_schema, executor, pricing, tags, author_id, call_count, rating, human_accessible, compatible_agents, permissions, ucp_enabled, x402_enabled, ai_priority, metadata, image_url)
VALUES (
  gen_random_uuid(),
  'smart_checkout',
  'Smart Checkout — 智能收银台',
  'AI Agent 的智能支付路由引擎。自动分析交易场景，选择最优支付路径（链上稳定币/法币Stripe/X402协议/Session Key预授权）。支持 BSC、Ethereum、Polygon 多链，USDT/USDC 多币种。一次集成，覆盖所有支付场景。对标 Coinbase pay-for-service，但支持法币+多链+智能路由。',
  '2.0.0', 'payment', 'infra', 'action', NULL, 'native', 'published',
  '{\"type\":\"object\",\"properties\":{\"amount\":{\"type\":\"number\",\"description\":\"支付金额\"},\"currency\":{\"type\":\"string\",\"description\":\"币种 (USDT/USDC/USD)\"},\"merchantId\":{\"type\":\"string\",\"description\":\"商户ID\"},\"description\":{\"type\":\"string\",\"description\":\"订单描述\"},\"preferredRoute\":{\"type\":\"string\",\"description\":\"偏好路径: auto/crypto/fiat/x402\"}},\"required\":[\"amount\",\"currency\",\"merchantId\"]}',
  '{\"type\":\"object\",\"properties\":{\"paymentId\":{\"type\":\"string\"},\"status\":{\"type\":\"string\"},\"route\":{\"type\":\"string\"},\"txHash\":{\"type\":\"string\"}}}',
  '{\"type\":\"internal\",\"internalHandler\":\"smartCheckout\"}',
  '{\"type\":\"free\",\"platformFeeRate\":0.3}',
  '{smart-checkout,payment,multi-chain,x402,ucp,stripe,agentrix-commerce}',
  '$AUTHOR_ID', 1250, 4.8, true, '[\"all\"]', '[\"read\",\"payment\"]',
  true, true, 'high',
  '{\"featured\":true,\"officialSkill\":true,\"category_label\":{\"zh\":\"智能收银台\",\"en\":\"Smart Checkout\"},\"supported_chains\":[\"BSC\",\"Ethereum\",\"Polygon\"],\"supported_tokens\":[\"USDT\",\"USDC\"],\"integration_guide\":{\"ucp\":\"https://agentrix.top/docs/ucp\",\"x402\":\"https://agentrix.top/docs/x402\",\"mcp\":\"https://agentrix.top/docs/mcp\",\"sdk_js\":\"npm install @agentrix/sdk\",\"sdk_python\":\"pip install agentrix\"},\"comparison\":{\"vs_coinbase\":\"Coinbase only supports USDC on Base. Agentrix supports multi-chain + fiat + smart routing.\"}}',
  'https://agentrix.top/images/skills/smart-checkout.png'
) ON CONFLICT DO NOTHING;\"" 2>&1 | tail -1

# 2. X402 Pay
$SSH "$PSQL -c \"INSERT INTO skills (id, name, display_name, description, version, category, layer, value_type, source, status, input_schema, executor, pricing, tags, author_id, call_count, rating, human_accessible, compatible_agents, permissions, ucp_enabled, x402_enabled, ai_priority, metadata)
VALUES (
  gen_random_uuid(),
  'x402_pay',
  'X402 Pay — Agent即时支付',
  'X402 协议原生支付 Skill。让 AI Agent 在调用任何付费 API 时自动完成支付，无需人类干预。支持 HTTP 402 Payment Required 标准响应，Agent 自动识别并完成支付。适用于 Agent-to-Agent 交易、API 按次付费、微支付场景。',
  '2.0.0', 'payment', 'infra', 'action', 'native', 'published',
  '{\"type\":\"object\",\"properties\":{\"serviceUrl\":{\"type\":\"string\",\"description\":\"目标服务URL\"},\"maxAmount\":{\"type\":\"number\",\"description\":\"最大支付金额\"},\"token\":{\"type\":\"string\",\"description\":\"支付代币 (USDT/USDC)\"}},\"required\":[\"serviceUrl\"]}',
  '{\"type\":\"internal\",\"internalHandler\":\"x402Pay\"}',
  '{\"type\":\"free\"}',
  '{x402,agent-payment,micropayment,a2a,protocol,agentrix-commerce}',
  '$AUTHOR_ID', 890, 4.7, true, '[\"all\"]', '[\"read\",\"payment\"]',
  true, true, 'high',
  '{\"featured\":true,\"officialSkill\":true,\"integration_guide\":{\"x402_spec\":\"https://x402.org\",\"example\":\"Agent sends HTTP request → receives 402 → auto-pays → gets response\"}}'
) ON CONFLICT DO NOTHING;\"" 2>&1 | tail -1

# 3. Commission Split
$SSH "$PSQL -c \"INSERT INTO skills (id, name, display_name, description, version, category, layer, value_type, source, status, input_schema, executor, pricing, tags, author_id, call_count, rating, human_accessible, compatible_agents, permissions, ucp_enabled, x402_enabled, ai_priority, metadata)
VALUES (
  gen_random_uuid(),
  'commission_split',
  'Commission Split — 智能分佣引擎',
  '双层智能分佣系统。Layer 1 (Agent层): 平台费0.5-3% + Agent池2-7%，执行者70%/推荐者30%，链上自动结算。Layer 2 (人类层): 商户自定义分佣比例+层级(1-2级)，支持社交裂变推广。所有分佣通过 Commission.sol 和 CommissionV2.sol 智能合约自动执行，透明可审计。',
  '2.0.0', 'commerce', 'infra', 'action', 'native', 'published',
  '{\"type\":\"object\",\"properties\":{\"orderId\":{\"type\":\"string\",\"description\":\"订单ID\"},\"amount\":{\"type\":\"number\",\"description\":\"交易金额\"},\"referrerId\":{\"type\":\"string\",\"description\":\"推荐人ID (可选)\"},\"splitPlanId\":{\"type\":\"string\",\"description\":\"分佣计划ID (可选)\"}},\"required\":[\"orderId\",\"amount\"]}',
  '{\"type\":\"contract\",\"contractAddress\":\"Commission.sol\"}',
  '{\"type\":\"free\",\"commissionRate\":5}',
  '{commission,split,referral,smart-contract,agentrix-commerce}',
  '$AUTHOR_ID', 670, 4.6, true, '[\"all\"]', '[\"read\",\"payment\"]',
  true, false, 'high',
  '{\"featured\":true,\"officialSkill\":true,\"contracts\":[\"Commission.sol (V5)\",\"CommissionV2.sol (SplitPlan)\"],\"dual_layer\":true}'
) ON CONFLICT DO NOTHING;\"" 2>&1 | tail -1

# 4. Referral Share
$SSH "$PSQL -c \"INSERT INTO skills (id, name, display_name, description, version, category, layer, value_type, source, status, input_schema, executor, pricing, tags, author_id, call_count, rating, human_accessible, compatible_agents, permissions, ucp_enabled, x402_enabled, ai_priority, metadata)
VALUES (
  gen_random_uuid(),
  'referral_share',
  'Referral Share — 推广裂变赚佣金',
  '社交裂变推广 Skill。用户分享 Skill/商品链接，好友通过链接购买后自动获得佣金（默认10%一级、3%二级）。佣金通过智能合约实时结算到钱包。支持移动端 App 一键分享到微信/Twitter/Telegram。配合 Commission Split 使用，实现完整的推广裂变闭环。',
  '2.0.0', 'commerce', 'logic', 'action', 'native', 'published',
  '{\"type\":\"object\",\"properties\":{\"skillId\":{\"type\":\"string\",\"description\":\"要分享的Skill ID\"},\"platform\":{\"type\":\"string\",\"description\":\"分享平台: twitter/telegram/wechat/link\"},\"message\":{\"type\":\"string\",\"description\":\"自定义分享文案 (可选)\"}},\"required\":[\"skillId\"]}',
  '{\"type\":\"internal\",\"internalHandler\":\"referralShare\"}',
  '{\"type\":\"revenue_share\",\"commissionRate\":10}',
  '{referral,share,viral,growth,mobile,agentrix-commerce}',
  '$AUTHOR_ID', 450, 4.5, true, '[\"all\"]', '[\"read\"]',
  true, false, 'high',
  '{\"featured\":true,\"officialSkill\":true,\"commission_tiers\":{\"level1\":\"10%\",\"level2\":\"3%\"},\"mobile_app\":true}'
) ON CONFLICT DO NOTHING;\"" 2>&1 | tail -1

# 5. Product Listing (Skill Publishing)
$SSH "$PSQL -c \"INSERT INTO skills (id, name, display_name, description, version, category, layer, value_type, source, status, input_schema, executor, pricing, tags, author_id, call_count, rating, human_accessible, compatible_agents, permissions, ucp_enabled, x402_enabled, ai_priority, metadata)
VALUES (
  gen_random_uuid(),
  'publish_skill',
  'Publish Skill — 一键发布到市场',
  '商户/开发者一键将 API、服务、商品发布到 Agentrix Marketplace。支持从 OpenAPI Schema 自动导入、MCP Server 注册、手动创建。发布后自动生成 UCP 端点和 X402 支付配置，所有主流 AI 生态（Claude Desktop、Cursor、Windsurf、GPTs、Gemini）均可发现和调用。',
  '2.0.0', 'commerce', 'logic', 'action', 'native', 'published',
  '{\"type\":\"object\",\"properties\":{\"name\":{\"type\":\"string\",\"description\":\"Skill名称\"},\"description\":{\"type\":\"string\",\"description\":\"Skill描述\"},\"pricingType\":{\"type\":\"string\",\"description\":\"定价类型: free/per_call/subscription/revenue_share\"},\"price\":{\"type\":\"number\",\"description\":\"单次调用价格 (可选)\"},\"openApiUrl\":{\"type\":\"string\",\"description\":\"OpenAPI Schema URL (可选，自动导入)\"}},\"required\":[\"name\",\"description\"]}',
  '{\"type\":\"internal\",\"internalHandler\":\"publishSkill\"}',
  '{\"type\":\"free\"}',
  '{publish,marketplace,merchant,developer,openapi,agentrix-commerce}',
  '$AUTHOR_ID', 380, 4.4, true, '[\"all\"]', '[\"read\",\"write\"]',
  true, false, 'high',
  '{\"featured\":true,\"officialSkill\":true,\"import_sources\":[\"OpenAPI\",\"MCP Server\",\"Manual\"],\"ai_ecosystems\":[\"Claude Desktop\",\"Cursor\",\"Windsurf\",\"GPTs\",\"Gemini\"]}'
) ON CONFLICT DO NOTHING;\"" 2>&1 | tail -1

# 6. Order Manager
$SSH "$PSQL -c \"INSERT INTO skills (id, name, display_name, description, version, category, layer, value_type, source, status, input_schema, executor, pricing, tags, author_id, call_count, rating, human_accessible, compatible_agents, permissions, ucp_enabled, x402_enabled, ai_priority, metadata)
VALUES (
  gen_random_uuid(),
  'order_manager',
  'Order Manager — 订单全生命周期管理',
  '完整的订单管理 Skill。支持创建订单、查询状态、确认收货、申请退款、物流追踪。覆盖实物商品(T+7结算)、数字商品(T+1)、服务(T+3)、开发工具(即时)四种类型。Agent 可自主完成从下单到售后的全流程，人类也可通过 App 管理订单。',
  '2.0.0', 'commerce', 'logic', 'action', 'native', 'published',
  '{\"type\":\"object\",\"properties\":{\"action\":{\"type\":\"string\",\"description\":\"操作: create/query/confirm/refund/track\",\"enum\":[\"create\",\"query\",\"confirm\",\"refund\",\"track\"]},\"orderId\":{\"type\":\"string\",\"description\":\"订单ID (query/confirm/refund/track时必填)\"},\"skillId\":{\"type\":\"string\",\"description\":\"Skill ID (create时必填)\"},\"params\":{\"type\":\"object\",\"description\":\"订单参数\"}},\"required\":[\"action\"]}',
  '{\"type\":\"internal\",\"internalHandler\":\"orderManager\"}',
  '{\"type\":\"free\"}',
  '{order,management,lifecycle,logistics,refund,agentrix-commerce}',
  '$AUTHOR_ID', 520, 4.3, true, '[\"all\"]', '[\"read\",\"write\"]',
  true, false, 'high',
  '{\"featured\":true,\"officialSkill\":true,\"settlement_rules\":{\"physical\":\"T+7\",\"digital\":\"T+1\",\"service\":\"T+3\",\"dev_tool\":\"instant\"}}'
) ON CONFLICT DO NOTHING;\"" 2>&1 | tail -1

# 7. Fiat Gateway
$SSH "$PSQL -c \"INSERT INTO skills (id, name, display_name, description, version, category, layer, value_type, source, status, input_schema, executor, pricing, tags, author_id, call_count, rating, human_accessible, compatible_agents, permissions, ucp_enabled, x402_enabled, ai_priority, metadata)
VALUES (
  gen_random_uuid(),
  'fiat_gateway',
  'Fiat Gateway — 法币入金通道',
  '法币支付入金 Skill。集成 Stripe（信用卡/借记卡）和 Transak（白标法币入金）两大通道。支持 USD/EUR/GBP 等 50+ 法币，自动转换为链上稳定币。适用于不持有加密货币的用户，降低支付门槛。KYC 合规，支持全球 150+ 国家。',
  '2.0.0', 'payment', 'infra', 'action', 'native', 'published',
  '{\"type\":\"object\",\"properties\":{\"amount\":{\"type\":\"number\",\"description\":\"金额\"},\"fiatCurrency\":{\"type\":\"string\",\"description\":\"法币币种 (USD/EUR/GBP等)\"},\"provider\":{\"type\":\"string\",\"description\":\"支付通道: stripe/transak/auto\"},\"targetToken\":{\"type\":\"string\",\"description\":\"目标代币: USDT/USDC\"}},\"required\":[\"amount\",\"fiatCurrency\"]}',
  '{\"type\":\"internal\",\"internalHandler\":\"fiatGateway\"}',
  '{\"type\":\"per_call\",\"pricePerCall\":0,\"platformFeeRate\":1.0}',
  '{fiat,stripe,transak,credit-card,kyc,agentrix-commerce}',
  '$AUTHOR_ID', 310, 4.2, true, '[\"all\"]', '[\"read\",\"payment\"]',
  true, false, 'high',
  '{\"featured\":true,\"officialSkill\":true,\"providers\":[\"Stripe\",\"Transak\"],\"supported_fiat\":[\"USD\",\"EUR\",\"GBP\",\"JPY\",\"KRW\",\"SGD\"],\"countries\":\"150+\"}'
) ON CONFLICT DO NOTHING;\"" 2>&1 | tail -1

# 8. Auto Earn
$SSH "$PSQL -c \"INSERT INTO skills (id, name, display_name, description, version, category, layer, value_type, source, status, input_schema, executor, pricing, tags, author_id, call_count, rating, human_accessible, compatible_agents, permissions, ucp_enabled, x402_enabled, ai_priority, metadata)
VALUES (
  gen_random_uuid(),
  'auto_earn',
  'Auto Earn — 自动赚取收益',
  '自动发现和参与赚取机会的 Skill。包括: Airdrop 发现与领取、DCA 定投策略、Staking 质押收益、推广佣金自动归集。Agent 24/7 自动扫描链上机会，符合条件时自动执行。人类可通过 App 设置策略和风控参数。',
  '2.0.0', 'commerce', 'composite', 'action', 'native', 'published',
  '{\"type\":\"object\",\"properties\":{\"strategy\":{\"type\":\"string\",\"description\":\"策略类型: airdrop/dca/staking/referral\",\"enum\":[\"airdrop\",\"dca\",\"staking\",\"referral\"]},\"maxAmount\":{\"type\":\"number\",\"description\":\"单次最大金额\"},\"riskLevel\":{\"type\":\"string\",\"description\":\"风险等级: low/medium/high\"}},\"required\":[\"strategy\"]}',
  '{\"type\":\"internal\",\"internalHandler\":\"autoEarn\"}',
  '{\"type\":\"free\"}',
  '{auto-earn,airdrop,staking,dca,passive-income,agentrix-commerce}',
  '$AUTHOR_ID', 280, 4.1, true, '[\"all\"]', '[\"read\",\"payment\"]',
  true, false, 'high',
  '{\"featured\":true,\"officialSkill\":true,\"strategies\":[\"Airdrop Discovery\",\"DCA Auto-invest\",\"Staking Yield\",\"Referral Earnings\"]}'
) ON CONFLICT DO NOTHING;\"" 2>&1 | tail -1

echo ""
echo "=== Verify: All featured skills ==="
$SSH "$PSQL -c \"SELECT name, display_name, category, ai_priority, rating FROM skills WHERE ai_priority='high' AND metadata::text LIKE '%officialSkill%' ORDER BY rating DESC;\""

echo ""
echo "=== Total skills count ==="
$SSH "$PSQL -c \"SELECT status, COUNT(*) FROM skills GROUP BY status;\""
