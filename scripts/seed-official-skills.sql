-- Seed 8 Official Agentrix Commerce Skills
-- Author: system@agentrix.top (6cb90370-44c5-4f2a-8fdd-d395fbd9fbfd)

-- 1. Smart Checkout
INSERT INTO skills (id, name, display_name, description, version, category, layer, value_type, source, status, input_schema, output_schema, executor, pricing, tags, author_id, call_count, rating, human_accessible, compatible_agents, permissions, ucp_enabled, x402_enabled, ai_priority, metadata)
SELECT gen_random_uuid(),
  'smart_checkout',
  'Smart Checkout',
  'AI Agent 的智能支付路由引擎。自动分析交易场景，选择最优支付路径（链上稳定币/法币Stripe/X402协议/Session Key预授权）。支持 BSC、Ethereum、Polygon 多链，USDT/USDC 多币种。一次集成，覆盖所有支付场景。',
  '2.0.0', 'payment', 'infra', 'action', 'native', 'published',
  '{"type":"object","properties":{"amount":{"type":"number","description":"Payment amount"},"currency":{"type":"string","description":"Currency (USDT/USDC/USD)"},"merchantId":{"type":"string","description":"Merchant ID"},"preferredRoute":{"type":"string","description":"Preferred route: auto/crypto/fiat/x402"}},"required":["amount","currency","merchantId"]}'::jsonb,
  '{"type":"object","properties":{"paymentId":{"type":"string"},"status":{"type":"string"},"route":{"type":"string"},"txHash":{"type":"string"}}}'::jsonb,
  '{"type":"internal","internalHandler":"smartCheckout"}'::jsonb,
  '{"type":"free","platformFeeRate":0.3}'::jsonb,
  '{smart-checkout,payment,multi-chain,x402,ucp,stripe,agentrix-commerce}',
  '6cb90370-44c5-4f2a-8fdd-d395fbd9fbfd', 1250, 4.8, true,
  '["all"]'::jsonb, '["read","payment"]'::jsonb,
  true, true, 1,
  '{"featured":true,"officialSkill":true,"supported_chains":["BSC","Ethereum","Polygon"],"supported_tokens":["USDT","USDC"],"integration":{"ucp":"https://agentrix.top/docs/ucp","x402":"https://agentrix.top/docs/x402","sdk_js":"npm install @agentrix/sdk","sdk_python":"pip install agentrix"}}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE name='smart_checkout' AND metadata::text LIKE '%officialSkill%');

-- 2. X402 Pay
INSERT INTO skills (id, name, display_name, description, version, category, layer, value_type, source, status, input_schema, executor, pricing, tags, author_id, call_count, rating, human_accessible, compatible_agents, permissions, ucp_enabled, x402_enabled, ai_priority, metadata)
SELECT gen_random_uuid(),
  'x402_pay',
  'X402 Pay',
  'X402 协议原生支付。让 AI Agent 调用付费 API 时自动完成支付，无需人类干预。支持 HTTP 402 Payment Required 标准，Agent 自动识别并完成支付。适用于 Agent-to-Agent 交易、API 按次付费、微支付。',
  '2.0.0', 'payment', 'infra', 'action', 'native', 'published',
  '{"type":"object","properties":{"serviceUrl":{"type":"string","description":"Target service URL"},"maxAmount":{"type":"number","description":"Max payment amount"},"token":{"type":"string","description":"Payment token (USDT/USDC)"}},"required":["serviceUrl"]}'::jsonb,
  '{"type":"internal","internalHandler":"x402Pay"}'::jsonb,
  '{"type":"free"}'::jsonb,
  '{x402,agent-payment,micropayment,a2a,protocol,agentrix-commerce}',
  '6cb90370-44c5-4f2a-8fdd-d395fbd9fbfd', 890, 4.7, true,
  '["all"]'::jsonb, '["read","payment"]'::jsonb,
  true, true, 1,
  '{"featured":true,"officialSkill":true,"protocol":"x402.org"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE name='x402_pay' AND metadata::text LIKE '%officialSkill%');

