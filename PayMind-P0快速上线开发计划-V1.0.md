# PayMind P0快速上线开发计划 V1.0

**制定日期**: 2025-01-XX  
**目标**: 快速完成P0核心功能，推向市场  
**预计时间**: 8-10周

---

## 🎯 P0核心功能清单

### ✅ 必须完成的功能（MVP）

| 模块 | 功能 | 优先级 | 预计时间 |
|------|------|--------|---------|
| **统一支付** | 手续费估算 | P0 | 1周 |
| **统一支付** | 风险评分基础版 | P0 | 1周 |
| **统一支付** | QuickPay增强 | P0 | 1周 |
| **个人Agent** | 支付助手（KYC复用+商家可信度） | P0 | 1.5周 |
| **个人Agent** | 消费管理（订阅识别+预算） | P0 | 1.5周 |
| **商家Agent** | 订单处理自动化（Webhook+自动发货） | P0 | 2周 |
| **商家Agent** | 财务结算（多链账户+自动对账） | P0 | 2周 |
| **联盟生态** | 推广分成前端 | P0 | 1.5周 |
| **联盟生态** | 多级分佣系统 | P0 | 1.5周 |
| **Agent Runtime** | Memory系统基础版 | P0 | 1周 |
| **Agent Runtime** | Skills系统基础版 | P0 | 1周 |

**总计**: 14.5周（可并行开发，实际约8-10周）

---

## 📅 8周开发计划（并行开发）

### Week 1-2: 统一支付系统完善

#### Week 1: 手续费估算 + 风险评分基础版

**任务清单**:

1. **手续费估算服务** (3天)
   - [ ] 创建 `FeeEstimationService`
   - [ ] 实现Stripe手续费计算
   - [ ] 实现钱包Gas费估算（EVM、Solana）
   - [ ] 实现X402手续费计算
   - [ ] 实现跨链桥接费估算
   - [ ] 前端展示手续费明细
   - 位置：`backend/src/modules/payment/fee-estimation.service.ts`

2. **风险评分基础版** (2天)
   - [ ] 创建 `RiskAssessmentService`
   - [ ] 实现基础风险评分算法（金额、频率、KYC）
   - [ ] 高风险交易拦截
   - [ ] 前端风险提示
   - 位置：`backend/src/modules/payment/risk-assessment.service.ts`

**交付物**:
- ✅ 手续费估算API
- ✅ 风险评分API
- ✅ 前端手续费展示
- ✅ 前端风险提示

#### Week 2: QuickPay增强

**任务清单**:

1. **QuickPay自动选择** (2天)
   - [ ] 优化QuickPay选择逻辑
   - [ ] 自动选择最优授权方式
   - [ ] 优先使用X402（如果已授权）
   - 位置：`backend/src/modules/payment/payment.service.ts`

2. **QuickPay前端界面** (3天)
   - [ ] 授权管理页面
   - [ ] 授权状态展示
   - [ ] 一键授权流程
   - 位置：`paymindfrontend/pages/app/user/quick-pay.tsx`

**交付物**:
- ✅ QuickPay自动选择逻辑
- ✅ QuickPay管理界面

---

### Week 3-4: 个人Agent核心功能

#### Week 3: 支付助手

**任务清单**:

1. **KYC复用服务** (2天)
   - [ ] 创建 `KYCReuseService`
   - [ ] KYC状态查询
   - [ ] KYC复用判断
   - [ ] 前端KYC状态展示
   - 位置：`backend/src/modules/user-agent/kyc-reuse.service.ts`

2. **商家可信度服务** (2天)
   - [ ] 创建 `MerchantTrustService`
   - [ ] 商家信誉评分查询
   - [ ] 交易历史统计
   - [ ] 前端信誉展示
   - 位置：`backend/src/modules/user-agent/merchant-trust.service.ts`

