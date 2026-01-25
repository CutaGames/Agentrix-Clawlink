# Agentrix Agent Runtime 与基础模型协同方案

## 📋 核心问题

**Agent Runtime架构** 和 **基础模型底座** 的先后顺序和协同方式是什么？

---

## 🎯 架构关系分析

### 架构层次

```
┌─────────────────────────────────────────┐
│      Agent Runtime（编排层）              │
│  - Memory System                         │
│  - Workflow Engine                       │
│  - Skills Registry                       │
│  - Intent Recognition                    │
└──────────────┬──────────────────────────┘
               │ 调用
┌──────────────▼──────────────────────────┐
│      基础模型底座（能力层）                │
│  - TransactionFoundationModel           │
│  - AssetFoundationModel                 │
│  - MerchantFoundationModel              │
│  - DeveloperFoundationModel             │
└──────────────┬──────────────────────────┘
               │ 使用
┌──────────────▼──────────────────────────┐
│      现有服务层（业务逻辑）                │
│  - PaymentService                       │
│  - OrderService                         │
│  - ProductService                       │
│  - ...                                  │
└─────────────────────────────────────────┘
```

### 依赖关系

**Runtime依赖基础模型**：
- Runtime通过Skills调用基础模型的能力
- 基础模型是Runtime的能力提供者

**基础模型依赖现有服务**：
- 基础模型封装和统一现有服务的接口
- 提供更高层次的抽象

---

## 🚀 推荐实施顺序

### 方案A：先Runtime后基础模型（推荐）⭐

**理由**：
1. **Runtime是框架，可以先搭建框架**
2. **基础模型可以逐步集成**
3. **可以先用现有服务作为临时能力提供者**

#### 实施步骤

**阶段1：实现Runtime框架（2周）**

```typescript
// 1. 实现Memory系统
class AgentMemoryService {
  async saveContext(sessionId: string, context: AgentContext): Promise<void>
  async getContext(sessionId: string): Promise<AgentContext>
  async updateContext(sessionId: string, updates: Partial<AgentContext>): Promise<void>
}

// 2. 实现Workflow引擎
class WorkflowEngine {
  defineWorkflow(workflow: WorkflowDefinition): void
  async executeWorkflow(workflowId: string, input: any): Promise<WorkflowResult>
  async resumeWorkflow(workflowId: string, step: number): Promise<WorkflowResult>
}

// 3. 实现Skills系统（先使用现有服务）
class SkillsRegistry {
  // 临时：直接调用现有服务
  registerSkill({
    id: 'product_search',
    execute: async (params, context) => {
      // 临时：直接调用SearchService
      return await searchService.semanticSearch(params.query);
    }
  })
}
```

**阶段2：实现电商流程Workflow（1周）**

```typescript
// 定义电商流程（使用现有服务）
const shoppingWorkflow: WorkflowDefinition = {
  id: 'shopping',
  steps: [
    {
      id: 'search',
      skill: 'product_search',  // 临时：直接调用SearchService
      input: { query: '{{userQuery}}' },
      output: { products: '{{products}}' }
    },
    {
      id: 'add_to_cart',
      skill: 'add_to_cart',  // 临时：直接调用CartService
      input: { product: '{{selectedProduct}}' },
      output: { cart: '{{cart}}' }
    },
    // ...
  ]
};
```

**阶段3：逐步实现基础模型（2-3周）**

```typescript
// 实现TransactionFoundationModel
class TransactionFoundationModel {
  async routePayment(context: RoutingContext): Promise<PaymentRoute> {
    // 整合现有PaymentService
    return await this.paymentService.smartRoute(context);
  }
  
  async assessRisk(transaction: Transaction): Promise<RiskAssessment> {
    // 整合现有RiskAssessmentService
    return await this.riskAssessmentService.assess(transaction);
  }
}

// 在Runtime中替换临时实现
class SkillsRegistry {
  // 替换：使用基础模型
  registerSkill({
    id: 'payment',
    execute: async (params, context) => {
      // 使用TransactionFoundationModel
      return await this.foundationModels.transaction.routePayment(params);
    }
  })
}
```