-- 3. Commission Split
INSERT INTO skills (id, name, display_name, description, version, category, layer, value_type, source, status, input_schema, executor, pricing, tags, author_id, call_count, rating, human_accessible, compatible_agents, permissions, ucp_enabled, x402_enabled, ai_priority, metadata)
SELECT gen_random_uuid(),
  'commission_split',
  'Commission Split',
  'Dual-layer smart commission system. Layer 1 (Agent): Platform fee 0.5-3% + Agent pool 2-7%, Executor 70% / Referrer 30%. Layer 2 (Human): Merchant custom rates + 2-level referral. All settled via Commission.sol and CommissionV2.sol smart contracts on-chain.',
  '2.0.0', 'commerce', 'infra', 'action', 'native', 'published',
  '{"type":"object","properties":{"orderId":{"type":"string","description":"Order ID"},"amount":{"type":"number","description":"Transaction amount"},"referrerId":{"type":"string","description":"Referrer ID (optional)"},"splitPlanId":{"type":"string","description":"Split plan ID (optional)"}},"required":["orderId","amount"]}'::jsonb,
  '{"type":"contract","contractAddress":"Commission.sol"}'::jsonb,
  '{"type":"free","commissionRate":5}'::jsonb,
  '{commission,split,referral,smart-contract,agentrix-commerce}',
  '6cb90370-44c5-4f2a-8fdd-d395fbd9fbfd', 670, 4.6, true,
  '["all"]'::jsonb, '["read","payment"]'::jsonb,
  true, false, 1,
  '{"featured":true,"officialSkill":true,"contracts":["Commission.sol (V5)","CommissionV2.sol (SplitPlan)"],"dual_layer":true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE name='commission_split' AND metadata::text LIKE '%officialSkill%');

-- 4. Referral Share
INSERT INTO skills (id, name, display_name, description, version, category, layer, value_type, source, status, input_schema, executor, pricing, tags, author_id, call_count, rating, human_accessible, compatible_agents, permissions, ucp_enabled, x402_enabled, ai_priority, metadata)
SELECT gen_random_uuid(),
  'referral_share',
  'Referral Share',
  'Social viral referral Skill. Users share Skill links, friends purchase via link and referrer earns commission (default 10% L1, 3% L2). Commission settled instantly on-chain. Supports mobile App one-click share to Twitter/Telegram/WeChat.',
  '2.0.0', 'commerce', 'logic', 'action', 'native', 'published',
  '{"type":"object","properties":{"skillId":{"type":"string","description":"Skill ID to share"},"platform":{"type":"string","description":"Share platform: twitter/telegram/wechat/link"},"message":{"type":"string","description":"Custom share message (optional)"}},"required":["skillId"]}'::jsonb,
  '{"type":"internal","internalHandler":"referralShare"}'::jsonb,
  '{"type":"revenue_share","commissionRate":10}'::jsonb,
  '{referral,share,viral,growth,mobile,agentrix-commerce}',
  '6cb90370-44c5-4f2a-8fdd-d395fbd9fbfd', 450, 4.5, true,
  '["all"]'::jsonb, '["read"]'::jsonb,
  true, false, 1,
  '{"featured":true,"officialSkill":true,"commission_tiers":{"level1":"10%","level2":"3%"},"mobile_app":true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE name='referral_share' AND metadata::text LIKE '%officialSkill%');

-- 5. Publish Skill
INSERT INTO skills (id, name, display_name, description, version, category, layer, value_type, source, status, input_schema, executor, pricing, tags, author_id, call_count, rating, human_accessible, compatible_agents, permissions, ucp_enabled, x402_enabled, ai_priority, metadata)
SELECT gen_random_uuid(),
  'publish_skill',
  'Publish Skill',
  'One-click publish API/service/product to Agentrix Marketplace. Supports OpenAPI Schema auto-import, MCP Server registration, manual creation. Auto-generates UCP endpoint and X402 payment config. Discoverable by Claude Desktop, Cursor, Windsurf, GPTs, Gemini.',
  '2.0.0', 'commerce', 'logic', 'action', 'native', 'published',
  '{"type":"object","properties":{"name":{"type":"string","description":"Skill name"},"description":{"type":"string","description":"Skill description"},"pricingType":{"type":"string","description":"Pricing: free/per_call/subscription/revenue_share"},"price":{"type":"number","description":"Price per call (optional)"},"openApiUrl":{"type":"string","description":"OpenAPI Schema URL (optional, auto-import)"}},"required":["name","description"]}'::jsonb,
  '{"type":"internal","internalHandler":"publishSkill"}'::jsonb,
  '{"type":"free"}'::jsonb,
  '{publish,marketplace,merchant,developer,openapi,agentrix-commerce}',
  '6cb90370-44c5-4f2a-8fdd-d395fbd9fbfd', 380, 4.4, true,
  '["all"]'::jsonb, '["read","write"]'::jsonb,
  true, false, 1,
  '{"featured":true,"officialSkill":true,"import_sources":["OpenAPI","MCP Server","Manual"],"ai_ecosystems":["Claude Desktop","Cursor","Windsurf","GPTs","Gemini"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE name='publish_skill' AND metadata::text LIKE '%officialSkill%');