3. **自动填写支付信息** (1天)
   - [ ] 支付信息记忆服务
   - [ ] 自动填充逻辑
   - [ ] 前端自动填充
   - 位置：`backend/src/modules/user-agent/payment-memory.service.ts`

**交付物**:
- ✅ KYC复用功能
- ✅ 商家可信度展示
- ✅ 自动填写支付信息

#### Week 4: 消费管理

**任务清单**:

1. **订阅识别服务** (2天)
   - [ ] 创建 `SubscriptionDetectorService`
   - [ ] 定期交易识别算法
   - [ ] 订阅分类
   - [ ] 订阅管理前端
   - 位置：`backend/src/modules/user-agent/subscription-detector.service.ts`

2. **预算管理服务** (2天)
   - [ ] 创建 `BudgetManagerService`
   - [ ] 预算设置和查询
   - [ ] 预算使用统计
   - [ ] 预算超额提醒
   - [ ] 预算管理前端
   - 位置：`backend/src/modules/user-agent/budget-manager.service.ts`

3. **交易分类基础版** (1天)
   - [ ] 创建 `TransactionClassifierService`
   - [ ] 规则引擎分类（基础版）
   - [ ] 分类账本前端
   - 位置：`backend/src/modules/user-agent/transaction-classifier.service.ts`

**交付物**:
- ✅ 订阅识别和管理
- ✅ 预算管理
- ✅ 交易分类基础版

---

### Week 5-6: 商家Agent核心功能

#### Week 5: 订单处理自动化

**任务清单**:

1. **Webhook自动化** (2天)
   - [ ] 增强 `WebhookHandlerService`
   - [ ] 自动处理订单Webhook
   - [ ] 错误重试机制
   - [ ] Webhook配置管理前端
   - 位置：`backend/src/modules/merchant/webhook-handler.service.ts`

2. **自动发货服务** (2天)
   - [ ] 创建 `AutoFulfillmentService`
   - [ ] 支付成功后自动发货
   - [ ] 虚拟商品自动核销
   - [ ] 发货管理前端
   - 位置：`backend/src/modules/merchant/auto-fulfillment.service.ts`

3. **自动核销服务** (1天)
   - [ ] 创建 `AutoRedemptionService`
   - [ ] 会员卡自动开通
   - [ ] 充值自动到账
   - 位置：`backend/src/modules/merchant/auto-redemption.service.ts`

**交付物**:
- ✅ Webhook自动化
- ✅ 自动发货
- ✅ 自动核销

#### Week 6: 财务结算

**任务清单**:

1. **多链统一账户** (2天)
   - [ ] 创建 `MultiChainAccountService`
   - [ ] 多链账户聚合
   - [ ] 统一余额查询
   - [ ] 账户管理前端
   - 位置：`backend/src/modules/merchant/multi-chain-account.service.ts`

2. **自动对账服务** (2天)
   - [ ] 创建 `ReconciliationService`
   - [ ] 自动对账逻辑（T+1）
   - [ ] 对账差异检测
   - [ ] 对账前端
   - 位置：`backend/src/modules/merchant/reconciliation.service.ts`

3. **结算规则配置** (1天)
   - [ ] 创建 `SettlementRulesService`
   - [ ] 结算周期配置
   - [ ] 结算配置前端
   - 位置：`backend/src/modules/merchant/settlement-rules.service.ts`

**交付物**:
- ✅ 多链统一账户
- ✅ 自动对账
- ✅ 结算规则配置

---

### Week 7: 联盟生态完善

#### Week 7: 推广分成前端 + 多级分佣

**任务清单**:

1. **推广分成前端** (2天)
   - [ ] 推广面板页面
   - [ ] 分成记录查询
   - [ ] 推广统计图表
   - 位置：`paymindfrontend/pages/app/agent/referral.tsx`

