# PayMind 底座大模型架构与调用流程说明

**版本**: V1.0  
**日期**: 2025-01-XX  
**定位**: Groq作为**临时底座大模型**，通过统一接口为Runtime和Agent提供智能支持，逐步过渡到自建模型

---

## 📋 核心定位

### Groq的定位

1. **临时底座大模型**（当前阶段）
   - 通过统一接口为Foundation Models提供AI能力
   - 原因：自建底座大模型数据不足，还不够智能
   - 逐步收集数据，训练优化自建模型

2. **AI生态之一**（长期）
   - Groq也可以作为接入的AI平台之一
   - 类似OpenAI、Claude等，提供Function Calling能力
   - 通过CapabilityRegistry注册，供Agent使用

---

## 🏗️ 可扩展底座大模型架构

### 架构设计原则

1. **统一接口抽象** - `IFoundationLLM`接口，支持多种实现
2. **可插拔实现** - 支持Groq、自建模型、其他LLM提供商
3. **平滑过渡** - 支持逐步从Groq切换到自建模型
4. **数据收集** - 自动收集训练数据，优化自建模型

### 架构层次

```
┌─────────────────────────────────────────────────────────────┐
│                    应用层（调用方）                            │
│  SDK调用  │  OpenAI等AI平台  │  PayMind Agent              │
└───────────┬───────────────────┬─────────────────────────────┘
            │                   │                    │
            │                   │                    │
┌───────────▼───────────┐  ┌───▼──────────┐  ┌─────▼──────────────┐
│  SDK API              │  │  AI平台集成    │  │  Agent Runtime      │
│  /api/sdk/*           │  │  /api/openai/*│  │  AgentService       │
└───────────┬───────────┘  └───┬──────────┘  └─────┬──────────────┘
            │                   │                    │
            └───────────────────┴────────────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │   Foundation Models      │
                    │  - TransactionFoundation │
                    │  - AssetFoundation       │
                    │  - IntentEngine          │
                    └───────────┬──────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │   底座大模型接口层          │
                    │   IFoundationLLM          │
                    │   (统一抽象接口)           │
                    └───────────┬──────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼────────┐  ┌──────────▼──────────┐  ┌─────────▼──────────┐
│ Groq实现       │  │ 自建模型实现         │  │ 其他LLM实现        │
│ (临时)         │  │ (逐步过渡)          │  │ (可选)             │
│ GroqFoundation │  │ PayMindFoundation   │  │ OpenAIFoundation   │
│ LLM            │  │ LLM                 │  │ ClaudeFoundation   │
└────────────────┘  └─────────────────────┘  └────────────────────┘
```

---

## 🔌 底座大模型接口定义

### IFoundationLLM接口

**文件**: `backend/src/modules/foundation/interfaces/foundation-llm.interface.ts`

```typescript
/**
 * 底座大模型统一接口
 * 支持多种实现：Groq（临时）、自建模型（目标）、其他LLM提供商
 */
export interface IFoundationLLM {
  /**
   * 意图识别
   * 将自然语言转换为结构化意图
   */
  recognizeIntent(
    text: string,
    context?: {
      userId?: string;
      history?: any[];
      sessionId?: string;
    }
  ): Promise<IntentRecognitionResult>;

  /**
   * 风险评估
   * 基于交易上下文进行风险评分
   */
  assessRisk(
    transaction: TransactionContext,
    userHistory?: any[]
  ): Promise<RiskAssessmentResult>;

  /**
   * 交易分类
   * AI Ledger自动分类交易
   */
  classifyTransaction(
    transaction: TransactionData,
    userContext?: any
  ): Promise<TransactionCategory>;

  /**
   * 路由建议
   * 基于上下文建议最优支付路由
   */
  suggestPaymentRoute(
    context: RoutingContext,
    options?: RouteOptions[]
  ): Promise<RouteSuggestion>;

  /**
   * 资产分析
   * 分析资产健康度和风险
   */
  analyzeAssets(
    assets: AggregatedAssets,
    userContext?: any
  ): Promise<AssetAnalysis>;

  /**
   * 获取模型信息
   */
  getModelInfo(): {
    provider: string; // 'groq' | 'paymind' | 'openai' | 'claude'
    modelName: string;
    version: string;
    isTemporary: boolean; // 是否为临时实现
  };
}
```