-- 6. Order Manager
INSERT INTO skills (id, name, display_name, description, version, category, layer, value_type, source, status, input_schema, executor, pricing, tags, author_id, call_count, rating, human_accessible, compatible_agents, permissions, ucp_enabled, x402_enabled, ai_priority, metadata)
SELECT gen_random_uuid(),
  'order_manager',
  'Order Manager',
  'Full order lifecycle management. Create, query, confirm, refund, track logistics. Covers physical goods (T+7), digital (T+1), services (T+3), dev tools (instant). Agent handles entire flow autonomously, humans manage via App.',
  '2.0.0', 'commerce', 'logic', 'action', 'native', 'published',
  '{"type":"object","properties":{"action":{"type":"string","description":"Action: create/query/confirm/refund/track","enum":["create","query","confirm","refund","track"]},"orderId":{"type":"string","description":"Order ID (required for query/confirm/refund/track)"},"skillId":{"type":"string","description":"Skill ID (required for create)"},"params":{"type":"object","description":"Order parameters"}},"required":["action"]}'::jsonb,
  '{"type":"internal","internalHandler":"orderManager"}'::jsonb,
  '{"type":"free"}'::jsonb,
  '{order,management,lifecycle,logistics,refund,agentrix-commerce}',
  '6cb90370-44c5-4f2a-8fdd-d395fbd9fbfd', 520, 4.3, true,
  '["all"]'::jsonb, '["read","write"]'::jsonb,
  true, false, 1,
  '{"featured":true,"officialSkill":true,"settlement":{"physical":"T+7","digital":"T+1","service":"T+3","dev_tool":"instant"}}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE name='order_manager' AND metadata::text LIKE '%officialSkill%');

-- 7. Fiat Gateway
INSERT INTO skills (id, name, display_name, description, version, category, layer, value_type, source, status, input_schema, executor, pricing, tags, author_id, call_count, rating, human_accessible, compatible_agents, permissions, ucp_enabled, x402_enabled, ai_priority, metadata)
SELECT gen_random_uuid(),
  'fiat_gateway',
  'Fiat Gateway',
  'Fiat payment on-ramp. Integrates Stripe (credit/debit card) and Transak (white-label fiat on-ramp). Supports 50+ fiat currencies, auto-converts to on-chain stablecoins. KYC compliant, 150+ countries supported.',
  '2.0.0', 'payment', 'infra', 'action', 'native', 'published',
  '{"type":"object","properties":{"amount":{"type":"number","description":"Amount"},"fiatCurrency":{"type":"string","description":"Fiat currency (USD/EUR/GBP etc)"},"provider":{"type":"string","description":"Provider: stripe/transak/auto"},"targetToken":{"type":"string","description":"Target token: USDT/USDC"}},"required":["amount","fiatCurrency"]}'::jsonb,
  '{"type":"internal","internalHandler":"fiatGateway"}'::jsonb,
  '{"type":"per_call","pricePerCall":0,"platformFeeRate":1.0}'::jsonb,
  '{fiat,stripe,transak,credit-card,kyc,agentrix-commerce}',
  '6cb90370-44c5-4f2a-8fdd-d395fbd9fbfd', 310, 4.2, true,
  '["all"]'::jsonb, '["read","payment"]'::jsonb,
  true, false, 1,
  '{"featured":true,"officialSkill":true,"providers":["Stripe","Transak"],"supported_fiat":["USD","EUR","GBP","JPY","KRW","SGD"],"countries":"150+"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE name='fiat_gateway' AND metadata::text LIKE '%officialSkill%');

-- 8. Auto Earn
INSERT INTO skills (id, name, display_name, description, version, category, layer, value_type, source, status, input_schema, executor, pricing, tags, author_id, call_count, rating, human_accessible, compatible_agents, permissions, ucp_enabled, x402_enabled, ai_priority, metadata)
SELECT gen_random_uuid(),
  'auto_earn',
  'Auto Earn',
  'Auto-discover and participate in earning opportunities. Includes: Airdrop discovery and claiming, DCA auto-invest strategies, Staking yield, Referral commission aggregation. Agent scans on-chain opportunities 24/7, auto-executes when conditions are met.',
  '2.0.0', 'commerce', 'composite', 'action', 'native', 'published',
  '{"type":"object","properties":{"strategy":{"type":"string","description":"Strategy: airdrop/dca/staking/referral","enum":["airdrop","dca","staking","referral"]},"maxAmount":{"type":"number","description":"Max amount per execution"},"riskLevel":{"type":"string","description":"Risk level: low/medium/high"}},"required":["strategy"]}'::jsonb,
  '{"type":"internal","internalHandler":"autoEarn"}'::jsonb,
  '{"type":"free"}'::jsonb,
  '{auto-earn,airdrop,staking,dca,passive-income,agentrix-commerce}',
  '6cb90370-44c5-4f2a-8fdd-d395fbd9fbfd', 280, 4.1, true,
  '["all"]'::jsonb, '["read","payment"]'::jsonb,
  true, false, 1,
  '{"featured":true,"officialSkill":true,"strategies":["Airdrop Discovery","DCA Auto-invest","Staking Yield","Referral Earnings"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE name='auto_earn' AND metadata::text LIKE '%officialSkill%');