2. **多级分佣系统** (2天)
   - [ ] 创建 `MultiLevelCommissionService`
   - [ ] 推荐Agent + 执行Agent分佣计算
   - [ ] 分佣前端展示
   - 位置：`backend/src/modules/commission/multi-level-commission.service.ts`

3. **推广链接管理** (1天)
   - [ ] 推广链接生成
   - [ ] 推广链接统计
   - 位置：`paymindfrontend/pages/app/agent/referral-links.tsx`

**交付物**:
- ✅ 推广分成前端
- ✅ 多级分佣系统
- ✅ 推广链接管理

---

### Week 8: Agent Runtime基础 + 测试

#### Week 8: Memory系统 + Skills系统 + 测试

**任务清单**:

1. **Memory系统基础版** (2天)
   - [ ] 创建 `UserPreferencesService`
   - [ ] 用户偏好存储
   - [ ] 会话摘要存储
   - 位置：`backend/src/modules/agent/memory/`

2. **Skills系统基础版** (2天)
   - [ ] 创建 `SkillRegistryService`
   - [ ] Skills注册机制
   - [ ] 默认Skills实现（支付、订单查询、商品搜索）
   - 位置：`backend/src/modules/agent/skills/`

3. **集成测试** (1天)
   - [ ] 支付流程测试
   - [ ] Agent对话测试
   - [ ] 订单处理测试

**交付物**:
- ✅ Memory系统基础版
- ✅ Skills系统基础版
- ✅ 集成测试通过

---

## 📋 详细任务分解

### 1. 手续费估算服务

**文件**: `backend/src/modules/payment/fee-estimation.service.ts`

```typescript
@Injectable()
export class FeeEstimationService {
  // 估算Stripe手续费
  async estimateStripeFee(amount: number, currency: string): Promise<FeeEstimate>
  
  // 估算钱包Gas费
  async estimateWalletGasFee(
    chain: 'ethereum' | 'solana' | 'bsc' | 'polygon',
    amount: number
  ): Promise<FeeEstimate>
  
  // 估算X402手续费
  async estimateX402Fee(amount: number): Promise<FeeEstimate>
  
  // 估算跨链桥接费
  async estimateBridgeFee(
    fromChain: string,
    toChain: string,
    amount: number
  ): Promise<FeeEstimate>
  
  // 获取所有支付方式的总成本
  async getAllPaymentCosts(
    amount: number,
    currency: string
  ): Promise<PaymentCostComparison[]>
}
```

**数据库迁移**:
```sql
CREATE TABLE fee_estimations (
  id UUID PRIMARY KEY,
  payment_method VARCHAR(50),
  amount DECIMAL(18,2),
  currency VARCHAR(3),
  estimated_fee DECIMAL(18,2),
  fee_breakdown JSONB,
  created_at TIMESTAMP
);
```

### 2. 风险评分服务

**文件**: `backend/src/modules/payment/risk-assessment.service.ts`

```typescript
@Injectable()
export class RiskAssessmentService {
  // 评估交易风险
  async assessRisk(
    userId: string,
    amount: number,
    paymentMethod: string,
    metadata?: any
  ): Promise<RiskAssessment> {
    // 1. 金额风险（大额交易风险高）
    // 2. 频率风险（高频交易风险高）
    // 3. KYC风险（未KYC风险高）
    // 4. 历史风险（历史异常交易风险高）
    // 5. IP风险（异常IP风险高）
    
    // 综合评分 0-100
    // < 30: 低风险，自动通过
    // 30-70: 中风险，需要二次确认
    // > 70: 高风险，拒绝或人工审核
  }
}
```

**数据库迁移**:
```sql
CREATE TABLE risk_assessments (
  id UUID PRIMARY KEY,
  payment_id UUID,
  risk_score DECIMAL(5,2),
  risk_factors JSONB,
  decision VARCHAR(50), -- 'approve', 'review', 'reject'
  created_at TIMESTAMP
);
```

### 3. KYC复用服务

**文件**: `backend/src/modules/user-agent/kyc-reuse.service.ts`