---

## 🔄 三个场景的调用流程

### 场景1：SDK调用流程

**场景描述**：开发者通过PayMind SDK调用智能能力

```
开发者代码
  ↓
agent.marketplace.searchProducts('AI咨询服务')
  ↓
SDK发送HTTP请求
  ↓
POST /api/sdk/marketplace/search
  {
    "query": "AI咨询服务",
    "userId": "user_123",
    "apiKey": "sk_xxx"
  }
  ↓
SDKController.search()
  ↓
AgentService.processMessage()
  ↓
AgentRuntimeIntegrationService.processMessageWithRuntime()
  ↓
意图识别: IntentEngineService.recognizeIntent()
  ↓
  ├─ 规则引擎识别（快速）
  ├─ 如果置信度 < 70%
  └─ 调用底座大模型: IFoundationLLM.recognizeIntent()
      ↓
      GroqFoundationLLM.recognizeIntent()
      (或 PayMindFoundationLLM.recognizeIntent() - 未来)
      ↓
      返回意图识别结果
  ↓
创建Workflow: EcommerceWorkflow
  ↓
执行Skill: ProductSearchSkill
  ↓
调用Foundation Model: TransactionFoundationModel
  ↓
  ├─ 路由建议: routePayment()
  │   └─ 使用底座大模型: IFoundationLLM.suggestPaymentRoute()
  │
  └─ 风险评估: assessRisk()
      └─ 使用底座大模型: IFoundationLLM.assessRisk()
  ↓
SearchService.semanticSearch()
  ↓
返回统一格式结果
  {
    "products": [...],
    "query": "AI咨询服务",
    "total": 10
  }
  ↓
SDK返回结果给开发者
```

**关键点**：
- SDK通过REST API调用
- 经过Agent Runtime处理
- 意图识别使用底座大模型增强
- Foundation Models使用底座大模型提供AI能力

---

### 场景2：OpenAI等其他AI平台调用流程

**场景描述**：用户通过ChatGPT等AI平台，使用PayMind能力

```
用户在ChatGPT中
  ↓
用户输入: "帮我找AI咨询服务"
  ↓
ChatGPT识别需要调用Function
  ↓
调用 search_paymind_products({ query: 'AI咨询服务' })
  ↓
OpenAIIntegrationService.executeFunctionCall()
  ↓
CapabilityExecutorService.execute('executor_search', params)
  ↓
SearchServiceExecutor.execute()
  ↓
SearchService.semanticSearch()
  ↓
返回商品列表
  ↓
ChatGPT格式化展示给用户
```

**同时，如果ChatGPT需要智能决策**：

```
ChatGPT需要智能路由建议
  ↓
调用 pay_paymind_order({ order_id: 'xxx', amount: 100 })
  ↓
OpenAIIntegrationService.executeFunctionCall()
  ↓
PaymentService.processPayment()
  ↓
TransactionFoundationModel.routePayment()
  ↓
  ├─ 基础路由计算（规则引擎）
  └─ 使用底座大模型增强: IFoundationLLM.suggestPaymentRoute()
      ↓
      GroqFoundationLLM.suggestPaymentRoute()
      ↓
      返回智能路由建议
  ↓
执行支付
  ↓
返回结果给ChatGPT
```

**关键点**：
- AI平台通过Function Calling调用
- 直接调用CapabilityExecutor，不经过Agent Runtime
- 但Foundation Models仍使用底座大模型提供AI能力
- 底座大模型在后台增强决策能力

---

### 场景3：PayMind Agent调用流程

**场景描述**：用户在PayMind Agent工作台与Agent交互

