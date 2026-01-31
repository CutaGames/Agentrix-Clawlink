# Agentrix Commerce Skill 产品设计方案
## 支付 + 分佣一体化 MCP Skill

**版本**: 2.0  
**日期**: 2026年1月31日  
**状态**: Draft  

---

# 目录

1. [产品概述](#1-产品概述)
2. [费率结构](#2-费率结构)
3. [用户画像与场景](#3-用户画像与场景)
4. [合约改动方案](#4-合约改动方案)
5. [后端改动方案](#5-后端改动方案)
6. [前端融合方案](#6-前端融合方案)
7. [SDK 设计](#7-sdk-设计)
8. [Skill 生成与注册](#8-skill-生成与注册)
9. [实施路线图](#9-实施路线图)

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

## 2. 与现有系统的关系

### 2.1 复用的核心模块

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

### 2.2 现有代码入口（复用）

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

## 3. 数据模型 (Schema)

### 3.1 核心实体

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

## 4. MCP Tool 定义

### 4.1 统一入口

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

### 4.2 核心 Action 参数详解

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

## 5. 工作流示例

### 5.1 PAY_ONLY 模式：简单购买

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

### 5.2 PAY_AND_SPLIT 模式：Marketplace 购买

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

### 5.3 多 Agent 协作 + 预算池

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

### 5.4 SPLIT_ONLY 模式：外部订单分佣

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

## 6. 与现有代码的集成方案

### 6.1 新增文件结构

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

### 6.2 关键服务封装

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

## 7. 实施路线图

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

## 8. 附录

### 8.1 与 V4.0 分账协议的对应关系

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

### 8.2 幂等与冲正策略

| 场景 | 幂等键生成规则 | 冲正策略 |
|------|--------------|---------|
| 创建订单 | `order:{externalOrderId}` 或 UUID | 不可冲正，只能取消 |
| 创建支付 | `payment:{orderId}:{attempt}` | 调用 Provider 退款 |
| 分配计算 | `allocation:{orderId}:{planVersion}` | 重新计算 |
| 结算打款 | `settlement:{settlementId}` | 生成反向 Settlement |
| 里程碑释放 | `release:{milestoneId}` | 生成反向 LedgerEntry |

### 8.3 错误码定义

| 错误码 | 含义 |
|--------|------|
| `COMMERCE_ORDER_NOT_FOUND` | 订单不存在 |
| `COMMERCE_INVALID_MODE` | 模式与操作不匹配 |
| `COMMERCE_INSUFFICIENT_BUDGET` | 预算池余额不足 |
| `COMMERCE_MILESTONE_NOT_APPROVED` | 里程碑未通过审批 |
| `COMMERCE_PAYMENT_FAILED` | 支付失败 |
| `COMMERCE_ALLOCATION_LOCKED` | 分配计划已锁定（已有支付） |
| `COMMERCE_IDEMPOTENCY_CONFLICT` | 幂等键冲突 |