```typescript
@Injectable()
export class KYCReuseService {
  // 检查KYC是否可以复用
  async canReuseKYC(
    userId: string,
    merchantId: string
  ): Promise<{
    canReuse: boolean;
    userKYCLevel: string;
    merchantRequirement: string;
  }>
  
  // 获取用户KYC状态
  async getUserKYCStatus(userId: string): Promise<KYCStatus>
  
  // 获取商户KYC要求
  async getMerchantKYCRequirement(merchantId: string): Promise<KYCRequirement>
}
```

### 4. 商家可信度服务

**文件**: `backend/src/modules/user-agent/merchant-trust.service.ts`

```typescript
@Injectable()
export class MerchantTrustService {
  // 获取商家信誉评分
  async getTrustScore(merchantId: string): Promise<TrustScore> {
    // 1. 交易历史统计
    // 2. 评分统计
    // 3. 投诉记录
    // 4. 退款率
    // 综合评分 0-100
  }
  
  // 获取商家交易统计
  async getMerchantStats(merchantId: string): Promise<MerchantStats>
}
```

### 5. 订阅识别服务

**文件**: `backend/src/modules/user-agent/subscription-detector.service.ts`

```typescript
@Injectable()
export class SubscriptionDetectorService {
  // 识别订阅交易
  async detectSubscriptions(
    userId: string,
    transactions: Transaction[]
  ): Promise<Subscription[]> {
    // 规则：
    // 1. 定期交易（每月/每年相同日期）
    // 2. 相同金额
    // 3. 相同商户
    // 4. 交易描述包含订阅关键词
  }
  
  // 订阅到期提醒
  async checkUpcomingRenewals(userId: string): Promise<Subscription[]>
}
```

**数据库迁移**:
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID,
  merchant_name VARCHAR(255),
  amount DECIMAL(18,2),
  currency VARCHAR(3),
  frequency VARCHAR(50), -- 'monthly', 'yearly'
  next_billing_date DATE,
  status VARCHAR(50), -- 'active', 'cancelled'
  created_at TIMESTAMP
);
```

### 6. 预算管理服务

**文件**: `backend/src/modules/user-agent/budget-manager.service.ts`

```typescript
@Injectable()
export class BudgetManagerService {
  // 设置预算
  async setBudget(
    userId: string,
    category: string,
    amount: number,
    period: 'monthly' | 'yearly'
  ): Promise<Budget>
  
  // 检查预算
  async checkBudget(
    userId: string,
    category: string,
    amount: number
  ): Promise<BudgetCheckResult>
  
  // 获取预算使用情况
  async getBudgetUsage(
    userId: string,
    category?: string
  ): Promise<BudgetUsage[]>
}
```

**数据库迁移**:
```sql
CREATE TABLE budgets (
  id UUID PRIMARY KEY,
  user_id UUID,
  category VARCHAR(100),
  amount DECIMAL(18,2),
  period VARCHAR(50), -- 'monthly', 'yearly'
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP
);
```

### 7. 自动发货服务

**文件**: `backend/src/modules/merchant/auto-fulfillment.service.ts`

```typescript
@Injectable()
export class AutoFulfillmentService {
  // 自动发货
  async autoFulfill(orderId: string): Promise<void> {
    // 1. 检查订单状态（已支付）
    // 2. 检查商品类型
    // 3. 虚拟商品：自动核销
    // 4. 实物商品：生成发货单
  }
  
  // 虚拟商品核销
  async redeemVirtualProduct(orderId: string): Promise<void>
  
  // 生成发货单
  async generateShippingLabel(orderId: string): Promise<ShippingLabel>
}
```

### 8. 多链统一账户服务

**文件**: `backend/src/modules/merchant/multi-chain-account.service.ts`

```typescript
@Injectable()
export class MultiChainAccountService {
  // 聚合多链账户
  async aggregateAccounts(merchantId: string): Promise<MultiChainAccount[]> {
    // 1. 查询所有链的收款地址
    // 2. 查询各链余额
    // 3. 统一展示
  }
  