```
用户在Agent工作台
  ↓
用户输入: "我要买AI咨询服务"
  ↓
前端发送请求
POST /api/agent/process
{
  "message": "我要买AI咨询服务",
  "userId": "user_123",
  "sessionId": "session_456"
}
  ↓
AgentService.processMessage()
  ↓
AgentRuntimeIntegrationService.processMessageWithRuntime()
  ↓
AgentRuntime处理
  ├─ MemoryService: 获取上下文
  ├─ IntentEngineService: 识别意图
  │   └─ 使用底座大模型: IFoundationLLM.recognizeIntent()
  │       ↓
  │       GroqFoundationLLM.recognizeIntent()
  │       ↓
  │       返回意图: { intent: 'product_search', ... }
  │
  ├─ WorkflowEngine: 创建Workflow
  │   └─ EcommerceWorkflow
  │
  └─ SkillsRegistry: 执行Skills
      └─ ProductSearchSkill.execute()
          ↓
          调用Foundation Model
          ├─ TransactionFoundationModel.routePayment()
          │   └─ 使用底座大模型: IFoundationLLM.suggestPaymentRoute()
          │
          └─ TransactionFoundationModel.assessRisk()
              └─ 使用底座大模型: IFoundationLLM.assessRisk()
          ↓
          SearchService.semanticSearch()
          ↓
          返回商品列表
  ↓
AgentRuntime格式化响应
  ↓
返回给前端
{
  "response": "我为您找到了以下AI咨询服务...",
  "products": [...],
  "suggestions": [...]
}
  ↓
前端展示商品卡片和智能建议
```

**关键点**：
- 完整的Agent Runtime流程
- Memory、Workflow、Skills协同工作
- 意图识别使用底座大模型
- Foundation Models使用底座大模型增强决策

---

## 🔧 实现细节

### 1. 底座大模型提供者注册

**文件**: `backend/src/modules/foundation/foundation.module.ts`

```typescript
@Module({
  imports: [...],
  providers: [
    // 底座大模型提供者（支持多种实现）
    {
      provide: 'FOUNDATION_LLM',
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('FOUNDATION_LLM_PROVIDER', 'groq');
        
        switch (provider) {
          case 'groq':
            return new GroqFoundationLLM(configService);
          case 'paymind':
            return new PayMindFoundationLLM(configService);
          case 'openai':
            return new OpenAIFoundationLLM(configService);
          default:
            return new GroqFoundationLLM(configService); // 默认使用Groq
        }
      },
      inject: [ConfigService],
    },
    
    // 作为IFoundationLLM接口注入
    {
      provide: IFoundationLLM,
      useExisting: 'FOUNDATION_LLM',
    },
    
    // Foundation Models
    TransactionFoundationModel,
    AssetFoundationModel,
  ],
  exports: [IFoundationLLM, TransactionFoundationModel, AssetFoundationModel],
})
export class FoundationModule {}
```

### 2. Groq实现（临时）

**文件**: `backend/src/modules/foundation/llm-providers/groq-foundation-llm.service.ts`

```typescript
@Injectable()
export class GroqFoundationLLM implements IFoundationLLM {
  private readonly logger = new Logger(GroqFoundationLLM.name);
  private readonly groq: Groq;
  private readonly defaultModel = 'llama-3-groq-70b-tool-use';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      this.logger.warn('GROQ_API_KEY not configured');
      return;
    }
    this.groq = new Groq({ apiKey });
  }

  async recognizeIntent(
    text: string,
    context?: { userId?: string; history?: any[]; sessionId?: string }
  ): Promise<IntentRecognitionResult> {
    // 收集训练数据（用于优化自建模型）
    await this.collectTrainingData('recognizeIntent', { text, context });
    
    // 调用Groq API
    const response = await this.groq.chat.completions.create({
      model: this.defaultModel,
      messages: [
        { role: 'system', content: '你是一个专业的交易意图识别系统。' },
        { role: 'user', content: this.buildIntentPrompt(text, context) }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // 记录使用情况
    await this.logUsage('recognizeIntent', result);
    
    return result;
  }

  // ... 其他方法实现

  getModelInfo() {
    return {
      provider: 'groq',
      modelName: this.defaultModel,
      version: '1.0',
      isTemporary: true, // 标记为临时实现
    };
  }

  /**
   * 收集训练数据（用于优化自建模型）
   */
  private async collectTrainingData(method: string, data: any) {
    // TODO: 保存到数据库，用于训练自建模型
    // await this.trainingDataRepository.save({
    //   method,
    //   input: data,
    //   timestamp: new Date(),
    // });
  }

  /**
   * 记录使用情况
   */
  private async logUsage(method: string, result: any) {
    // TODO: 记录使用统计，用于分析模型效果
  }
}
```

### 3. 自建模型实现（未来）

**文件**: `backend/src/modules/foundation/llm-providers/paymind-foundation-llm.service.ts`

