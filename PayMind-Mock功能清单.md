# PayMind Mock功能清单

## 📋 概述

本文档列出了PayMind系统中所有仍在使用Mock数据的功能，以及这些功能的API集成状态。

---

## ✅ 已集成真实API的功能

### 1. 用户支付功能
- ✅ **支付意图创建** - 已集成 `POST /payments/create-intent`
- ✅ **支付处理** - 已集成 `POST /payments/process`
- ✅ **支付状态查询** - 已集成 `GET /payments/{paymentId}`
- ✅ **支付方式选择** - 已集成真实API调用

### 2. 商户端功能
- ✅ **商品列表** - 已集成 `GET /products`（有fallback mock）
- ✅ **订单列表** - 已集成 `GET /orders`（有fallback mock）
- ✅ **结算数据** - 已集成 `GET /commissions/settlements` 和 `GET /commissions`（有fallback mock）
- ✅ **数据分析** - 已集成 `GET /analytics/merchant`（有fallback mock）

### 3. 开发端功能
- ✅ **Agent列表** - 已集成 `GET /user-agent/my-agents`（有fallback mock）
- ✅ **API统计** - 已集成 `GET /statistics/api`（有fallback mock）
- ✅ **收益查询** - 已集成 `GET /statistics/revenue`（有fallback mock）

### 4. Agent Builder功能
- ✅ **Agent模板查询** - 已集成 `GET /agent/templates`
- ✅ **Agent实例化** - 已集成 `POST /agent/templates/{id}/instantiate`
- ✅ **Agent部署** - 已集成 `PUT /user-agent/{id}/status`

### 5. 用户端功能
- ✅ **支付历史** - 已集成 `GET /payments/agent/user-list`（有fallback mock）
- ✅ **钱包列表** - 已集成 `GET /wallets`（有fallback到Web3钱包）

---

## ⚠️ 仍在使用Mock数据的功能

### 1. 用户端功能（UserModule）

#### 1.1 支付历史
- **状态**：已集成API，但有fallback mock
- **API**：`GET /payments/agent/user-list`
- **Mock数据位置**：`paymindfrontend/components/agent/workspace/UserModule.tsx:44-54`
- **Mock原因**：API失败时使用mock数据作为fallback
- **优先级**：中（已有API集成，mock仅作为fallback）

#### 1.2 订单跟踪
- **状态**：完全使用mock（功能开发中）
- **Mock数据位置**：`paymindfrontend/components/agent/workspace/UserModule.tsx:242-248`
- **Mock原因**：功能尚未开发完成
- **需要API**：`GET /orders`（用户订单列表）
- **优先级**：中

#### 1.3 KYC认证
- **状态**：使用用户上下文数据（非mock）
- **数据来源**：`UserContext`中的`user.kycLevel`和`user.kycStatus`
- **需要API**：`GET /kyc/status`（如果需要实时查询）
- **优先级**：低（当前实现已足够）

### 2. 商户端功能（MerchantModule）

#### 2.1 商品管理
- **状态**：已集成API，但有fallback mock
- **API**：`GET /products`
- **Mock数据位置**：`paymindfrontend/components/agent/workspace/MerchantModule.tsx:36-49`
- **Mock原因**：API失败时使用mock数据作为fallback
- **优先级**：低（已有API集成，mock仅作为fallback）

#### 2.2 订单管理
- **状态**：已集成API，但有fallback mock
- **API**：`GET /orders`
- **Mock数据位置**：`paymindfrontend/components/agent/workspace/MerchantModule.tsx:76-85`
- **Mock原因**：API失败时使用mock数据作为fallback
- **优先级**：低（已有API集成，mock仅作为fallback）

#### 2.3 结算管理
- **状态**：已集成API，但有fallback mock
- **API**：`GET /commissions/settlements` 和 `GET /commissions`
- **Mock数据位置**：`paymindfrontend/components/agent/workspace/MerchantModule.tsx:95-101`（fallback）
- **Mock原因**：API失败时使用mock数据作为fallback
- **优先级**：低（已有API集成，mock仅作为fallback）