**优点**：
- ✅ 可以快速搭建框架，解决当前问题
- ✅ 基础模型可以并行开发
- ✅ 逐步替换，风险可控

**缺点**：
- ⚠️ 需要重构一次（从临时实现到基础模型）

---

### 方案B：先基础模型后Runtime

**理由**：
1. **先统一能力层，再搭建编排层**
2. **基础模型是Runtime的依赖**

#### 实施步骤

**阶段1：实现基础模型（3-4周）**

```typescript
// 1. TransactionFoundationModel
class TransactionFoundationModel {
  // 整合现有PaymentService、RiskAssessmentService等
}

// 2. AssetFoundationModel
class AssetFoundationModel {
  // 整合现有AssetAggregationService等
}

// 3. MerchantFoundationModel
class MerchantFoundationModel {
  // 整合现有OrderService、ProductService等
}
```

**阶段2：实现Runtime框架（2周）**

```typescript
// Runtime直接使用基础模型
class AgentRuntime {
  private foundationModels: {
    transaction: TransactionFoundationModel;
    asset: AssetFoundationModel;
    merchant: MerchantFoundationModel;
  };
  
  constructor() {
    // 直接使用已实现的基础模型
    this.foundationModels = {
      transaction: new TransactionFoundationModel(),
      asset: new AssetFoundationModel(),
      merchant: new MerchantFoundationModel(),
    };
  }
}
```

**优点**：
- ✅ 架构更清晰，不需要重构
- ✅ 基础模型先统一，Runtime直接使用

**缺点**：
- ❌ 开发周期长（5-6周）
- ❌ 无法快速解决当前问题

---

### 方案C：并行开发（最佳）⭐⭐⭐

**理由**：
1. **Runtime和基础模型可以并行开发**
2. **通过接口解耦**
3. **可以快速迭代**

#### 实施步骤

**第1-2周：并行开发**

```
团队A：实现Runtime框架
  ├─ Memory系统
  ├─ Workflow引擎
  └─ Skills系统（定义接口）

团队B：实现基础模型
  ├─ TransactionFoundationModel
  ├─ AssetFoundationModel
  └─ 定义统一接口
```

**第3周：集成**

```typescript
// Runtime通过接口调用基础模型
interface IFoundationModel {
  // 定义统一接口
}

class AgentRuntime {
  private foundationModels: {
    transaction: IFoundationModel;
    asset: IFoundationModel;
  };
  
  // Runtime不关心具体实现，只关心接口
  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    const skill = this.skills.getSkillByIntent(request.intent);
    // 通过接口调用基础模型
    return await skill.execute(request, this.foundationModels);
  }
}
```

**第4-6周：完善和优化**

- 完善基础模型实现
- 优化Runtime性能
- 测试和修复

**优点**：
- ✅ 开发效率最高
- ✅ 可以快速解决问题
- ✅ 架构清晰，接口解耦

**缺点**：
- ⚠️ 需要团队协调
- ⚠️ 需要定义清晰的接口

---

## 🔄 协同方式

### 1. 接口定义（解耦）

```typescript
// 定义基础模型接口
interface ITransactionFoundationModel {
  routePayment(context: RoutingContext): Promise<PaymentRoute>;
  assessRisk(transaction: Transaction): Promise<RiskAssessment>;
  estimateFees(route: PaymentRoute): Promise<FeeEstimate>;
}

interface IAssetFoundationModel {
  aggregateAssets(userId: string): Promise<AggregatedAssets>;
  classifyTransaction(transaction: Transaction): Promise<TransactionCategory>;
}

// Runtime通过接口使用
class AgentRuntime {
  constructor(
    private transactionModel: ITransactionFoundationModel,
    private assetModel: IAssetFoundationModel,
  ) {}
}
```

