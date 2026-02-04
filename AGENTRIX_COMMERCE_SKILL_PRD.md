# Agentrix Commerce Skill 产品设计方案
## 支付 + 分佣一体化 MCP Skill

**版本**: 2.0  
**日期**: 2026年1月31日  
**状态**: Draft  

---

# 目录

1. [产品概述](#1-产品概述)
2. [统一费率体系](#2-统一费率体系)
3. [与现有系统的关系](#3-与现有系统的关系)
4. [数据模型 (Schema)](#4-数据模型-schema)
5. [MCP Tool 定义](#5-mcp-tool-定义)
6. [工作流示例](#6-工作流示例)
7. [与现有代码的集成方案](#7-与现有代码的集成方案)
8. [实施路线图](#8-实施路线图)
9. [附录](#9-附录)
10. [合约改动方案](#10-合约改动方案)
11. [后端改动方案](#11-后端改动方案)
12. [前端融合方案](#12-前端融合方案)
13. [SDK 设计](#13-sdk-设计)
14. [Skill 生成与注册](#14-skill-生成与注册)
15. [分批执行计划](#15-分批执行计划)

---

## 1. 产品概述

### 1.1 设计目标
将 Agentrix 已有的支付（Stripe/Transak/X402/Wallet）和分佣（V4.0 分账协议）能力整合为 **一个统一的 MCP Skill**，对外暴露简洁一致的 Tool API，支持三种使用模式：

| 模式 | 描述 | 典型场景 |
|-----|------|---------|
| `PAY_ONLY` | 仅收款/退款 | 充值、订阅、一次性购买 |
| `SPLIT_ONLY` | 仅分账（基于外部订单事件） | 外部电商订单分佣、广告联盟结算 |
| `PAY_AND_SPLIT` | 收款成功后自动按规则分账 | Marketplace、Agent-to-Agent、多方协作项目 |

### 1.2 核心特性
- **一套 Schema**：三种模式共用相同的数据结构（Order、PaymentIntent、AllocationPlan）
- **模块可选**：用户按需开启支付能力、分佣能力或两者皆有
- **预算池支持**：支持复杂多 Agent 协作的项目制预算分配
- **幂等 & 可回滚**：所有操作支持幂等键，退款/冲正按原路径反向执行

---

## 2. 统一费率体系

### 2.1 设计决策

**核心原则：Commerce Skill 作为唯一分佣引擎，商品类型降级为默认模板选择器**

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 费率体系 | 统一到 Commerce Skill | 避免两套体系并存导致的用户困惑和代码冗余 |
| 商品类型 | 作为默认 SplitPlan 模板 | 向后兼容现有商户，无需迁移 |
| 自定义能力 | 用户可覆盖默认模板 | 满足高级用户灵活需求 |
| V5 分佣代码 | 标记 deprecated，仅维护 | 渐进式迁移，降低风险 |
| 合约费率 | **可动态调整** | 通过 `setLayerRates()` 等函数配置 |

### 2.2 统一费率公式

**核心原则：纯 Crypto 免费，按功能叠加收费**

```
总费用 = Onramp费 + Offramp费 + 分佣费

费率规则：
  - 纯 Crypto 钱包支付：0%（用户自付 gas）
  - Onramp（法币入金）：+0.1%
  - Offramp（法币出金）：+0.1%
  - 分佣（通过智能合约）：0.3%，最低 0.1 USDC
```

#### 费率计算示例

| 场景 | 费率计算 | 总费率 |
|------|---------|-------|
| 钱包直接转账，无分佣 | 0 | **0%** |
| 钱包支付 + 分佣 | 0.3% | **0.3%** |
| Onramp 购买，无分佣 | 0.1% | **0.1%** |
| Onramp 购买 + 分佣 | 0.1% + 0.3% | **0.4%** |
| Onramp + Offramp（充提） | 0.1% + 0.1% | **0.2%** |
| Onramp + 分佣 + Offramp | 0.1% + 0.3% + 0.1% | **0.5%** |

#### 最低收费规则

| 费用类型 | 最低收费 | 说明 |
|---------|---------|------|
| 分佣费 | 0.1 USDC | 防止微交易刷量 |
| Onramp 费 | 无最低 | 按比例收取 |
| Offramp 费 | 无最低 | 按比例收取 |

### 2.3 合约费率配置能力

现有 `Commission.sol` 合约支持动态费率配置：

| 函数 | 用途 | 最大值 |
|------|------|-------|
| `setX402ChannelFeeRate(rate)` | X402 通道费 | 3% |
| `setScannedFeeRate(source, rate)` | 扫描商品费率 | 2% |
| `setLayerRates(layer, platformFee, poolRate)` | 分层费率 | 平台5%，池10% |

**固定比例（代码写死）**：
- `EXECUTOR_SHARE = 7000` (70%) - 执行 Agent
- `REFERRER_SHARE = 3000` (30%) - 推荐 Agent
- `PROMOTER_SHARE_OF_PLATFORM = 2000` (平台费的20%) - 推广 Agent

> ⚠️ V2 合约将支持这些比例的动态配置

### 2.4 商品类型 → 默认 SplitPlan 模板

商品类型不再决定费率，而是决定**默认的分佣比例模板**：

| 商品类型 | 模板名称 | 默认分佣规则 | 可覆盖 |
|---------|---------|-------------|--------|
| `physical` | 实物商品模板 | executor 70%, referrer 30% | ✅ |
| `service` | 服务模板 | executor 80%, referrer 20% | ✅ |
| `virtual` | 虚拟商品模板 | executor 70%, referrer 30% | ✅ |
| `nft` | NFT模板 | creator 85%, platform 15% (royalty) | ✅ |
| `skill` | 技能模板 | developer 70%, referrer 30% | ✅ |
| `agent_task` | Agent任务模板 | 按 SplitPlan 执行（必须自定义） | 必填 |

### 2.5 SplitPlan 优先级

```
用户自定义 SplitPlan > 商品类型默认模板 > 系统全局默认
```

**逻辑伪代码**：
```typescript
function resolveSplitPlan(order: CommerceOrder): SplitPlan {
  // 1. 用户指定了自定义计划
  if (order.allocationPlanId) {
    return getSplitPlan(order.allocationPlanId);
  }
  
  // 2. 使用商品类型默认模板
  const template = getDefaultTemplate(order.productType);
  
  // 3. 应用临时覆盖（如果有）
  if (order.allocationOverrides) {
    return mergeOverrides(template, order.allocationOverrides);
  }
  
  return template;
}
```

### 2.6 迁移策略

```
Phase 1: Commerce Skill 上线，新交易走新体系
Phase 2: 现有商品自动映射到对应模板（零代码迁移）
Phase 3: V5 代码标记 @deprecated，仅 bugfix
Phase 4: 合约升级，V1 冻结，V2 接管新交易
```

### 2.7 与 V5 分佣体系对比

| 维度 | Commission V5 (旧) | Commerce Skill (新) |
|------|-------------------|---------------------|
| 分类依据 | 商品类型决定费率 | 功能叠加决定费率 |
| 费率灵活性 | 固定预设 | 按需叠加 |
| 分佣规则 | 平台定义 | 用户可自定义 |
| 参与方层级 | 固定 3 角色 | 支持 N 级 |
| 向后兼容 | - | 商品类型 → 模板自动映射 |

---

## 3. 与现有系统的关系

### 3.1 复用的核心模块

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Commerce Skill (New Facade)                      │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ PaymentModule│  │AllocationMod│  │ BudgetPoolMod│              │
│  │ (新增编排)    │  │ (新增编排)    │  │ (新增)       │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
└─────────┼─────────────────┼─────────────────┼───────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────────┐ ┌──────────────────────────┐
│ 现有支付服务     │ │ 现有分佣服务         │ │ 新增预算池/托管服务       │
│ - PaymentService│ │ - CommissionV4Svc   │ │ - BudgetPoolService      │
│ - StripeConnect │ │ - LedgerService     │ │ - MilestoneService       │
│ - SmartRouter   │ │ - SettlementSvc     │ │ - EscrowService(增强)    │
│ - X402Service   │ │ - FundPathEntity    │ │                          │
│ - TransakSvc    │ └─────────────────────┘ └──────────────────────────┘
└─────────────────┘
```

### 3.2 现有代码入口（复用）

| 能力 | 现有服务 | 文件路径 |
|------|---------|---------|
| 支付创建 | `PaymentService` | `backend/src/modules/payment/payment.service.ts` |
| 智能路由 | `SmartRouterService` | `backend/src/modules/payment/smart-router.service.ts` |
| Stripe 分账 | `StripeConnectService` | `backend/src/modules/payment/stripe-connect.service.ts` |
| X402 链上支付 | `X402Service` | `backend/src/modules/payment/x402.service.ts` |
| 分佣计算 V4 | `CommissionStrategyV4Service` | `backend/src/modules/commission/commission-strategy-v4.service.ts` |
| 资金路径记录 | `FundPath` Entity | `backend/src/entities/fund-path.entity.ts` |
| 账本服务 | `LedgerService` | `backend/src/modules/ledger/ledger.service.ts` |
| Agent 支付技能 | `AgentPaymentSkillService` | `backend/src/modules/mcp/agent-payment-skill.service.ts` |

---

## 4. 数据模型 (Schema)

### 4.1 核心实体

```typescript
// ============ Order（业务订单）============
interface CommerceOrder {
  id: string;                          // 订单唯一ID
  externalOrderId?: string;            // 外部系统订单号（SPLIT_ONLY 模式必填）
  
  // 金额
  amount: number;
  currency: string;                    // USD, CNY, USDC, etc.
  
  // 参与方
  merchantId: string;                  // 商户/卖家
  customerId?: string;                 // 买家/付款方
  
  // 商品/服务信息
  productType: 'physical' | 'service' | 'virtual' | 'nft' | 'skill' | 'agent_task';
  items?: OrderItem[];
  
  // 状态
  status: 'draft' | 'pending_payment' | 'paid' | 'processing' | 'completed' | 'refunded' | 'cancelled';
  
  // 元数据
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============ PaymentIntent（支付意图）============
interface CommercePaymentIntent {
  id: string;
  orderId: string;
  
  // 金额
  amount: number;
  currency: string;
  
  // 支付通道
  provider: 'stripe' | 'transak' | 'x402' | 'wallet' | 'passkey';
  providerPaymentId?: string;          // Stripe PaymentIntent ID 等
  
  // 状态
  status: 'created' | 'requires_action' | 'authorized' | 'captured' | 'refunded' | 'failed';
  
  // 客户端数据（Stripe clientSecret 等）
  clientPayload?: Record<string, any>;
  
  // 授权/预授权
  captureMethod?: 'automatic' | 'manual';
  authorizedAt?: Date;
  capturedAt?: Date;
  
  // 幂等
  idempotencyKey: string;
  
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============ AllocationPlan（分配计划）============
interface CommerceAllocationPlan {
  id: string;
  name?: string;
  version: number;                     // 版本号，支付时锁定当前版本
  
  // 基础费率（与 V4.0 一致）
  productType: 'physical' | 'service' | 'virtual' | 'nft';
  rateProfile: {
    channelRate: number;               // 0.003 = 0.3%
    platformRate: number;              // 0.005 = 0.5%
    poolRate: number;                  // 0.022 = 2.2%
  };
  
  // 参与方动态规则
  roles: {
    promoter?: { address: string; share: number };     // 从 platformFee 中分，如 0.2 = 20%
    executor?: { address: string; share: number };     // 从 pool 中分，如 0.7 = 70%
    referrer?: { address: string; share: number };     // 从 pool 中分，如 0.3 = 30%
    custom?: Array<{                                   // 自定义接收方
      address: string;
      share: number;
      source: 'pool' | 'platform' | 'merchant';
      role: string;
    }>;
  };
  
  // 高级规则（V2）
  tiers?: AllocationTier[];            // 阶梯规则
  caps?: { role: string; maxAmount: number }[];  // 封顶
  conditions?: AllocationCondition[];  // 条件触发（如评分 >= 80 才释放）
  
  status: 'draft' | 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

// ============ BudgetPool（预算池/托管）============
interface CommerceBudgetPool {
  id: string;
  projectId?: string;                  // 关联的项目/任务ID
  
  // 金额
  totalBudget: number;
  fundedAmount: number;                // 已充值金额
  reservedAmount: number;              // 已预留给子任务的金额
  releasedAmount: number;              // 已释放的金额
  availableAmount: number;             // 可用余额 = funded - reserved - released
  currency: string;
  
  // 资金来源
  fundingSource: 'payment' | 'wallet' | 'credit';
  
  // 关联的分配计划
  allocationPlanId?: string;
  
  // 状态
  status: 'draft' | 'funded' | 'active' | 'depleted' | 'expired' | 'cancelled';
  expiresAt?: Date;
  
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Milestone（里程碑）============
interface CommerceMilestone {
  id: string;
  budgetPoolId: string;
  orderId?: string;
  
  // 描述
  name: string;
  description?: string;
  
  // 预算
  reservedAmount: number;
  releasedAmount: number;
  
  // 参与方（覆盖 AllocationPlan 的默认值）
  participants?: Array<{
    agentId: string;
    address: string;
    role: string;
    shareOverride?: number;            // 如果不填则用 plan 默认值
  }>;
  
  // 验收
  status: 'pending' | 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'released';
  approvalType: 'auto' | 'manual' | 'quality_gate';
  qualityGate?: {
    metric: string;                    // 'test_pass_rate' | 'score' | 'custom'
    threshold: number;
    operator: '>=' | '>' | '=' | '<' | '<=';
  };
  
  // 产出证明
  artifacts?: Array<{
    type: string;
    url?: string;
    hash?: string;
    metadata?: Record<string, any>;
  }>;
  
  reviewedBy?: string;
  reviewedAt?: Date;
  releasedAt?: Date;
  
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Settlement（结算明细）============
interface CommerceSettlement {
  id: string;
  
  // 关联
  orderId?: string;
  paymentIntentId?: string;
  milestoneId?: string;
  allocationPlanId: string;
  allocationPlanVersion: number;
  
  // 接收方
  recipientId: string;
  recipientAddress: string;
  recipientRole: string;
  
  // 金额
  grossAmount: number;                 // 应得金额
  feeAmount: number;                   // 扣除的手续费
  netAmount: number;                   // 实收金额
  currency: string;
  
  // 状态
  status: 'pending' | 'processing' | 'settled' | 'failed' | 'reversed';
  disputePeriodEnds?: Date;            // 争议期结束时间
  
  // 打款信息
  payoutMethod?: 'stripe_transfer' | 'x402' | 'wallet' | 'manual';
  payoutReference?: string;
  settledAt?: Date;
  
  // 冲正信息（退款/拒付时填写）
  reversalReason?: string;
  reversedAt?: Date;
  originalSettlementId?: string;
  
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Ledger Entry（账本条目）============
interface CommerceLedgerEntry {
  id: string;
  
  // 关联
  orderId?: string;
  paymentIntentId?: string;
  settlementId?: string;
  milestoneId?: string;
  budgetPoolId?: string;
  
  // 借贷
  entryType: 'debit' | 'credit';
  accountType: 'customer' | 'merchant' | 'platform' | 'agent' | 'channel' | 'pool' | 'escrow';
  accountId: string;
  
  // 金额
  amount: number;
  currency: string;
  
  // 说明
  description: string;
  category: string;                    // 'payment' | 'commission' | 'fee' | 'refund' | 'release' | 'reserve'
  
  // 幂等
  idempotencyKey: string;
  
  // 不可变
  createdAt: Date;
}
```

---

## 5. MCP Tool 定义

### 5.1 统一入口

所有操作通过 `commerce` 这一个 MCP Tool 暴露，使用 `action` 参数区分操作类型。

```typescript
// MCP Tool 定义
const commerceTool = {
  name: 'commerce',
  description: '统一支付与分佣能力，支持收款、分账、预算池管理',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: [
          // 订单
          'createOrder',
          'getOrder',
          'updateOrder',
          
          // 支付
          'createPaymentIntent',
          'capturePayment',
          'refundPayment',
          
          // 分配计划
          'createAllocationPlan',
          'updateAllocationPlan',
          'getAllocations',
          
          // 预算池
          'createBudgetPool',
          'fundBudgetPool',
          'reserveBudget',
          'releaseBudget',
          
          // 里程碑
          'createMilestone',
          'submitMilestone',
          'approveMilestone',
          'rejectMilestone',
          
          // 结算
          'getSettlements',
          'payoutSettlement',
          
          // 账本
          'getLedger',
          
          // 预览/模拟
          'previewAllocation',
        ],
        description: '要执行的操作',
      },
      mode: {
        type: 'string',
        enum: ['PAY_ONLY', 'SPLIT_ONLY', 'PAY_AND_SPLIT'],
        default: 'PAY_AND_SPLIT',
        description: '使用模式',
      },
      params: {
        type: 'object',
        description: '操作参数（根据 action 不同而不同）',
      },
      idempotencyKey: {
        type: 'string',
        description: '幂等键，防止重复操作',
      },
    },
    required: ['action'],
  },
};
```

### 5.2 核心 Action 参数详解

#### 4.2.1 createOrder

```typescript
interface CreateOrderParams {
  // 必填
  amount: number;
  currency: string;
  merchantId: string;
  productType: 'physical' | 'service' | 'virtual' | 'nft' | 'skill' | 'agent_task';
  
  // 可选
  externalOrderId?: string;            // SPLIT_ONLY 模式必填
  customerId?: string;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    metadata?: Record<string, any>;
  }>;
  
  // 分配计划（如果不传，使用 productType 的默认计划）
  allocationPlanId?: string;
  allocationOverrides?: {              // 临时覆盖分配规则
    promoter?: string;
    executor?: string;
    referrer?: string;
  };
  
  metadata?: Record<string, any>;
}

// 返回
interface CreateOrderResult {
  orderId: string;
  status: string;
  allocationPlanId: string;            // 绑定的分配计划
  nextStep: 'createPaymentIntent' | 'applyAllocation';  // 下一步操作提示
}
```

#### 4.2.2 createPaymentIntent

```typescript
interface CreatePaymentIntentParams {
  orderId: string;
  
  // 支付方式偏好（可选，默认由 SmartRouter 决定）
  preferredProvider?: 'stripe' | 'transak' | 'x402' | 'wallet';
  
  // 预授权（可选）
  captureMethod?: 'automatic' | 'manual';
  
  // 客户信息（某些支付通道需要）
  customer?: {
    email?: string;
    phone?: string;
    walletAddress?: string;
  };
  
  // 用于 Stripe
  returnUrl?: string;
  
  metadata?: Record<string, any>;
}

// 返回
interface CreatePaymentIntentResult {
  paymentIntentId: string;
  provider: string;
  status: string;
  
  // 客户端完成支付所需数据
  clientPayload: {
    // Stripe
    clientSecret?: string;
    publishableKey?: string;
    
    // X402
    paymentRequest?: string;
    
    // Transak
    redirectUrl?: string;
    
    // Wallet
    to?: string;
    value?: string;
    data?: string;
  };
  
  expiresAt: string;
}
```

#### 4.2.3 previewAllocation

```typescript
interface PreviewAllocationParams {
  amount: number;
  currency: string;
  productType: 'physical' | 'service' | 'virtual' | 'nft';
  
  // 参与方（可选）
  roles?: {
    promoter?: string;
    executor?: string;
    referrer?: string;
  };
  
  // 使用自定义计划（可选）
  allocationPlanId?: string;
}

// 返回
interface PreviewAllocationResult {
  grossAmount: number;
  currency: string;
  
  // 费用明细
  fees: {
    channelFee: number;
    platformFee: number;
    poolFee: number;
    totalFees: number;
  };
  
  // 分配明细
  allocations: Array<{
    recipient: string;
    role: string;
    amount: number;
    percentage: number;
    source: 'platform' | 'pool' | 'merchant';
  }>;
  
  merchantNet: number;
  
  // 费率说明
  rateBreakdown: {
    channelRate: string;
    platformRate: string;
    poolRate: string;
  };
}
```

#### 4.2.4 预算池相关

```typescript
// 创建预算池
interface CreateBudgetPoolParams {
  projectId?: string;
  totalBudget: number;
  currency: string;
  allocationPlanId?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

// 充值预算池
interface FundBudgetPoolParams {
  budgetPoolId: string;
  amount: number;
  fundingSource: 'payment' | 'wallet';
  paymentIntentId?: string;            // 如果是 payment
  walletAddress?: string;              // 如果是 wallet
}

// 预留预算（给子任务/里程碑）
interface ReserveBudgetParams {
  budgetPoolId: string;
  milestoneId: string;
  amount: number;
  participants: Array<{
    agentId: string;
    address: string;
    role: string;
    share: number;
  }>;
}

// 释放预算（里程碑完成后）
interface ReleaseBudgetParams {
  budgetPoolId: string;
  milestoneId: string;
  approvalType?: 'auto' | 'manual';
  artifacts?: Array<{
    type: string;
    url?: string;
    hash?: string;
  }>;
}
```

---

## 6. 工作流示例

### 6.1 PAY_ONLY 模式：简单购买

```
用户 → createOrder(mode=PAY_ONLY) → createPaymentIntent → [客户端完成支付] → Webhook → Order.paid
```

```typescript
// 1. 创建订单
const order = await commerce({
  action: 'createOrder',
  mode: 'PAY_ONLY',
  params: {
    amount: 100,
    currency: 'USD',
    merchantId: 'merchant_123',
    productType: 'virtual',
  },
});

// 2. 创建支付意图
const intent = await commerce({
  action: 'createPaymentIntent',
  params: {
    orderId: order.orderId,
    preferredProvider: 'stripe',
    customer: { email: 'user@example.com' },
    returnUrl: 'https://example.com/success',
  },
});

// 3. 客户端使用 intent.clientPayload.clientSecret 完成支付
// 4. Webhook 自动更新订单状态
```

### 6.2 PAY_AND_SPLIT 模式：Marketplace 购买

```
用户 → createOrder(带参与方) → createPaymentIntent → [支付] → Webhook → 自动分账 → 各方 Settlement 入库
```

```typescript
// 1. 创建订单（带分账参与方）
const order = await commerce({
  action: 'createOrder',
  mode: 'PAY_AND_SPLIT',
  params: {
    amount: 100,
    currency: 'USD',
    merchantId: 'merchant_123',
    productType: 'virtual',
    allocationOverrides: {
      executor: 'agent_seller_456',      // 技能提供方
      referrer: 'agent_recommend_789',   // 推荐该商品的 Agent
    },
  },
});

// 2. 预览分配（可选，给用户确认）
const preview = await commerce({
  action: 'previewAllocation',
  params: {
    amount: 100,
    currency: 'USD',
    productType: 'virtual',
    roles: {
      executor: 'agent_seller_456',
      referrer: 'agent_recommend_789',
    },
  },
});
// preview.allocations = [
//   { recipient: 'agent_seller_456', role: 'executor', amount: 1.54, percentage: 70 },
//   { recipient: 'agent_recommend_789', role: 'referrer', amount: 0.66, percentage: 30 },
//   { recipient: 'platform', role: 'platform', amount: 0.40, ... },
// ]

// 3. 创建支付并完成...
```

### 6.3 多 Agent 协作 + 预算池

```
项目方 → createBudgetPool → fundBudgetPool → [创建多个 Milestone] → [Agent 完成任务]
→ submitMilestone → approveMilestone → releaseBudget → Settlement
```

```typescript
// 1. 创建预算池
const pool = await commerce({
  action: 'createBudgetPool',
  params: {
    projectId: 'project_abc',
    totalBudget: 1000,
    currency: 'USD',
    expiresAt: '2026-03-01T00:00:00Z',
  },
});

// 2. 充值预算池
await commerce({
  action: 'fundBudgetPool',
  params: {
    budgetPoolId: pool.budgetPoolId,
    amount: 1000,
    fundingSource: 'wallet',
    walletAddress: '0x...',
  },
});

// 3. 创建里程碑（任务拆分）
const milestone1 = await commerce({
  action: 'createMilestone',
  params: {
    budgetPoolId: pool.budgetPoolId,
    name: '需求分析与架构设计',
    reservedAmount: 200,
    participants: [
      { agentId: 'agent_architect', address: '0x...', role: 'executor', share: 0.8 },
      { agentId: 'agent_pm', address: '0x...', role: 'referrer', share: 0.2 },
    ],
    approvalType: 'manual',
  },
});

// 4. Agent 提交产出
await commerce({
  action: 'submitMilestone',
  params: {
    milestoneId: milestone1.milestoneId,
    artifacts: [
      { type: 'document', url: 'https://...', hash: '0x...' },
    ],
  },
});

// 5. 审批通过并释放资金
await commerce({
  action: 'approveMilestone',
  params: {
    milestoneId: milestone1.milestoneId,
    reviewNote: 'LGTM',
  },
});

// 6. 自动执行：
// - 从 BudgetPool 扣除 200 USD
// - 按 participants 分配：agent_architect 拿 160, agent_pm 拿 40
// - 生成 Settlement 记录
// - 入账本
```

### 6.4 SPLIT_ONLY 模式：外部订单分佣

```
外部系统订单完成 → createOrder(externalOrderId, SPLIT_ONLY) → applyAllocation → Settlement
```

```typescript
// 外部电商系统已完成交易，金额 500 USD
const order = await commerce({
  action: 'createOrder',
  mode: 'SPLIT_ONLY',
  params: {
    externalOrderId: 'shopify_order_12345',
    amount: 500,
    currency: 'USD',
    merchantId: 'merchant_123',
    productType: 'physical',
    allocationOverrides: {
      promoter: 'agent_bd_001',          // BD 拉来的商户
      referrer: 'agent_influencer_002',  // 带货达人
    },
  },
});

// 直接触发分配（不需要走支付流程）
const settlements = await commerce({
  action: 'getSettlements',
  params: { orderId: order.orderId },
});

// settlements = [
//   { recipient: 'agent_bd_001', role: 'promoter', amount: 0.5, status: 'pending' },
//   { recipient: 'agent_influencer_002', role: 'referrer', amount: 3.3, status: 'pending' },
// ]
```

---

## 7. 与现有代码的集成方案

### 7.1 新增文件结构

```
backend/src/modules/commerce/
├── commerce.module.ts                 # 模块定义
├── commerce.service.ts                # 核心编排服务
├── commerce.controller.ts             # REST API（可选）
├── commerce-mcp.tools.ts              # MCP Tool 定义
├── dto/
│   ├── create-order.dto.ts
│   ├── create-payment-intent.dto.ts
│   ├── allocation-plan.dto.ts
│   └── ...
├── entities/
│   ├── commerce-order.entity.ts       # 扩展现有 Order
│   ├── allocation-plan.entity.ts
│   ├── budget-pool.entity.ts
│   ├── milestone.entity.ts
│   └── commerce-settlement.entity.ts
└── services/
    ├── allocation.service.ts          # 封装 CommissionStrategyV4Service
    ├── budget-pool.service.ts
    ├── milestone.service.ts
    └── commerce-ledger.service.ts     # 封装 LedgerService
```

### 7.2 关键服务封装

```typescript
// commerce.service.ts
@Injectable()
export class CommerceService {
  constructor(
    // 复用现有服务
    private readonly paymentService: PaymentService,
    private readonly stripeConnectService: StripeConnectService,
    private readonly commissionV4Service: CommissionStrategyV4Service,
    private readonly ledgerService: LedgerService,
    private readonly smartRouterService: SmartRouterService,
    
    // 新增服务
    private readonly allocationService: AllocationService,
    private readonly budgetPoolService: BudgetPoolService,
    private readonly milestoneService: MilestoneService,
    
    // 仓库
    @InjectRepository(CommerceOrder)
    private readonly orderRepo: Repository<CommerceOrder>,
  ) {}

  async execute(action: string, mode: CommerceMode, params: any, idempotencyKey?: string) {
    // 幂等检查
    if (idempotencyKey) {
      const existing = await this.checkIdempotency(idempotencyKey);
      if (existing) return existing;
    }

    switch (action) {
      case 'createOrder':
        return this.createOrder(mode, params);
      case 'createPaymentIntent':
        return this.createPaymentIntent(params);
      case 'previewAllocation':
        return this.previewAllocation(params);
      // ... 其他 action
    }
  }

  private async createOrder(mode: CommerceMode, params: CreateOrderParams) {
    // 1. 验证参数
    // 2. 创建订单
    // 3. 绑定/创建 AllocationPlan
    // 4. 如果是 SPLIT_ONLY，直接触发分配计算
    // 5. 返回结果
  }

  private async createPaymentIntent(params: CreatePaymentIntentParams) {
    // 1. 获取订单
    // 2. 调用 SmartRouter 选择最优通道
    // 3. 调用对应 Provider 创建 PaymentIntent
    // 4. 返回 clientPayload
  }
}
```

---

## 8. 实施路线图

### Phase 1: 核心能力（2周）
- [ ] 定义 Entity Schema 并生成 Migration
- [ ] 实现 `CommerceService` 核心编排
- [ ] 封装现有 `PaymentService` 为 PaymentModule
- [ ] 封装现有 `CommissionStrategyV4Service` 为 AllocationService
- [ ] 实现 `createOrder`、`createPaymentIntent`、`previewAllocation`
- [ ] 注册 MCP Tool

### Phase 2: 分账与结算（2周）
- [ ] 实现 `AllocationPlan` CRUD
- [ ] 实现支付成功后的自动分账触发（Webhook）
- [ ] 实现 `Settlement` 状态机
- [ ] 实现 `refundPayment` 及冲正逻辑
- [ ] 集成现有 `LedgerService`

### Phase 3: 预算池与里程碑（2周）
- [ ] 实现 `BudgetPoolService`
- [ ] 实现 `MilestoneService`
- [ ] 实现里程碑验收流程（自动/手动/质量门槛）
- [ ] 实现预算释放与分账联动

### Phase 4: 高级特性（2周）
- [ ] 阶梯分佣规则
- [ ] 多级分佣（N 级推荐）
- [ ] 跨币种结算
- [ ] 争议期与仲裁
- [ ] Dashboard & 报表

---

## 9. 附录

### 9.1 与 V4.0 分账协议的对应关系

| V4.0 概念 | Commerce Skill 对应 |
|-----------|---------------------|
| `channelFee` | `AllocationPlan.rateProfile.channelRate` |
| `platformFee` | `AllocationPlan.rateProfile.platformRate` |
| `incentivePool` | `AllocationPlan.rateProfile.poolRate` |
| `promoter` | `AllocationPlan.roles.promoter` |
| `executor` | `AllocationPlan.roles.executor` |
| `referrer` | `AllocationPlan.roles.referrer` |
| `SplitResult` | `Settlement` 记录集合 |
| `FundPath` | `LedgerEntry` |

### 9.2 幂等与冲正策略

| 场景 | 幂等键生成规则 | 冲正策略 |
|------|--------------|---------|
| 创建订单 | `order:{externalOrderId}` 或 UUID | 不可冲正，只能取消 |
| 创建支付 | `payment:{orderId}:{attempt}` | 调用 Provider 退款 |
| 分配计算 | `allocation:{orderId}:{planVersion}` | 重新计算 |
| 结算打款 | `settlement:{settlementId}` | 生成反向 Settlement |
| 里程碑释放 | `release:{milestoneId}` | 生成反向 LedgerEntry |

### 9.3 错误码定义

| 错误码 | 含义 |
|--------|------|
| `COMMERCE_ORDER_NOT_FOUND` | 订单不存在 |
| `COMMERCE_INVALID_MODE` | 模式与操作不匹配 |
| `COMMERCE_INSUFFICIENT_BUDGET` | 预算池余额不足 |
| `COMMERCE_MILESTONE_NOT_APPROVED` | 里程碑未通过审批 |
| `COMMERCE_PAYMENT_FAILED` | 支付失败 |
| `COMMERCE_ALLOCATION_LOCKED` | 分配计划已锁定（已有支付） |
| `COMMERCE_IDEMPOTENCY_CONFLICT` | 幂等键冲突 |

---

## 10. 合约改动方案

### 10.1 目标
- 支持 **多级分佣**（N 级）
- 支持 **用户自定义分佣比例、分佣层级**
- 支持 **预算池/里程碑分配**
- 保持与现有 `Commission.sol` 向后兼容

### 10.2 合约改造策略
**方案：新增 V2 合约 + 保留 V1**
- 保留现有 `Commission.sol` 与 `ArnFeeSplitter.sol`
- 新增 `CommissionV2.sol` + `BudgetPool.sol` + `Milestone.sol`
- 新合约接受 **动态分佣计划（SplitPlan）**
- 旧合约继续支持固定 7:3 和平台费逻辑

### 10.3 CommissionV2 关键结构
```solidity
struct SplitRule {
  address recipient;
  uint16 shareBps; // 0-10000
  bytes32 role;    // executor/referrer/l1/l2/custom
  bool active;
}

struct SplitPlan {
  bytes32 planId;
  address owner;
  SplitRule[] rules;     // 支持 N 级
  bool active;
}

// 费率配置（独立于 SplitPlan）
struct FeeConfig {
  uint16 onrampFeeBps;   // 法币入金费率，默认 10 (0.1%)
  uint16 offrampFeeBps;  // 法币出金费率，默认 10 (0.1%)
  uint16 splitFeeBps;    // 分佣费率，默认 30 (0.3%)
  uint256 minSplitFee;   // 最低分佣费，默认 0.1 USDC (100000)
}
```

### 10.4 新费率规则（合约实现）
```solidity
function calculateFees(
  uint256 amount,
  bool usesOnramp,
  bool usesOfframp,
  bool usesSplit
) public view returns (uint256 totalFee) {
  // 纯 Crypto 钱包支付：0 费用
  if (!usesOnramp && !usesOfframp && !usesSplit) {
    return 0;
  }
  
  // 按功能叠加
  if (usesOnramp) totalFee += amount * feeConfig.onrampFeeBps / 10000;
  if (usesOfframp) totalFee += amount * feeConfig.offrampFeeBps / 10000;
  if (usesSplit) {
    uint256 splitFee = amount * feeConfig.splitFeeBps / 10000;
    totalFee += splitFee < feeConfig.minSplitFee ? feeConfig.minSplitFee : splitFee;
  }
}
```

### 10.5 BudgetPool + Milestone 合约
- `BudgetPool.sol`：资金托管、分阶段释放、预算预留
- `Milestone.sol`：里程碑验收、条件释放（hash/audit/人工）
- 支持 **释放到 SplitPlan** 或直接收款人

### 10.6 兼容性要求
- V1：继续支持 `quickPaySplit()` / `walletSplit()` / `providerFiatToCryptoSplit()`
- V2：新增 `executeSplit(orderId, planId, amount)`
- 事件统一输出，后端可做双协议监听

---

## 11. 后端改动方案

### 11.1 Commerce 模块（核心编排）
新增 `backend/src/modules/commerce`：
- `CommerceService`：统一入口，编排支付/分佣/预算池
- `SplitPlanService`：管理分佣计划
- `BudgetPoolService`：预算池管理
- `MilestoneService`：里程碑管理
- `SettlementService`：结算与冲正

### 11.2 分佣与预算 API
- `POST /commerce/split-plans` 创建分佣计划
- `POST /commerce/split-plans/:id/preview` 预览分配
- `POST /commerce/budget-pools` 创建预算池
- `POST /commerce/budget-pools/:id/reserve` 预留预算
- `POST /commerce/milestones/:id/release` 释放预算

### 11.3 合约监听与对账
- 监听 `Commission`/`CommissionV2` 事件
- 统一写入 `Ledger` 与 `Settlement`
- 支持 **退款/拒付冲正**

---

## 12. 前端融合方案

### 12.1 融入工作台（Workbench）
**原则：能融入就融入，不做独立后台**

#### 商家模式（Merchant）
位置：`财务中心 (finance)`
- **分佣规则**（`commission-plans`）
- **预算池**（`budget-pools`）
- **分账结算**（`settlements`）

#### 开发者模式（Developer）
位置：`收益中心 (revenue)`
- **分润配置**（`commission-plans`）
- **预算池**（`budget-pools`）

### 12.2 现有组件融合点
- `MerchantModuleV2`：新增 finance 子页
- `DeveloperModuleV2`：新增 revenue 子页
- 复用现有卡片/表格样式，不新增独立路由

---

## 13. SDK 设计

### 13.1 JS SDK（优先）
```ts
agentrix.commerce.createSplitPlan({ ... })
agentrix.commerce.previewSplit({ ... })
agentrix.commerce.createBudgetPool({ ... })
agentrix.commerce.reserveBudget({ ... })
agentrix.commerce.releaseBudget({ ... })
```

### 13.2 SDK 必须能力
- 支付 + 分佣一体化调用
- 预算池 + 里程碑 API
- Webhook 验签工具

---

## 14. Skill 生成与注册

### 14.1 Skill 生成流程
1. 商家/开发者在工作台配置 **分佣计划** 与 **定价**
2. 系统生成 `commerce_skill.json`
3. 自动注册到 MCP Tool Registry

### 14.2 Skill Manifest 样例
```json
{
  "name": "commerce",
  "version": "1.0.0",
  "pricing": {
    "baseFeeBps": 10,
    "splitFeeBps": 20
  },
  "capabilities": ["pay", "split", "budget_pool"]
}
```

---

## 15. 分批执行计划

### Batch 1 ✅ 已完成
- [x] PRD 更新（本次完成）
- [x] 工作台新增分佣/预算池入口（前端占位视图）
- [x] Commerce 模块最小骨架（后端目录结构 + 占位 service）

### Batch 2 ✅ 已完成
- [x] `SplitPlanService` + API + DB Schema
- [x] `BudgetPoolService` + API + DB Schema
- [x] Workbench 前端接入真实数据 (SplitPlansPanel, BudgetPoolsPanel)

### Batch 3 ✅ 已完成
- [x] `CommissionV2.sol` - 统一分润结算合约
- [x] `BudgetPool.sol` - 预算池与里程碑管理合约
- [x] 合约事件监听与 Settlement 联动（事件定义完成）

### Batch 4 ✅ 已完成
- [x] SDK 扩展（`sdk-js/src/resources/commerce.ts`）
- [x] MCP Tool 注册（`commerce-mcp.tools.ts` 5个工具）
- [x] 集成到 MCP Service（`mcp.service.ts`）

---

## 16. 开发产物清单

### 后端文件
| 文件 | 说明 |
|------|------|
| `backend/src/entities/split-plan.entity.ts` | SplitPlan 实体 |
| `backend/src/entities/budget-pool.entity.ts` | BudgetPool 实体 |
| `backend/src/entities/milestone.entity.ts` | Milestone 实体 |
| `backend/src/modules/commerce/dto/*.ts` | DTOs |
| `backend/src/modules/commerce/split-plan.service.ts` | 分润方案服务 |
| `backend/src/modules/commerce/budget-pool.service.ts` | 预算池服务 |
| `backend/src/modules/commerce/commerce.controller.ts` | REST API |
| `backend/src/modules/commerce/commerce-mcp.tools.ts` | MCP 工具定义 |

### 前端文件
| 文件 | 说明 |
|------|------|
| `frontend/lib/api/commerce.api.ts` | API 客户端 |
| `frontend/components/agent/workspace/commerce/SplitPlansPanel.tsx` | 分润方案面板 |
| `frontend/components/agent/workspace/commerce/BudgetPoolsPanel.tsx` | 预算池面板 |

### 智能合约
| 文件 | 说明 |
|------|------|
| `contract/contracts/CommissionV2.sol` | 统一分润合约 |
| `contract/contracts/BudgetPool.sol` | 预算池合约 |

### SDK
| 文件 | 说明 |
|------|------|
| `sdk-js/src/resources/commerce.ts` | Commerce Resource |