  // 查询统一余额
  async getTotalBalance(
    merchantId: string,
    currency: string
  ): Promise<number>
}
```

**数据库迁移**:
```sql
CREATE TABLE merchant_multi_chain_accounts (
  id UUID PRIMARY KEY,
  merchant_id UUID,
  chain VARCHAR(50),
  address VARCHAR(255),
  balance DECIMAL(18,2),
  currency VARCHAR(3),
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP
);
```

### 9. 多级分佣服务

**文件**: `backend/src/modules/commission/multi-level-commission.service.ts`

```typescript
@Injectable()
export class MultiLevelCommissionService {
  // 计算多级分佣
  async calculateMultiLevelCommission(
    paymentId: string,
    referralAgentId?: string,
    executionAgentId?: string
  ): Promise<MultiLevelCommission> {
    // 1. 推荐Agent分成（商品佣金率 × 30%）
    // 2. 执行Agent分成（商品佣金率 × 70% 或 Agent基础分成）
    // 3. PayMind平台费
  }
  
  // 记录分佣
  async recordCommission(commission: MultiLevelCommission): Promise<void>
}
```

**数据库迁移**:
```sql
CREATE TABLE multi_level_commissions (
  id UUID PRIMARY KEY,
  payment_id UUID,
  referral_agent_id UUID,
  execution_agent_id UUID,
  referral_commission DECIMAL(18,2),
  execution_commission DECIMAL(18,2),
  total_commission DECIMAL(18,2),
  created_at TIMESTAMP
);
```

---

## 🚀 开发流程

### 每日站会
- 每天上午10:00
- 汇报昨日进度
- 今日计划
- 阻塞问题

### 周会
- 每周五下午
- 本周完成情况
- 下周计划
- 风险识别

### 代码审查
- 所有代码必须经过审查
- 关键功能需要2人审查
- 使用GitHub Pull Request

### 测试要求
- 每个功能必须包含单元测试
- 关键流程必须有集成测试
- 覆盖率要求：> 70%

---

## 📊 进度跟踪

### Week 1-2 检查点
- [ ] 手续费估算完成
- [ ] 风险评分完成
- [ ] QuickPay增强完成

### Week 3-4 检查点
- [ ] 支付助手完成
- [ ] 消费管理完成

### Week 5-6 检查点
- [ ] 订单处理自动化完成
- [ ] 财务结算完成

### Week 7 检查点
- [ ] 推广分成前端完成
- [ ] 多级分佣完成

### Week 8 检查点
- [ ] Memory系统完成
- [ ] Skills系统完成
- [ ] 集成测试通过

---

## ⚠️ 风险与应对

### 风险1: 开发时间超期
**应对**: 
- 优先完成核心功能
- 非核心功能可以简化实现
- 必要时调整功能范围

### 风险2: 技术难点
**应对**:
- 提前技术调研
- 准备备选方案
- 寻求外部支持

### 风险3: 测试不充分
**应对**:
- 持续集成测试
- 关键功能重点测试
- 上线前完整回归测试

---

## ✅ 上线准备清单

### 技术准备
- [ ] 所有P0功能完成
- [ ] 单元测试覆盖率 > 70%
- [ ] 集成测试通过
- [ ] 性能测试通过
- [ ] 安全审计完成

### 文档准备
- [ ] API文档完整
- [ ] 用户使用手册
- [ ] 商户接入指南
- [ ] 开发者文档

### 运营准备
- [ ] 上线公告
- [ ] 用户通知
- [ ] 客服培训
- [ ] 监控告警配置

---

**制定日期**: 2025-01-XX  
**审查**: 技术团队、产品团队  
**目标**: 8周内完成P0功能，快速推向市场