### 2. Skills作为桥梁

```typescript
// Skill连接Runtime和基础模型
class PaymentSkill implements Skill {
  constructor(
    private transactionModel: ITransactionFoundationModel,
  ) {}
  
  async execute(params: any, context: AgentContext): Promise<SkillResult> {
    // 调用基础模型
    const route = await this.transactionModel.routePayment({
      amount: params.amount,
      currency: params.currency,
      userId: context.userId,
    });
    
    return {
      success: true,
      data: route,
    };
  }
}
```

### 3. Workflow编排

```typescript
// Workflow使用Skills，Skills调用基础模型
const paymentWorkflow: WorkflowDefinition = {
  id: 'payment',
  steps: [
    {
      id: 'estimate_fee',
      skill: 'payment_estimate',  // Skill调用TransactionFoundationModel
      input: { amount: '{{amount}}' },
      output: { fee: '{{fee}}' }
    },
    {
      id: 'assess_risk',
      skill: 'risk_assessment',  // Skill调用TransactionFoundationModel
      input: { transaction: '{{transaction}}' },
      output: { risk: '{{risk}}' }
    },
    {
      id: 'route_payment',
      skill: 'payment_route',  // Skill调用TransactionFoundationModel
      input: { context: '{{context}}' },
      output: { route: '{{route}}' }
    }
  ]
};
```

---

## 📊 方案对比

| 方案 | 开发周期 | 解决速度 | 架构清晰度 | 推荐度 |
|------|---------|---------|-----------|--------|
| 方案A：先Runtime | 4-5周 | ⭐⭐⭐ 快 | ⭐⭐⭐ 中 | ⭐⭐⭐⭐ |
| 方案B：先基础模型 | 5-6周 | ⭐⭐ 慢 | ⭐⭐⭐⭐⭐ 高 | ⭐⭐⭐ |
| 方案C：并行开发 | 4-6周 | ⭐⭐⭐⭐ 最快 | ⭐⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐⭐ |

---

## 🎯 推荐方案：并行开发（方案C）

### 实施计划

#### 第1-2周：并行开发基础

**团队A：Runtime框架**
- [ ] 实现Memory系统
- [ ] 实现Workflow引擎框架
- [ ] 实现Skills系统框架
- [ ] 定义基础模型接口

**团队B：基础模型**
- [ ] 实现TransactionFoundationModel（整合现有PaymentService）
- [ ] 实现AssetFoundationModel（整合现有AssetAggregationService）
- [ ] 实现基础模型接口

#### 第3周：集成

- [ ] Runtime集成基础模型
- [ ] 实现电商流程Workflow
- [ ] 测试基础流程

#### 第4-5周：完善

- [ ] 完善基础模型功能
- [ ] 优化Runtime性能
- [ ] 实现更多Workflow

#### 第6周：优化

- [ ] 性能优化
- [ ] 错误处理
- [ ] 测试和修复

---

## 🔗 协同接口设计

### 1. 基础模型接口定义

```typescript
// backend/src/modules/foundation/interfaces/foundation-model.interface.ts

export interface ITransactionFoundationModel {
  routePayment(context: RoutingContext): Promise<PaymentRoute>;
  assessRisk(transaction: Transaction): Promise<RiskAssessment>;
  estimateFees(route: PaymentRoute): Promise<FeeEstimate>;
  buildTransaction(chain: Chain, type: TransactionType, params: TransactionParams): Promise<Transaction>;
  checkCompliance(user: User, transaction: Transaction): Promise<ComplianceResult>;
}

export interface IAssetFoundationModel {
  aggregateAssets(userId: string): Promise<AggregatedAssets>;
  aggregateFiatAccounts(userId: string): Promise<FiatAccount[]>;
  classifyTransaction(transaction: Transaction): Promise<TransactionCategory>;
  assessAssetRisk(assets: AggregatedAssets): Promise<RiskRecommendation>;
  generateHealthReport(userId: string): Promise<AssetHealthReport>;
}

export interface IMerchantFoundationModel {
  extractProductKnowledge(product: Product): Promise<ProductKnowledge>;
  processOrderFlow(order: Order): Promise<OrderFlowResult>;
  predictInventory(productId: string, days: number): Promise<InventoryForecast>;
  calculateCommission(order: Order, referralChain: ReferralChain): Promise<CommissionDistribution>;
}

export interface IDeveloperFoundationModel {
  generateAPI(spec: APISpec): Promise<GeneratedAPI>;
  generateSDK(apiSpec: APISpec, language: string): Promise<GeneratedSDK>;
  generateRPCWrapper(chain: Chain, functions: RPCFunction[]): Promise<RPCWrapper>;
  generateDevOps(projectType: string, deploymentTarget: string): Promise<DevOpsConfig>;
}
```