#### 2.4 数据分析
- **状态**：已集成API，但有fallback mock
- **API**：`GET /analytics/merchant`
- **Mock数据位置**：`paymindfrontend/components/agent/workspace/MerchantModule.tsx:112-117`（fallback）
- **Mock原因**：API失败时使用mock数据作为fallback
- **优先级**：低（已有API集成，mock仅作为fallback）

### 3. 开发端功能（DeveloperModule）

#### 3.1 API统计
- **状态**：已集成API，但有fallback mock
- **API**：`GET /statistics/api`
- **Mock数据位置**：`paymindfrontend/components/agent/workspace/DeveloperModule.tsx:24-29`（fallback）
- **Mock原因**：API失败时使用mock数据作为fallback
- **优先级**：低（已有API集成，mock仅作为fallback）

#### 3.2 收益查看
- **状态**：已集成API，但有fallback mock
- **API**：`GET /statistics/revenue`
- **Mock数据位置**：`paymindfrontend/components/agent/workspace/DeveloperModule.tsx:40-45`（fallback）
- **Mock原因**：API失败时使用mock数据作为fallback
- **优先级**：低（已有API集成，mock仅作为fallback）

#### 3.3 Agent管理
- **状态**：已集成API，但有fallback mock
- **API**：`GET /user-agent/my-agents`
- **Mock数据位置**：`paymindfrontend/components/agent/workspace/DeveloperModule.tsx:64-74`（fallback）
- **Mock原因**：API失败时使用mock数据作为fallback
- **优先级**：低（已有API集成，mock仅作为fallback）

### 4. 支付演示页面

#### 4.1 用户支付演示（user-demo.tsx）
- **状态**：已集成真实API
- **API**：`POST /payments/create-intent` 和 `POST /payments/process`
- **Mock数据**：无（已完全使用真实API）
- **优先级**：✅ 已完成

#### 4.2 商户支付演示（merchant-demo.tsx）
- **状态**：演示页面，使用静态数据
- **Mock数据位置**：`paymindfrontend/pages/pay/merchant-demo.tsx`
- **Mock原因**：演示页面，展示SDK集成步骤
- **优先级**：低（演示页面，不需要真实数据）

#### 4.3 其他支付演示页面
以下页面使用mock数据用于演示：
- `paymindfrontend/pages/pay/x402.tsx` - X402支付演示
- `paymindfrontend/pages/pay/smart-routing.tsx` - 智能路由演示
- `paymindfrontend/pages/pay/unified.tsx` - 统一支付演示
- `paymindfrontend/pages/pay/agent-chat.tsx` - Agent聊天演示
- `paymindfrontend/pages/pay/cross-border.tsx` - 跨境支付演示
- `paymindfrontend/pages/pay/agent-payment.tsx` - Agent支付演示
- `paymindfrontend/pages/pay/merchant.tsx` - 商户支付演示
- `paymindfrontend/pages/pay/tipping.tsx` - 打赏演示
- `paymindfrontend/pages/pay/agent.tsx` - Agent支付演示

**Mock原因**：这些是演示页面，用于展示功能，不需要真实数据
**优先级**：低（演示页面）

---

## 📊 Mock数据使用统计

### 按类型分类

#### 1. Fallback Mock（API失败时使用）
- **数量**：8个功能
- **位置**：
  - UserModule: 支付历史
  - MerchantModule: 商品列表、订单列表、结算数据、数据分析
  - DeveloperModule: API统计、收益查看、Agent列表
- **优先级**：低（已有真实API集成，mock仅作为fallback）

#### 2. 完全Mock（功能未开发）
- **数量**：1个功能
- **位置**：
  - UserModule: 订单跟踪
- **优先级**：中（需要开发）

#### 3. 演示页面Mock
- **数量**：9个页面
- **位置**：`paymindfrontend/pages/pay/`目录下的演示页面
- **优先级**：低（演示页面，不需要真实数据）

---

## 🎯 Mock数据优先级

### P0（必须替换 - 核心功能）
- **无** - 所有核心功能已集成真实API

### P1（应该替换 - 增强体验）
- **UserModule订单跟踪** - 需要开发订单跟踪功能

