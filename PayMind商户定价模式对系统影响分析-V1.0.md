# PayMind 商户定价模式对系统影响分析 V1.0
## 商户自主定价对智能路由和支付流程的影响

**版本**: 1.0  
**日期**: 2025年1月  
**设计理念**: 商户自主定价、智能路由适配、流程优化、产品完善

---

## 📋 目录

1. [影响分析总览](#1-影响分析总览)
2. [对智能路由的影响](#2-对智能路由的影响)
3. [对支付流程的影响](#3-对支付流程的影响)
4. [对分佣计算的影响](#4-对分佣计算的影响)
5. [对Agent ID体系的影响](#5-对agent-id体系的影响)
6. [对SLA治理机制的影响](#6-对sla治理机制的影响)
7. [对统一支付流程的影响](#7-对统一支付流程的影响)
8. [产品设计改变清单](#8-产品设计改变清单)
9. [实现方案](#9-实现方案)
10. [迁移策略](#10-迁移策略)

---

## 1. 影响分析总览

### 1.1 核心改变

**改变前**：
- 智能路由基于通道成本计算价格
- 价格 = 商品基础价格 + 通道费用（商户承担）
- 税费自动计算

**改变后**：
- 商户自主设置价格（根据通道、国家、税费等）
- 价格 = 商户设置的价格（已包含税费）
- 智能路由基于商户设置的价格进行推荐

### 1.2 影响范围

| 模块 | 影响程度 | 主要改变 |
|------|---------|---------|
| **智能路由** | ⭐⭐⭐⭐ | 需要从商户价格设置中获取价格，而非自己计算；支持全球200+国家，150+种货币 |
| **支付流程** | ⭐⭐⭐ | 需要先获取价格，再进行路由；统一支付流程适配所有场景 |
| **商户后台** | ⭐⭐⭐⭐⭐ | 需要增加价格设置功能（基础价格、国家价格、通道价格） |
| **用户前端** | ⭐⭐⭐ | 需要显示商户设置的价格；显示价格对比和推荐 |
| **分佣计算** | ⭐⭐⭐ | 需要基于商户税前价格计算；简化分佣（商户价格 × 固定比例） |
| **收入计算** | ⭐⭐⭐ | 需要区分商户税前收入和实际收入；考虑税费、通道费用 |
| **Agent ID体系** | ⭐⭐ | 支持ERC 8004、多链兼容、DID协议；不影响定价，但影响分佣计算 |
| **SLA治理** | ⭐⭐ | 记录支付SLA指标；不影响定价，但影响服务质量监控 |
| **统一支付流程** | ⭐⭐⭐ | 需要适配商户定价模式；保持7阶段流程不变 |

---

## 2. 对智能路由的影响

### 2.1 路由决策逻辑改变

#### 2.1.1 改变前

```
智能路由决策流程：
  1. 获取商品基础价格
  2. 计算各通道成本
  3. 计算各通道最终价格（基础价格 + 通道费用）
  4. 选择价格最低的通道
  5. 返回推荐通道和价格
```

#### 2.1.2 改变后

```
智能路由决策流程：
  1. 获取用户所在国家
  2. 获取商户设置的价格（根据国家、通道）
  3. 获取可用通道列表
  4. 获取各通道的商户设置价格
  5. 比较各通道价格（商户已设置）
  6. 选择价格最低的通道
  7. 返回推荐通道和价格
```

### 2.2 价格获取逻辑

#### 2.2.1 价格获取优先级

```
获取商品价格：
  1. 检查是否有通道+国家价格设置
     └─→ 有：使用该价格
  2. 检查是否有国家价格设置
     └─→ 有：使用该价格
  3. 检查是否有通道价格设置
     └─→ 有：使用该价格
  4. 使用基础价格
     └─→ 自动计算税费（如果未设置）
```

#### 2.2.2 价格计算服务调整

```typescript
@Injectable()
export class SmartRouterService {
  /**
   * 选择最佳支付通道（增强版，支持商户价格设置）
   */
  async selectBestChannel(
    productId: string,
    countryCode: string,
    currency: string,
    context?: RoutingContext,
  ): Promise<RoutingDecision> {
    // 1. 获取可用通道
    const availableChannels = await this.getAvailableChannels(
      countryCode,
      currency,
      context,
    );
    
    // 2. 获取各通道的商户设置价格
    const channelPrices = await Promise.all(
      availableChannels.map(async (channel) => {
        const price = await this.pricingService.getProductPrice(
          productId,
          countryCode,
          channel.method,
        );
        return {
          channel,
          price: price.finalPrice, // 商户设置的最终价格
          basePrice: price.basePrice, // 商户税前价格
          taxAmount: price.taxAmount, // 税费
        };
      }),
    );
    
    // 3. 按价格排序（价格最低优先）
    channelPrices.sort((a, b) => a.price - b.price);
    
    // 4. 选择价格最低的通道
    const recommended = channelPrices[0];
    
    // 5. 生成价格对比
    const priceComparison = channelPrices.map((cp) => ({
      method: cp.channel.method,
      price: cp.price,
      basePrice: cp.basePrice,
      taxAmount: cp.taxAmount,
    }));
    
    return {
      recommendedMethod: recommended.channel.method,
      channels: availableChannels,
      price: recommended.price,
      basePrice: recommended.basePrice,
      taxAmount: recommended.taxAmount,
      priceComparison,
      reason: `价格最低：${recommended.price} ${currency}`,
    };
  }
}
```

### 2.3 评分系统调整

#### 2.3.1 评分维度调整

**改变前**：
- 成本得分：基于通道费用
- 价格得分：基于计算的价格

**改变后**：
- 价格得分：基于商户设置的价格（主要因素）
- 速度得分：基于通道处理速度
- 成功率得分：基于通道成功率
- 安全性得分：基于通道安全性

#### 2.3.2 评分公式调整

**改变前**：
```
综合得分 = 成本得分 × 30% + 速度得分 × 25% + 成功率得分 × 25% + 
           安全性得分 × 10% + 覆盖范围得分 × 5% + 用户体验得分 × 5%
```

**改变后**：
```
综合得分 = 价格得分 × 40% + 速度得分 × 25% + 成功率得分 × 20% + 
           安全性得分 × 10% + 覆盖范围得分 × 3% + 用户体验得分 × 2%

价格得分 = 1 / (商户设置价格 / 最低价格)
```

### 2.4 价格对比逻辑

#### 2.4.1 价格对比数据源

**改变前**：
- 价格对比基于通道成本计算
- 所有通道使用相同基础价格

**改变后**：
- 价格对比基于商户设置的价格
- 不同通道可能有不同价格（商户设置）

#### 2.4.2 价格对比显示

```typescript
interface PriceComparison {
  channels: Array<{
    method: PaymentMethod;
    price: number;        // 商户设置的最终价格
    basePrice: number;    // 商户税前价格
    taxAmount: number;    // 税费
    channelFee?: number; // 通道费用（如果商户设置）
  }>;
  recommended: PaymentMethod; // 推荐通道（价格最低）
  priceDifference: number;   // 价格差异
}
```

---

## 3. 对支付流程的影响

### 3.1 支付流程调整

#### 3.1.1 改变前的流程

```
用户发起支付
    ↓
获取商品基础价格
    ↓
智能路由选择通道
    ↓
计算最终价格（基础价格 + 通道费用）
    ↓
用户支付
    ↓
执行支付
```

#### 3.1.2 改变后的流程

```
用户发起支付
    ↓
获取用户所在国家
    ↓
获取商户设置的价格（根据国家、通道）
    ↓
智能路由选择通道（基于商户设置的价格）
    ↓
用户支付（商户设置的最终价格）
    ↓
执行支付
    ↓
计算商户收入（基于商户税前价格）
```

### 3.2 支付请求参数调整

#### 3.2.1 改变前的参数

```typescript
interface PaymentRequest {
  productId: string;
  amount: number;        // 商品基础价格
  currency: string;
  paymentMethod?: PaymentMethod;
}
```

#### 3.2.2 改变后的参数

```typescript
interface PaymentRequest {
  productId: string;
  countryCode: string;   // 新增：用户所在国家
  currency: string;
  paymentMethod?: PaymentMethod;
  // amount 不再需要，从商户价格设置中获取
}
```

### 3.3 支付处理逻辑调整

#### 3.3.1 价格获取时机

**改变前**：
- 支付时使用请求中的金额
- 智能路由计算最终价格

**改变后**：
- 支付前先获取商户设置的价格
- 智能路由基于商户价格推荐通道
- 支付时使用商户设置的最终价格

#### 3.3.2 支付服务调整

```typescript
@Injectable()
export class PaymentService {
  /**
   * 创建支付（支持商户价格设置）
   */
  async createPayment(
    userId: string,
    productId: string,
    countryCode: string,
    currency: string,
    paymentMethod?: PaymentMethod,
  ): Promise<Payment> {
    // 1. 获取商户设置的价格
    const pricing = await this.pricingService.getProductPrice(
      productId,
      countryCode,
      paymentMethod,
    );
    
    // 2. 如果没有指定支付方式，使用智能路由推荐
    if (!paymentMethod) {
      const routing = await this.smartRouter.selectBestChannel(
        productId,
        countryCode,
        currency,
      );
      paymentMethod = routing.recommendedMethod;
      // 使用推荐通道的价格
      const recommendedPricing = await this.pricingService.getProductPrice(
        productId,
        countryCode,
        paymentMethod,
      );
      pricing.finalPrice = recommendedPricing.finalPrice;
    }
    
    // 3. 创建支付记录
    const payment = await this.paymentRepository.save({
      userId,
      productId,
      amount: pricing.finalPrice,      // 用户支付金额（含税）
      baseAmount: pricing.basePrice,   // 商户税前价格
      taxAmount: pricing.taxAmount,    // 税费
      currency,
      countryCode,
      paymentMethod,
      status: PaymentStatus.PENDING,
    });
    
    return payment;
  }
}
```

### 3.4 分佣计算调整

#### 3.4.1 分佣计算基础

**改变前**：
- 分佣基于商品基础价格
- 固定佣金比例

**改变后**：
- 分佣基于商户税前价格（basePrice）
- 固定佣金比例
- 税费不影响分佣计算

#### 3.4.2 分佣计算公式

```typescript
// 商户税前价格（不含税）
const basePrice = pricing.basePrice;

// 分佣计算（基于商户税前价格）
const agentCommission = basePrice * agentCommissionRate;
const paymindFee = basePrice * paymindFeeRate;

// 商户实际收入
const merchantIncome = basePrice - agentCommission - paymindFee - channelFee;
```

---

## 4. 对分佣计算的影响

### 4.1 分佣计算基础改变

#### 4.1.1 改变前

**分佣计算基础**：
- 基于可分配金额（扣除通道费用后）
- 计算复杂，需要先扣除通道费用

**计算公式**：
```
可分配金额 = 用户支付金额 - 通道费用
Agent佣金 = 可分配金额 × Agent佣金比例
PayMind平台费 = 可分配金额 × PayMind费率
```

#### 4.1.2 改变后

**分佣计算基础**：
- 基于商户税前价格（basePrice）
- 计算简化，固定佣金比例

**计算公式**：
```
商户税前价格 = 商户设置的基础价格（不含税）
Agent佣金 = 商户税前价格 × Agent佣金比例（固定）
PayMind平台费 = 商户税前价格 × PayMind费率（固定）
商户预期收入 = 商户税前价格 - Agent佣金 - PayMind平台费
商户实际收入 = 商户预期收入 - 通道费用
```

### 4.2 分佣计算服务调整

#### 4.2.1 分佣计算逻辑

```typescript
@Injectable()
export class CommissionCalculatorService {
  /**
   * 计算固定佣金（基于商户税前价格）
   */
  async calculateFixedCommission(
    paymentId: string,
    merchantBasePrice: number,  // 商户税前价格
    orderType: OrderType,
    productCategory?: string,
  ): Promise<CommissionCalculation> {
    // 1. 获取佣金比例（根据商品类型和类别）
    const rates = this.getCommissionRates(orderType, productCategory);
    
    // 2. 计算Agent佣金（基于商户税前价格）
    const agentCommission = merchantBasePrice * rates.agentRate;
    
    // 3. 计算PayMind平台费（基于商户税前价格）
    const paymindFee = merchantBasePrice * rates.paymindRate;
    
    // 4. 计算商户预期收入
    const merchantExpectedIncome = merchantBasePrice - agentCommission - paymindFee;
    
    // 5. 获取通道费用（从支付记录中获取）
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });
    const channelFee = payment.channelFee;
    
    // 6. 计算商户实际收入
    const merchantActualIncome = merchantExpectedIncome - channelFee;
    
    return {
      merchantBasePrice,
      agentCommission,
      agentCommissionRate: rates.agentRate,
      paymindFee,
      paymindFeeRate: rates.paymindRate,
      merchantExpectedIncome,
      channelFee,
      merchantActualIncome,
    };
  }
  
  /**
   * 根据商品类型和类别获取佣金比例
   */
  private getCommissionRates(
    orderType: OrderType,
    productCategory?: string,
  ): { agentRate: number; paymindRate: number } {
    // 实体商品
    if (orderType === 'product' || orderType === 'physical') {
      return this.getPhysicalProductRates(productCategory);
    }
    
    // 服务
    if (orderType === 'service') {
      return this.getServiceRates(productCategory);
    }
    
    // 链上资产
    if (orderType === 'nft' || orderType === 'virtual') {
      return this.getOnChainAssetRates(productCategory);
    }
    
    // 默认
    return { agentRate: 0.10, paymindRate: 0.01 };
  }
}
```

### 4.3 行业对标佣金比例

#### 4.3.1 佣金比例参考

**实体商品**（参考Amazon、eBay）：
- 电子产品：8-12% Agent + 1-2% PayMind
- 服饰时尚：12-15% Agent + 1.5-2% PayMind
- 美容健康：8-10% Agent + 1% PayMind

**服务类商品**：
- 咨询服务：15-20% Agent + 2-3% PayMind
- 设计服务：12-18% Agent + 2% PayMind
- 技术服务：10-15% Agent + 1.5-2% PayMind

**链上资产**（参考OpenSea、Uniswap）：
- NFT二级市场：2-3% Agent + 0.5-1% PayMind
- NFT一级市场：5-10% Agent + 1-2% PayMind
- FT DEX交易：0.1-0.5% Agent + 0.1-0.2% PayMind

---

## 5. 对Agent ID体系的影响

### 5.1 ERC 8004和多链兼容

#### 5.1.1 影响分析

**影响程度**：⭐⭐（中等）

**主要影响**：
- Agent ID验证需要支持多链
- 分佣计算需要关联Agent ID
- 不影响定价，但影响分佣分配

#### 5.1.2 Agent ID解析

```typescript
@Injectable()
export class AgentIdentityService {
  /**
   * 解析Agent ID（多链支持）
   */
  async resolveAgentId(
    agentId: string,
    chain?: string,
  ): Promise<AgentIdentity> {
    // 1. 尝试解析为PayMind统一ID
    let agent = await this.findByPayMindId(agentId);
    
    if (!agent) {
      // 2. 尝试解析为链上ID
      if (chain) {
        agent = await this.findByChainId(chain, agentId);
      } else {
        // 3. 尝试所有链
        agent = await this.findByAnyChain(agentId);
      }
    }
    
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }
    
    return agent;
  }
  
  /**
   * 验证Agent ID（支持ERC 8004、DID等）
   */
  async verifyAgentId(
    agentId: string,
    chain: string,
  ): Promise<boolean> {
    // 1. 检查协议类型
    const protocol = this.detectProtocol(agentId);
    
    // 2. 使用对应的适配器验证
    const adapter = this.getAdapter(protocol);
    return adapter.verifyAgent(agentId, chain);
  }
}
```

### 5.2 分佣计算中的Agent ID

#### 5.2.1 Agent ID在分佣中的作用

**作用**：
1. **执行Agent**：执行交易，获得执行Agent分佣
2. **推荐Agent**：推荐商品，获得推荐Agent分佣
3. **推广Agent**：推广商户，获得推广Agent分佣（永久）
4. **联盟节点**：网络节点，获得联盟网络分成（永久）

**分佣计算**：
```typescript
async calculateAgentCommission(
  paymentId: string,
  merchantBasePrice: number,
  agentId?: string,
  referralAgentId?: string,
): Promise<AgentCommission> {
  const commissions = [];
  
  // 1. 执行Agent分佣（如果有）
  if (agentId) {
    const agentIdentity = await this.agentIdentityService.resolveAgentId(agentId);
    const executionCommission = merchantBasePrice * this.getExecutionCommissionRate();
    commissions.push({
      agentId: agentIdentity.paymindAgentId,
      agentType: 'execution',
      commission: executionCommission,
      chain: agentIdentity.primaryChain,
    });
  }
  
  // 2. 推荐Agent分佣（如果有）
  if (referralAgentId) {
    const referralIdentity = await this.agentIdentityService.resolveAgentId(referralAgentId);
    const referralCommission = merchantBasePrice * this.getReferralCommissionRate();
    commissions.push({
      agentId: referralIdentity.paymindAgentId,
      agentType: 'referral',
      commission: referralCommission,
      chain: referralIdentity.primaryChain,
    });
  }
  
  return { commissions };
}
```

---

## 6. 对SLA治理机制的影响

### 6.1 SLA记录与监控

#### 6.1.1 影响分析

**影响程度**：⭐⭐（中等）

**主要影响**：
- 需要记录支付相关的SLA指标
- 不影响定价，但影响服务质量监控
- 需要关联Session ID、User ID、Agent ID

#### 6.1.2 SLA记录逻辑

```typescript
@Injectable()
export class SLAService {
  /**
   * 记录支付SLA指标
   */
  async recordPaymentSLA(
    sessionId: string,
    paymentId: string,
    metrics: {
      responseTime: number;
      paymentSuccess: boolean;
      availability: number;
    },
  ): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['user', 'merchant'],
    });
    
    // 记录SLA指标
    await this.slaRepository.save({
      sessionId,
      userId: payment.userId,
      agentId: payment.agentId,
      merchantId: payment.merchantId,
      slaLevel: this.getSLALevel(payment.merchantId),
      responseTime: metrics.responseTime,
      paymentSuccess: metrics.paymentSuccess,
      availability: metrics.availability,
    });
    
    // 检查SLA合规性
    await this.checkSLACompliance(sessionId, metrics);
  }
  
  /**
   * 检查SLA合规性
   */
  async checkSLACompliance(
    sessionId: string,
    metrics: SLAMetrics,
  ): Promise<void> {
    const slaRecord = await this.slaRepository.findOne({
      where: { sessionId },
    });
    
    const slaTarget = this.getSLATarget(slaRecord.slaLevel);
    
    // 检查各项指标
    if (metrics.availability < slaTarget.availability) {
      await this.triggerSLAViolation(sessionId, 'availability');
    }
    
    if (metrics.responseTime > slaTarget.responseTime) {
      await this.triggerSLAViolation(sessionId, 'responseTime');
    }
    
    if (!metrics.paymentSuccess && slaTarget.paymentSuccessRate > 0.99) {
      await this.triggerSLAViolation(sessionId, 'paymentSuccess');
    }
  }
}
```

### 6.2 追责机制

#### 6.2.1 三层ID追责

**追责体系**：
- **User ID**：用户责任（支付失败、退款等）
- **Agent ID**：Agent责任（服务质量、推荐错误等）
- **Session ID**：会话责任（交易追踪、问题定位）

**追责逻辑**：
```typescript
async determineLiability(
  sessionId: string,
  issue: PaymentIssue,
): Promise<Liability> {
  const session = await this.sessionRepository.findOne({
    where: { id: sessionId },
    relations: ['user', 'agent', 'payment'],
  });
  
  // 根据问题类型确定责任方
  if (issue.type === 'payment_failure') {
    // 检查是否是用户原因
    if (issue.reason === 'insufficient_balance' || issue.reason === 'user_cancelled') {
      return {
        liableParty: 'user',
        userId: session.userId,
        reason: issue.reason,
      };
    }
    
    // 检查是否是通道原因
    if (issue.reason === 'channel_failure') {
      return {
        liableParty: 'channel',
        channel: session.payment.paymentMethod,
        reason: issue.reason,
      };
    }
  }
  
  // 检查是否是Agent原因
  if (issue.type === 'service_quality') {
    return {
      liableParty: 'agent',
      agentId: session.agentId,
      reason: issue.reason,
    };
  }
  
  // 默认平台责任
  return {
    liableParty: 'platform',
    reason: 'platform_error',
  };
}
```

---

## 7. 对统一支付流程的影响

### 7.1 统一支付流程调整

#### 7.1.1 流程阶段（保持不变）

```
阶段1: 支付请求（含三层ID）
  ↓
阶段2: 智能路由选择（含价格获取）
  ↓
阶段3: 支付执行
  ↓
阶段4: 通道费用扣除（商户承担）
  ↓
阶段5: 固定佣金计算（基于商户税前价格）
  ↓
阶段6: 资金托管（可选）
  ↓
阶段7: 结算分派
```

#### 7.1.2 流程调整点

**调整点1：阶段1 - 支付请求**
- 新增：获取用户所在国家
- 新增：创建Session ID
- 新增：获取/验证Agent ID（多链支持）

**调整点2：阶段2 - 智能路由选择**
- 修改：先获取商户价格设置
- 修改：基于商户价格进行路由决策
- 新增：支持全球200+国家，150+种货币

**调整点3：阶段5 - 固定佣金计算**
- 修改：基于商户税前价格计算
- 修改：使用固定佣金比例（根据商品类型）
- 新增：支持行业对标佣金比例

**调整点4：阶段7 - 结算分派**
- 新增：记录SLA指标
- 新增：关联三层ID（User ID、Agent ID、Session ID）
- 新增：记录税费信息

### 7.2 支付流程时序图调整

#### 7.2.1 完整时序图（新）

```
用户                前端UI              后端API              价格服务              智能路由              支付执行服务          分佣服务              Agent ID服务          SLA服务              结算服务
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │──发起支付请求─────>│                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │──processPayment───>│                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │  [阶段1: 支付请求]  │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │  1. 创建Session ID │                    │                    │                    │                    │                    │                    │
 │                   │                   │  2. 获取User ID   │                    │                    │                    │                    │                    │                    │
 │                   │                   │  3. 获取Agent ID  │                    │                    │                    │                    │                    │                    │
 │                   │                   │  4. 验证Agent ID (多链)│              │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │──resolveAgentID───>│                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │  多链解析:         │                    │                    │
 │                   │                   │                    │                    │                    │                    │  - ERC 8004       │                    │                    │
 │                   │                   │                    │                    │                    │                    │  - W3C DID       │                    │                    │
 │                   │                   │                    │                    │                    │                    │  - Solana        │                    │                    │
 │                   │                   │                    │                    │                    │                    │  - BSC/Polygon   │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │<─返回Agent信息────│                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │  [阶段2: 价格获取] │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │──getProductPrice─>│                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │  1. 获取基础价格   │                    │                    │                    │                    │                    │
 │                   │                   │                    │  2. 检查国家价格   │                    │                    │                    │                    │                    │
 │                   │                   │                    │  3. 检查通道价格   │                    │                    │                    │                    │                    │
 │                   │                   │                    │  4. 计算税费       │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │<─返回价格信息─────│                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │  [阶段2: 智能路由选择]│                  │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │──selectBestChannel>│                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │  1. 获取各通道价格  │                    │                    │                    │                    │
 │                   │                   │                    │                    │  2. 比较价格       │                    │                    │                    │                    │
 │                   │                   │                    │                    │  3. 选择最优通道   │                    │                    │                    │                    │
 │                   │                   │                    │                    │  4. 支持全球200+国家│                  │                    │                    │                    │
 │                   │                   │                    │                    │  5. 支持150+种货币 │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │<─返回路由决策─────│                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │  [阶段3: 支付执行] │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │──执行支付──────────>│                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │<─支付结果──────────│                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │  [阶段4: 通道费用扣除]│                  │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │  [阶段5: 固定佣金计算]│                │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │──calculateFixedCommission>│                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │  基于商户税前价格:  │                    │                    │
 │                   │                   │                    │                    │                    │                    │  - Agent佣金 = 商户税前价格 × 固定比例│                    │                    │
 │                   │                   │                    │                    │                    │                    │  - PayMind平台费 = 商户税前价格 × 固定比例│                    │                    │
 │                   │                   │                    │                    │                    │                    │  - 商户实际收入 = 商户税前价格 - 佣金 - 通道费用│                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │──recordSLA───────>│
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │  记录SLA指标:     │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │  - 响应时间       │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │  - 支付成功率     │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │  - 可用性         │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │<─SLA记录完成──────│
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │<─分佣计算完成──────│                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │  [阶段6: 资金托管] │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │  [阶段7: 结算分派] │                    │                    │                    │                    │                    │                    │                    │
 │                   │                   │                    │                    │                    │                    │                    │                    │                    │                    │
 │                   │<─支付成功─────────│                    │                    │                    │                    │                    │                    │                    │                    │
 │<─显示支付成功──────│                   │                    │                    │                    │                    │                    │                    │                    │                    │
```

---

## 8. 产品设计改变清单

### 4.1 商户后台功能

#### 4.1.1 新增功能

**1. 商品价格设置页面**
- [ ] 基础价格设置
- [ ] 国家价格覆盖设置
- [ ] 通道价格覆盖设置
- [ ] 价格预览表格
- [ ] 价格批量导入/导出

**2. 价格管理功能**
- [ ] 价格模板管理
- [ ] 价格历史记录
- [ ] 价格变更通知
- [ ] 价格分析报表

**3. 税费管理功能**
- [ ] 税费计算工具
- [ ] 税费报表
- [ ] 税费设置（含税/不含税）
- [ ] 税费豁免管理

#### 4.1.2 修改功能

**1. 商品管理页面**
- [ ] 添加价格设置入口
- [ ] 显示价格设置状态
- [ ] 价格设置快捷操作

**2. 订单管理页面**
- [ ] 显示订单价格明细
- [ ] 显示税费明细
- [ ] 显示商户税前收入
- [ ] 显示商户实际收入

**3. 收入报表页面**
- [ ] 区分税前收入和实际收入
- [ ] 显示税费汇总
- [ ] 显示各国家收入分布
- [ ] 显示各通道收入分布

### 4.2 用户前端功能

#### 4.2.1 新增功能

**1. 价格显示**
- [ ] 显示商户设置的最终价格
- [ ] 显示价格差异（如果不同通道价格不同）
- [ ] 显示税费信息（可选）

**2. 支付方式选择**
- [ ] 显示各通道的价格对比
- [ ] 推荐价格最低的通道
- [ ] 显示价格差异原因

#### 4.2.2 修改功能

**1. 支付流程**
- [ ] 支付前先获取价格
- [ ] 显示商户设置的最终价格
- [ ] 支付确认页面显示价格明细

**2. 订单页面**
- [ ] 显示订单价格明细
- [ ] 显示税费信息
- [ ] 显示支付方式

### 4.3 后端API调整

#### 4.3.1 新增API

**1. 价格管理API**
```typescript
// 获取商品价格
GET /api/products/:productId/pricing?countryCode=GB&channel=stripe

// 设置商品价格
POST /api/products/:productId/pricing
PUT /api/products/:productId/pricing/:pricingId
DELETE /api/products/:productId/pricing/:pricingId

// 批量设置价格
POST /api/products/:productId/pricing/batch

// 获取价格模板
GET /api/pricing/templates
POST /api/pricing/templates
```

**2. 税费管理API**
```typescript
// 计算税费
POST /api/tax/calculate

// 获取税费报表
GET /api/tax/reports?startDate=...&endDate=...

// 导出税费报表
GET /api/tax/reports/export
```

#### 4.3.2 修改API

**1. 支付路由API**
```typescript
// 修改前
GET /api/payments/routing?amount=1000&currency=USD

// 修改后
GET /api/payments/routing?productId=xxx&countryCode=GB&currency=USD
```

**2. 支付创建API**
```typescript
// 修改前
POST /api/payments
{
  "productId": "xxx",
  "amount": 1000,
  "currency": "USD"
}

// 修改后
POST /api/payments
{
  "productId": "xxx",
  "countryCode": "GB",
  "currency": "USD",
  "paymentMethod": "stripe" // 可选
}
```

### 4.4 数据库设计

#### 4.4.1 新增表

**1. 商品价格表**
```sql
CREATE TABLE product_prices (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL,
  base_price DECIMAL NOT NULL,
  base_currency VARCHAR NOT NULL,
  tax_included BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**2. 商品国家价格表**
```sql
CREATE TABLE product_country_prices (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  price DECIMAL NOT NULL,
  currency VARCHAR NOT NULL,
  tax_included BOOLEAN DEFAULT TRUE,
  tax_rate DECIMAL,
  reason TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(product_id, country_code)
);
```

**3. 商品通道价格表**
```sql
CREATE TABLE product_channel_prices (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL,
  country_code VARCHAR(2),
  channel VARCHAR NOT NULL,
  price DECIMAL NOT NULL,
  currency VARCHAR NOT NULL,
  tax_included BOOLEAN DEFAULT TRUE,
  tax_rate DECIMAL,
  channel_fee DECIMAL,
  reason TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(product_id, country_code, channel)
);
```

#### 4.4.2 修改表

**1. 支付记录表**
```sql
ALTER TABLE payments ADD COLUMN country_code VARCHAR(2);
ALTER TABLE payments ADD COLUMN base_amount DECIMAL; -- 商户税前价格
ALTER TABLE payments ADD COLUMN tax_amount DECIMAL;  -- 税费
ALTER TABLE payments ADD COLUMN tax_rate DECIMAL;    -- 税率
```

---

## 9. 实现方案

### 5.1 智能路由调整方案

#### 5.1.1 路由决策流程（新）

```
支付请求
  │
  ├─→ [获取上下文信息]
  │   ├─→ 商品ID
  │   ├─→ 用户所在国家
  │   ├─→ 支付货币
  │   └─→ 商户收款配置
  │
  ├─→ [获取商户价格设置]
  │   ├─→ 检查通道+国家价格
  │   ├─→ 检查国家价格
  │   ├─→ 检查通道价格
  │   └─→ 使用基础价格（如果未设置）
  │
  ├─→ [获取可用通道]
  │   ├─→ 检查通道可用性
  │   ├─→ 检查货币支持
  │   └─→ 检查KYC要求
  │
  ├─→ [计算各通道价格]
  │   └─→ 从商户价格设置中获取
  │
  ├─→ [选择最优通道]
  │   ├─→ 价格最低优先
  │   ├─→ 速度、成功率、安全性次之
  │   └─→ 综合评分
  │
  └─→ [返回路由决策]
      ├─→ 推荐通道
      ├─→ 推荐价格（商户设置）
      ├─→ 价格对比
      └─→ 路由理由
```

#### 5.1.2 价格服务集成

```typescript
@Injectable()
export class SmartRouterService {
  constructor(
    private pricingService: PricingService,
    // ... other services
  ) {}
  
  /**
   * 选择最佳支付通道（支持商户价格设置）
   */
  async selectBestChannel(
    productId: string,
    countryCode: string,
    currency: string,
    context?: RoutingContext,
  ): Promise<RoutingDecision> {
    // 1. 获取可用通道
    const availableChannels = await this.getAvailableChannels(
      countryCode,
      currency,
      context,
    );
    
    // 2. 获取各通道的商户设置价格
    const channelPrices = await Promise.all(
      availableChannels.map(async (channel) => {
        const pricing = await this.pricingService.getProductPrice(
          productId,
          countryCode,
          channel.method,
        );
        
        return {
          channel,
          price: pricing.finalPrice,
          basePrice: pricing.basePrice,
          taxAmount: pricing.taxAmount,
          channelFee: pricing.channelFee,
        };
      }),
    );
    
    // 3. 计算综合得分（价格权重40%）
    const scoredChannels = channelPrices.map((cp) => {
      const priceScore = 1 / (cp.price / Math.min(...channelPrices.map(p => p.price)));
      const speedScore = cp.channel.speed / 10;
      const successRateScore = cp.channel.successRate / 100;
      const securityScore = cp.channel.securityLevel / 10;
      
      const score = 
        priceScore * 0.4 +
        speedScore * 0.25 +
        successRateScore * 0.20 +
        securityScore * 0.10 +
        (cp.channel.coverage / 100) * 0.03 +
        (cp.channel.ux / 10) * 0.02;
      
      return {
        ...cp,
        score,
      };
    });
    
    // 4. 按得分排序
    scoredChannels.sort((a, b) => b.score - a.score);
    
    // 5. 选择最优通道
    const recommended = scoredChannels[0];
    
    // 6. 生成价格对比
    const priceComparison = channelPrices.map((cp) => ({
      method: cp.channel.method,
      price: cp.price,
      basePrice: cp.basePrice,
      taxAmount: cp.taxAmount,
      channelFee: cp.channelFee,
    }));
    
    return {
      recommendedMethod: recommended.channel.method,
      channels: availableChannels,
      price: recommended.price,
      basePrice: recommended.basePrice,
      taxAmount: recommended.taxAmount,
      priceComparison,
      reason: `价格最低：${recommended.price} ${currency}，速度：${recommended.channel.speed}/10，成功率：${recommended.channel.successRate}%`,
    };
  }
}
```

### 5.2 支付流程调整方案

#### 5.2.1 支付流程（新）

```
用户发起支付
    ↓
[阶段1: 支付请求]
  ├─→ 获取商品信息
  ├─→ 获取用户所在国家
  └─→ 创建支付记录（待定价）
    ↓
[阶段2: 价格获取]
  ├─→ 获取商户价格设置
  ├─→ 计算最终价格
  └─→ 更新支付记录价格
    ↓
[阶段3: 智能路由选择]
  ├─→ 获取各通道价格
  ├─→ 选择最优通道
  └─→ 返回推荐通道和价格
   包括 ↓
[阶段4: 支付执行]
  ├─→ 用户确认支付
  ├─→ 执行支付
  └─→ 更新支付状态
    ↓
[阶段5: 分佣计算]
  ├─→ 基于商户税前价格计算
  ├─→ 计算Agent佣金
  ├─→ 计算PayMind平台费
  └─→ 计算商户实际收入
    ↓
[阶段6: 结算分派]
  ├─→ 资金托管（如需要）
  ├─→ 结算分派
  └─→ 完成支付
```

#### 5.2.2 支付服务调整

```typescript
@Injectable()
export class PaymentService {
  /**
   * 创建支付（支持商户价格设置）
   */
  async createPayment(
    userId: string,
    productId: string,
    countryCode: string,
    currency: string,
    paymentMethod?: PaymentMethod,
  ): Promise<Payment> {
    // 1. 获取商品信息
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    
    // 2. 获取商户价格设置
    const pricing = await this.pricingService.getProductPrice(
      productId,
      countryCode,
      paymentMethod,
    );
    
    // 3. 如果没有指定支付方式，使用智能路由推荐
    if (!paymentMethod) {
      const routing = await this.smartRouter.selectBestChannel(
        productId,
        countryCode,
        currency,
      );
      paymentMethod = routing.recommendedMethod;
      // 使用推荐通道的价格
      const recommendedPricing = await this.pricingService.getProductPrice(
        productId,
        countryCode,
        paymentMethod,
      );
      pricing.finalPrice = recommendedPricing.finalPrice;
      pricing.basePrice = recommendedPricing.basePrice;
      pricing.taxAmount = recommendedPricing.taxAmount;
    }
    
    // 4. 创建支付记录
    const payment = await this.paymentRepository.save({
      userId,
      productId,
      merchantId: product.merchantId,
      amount: pricing.finalPrice,      // 用户支付金额（含税）
      baseAmount: pricing.basePrice,   // 商户税前价格
      taxAmount: pricing.taxAmount,    // 税费
      taxRate: pricing.taxRate,        // 税率
      currency,
      countryCode,
      paymentMethod,
      status: PaymentStatus.PENDING,
    });
    
    return payment;
  }
  
  /**
   * 处理支付成功（支持商户价格设置）
   */
  async processPaymentSuccess(
    paymentId: string,
  ): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });
    
    // 分佣计算基于商户税前价格
    const baseAmount = payment.baseAmount;
    
    // 计算分佣
    await this.commissionService.calculateCommission(
      paymentId,
      baseAmount, // 使用商户税前价格
    );
    
    // 计算商户实际收入
    const channelFee = await this.calculateChannelFee(payment);
    const agentCommission = await this.calculateAgentCommission(payment, baseAmount);
    const paymindFee = await this.calculatePayMindFee(payment, baseAmount);
    
    const merchantIncome = baseAmount - channelFee - agentCommission - paymindFee;
    
    // 更新支付记录
    payment.status = PaymentStatus.COMPLETED;
    payment.merchantIncome = merchantIncome;
    await this.paymentRepository.save(payment);
  }
}
```

### 5.3 商户后台界面设计

#### 5.3.1 商品价格设置页面

```
┌─────────────────────────────────────────────────────────┐
│  商品价格设置 - iPhone 15 Pro Max                        │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  基础价格设置                                    │   │
│  │                                                   │   │
│  │  基础价格：[$1,000.00] [USD ▼]                   │   │
│  │  ☑️ 价格含税                                      │   │
│  │                                                   │   │
│  │  💡 基础价格将作为默认价格，适用于未设置特定国家  │   │
│  │     或通道价格的情况。                            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  国家价格设置                                    │   │
│  │                                                   │   │
│  │  [+ 添加国家价格]                                 │   │
│  │                                                   │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │  🇬🇧 英国                                │   │   │
│  │  │  价格：$1,200.00                        │   │   │
│  │  │  税费：VAT 20%（已包含）                 │   │   │
│  │  │  原因：英国VAT税率较高                    │   │   │
│  │  │  [编辑] [删除]                            │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  通道价格设置                                    │   │
│  │                                                   │   │
│  │  [+ 添加通道价格]                                 │   │
│  │                                                   │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │  💳 Stripe（英国）                       │   │   │
│  │  │  价格：$1,229.00                        │   │   │
│  │  │  基础价格：$1,200.00                    │   │   │
│  │  │  通道费用：$29.00（用户承担）            │   │   │
│  │  │  税费：VAT 20%（已包含）                 │   │   │
│  │  │  [编辑] [删除]                            │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                                                   │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │  ⚡ X402协议（英国）                      │   │   │
│  │  │  价格：$1,200.60                        │   │   │
│  │  │  基础价格：$1,200.00                    │   │   │
│  │  │  通道费用：$0.60（商户承担）              │   │   │
│  │  │  税费：VAT 20%（已包含）                 │   │   │
│  │  │  [编辑] [删除]                            │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  价格预览                                        │   │
│  │                                                   │   │
│  │  国家/通道 | 最终价格 | 基础价格 | 税费 | 通道费用 │   │
│  │  ─────────────────────────────────────────────   │   │
│  │  英国/X402 | $1,200.60 | $1,000.00 | $200.00 | $0.60 │   │
│  │  英国/Stripe | $1,229.00 | $1,000.00 | $200.00 | $29.00 │   │
│  │  美国/X402 | $1,050.60 | $1,000.00 | $50.00 | $0.60 │   │
│  │  美国/Stripe | $1,079.00 | $1,000.00 | $50.00 | $29.00 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  [取消]                                    [保存]          │
└─────────────────────────────────────────────────────────┘
```

### 5.4 用户前端界面调整

#### 5.4.1 支付界面调整

```
┌─────────────────────────────────────────────────────────┐
│                    PayMind 支付                          │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │              订单信息                             │   │
│  │                                                   │   │
│  │  📦 商品名称：iPhone 15 Pro Max                  │   │
│  │  💰 商品价格：$1,000.00（基础价格）               │   │
│  │  📊 数量：1                                      │   │
│  │  🏪 商户：Apple Store                            │   │
│  │  🌍 您的国家：英国                                │   │
│  │                                                   │   │
│  │  ─────────────────────────────────────────────   │   │
│  │                                                   │   │
│  │  💵 支付金额：$1,200.60（含税）                  │   │
│  │  💳 税费（VAT 20%）：$200.00                      │   │
│  │  💡 通道费用：由商户承担（不向您收费）            │   │
│  │                                                   │   │
│  │  ─────────────────────────────────────────────   │   │
│  │                                                   │   │
│  │  ✅ 总计：$1,200.60                              │   │
│  │                                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ⭐ 推荐支付方式                                │   │
│  │                                                   │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │  ⚡ X402协议支付                         │   │   │
│  │  │                                         │   │   │
│  │  │  💰 支付金额：$1,200.60                │   │   │
│  │  │  ⚡ 处理速度：1-3秒                      │   │   │
│  │  │  ✅ 成功率：99.8%                        │   │   │
│  │  │  🔒 安全性：极高                          │   │   │
│  │  │                                         │   │   │
│  │  │  💡 推荐理由：价格最低，速度最快          │   │   │
│  │  │                                         │   │   │
│  │  │  [使用此方式支付]                        │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                                                   │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │  📊 价格对比                             │   │   │
│  │  │                                         │   │   │
│  │  │  X402协议：$1,200.60（推荐）            │   │   │
│  │  │  Wallet支付：$1,201.00                  │   │   │
│  │  │  Stripe支付：$1,229.00                  │   │   │
│  │  │                                         │   │   │
│  │  │  💡 价格由商户设置，不同通道价格可能不同  │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                                                   │   │
│  │  [查看其他支付方式]                               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  [取消]                                    [继续支付 →]  │
└─────────────────────────────────────────────────────────┘
```

---

## 10. 迁移策略

### 6.1 数据迁移

#### 6.1.1 现有数据迁移

**步骤1：创建价格设置表**
- 创建 `product_prices` 表
- 创建 `product_country_prices` 表
- 创建 `product_channel_prices` 表

**步骤2：迁移现有商品价格**
- 从 `products` 表读取现有价格
- 创建基础价格记录
- 为有国家差异的商品创建国家价格记录

**步骤3：更新支付记录表**
- 添加 `country_code` 字段
- 添加 `base_amount` 字段
- 添加 `tax_amount` 字段
- 添加 `tax_rate` 字段

### 6.2 功能迁移

#### 6.2.1 分阶段迁移

**阶段1：基础功能（1-2周）**
- 实现价格设置功能
- 实现价格获取服务
- 更新智能路由服务

**阶段2：支付流程（1-2周）**
- 更新支付创建流程
- 更新支付处理流程
- 更新分佣计算逻辑

**阶段3：界面更新（1周）**
- 更新商户后台界面
- 更新用户前端界面
- 更新API文档

**阶段4：测试和优化（1周）**
- 功能测试
- 性能优化
- 用户体验优化

### 6.3 兼容性处理

#### 6.3.1 向后兼容

**策略**：
- 支持旧API（逐步废弃）
- 新API优先使用商户价格设置
- 如果没有价格设置，使用默认价格

**实现**：
```typescript
async getProductPrice(
  productId: string,
  countryCode: string,
  channel?: PaymentMethod,
): Promise<ProductPrice> {
  // 1. 尝试获取商户设置的价格
  const merchantPrice = await this.getMerchantPrice(
    productId,
    countryCode,
    channel,
  );
  
  if (merchantPrice) {
    return merchantPrice;
  }
  
  // 2. 如果没有设置，使用默认价格（向后兼容）
  const product = await this.productRepository.findOne({
    where: { id: productId },
  });
  
  const taxRate = await this.getTaxRate(countryCode);
  return {
    finalPrice: product.price * (1 + taxRate),
    basePrice: product.price,
    taxAmount: product.price * taxRate,
    taxRate,
    taxIncluded: true,
  };
}
```

---

## 7. 总结

### 11.1 核心影响总结

#### 11.1.1 智能路由影响

1. **价格获取**：需要从商户价格设置中获取价格，而非自己计算
2. **全球支持**：支持全球200+国家，150+种货币
3. **通道选择**：基于商户设置的价格进行推荐
4. **价格对比**：显示各通道的商户设置价格对比

#### 11.1.2 支付流程影响

1. **流程调整**：需要先获取价格，再进行路由
2. **统一流程**：保持7阶段统一支付流程不变
3. **三层ID**：集成User ID、Agent ID、Session ID
4. **SLA记录**：记录支付相关的SLA指标

#### 11.1.3 分佣计算影响

1. **计算基础**：基于商户税前价格（basePrice）
2. **简化计算**：商户价格 × 固定佣金比例
3. **行业对标**：参考Amazon、eBay等主流平台佣金比例
4. **类型区分**：根据商品类型和类别设定不同佣金比例

#### 11.1.4 Agent ID体系影响

1. **多链支持**：支持ERC 8004、W3C DID、多链注册
2. **协议兼容**：支持Ethereum、Solana、BSC、Polygon、Base等
3. **ID解析**：需要解析多链Agent ID
4. **分佣关联**：分佣计算需要关联Agent ID

#### 11.1.5 SLA治理影响

1. **指标记录**：记录支付成功率、响应时间、可用性等
2. **合规检查**：检查SLA是否达标
3. **违约处理**：触发SLA违约时的补偿机制
4. **追责机制**：基于三层ID的追责体系

### 11.2 产品设计改变总结

#### 11.2.1 新增功能

1. **价格管理**：
   - 商品价格设置（基础价格、国家价格、通道价格）
   - 价格模板管理
   - 价格历史记录
   - 价格分析报表

2. **税费管理**：
   - 税费计算工具
   - 税费报表
   - 税费设置（含税/不含税）
   - 税费豁免管理

3. **Agent ID管理**：
   - 多链Agent ID注册
   - ERC 8004协议支持
   - DID协议支持
   - 跨链Agent ID映射

4. **SLA管理**：
   - SLA指标记录
   - SLA合规检查
   - SLA违约处理
   - SLA报表

#### 11.2.2 修改功能

1. **智能路由**：
   - 基于商户价格进行路由决策
   - 支持全球200+国家，150+种货币
   - 价格权重提升至40%

2. **支付流程**：
   - 先获取价格，再进行路由
   - 集成三层ID体系
   - 记录SLA指标

3. **分佣计算**：
   - 基于商户税前价格计算
   - 使用固定佣金比例
   - 支持行业对标佣金比例

4. **收入显示**：
   - 区分商户税前收入和实际收入
   - 显示税费明细
   - 显示通道费用
   - 显示分佣明细

#### 11.2.3 界面调整

1. **商户后台**：
   - 价格设置页面
   - 税费管理页面
   - Agent ID管理页面
   - SLA监控页面

2. **用户前端**：
   - 价格显示和对比
   - 支付方式选择
   - 订单价格明细

### 11.3 技术架构改变

#### 11.3.1 数据库设计

**新增表**：
- `product_prices` - 商品基础价格
- `product_country_prices` - 商品国家价格
- `product_channel_prices` - 商品通道价格
- `agent_identities` - Agent身份表（多链）
- `agent_chain_identities` - Agent多链身份表
- `sla_records` - SLA记录表
- `tax_rates` - 税费配置表
- `order_taxes` - 订单税费记录表

**修改表**：
- `payments` - 添加 `country_code`、`base_amount`、`tax_amount`、`tax_rate`、`session_id`

#### 11.3.2 后端服务

**新增服务**：
- `PricingService` - 价格管理服务
- `TaxService` - 税费管理服务
- `AgentIdentityService` - Agent身份服务（多链）
- `SLAService` - SLA管理服务

**修改服务**：
- `SmartRouterService` - 支持商户价格设置
- `PaymentService` - 支持价格获取和税费处理
- `CommissionCalculatorService` - 基于商户税前价格计算

#### 11.3.3 API调整

**新增API**：
- `GET /api/products/:productId/pricing` - 获取商品价格
- `POST /api/products/:productId/pricing` - 设置商品价格
- `POST /api/tax/calculate` - 计算税费
- `GET /api/tax/reports` - 获取税费报表
- `GET /api/agents/:agentId/identity` - 获取Agent身份（多链）
- `GET /api/sla/records` - 获取SLA记录

**修改API**：
- `GET /api/payments/routing` - 参数改为 `productId` 和 `countryCode`
- `POST /api/payments` - 参数改为 `productId` 和 `countryCode`

### 11.4 实施建议

#### 11.4.1 分阶段实施

**阶段1：基础功能（2-3周）**
- 实现价格设置功能
- 实现价格获取服务
- 更新智能路由服务
- 更新支付流程

**阶段2：分佣和税费（1-2周）**
- 实现简化分佣计算
- 实现税费计算和报表
- 更新收入显示

**阶段3：Agent ID和SLA（1-2周）**
- 实现多链Agent ID支持
- 实现ERC 8004协议支持
- 实现SLA记录和监控

**阶段4：界面更新（1周）**
- 更新商户后台界面
- 更新用户前端界面
- 更新API文档

**阶段5：测试和优化（1-2周）**
- 功能测试
- 性能优化
- 用户体验优化

#### 11.4.2 向后兼容

**策略**：
- 支持旧API（逐步废弃）
- 新API优先使用商户价格设置
- 如果没有价格设置，使用默认价格
- 如果没有Agent ID，使用默认分佣逻辑

#### 11.4.3 数据迁移

**步骤**：
1. 创建新表结构
2. 迁移现有商品价格
3. 迁移现有支付记录
4. 更新Agent ID数据
5. 初始化SLA记录

---

**此分析确保了PayMind系统能够支持商户自主定价模式，同时保持智能路由和支付流程的完整性和准确性。**