### 2. Runtime使用基础模型

```typescript
// backend/src/modules/agent/runtime/agent-runtime.ts

export class AgentRuntime {
  private foundationModels: {
    transaction: ITransactionFoundationModel;
    asset: IAssetFoundationModel;
    merchant: IMerchantFoundationModel;
    developer: IDeveloperFoundationModel;
  };
  
  constructor(
    transactionModel: ITransactionFoundationModel,
    assetModel: IAssetFoundationModel,
    merchantModel: IMerchantFoundationModel,
    developerModel: IDeveloperFoundationModel,
  ) {
    this.foundationModels = {
      transaction: transactionModel,
      asset: assetModel,
      merchant: merchantModel,
      developer: developerModel,
    };
  }
  
  // Skills通过Runtime访问基础模型
  async executeSkill(skill: Skill, params: any, context: AgentContext): Promise<SkillResult> {
    // Skill可以访问foundationModels
    return await skill.execute(params, context, this.foundationModels);
  }
}
```

### 3. Skill实现示例

```typescript
// backend/src/modules/agent/skills/payment-skill.ts

export class PaymentSkill implements Skill {
  id = 'payment_route';
  
  async execute(
    params: any,
    context: AgentContext,
    foundationModels: {
      transaction: ITransactionFoundationModel;
    }
  ): Promise<SkillResult> {
    // 调用基础模型
    const route = await foundationModels.transaction.routePayment({
      amount: params.amount,
      currency: params.currency,
      userId: context.userId,
    });
    
    return {
      success: true,
      data: route,
    };
  }
}
```

---

## 📝 实施建议

### 立即开始：并行开发（方案C）

**第1-2周**：
- **团队A**：实现Runtime框架（Memory、Workflow、Skills）
- **团队B**：实现基础模型（Transaction、Asset）

**第3周**：
- 集成Runtime和基础模型
- 实现电商流程Workflow
- 测试基础流程

**第4-6周**：
- 完善基础模型
- 优化Runtime
- 实现更多Workflow

### 关键成功因素

1. **接口先行**：先定义接口，再实现
2. **并行开发**：Runtime和基础模型可以并行
3. **逐步集成**：先集成核心功能，再扩展
4. **持续测试**：每个阶段都要测试

---

## 🎯 总结

### 先后顺序

**推荐：并行开发，Runtime优先集成**

1. **第1-2周**：Runtime框架 + 基础模型接口定义
2. **第2-3周**：基础模型实现 + Runtime集成
3. **第4-6周**：完善和优化

### 协同方式

1. **接口解耦**：Runtime通过接口调用基础模型
2. **Skills桥梁**：Skills连接Runtime和基础模型
3. **Workflow编排**：Workflow使用Skills，Skills调用基础模型

### 架构关系

```
Agent Runtime（编排层）
    ↓ 通过接口
基础模型底座（能力层）
    ↓ 整合
现有服务层（业务逻辑）
```

**关键**：Runtime是框架，基础模型是能力提供者，通过接口解耦，可以并行开发。