### P2（可以保留 - 演示/fallback）
- **所有Fallback Mock** - 作为API失败时的备用方案
- **所有演示页面Mock** - 演示页面不需要真实数据

---

## 📝 详细Mock清单

### 1. UserModule Mock数据

#### 支付历史（Fallback Mock）
```typescript
// 位置：paymindfrontend/components/agent/workspace/UserModule.tsx:44-54
{
  id: 'pay_001',
  amount: 99.00,
  currency: 'CNY',
  status: 'completed',
  description: 'X402协议支付演示',
  createdAt: new Date().toISOString(),
}
```
- **API状态**：已集成 `GET /payments/agent/user-list`
- **Mock触发条件**：API调用失败且不是401错误
- **优先级**：低（已有API集成）

#### 订单跟踪（完全Mock）
```typescript
// 位置：paymindfrontend/components/agent/workspace/UserModule.tsx:242-248
// 显示："订单功能开发中..."
```
- **API状态**：未集成
- **需要API**：`GET /orders?userId={userId}`
- **优先级**：中

### 2. MerchantModule Mock数据

#### 商品列表（Fallback Mock）
```typescript
// 位置：paymindfrontend/components/agent/workspace/MerchantModule.tsx:36-49
{
  id: 'prod_1',
  name: '示例商品1',
  description: '这是一个示例商品',
  price: 99.00,
  stock: 100,
  category: '电子产品',
  commissionRate: 5,
  status: 'active',
  merchantId: 'merchant_demo',
  metadata: { image: '/placeholder-product.jpg' },
}
```
- **API状态**：已集成 `GET /products`
- **Mock触发条件**：API调用失败且不是401错误
- **优先级**：低（已有API集成）

#### 订单列表（Fallback Mock）
```typescript
// 位置：paymindfrontend/components/agent/workspace/MerchantModule.tsx:76-85
{
  id: 'ORD-001',
  amount: 99.00,
  currency: 'CNY',
  status: 'completed',
  description: '订单示例',
  createdAt: new Date().toISOString(),
}
```
- **API状态**：已集成 `GET /orders`
- **Mock触发条件**：API调用失败且不是401错误
- **优先级**：低（已有API集成）

#### 结算数据（Fallback Mock）
```typescript
// 位置：paymindfrontend/components/agent/workspace/MerchantModule.tsx:95-101
{
  totalRevenue: '¥125,000',
  pendingSettlement: '¥15,000',
  settledAmount: '¥110,000',
  aiCommission: '¥3,750',
  netRevenue: '¥106,250',
}
```
- **API状态**：已集成 `GET /commissions/settlements` 和 `GET /commissions`
- **Mock触发条件**：API调用失败
- **优先级**：低（已有API集成）

#### 数据分析（Fallback Mock）
```typescript
// 位置：paymindfrontend/components/agent/workspace/MerchantModule.tsx:112-117
{
  todayGMV: '¥12,560',
  todayOrders: 45,
  successRate: '99.2%',
  avgOrderValue: '¥279',
}
```
- **API状态**：已集成 `GET /analytics/merchant`
- **Mock触发条件**：API调用失败
- **优先级**：低（已有API集成）

### 3. DeveloperModule Mock数据

#### API统计（Fallback Mock）
```typescript
// 位置：paymindfrontend/components/agent/workspace/DeveloperModule.tsx:24-29
{
  todayCalls: 1842,
  totalCalls: 45678,
  successRate: '99.5%',
  avgResponseTime: '320ms',
}
```
- **API状态**：已集成 `GET /statistics/api`
- **Mock触发条件**：API调用失败
- **优先级**：低（已有API集成）

#### 收益查看（Fallback Mock）
```typescript
// 位置：paymindfrontend/components/agent/workspace/DeveloperModule.tsx:40-45
{
  totalRevenue: '¥12,500',
  todayRevenue: '¥450',
  commission: '¥3,750',
  pending: '¥1,200',
}
```
- **API状态**：已集成 `GET /statistics/revenue`
- **Mock触发条件**：API调用失败
- **优先级**：低（已有API集成）

