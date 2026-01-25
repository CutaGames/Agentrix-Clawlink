# Agentrix V5.0 五方分账模型 (Stripe Connect)

## 1. 分账概述

V5.0 采用五方分账模型，实现了精细化的收益分配：

| 参与方 | 角色说明 | 收益来源 |
|--------|----------|----------|
| **Stripe** | 支付通道 | 固定费率 2.9% + $0.30 |
| **商户 (Merchant)** | 商品/服务提供者 | 净额 - 平台管理费 - 激励池 |
| **执行 Agent** | 完成服务交付的 Agent | 激励池 × 70% |
| **推荐 Agent** | 推荐商户/服务的 Agent | 激励池 × 30% |
| **推广 Agent** | 引流用户的 Agent | 平台管理费 × 20% |
| **平台** | Agentrix | 平台管理费 × 80% + 未分配激励池 |

## 2. 费率配置

按商品/技能类型的差异化费率：

| 类型 | 平台管理费 (Base) | 激励池 (Pool) | 总费率 |
|------|-------------------|---------------|--------|
| PHYSICAL (实物) | 0.5% | 2.5% | **3%** |
| DIGITAL (数字商品) | 1% | 4% | **5%** |
| SERVICE (服务) | 1.5% | 6.5% | **8%** |
| INFRA (基础设施) | 0.5% | 2% | **2.5%** |
| RESOURCE (资源) | 0.5% | 2.5% | **3%** |
| LOGIC (逻辑层) | 1% | 4% | **5%** |
| COMPOSITE (复合层) | 2% | 8% | **10%** |

## 3. 计算示例

### $100 实物商品订单 (PHYSICAL)

```
用户支付: $100.00

1. Stripe 通道费: $100 × 2.9% + $0.30 = $3.20
   → 可分账净额: $100.00 - $3.20 = $96.80

2. 平台管理费 (Base): $100 × 0.5% = $0.50
   → 推广 Agent: $0.50 × 20% = $0.10
   → 平台净得: $0.50 × 80% = $0.40

3. 激励池 (Pool): $100 × 2.5% = $2.50
   → 执行 Agent: $2.50 × 70% = $1.75
   → 推荐 Agent: $2.50 × 30% = $0.75

4. 商户最终所得: $96.80 - $0.50 - $2.50 = $93.80
```

### 最终分配

| 参与方 | 金额 | 说明 |
|--------|------|------|
| Stripe | $3.20 | 支付通道费 |
| 商户 | **$93.80** | Connect Transfer #1 |
| 执行 Agent | **$1.75** | Connect Transfer #2 |
| 推荐 Agent | **$0.75** | Connect Transfer #3 |
| 推广 Agent | **$0.10** | Connect Transfer #4 |
| 平台 | **$0.40** | 留在平台账户 |

## 4. Stripe Connect 实现

### 4.1 支付时传递 metadata

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000, // $100.00
  currency: 'usd',
  metadata: {
    // 订单信息
    orderId: 'order_123',
    paymentId: 'payment_456',
    productType: 'PHYSICAL',
    
    // 商户信息
    merchantId: 'merchant_789',
    stripeConnectAccountId: 'acct_merchant',
    
    // V5.0 Agent 信息
    executionAgentId: 'agent_exec_001',
    executionAgentConnectId: 'acct_exec_agent',
    recommendationAgentId: 'agent_rec_002',
    recommendationAgentConnectId: 'acct_rec_agent',
    referralAgentId: 'agent_ref_003',
    referralAgentConnectId: 'acct_ref_agent',
  },
});
```

### 4.2 Webhook 处理

```typescript
// payment_intent.succeeded 事件处理
// 自动计算 V5.0 分账并创建 StripeSettlement 记录
```

### 4.3 T+3 批量 Transfer

```typescript
// 每日定时任务执行 T+3 结算
// 为每个结算记录执行 4 个 Transfer:
// 1. 商户转账
// 2. 执行 Agent 转账
// 3. 推荐 Agent 转账
// 4. 推广 Agent 转账
```

## 5. API 端点

### 5.1 计算费用预览

```bash
POST /api/payments/connect/calculate-v5-fees
Content-Type: application/json

{
  "amount": 100,
  "productType": "PHYSICAL",
  "hasExecutionAgent": true,
  "hasRecommendationAgent": true,
  "hasReferralAgent": true
}
```

### 5.2 执行分账

```bash
POST /api/payments/connect/execute-v5-transfers
Content-Type: application/json

{
  "settlementId": "settlement_uuid",
  "merchantConnectAccountId": "acct_merchant",
  "executionAgentConnectAccountId": "acct_exec",
  "recommendationAgentConnectAccountId": "acct_rec",
  "referralAgentConnectAccountId": "acct_ref"
}
```

### 5.3 获取费率配置

```bash
GET /api/payments/connect/v5-fee-configs
```

## 6. 数据库 Schema

### stripe_settlements 表 (V5.0 字段)

| 字段 | 类型 | 说明 |
|------|------|------|
| product_type | VARCHAR(50) | 商品类型 |
| base_fee | DECIMAL(15,2) | 平台管理费 |
| pool_fee | DECIMAL(15,2) | 激励池 |
| platform_net_amount | DECIMAL(15,2) | 平台净收益 |
| execution_agent_id | VARCHAR | 执行 Agent ID |
| execution_agent_connect_id | VARCHAR | 执行 Agent Connect 账户 |
| execution_agent_amount | DECIMAL(15,2) | 执行 Agent 金额 |
| execution_agent_transfer_id | VARCHAR | 执行 Agent Transfer ID |
| recommendation_agent_id | VARCHAR | 推荐 Agent ID |
| recommendation_agent_connect_id | VARCHAR | 推荐 Agent Connect 账户 |
| recommendation_agent_amount | DECIMAL(15,2) | 推荐 Agent 金额 |
| recommendation_agent_transfer_id | VARCHAR | 推荐 Agent Transfer ID |
| referral_agent_id | VARCHAR | 推广 Agent ID |
| referral_agent_connect_id | VARCHAR | 推广 Agent Connect 账户 |
| referral_agent_amount | DECIMAL(15,2) | 推广 Agent 金额 |
| referral_agent_transfer_id | VARCHAR | 推广 Agent Transfer ID |

## 7. 未分配收益处理

当某个 Agent 角色缺失时，其应得收益会归平台：

| 场景 | 处理方式 |
|------|----------|
| 无执行 Agent | 激励池 70% 归平台 |
| 无推荐 Agent | 激励池 30% 归平台 |
| 无推广 Agent | 平台管理费 20% 归平台 |
| 全部 Agent 缺失 | 整个激励池 + 20% 管理费归平台 |

## 8. 相关文件

- [stripe-webhook.service.ts](backend/src/modules/payment/stripe-webhook.service.ts) - Webhook 处理和分账计算
- [stripe-connect.service.ts](backend/src/modules/payment/stripe-connect.service.ts) - Connect Transfer 执行
- [stripe-connect.controller.ts](backend/src/modules/payment/stripe-connect.controller.ts) - REST API
- [stripe-settlement.entity.ts](backend/src/entities/stripe-settlement.entity.ts) - 数据库实体
- [1775000000000-CreateStripeSettlementsTable.ts](backend/src/migrations/1775000000000-CreateStripeSettlementsTable.ts) - 基础表 Migration
- [1775100000000-AddV5SettlementColumns.ts](backend/src/migrations/1775100000000-AddV5SettlementColumns.ts) - V5.0 字段 Migration

---

更新时间: 2026-01-21
版本: V5.0
