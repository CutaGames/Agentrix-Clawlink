# PayMind P0前端开发指南

**创建日期**: 2025-01-XX  
**状态**: 开发中

---

## 📋 已完成

### API客户端
- ✅ `lib/api/user-agent.api.ts` - 个人Agent API客户端
- ✅ `lib/api/payment.api.ts` - 支付API增强（手续费估算、风险评分）

---

## 🚧 待开发页面

### 个人Agent页面

#### 1. 预算管理页面
**路径**: `pages/app/user/budgets.tsx`
**功能**:
- 创建预算（金额、周期、分类）
- 预算列表展示
- 预算使用情况图表
- 预算超额提醒

**API调用**:
```typescript
import { userAgentApi } from '@/lib/api/user-agent.api';

// 创建预算
await userAgentApi.createBudget({
  amount: 1000,
  currency: 'USD',
  period: 'monthly',
  category: 'shopping',
});

// 获取预算列表
const budgets = await userAgentApi.getBudgets();
```

#### 2. 订阅管理页面
**路径**: `pages/app/user/subscriptions.tsx` (已存在，需要增强)
**功能**:
- 显示识别出的订阅
- 订阅详情（金额、周期、下次扣款日期）
- 订阅管理（暂停/取消）

**API调用**:
```typescript
const subscriptions = await userAgentApi.getSubscriptions();
```

#### 3. 交易分类页面
**路径**: `pages/app/user/transaction-classification.tsx`
**功能**:
- 交易分类展示
- 分类统计图表
- 手动分类编辑

**API调用**:
```typescript
// 分类交易
const classification = await userAgentApi.classifyTransaction(paymentId);

// 获取分类统计
const stats = await userAgentApi.getCategoryStatistics();
```

#### 4. 商家可信度展示
**路径**: 集成到支付流程中
**功能**:
- 在支付页面显示商家可信度评分
- 显示交易统计信息

**API调用**:
```typescript
const trustScore = await userAgentApi.getMerchantTrust(merchantId);
```

---

### 商家Agent页面

#### 1. Webhook配置页面
**路径**: `pages/app/merchant/webhooks.tsx` (已存在，需要增强)
**功能**:
- Webhook URL配置
- 事件订阅管理
- Webhook测试工具
- Webhook日志查看

#### 2. 发货管理页面
**路径**: `pages/app/merchant/fulfillment.tsx`
**功能**:
- 发货记录列表
- 批量发货
- 发货单打印
- 物流跟踪

#### 3. 多链账户页面
**路径**: `pages/app/merchant/multi-chain-accounts.tsx`
**功能**:
- 多链账户展示
- 账户余额统计
- 账户管理

#### 4. 对账页面
**路径**: `pages/app/merchant/reconciliation.tsx`
**功能**:
- 对账记录查询
- 对账差异展示
- 对账报表下载

#### 5. 结算配置页面
**路径**: `pages/app/merchant/settlement-config.tsx`
**功能**:
- 结算规则设置
- 结算历史查询
- 结算状态跟踪

---

### 支付流程增强

#### 1. 手续费展示
**位置**: `components/payment/UserFriendlyPaymentModalV2.tsx`
**功能**:
- 显示各支付方式的手续费
- 显示总成本对比
- 实时更新手续费

**实现**:
```typescript
import { paymentApi } from '@/lib/api/payment.api';

// 估算手续费
const feeEstimate = await paymentApi.estimateFee({
  amount: 100,
  currency: 'USD',
  paymentMethod: 'stripe',
});

// 对比所有支付方式
const costs = await paymentApi.compareCosts({
  amount: 100,
  currency: 'USD',
});
```

#### 2. 风险提示
**位置**: `components/payment/UserFriendlyPaymentModalV2.tsx`
**功能**:
- 显示风险评估结果
- 高风险交易警告
- 需要二次确认提示

**实现**:
```typescript
const riskAssessment = await paymentApi.assessRisk({
  amount: 100,
  paymentMethod: 'stripe',
});
```

---

## 🎨 UI组件建议

### 1. BudgetCard组件
```typescript
// components/user/BudgetCard.tsx
interface BudgetCardProps {
  budget: Budget;
  onEdit?: () => void;
  onDelete?: () => void;
}
```

### 2. SubscriptionCard组件
```typescript
// components/user/SubscriptionCard.tsx
interface SubscriptionCardProps {
  subscription: Subscription;
  onPause?: () => void;
  onCancel?: () => void;
}
```

### 3. MerchantTrustBadge组件
```typescript
// components/payment/MerchantTrustBadge.tsx
interface MerchantTrustBadgeProps {
  merchantId: string;
  showDetails?: boolean;
}
```

### 4. FeeComparisonTable组件
```typescript
// components/payment/FeeComparisonTable.tsx
interface FeeComparisonTableProps {
  costs: PaymentCost[];
  onSelect?: (method: string) => void;
}
```

---

## 📝 开发步骤

1. **创建API客户端** ✅ 已完成
2. **创建基础页面组件**
3. **集成到现有页面**
4. **添加UI组件**
5. **测试和优化**

---

**完成日期**: TBD  
**开发者**: TBD