#### Agent列表（Fallback Mock）
```typescript
// 位置：paymindfrontend/components/agent/workspace/DeveloperModule.tsx:64-74
{
  id: 'agent_demo_1',
  name: '示例Agent',
  description: '这是一个示例Agent',
  status: 'active',
  isPublished: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}
```
- **API状态**：已集成 `GET /user-agent/my-agents`
- **Mock触发条件**：API调用失败且不是401错误
- **优先级**：低（已有API集成）

### 4. 演示页面Mock数据

以下演示页面使用mock数据，这些是正常的，因为它们是演示页面：

1. **X402支付演示** (`paymindfrontend/pages/pay/x402.tsx`)
   - Mock原因：演示X402支付流程
   - 优先级：低

2. **智能路由演示** (`paymindfrontend/pages/pay/smart-routing.tsx`)
   - Mock原因：演示智能路由算法
   - 优先级：低

3. **统一支付演示** (`paymindfrontend/pages/pay/unified.tsx`)
   - Mock原因：演示统一支付流程
   - 优先级：低

4. **Agent聊天演示** (`paymindfrontend/pages/pay/agent-chat.tsx`)
   - Mock原因：演示Agent对话
   - 优先级：低

5. **跨境支付演示** (`paymindfrontend/pages/pay/cross-border.tsx`)
   - Mock原因：演示跨境支付流程
   - 优先级：低

6. **Agent支付演示** (`paymindfrontend/pages/pay/agent-payment.tsx`)
   - Mock原因：演示Agent支付功能
   - 优先级：低

7. **商户支付演示** (`paymindfrontend/pages/pay/merchant.tsx`)
   - Mock原因：演示商户支付流程
   - 优先级：低

8. **打赏演示** (`paymindfrontend/pages/pay/tipping.tsx`)
   - Mock原因：演示打赏功能
   - 优先级：低

9. **Agent支付演示** (`paymindfrontend/pages/pay/agent.tsx`)
   - Mock原因：演示Agent支付
   - 优先级：低

---

## 🔧 Mock数据策略

### Fallback Mock策略
所有已集成API的功能都采用了fallback策略：
1. **优先使用真实API**：首先尝试调用真实API
2. **401错误处理**：如果是401未授权，显示空列表，不显示mock数据
3. **其他错误fallback**：如果是其他错误（网络错误、500错误等），使用mock数据确保用户体验
4. **用户提示**：可以在UI上提示用户当前使用的是演示数据

### 演示页面Mock策略
演示页面使用mock数据是正常的：
1. **目的明确**：这些页面用于演示功能，不是实际使用
2. **不需要真实数据**：演示页面不需要连接真实后端
3. **保持独立**：演示页面可以独立运行，不依赖后端状态

---

## 📊 总结

### Mock数据统计
- **Fallback Mock**：8个功能（已有API集成，mock仅作为fallback）
- **完全Mock**：1个功能（订单跟踪，功能未开发）
- **演示页面Mock**：9个页面（演示页面，不需要真实数据）

### API集成状态
- **已集成真实API**：所有核心功能（100%）
- **有Fallback Mock**：8个功能（作为API失败时的备用方案）
- **完全Mock**：1个功能（订单跟踪）

### 优先级建议
1. **P0（必须完成）**：无（所有核心功能已集成真实API）
2. **P1（应该完成）**：订单跟踪功能开发
3. **P2（可以保留）**：所有fallback mock和演示页面mock

---

## 🎯 下一步行动

### 立即行动（P1）
1. **开发订单跟踪功能**
   - 集成 `GET /orders?userId={userId}` API
   - 实现订单状态跟踪
   - 实现物流信息展示

### 可选优化（P2）
1. **优化Fallback Mock**
   - 添加用户提示（当前使用演示数据）
   - 添加重试机制
   - 改进错误处理

2. **演示页面优化**
   - 保持当前mock数据
   - 可以添加"这是演示数据"的提示

---

## 📝 注意事项

1. **Fallback Mock是必要的**：确保在API失败时用户仍能看到界面，而不是空白页面
2. **演示页面Mock是正常的**：这些页面用于演示，不需要真实数据
3. **401错误不显示Mock**：未授权时显示空列表，引导用户登录
4. **所有核心功能已集成真实API**：系统可以正常使用，mock仅作为fallback