```typescript
@Injectable()
export class PayMindFoundationLLM implements IFoundationLLM {
  private readonly logger = new Logger(PayMindFoundationLLM.name);
  private readonly modelEndpoint: string;

  constructor(private readonly configService: ConfigService) {
    this.modelEndpoint = configService.get<string>('PAYMIND_LLM_ENDPOINT');
  }

  async recognizeIntent(
    text: string,
    context?: { userId?: string; history?: any[]; sessionId?: string }
  ): Promise<IntentRecognitionResult> {
    // 调用自建模型API
    const response = await fetch(`${this.modelEndpoint}/recognize-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, context }),
    });

    return await response.json();
  }

  // ... 其他方法实现

  getModelInfo() {
    return {
      provider: 'paymind',
      modelName: 'paymind-foundation-v1',
      version: '1.0',
      isTemporary: false, // 自建模型，不是临时实现
    };
  }
}
```

### 4. 配置切换

**文件**: `backend/.env`

```env
# 底座大模型提供者配置
# 选项: 'groq' (临时) | 'paymind' (自建) | 'openai' | 'claude'
FOUNDATION_LLM_PROVIDER=groq

# Groq配置（临时使用）
GROQ_API_KEY=your_groq_api_key

# 自建模型配置（未来使用）
PAYMIND_LLM_ENDPOINT=http://localhost:8000/api/v1
PAYMIND_LLM_API_KEY=your_paymind_llm_key

# 数据收集配置
COLLECT_TRAINING_DATA=true
TRAINING_DATA_STORAGE=postgresql
```

---

## 📊 数据收集与模型优化流程

### 训练数据收集

```
用户调用
  ↓
底座大模型处理（Groq）
  ↓
自动收集训练数据
  ├─ 输入: 用户意图文本、上下文
  ├─ 输出: Groq返回的结果
  ├─ 标注: 人工审核（可选）
  └─ 存储: TrainingDataRepository
  ↓
定期训练自建模型
  ├─ 使用收集的数据
  ├─ Fine-tune基础模型
  └─ 评估模型效果
  ↓
逐步切换
  ├─ A/B测试: 部分流量使用自建模型
  ├─ 对比效果: Groq vs 自建模型
  └─ 逐步增加自建模型流量
  ↓
完全切换
  └─ 100%使用自建模型
```

---

## 🔄 平滑过渡策略

### 阶段1：Groq临时使用（当前）

- ✅ 使用Groq作为底座大模型
- ✅ 自动收集训练数据
- ✅ 记录使用情况和效果

### 阶段2：A/B测试（过渡期）

- ✅ 自建模型上线
- ✅ 10%流量使用自建模型，90%使用Groq
- ✅ 对比效果，持续优化

### 阶段3：逐步切换

- ✅ 50%流量使用自建模型
- ✅ 继续收集数据，优化模型
- ✅ 监控效果指标

### 阶段4：完全切换

- ✅ 100%使用自建模型
- ✅ Groq作为备用或AI生态之一

---

## 📝 总结

### Groq的双重角色

1. **临时底座大模型**（当前）
   - 通过`IFoundationLLM`接口为Foundation Models提供AI能力
   - 自动收集训练数据，优化自建模型
   - 逐步过渡到自建模型

2. **AI生态之一**（长期）
   - 通过`CapabilityRegistry`注册Function Calling能力
   - 类似OpenAI、Claude，供Agent直接使用
   - 作为AI平台集成的一部分

### 三个场景的调用路径

| 场景 | 调用路径 | 底座大模型使用 |
|------|---------|---------------|
| **SDK调用** | SDK → Agent Runtime → Foundation Models → IFoundationLLM | ✅ 意图识别、路由建议、风险评估 |
| **AI平台调用** | AI平台 → CapabilityExecutor → Foundation Models → IFoundationLLM | ✅ 路由建议、风险评估（后台增强） |
| **PayMind Agent** | Agent Runtime → Foundation Models → IFoundationLLM | ✅ 意图识别、路由建议、风险评估、资产分析 |

### 关键设计

- ✅ **统一接口** - `IFoundationLLM`抽象，支持多种实现
- ✅ **可插拔** - 支持Groq、自建模型、其他LLM提供商
- ✅ **数据收集** - 自动收集训练数据，优化自建模型
- ✅ **平滑过渡** - 支持A/B测试，逐步切换

---

**最后更新**: 2025-01-XX

