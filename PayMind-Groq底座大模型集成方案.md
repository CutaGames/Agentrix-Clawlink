# PayMind Groq底座大模型集成方案

**版本**: V2.0  
**日期**: 2025-01-XX  
**定位**: Groq作为**临时底座大模型**，通过统一接口为Runtime和Agent提供智能支持，逐步过渡到自建模型

---

## 📋 核心定位

### Groq的双重角色

1. **临时底座大模型**（当前阶段）
   - 通过统一接口为Foundation Models提供AI能力
   - **原因**：自建底座大模型数据不足，还不够智能
   - **目标**：逐步收集数据，训练优化自建模型
   - **过渡策略**：A/B测试 → 逐步切换 → 完全切换

2. **AI生态之一**（长期）
   - Groq也可以作为接入的AI平台之一
   - 类似OpenAI、Claude等，提供Function Calling能力
   - 通过CapabilityRegistry注册，供Agent使用

---

## 📋 架构定位澄清

### ❌ **错误理解（之前）**

```
Agent
  ↓
Groq集成 (Function Calling)
  ↓
PayMind功能 (search_paymind_products, buy_paymind_product)
```

**问题**：将Groq当作类似ChatGPT的Agent集成，直接提供Function Calling。

---

### ✅ **正确理解（现在）**

```
Groq (底座大模型)
  ↓
TransactionFoundationModel / AssetFoundationModel (统一接口)
  ↓
Runtime / Skills
  ↓
Agent功能
```

**定位**：Groq作为**临时底座大模型**，为以下场景提供AI能力：
1. **意图识别** - 自然语言转交易策略
2. **风险评估** - 交易风险评分
3. **交易分类** - AI Ledger自动分类
4. **路由决策** - 智能支付路由建议
5. **资产分析** - 资产健康度分析

**重要说明**：
- Groq是**临时方案**，因为自建底座大模型数据不足
- 系统会**自动收集训练数据**，用于优化自建模型
- 支持**平滑过渡**：A/B测试 → 逐步切换 → 完全使用自建模型
- 详细调用流程请参考：`PayMind-底座大模型架构与调用流程说明.md`

---

## 🏗️ 架构设计

### 1. 底座大模型接口层

**文件**: `backend/src/modules/foundation/interfaces/foundation-llm.interface.ts`

```typescript
/**
 * 底座大模型接口
 * Groq作为实现，为Foundation Models提供AI能力
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
}
```

---

### 2. Groq实现底座大模型接口

**文件**: `backend/src/modules/foundation/llm-providers/groq-foundation-llm.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { IFoundationLLM, IntentRecognitionResult, RiskAssessmentResult } from '../interfaces/foundation-llm.interface';

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

  /**
   * 意图识别
   * 使用Groq将自然语言转换为结构化意图
   */
  async recognizeIntent(
    text: string,
    context?: { userId?: string; history?: any[] }
  ): Promise<IntentRecognitionResult> {
    const prompt = `你是一个交易意图识别专家。分析用户的自然语言输入，识别交易意图。

用户输入: "${text}"

请返回JSON格式的意图识别结果：
{
  "intent": "dca" | "swap" | "rebalancing" | "arbitrage" | "market_making",
  "entities": {
    "amount": 数字,
    "percentage": 百分比,
    "fromToken": "代币符号",
    "toToken": "代币符号",
    "frequency": "daily" | "weekly" | "monthly",
    "schedule": "Cron表达式"
  },
  "confidence": 0-100
}`;

    const response = await this.groq.chat.completions.create({
      model: this.defaultModel,
      messages: [
        { role: 'system', content: '你是一个专业的交易意图识别系统。' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // 降低温度，提高准确性
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  }

  /**
   * 风险评估
   * 使用Groq进行交易风险评估
   */
  async assessRisk(
    transaction: TransactionContext,
    userHistory?: any[]
  ): Promise<RiskAssessmentResult> {
    const prompt = `分析以下交易的风险：

交易信息：
- 金额: ${transaction.amount} ${transaction.currency}
- 类型: ${transaction.type}
- 链: ${transaction.chain}
- 用户KYC状态: ${transaction.kycStatus}

${userHistory ? `用户历史交易: ${JSON.stringify(userHistory.slice(-10))}` : ''}

请返回JSON格式的风险评估：
{
  "riskScore": 0-100,
  "riskLevel": "low" | "medium" | "high" | "critical",
  "riskFactors": {
    "amount": 风险评分,
    "frequency": 风险评分,
    "kycStatus": 风险评分,
    "historyScore": 风险评分
  },
  "recommendation": "建议文本"
}`;

    const response = await this.groq.chat.completions.create({
      model: this.defaultModel,
      messages: [
        { role: 'system', content: '你是一个专业的交易风险评估系统。' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    return JSON.parse(response.choices[0].message.content);
  }

  /**
   * 交易分类
   * AI Ledger自动分类
   */
  async classifyTransaction(
    transaction: TransactionData,
    userContext?: any
  ): Promise<TransactionCategory> {
    const prompt = `对以下交易进行分类：

交易数据：
${JSON.stringify(transaction)}

请返回JSON格式的分类结果：
{
  "category": "支付" | "转账" | "交易" | "空投" | "其他",
  "subcategory": "具体子分类",
  "tags": ["标签1", "标签2"],
  "confidence": 0-100
}`;

    const response = await this.groq.chat.completions.create({
      model: this.defaultModel,
      messages: [
        { role: 'system', content: '你是一个专业的交易分类系统（AI Ledger）。' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content);
  }

  // ... 其他方法实现
}
```

---

### 3. Foundation Models集成Groq

**修改**: `backend/src/modules/foundation/transaction-foundation.model.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { IFoundationLLM } from './interfaces/foundation-llm.interface';
import { GroqFoundationLLM } from './llm-providers/groq-foundation-llm.service';

@Injectable()
export class TransactionFoundationModel {
  constructor(
    private readonly foundationLLM: IFoundationLLM, // 注入Groq实现
    // ... 其他依赖
  ) {}

  /**
   * 支付路由（增强版）
   * 使用Groq进行智能路由建议
   */
  async routePayment(context: RoutingContext): Promise<PaymentRoute> {
    // 1. 基础路由逻辑（规则引擎）
    const baseRoute = await this.calculateBaseRoute(context);

    // 2. 使用Groq进行智能建议
    const suggestions = await this.foundationLLM.suggestPaymentRoute(
      context,
      [baseRoute] // 传入基础路由作为选项
    );

    // 3. 合并结果
    return {
      ...baseRoute,
      ...suggestions,
      aiEnhanced: true, // 标记为AI增强
    };
  }

  /**
   * 风险评估（增强版）
   * 使用Groq进行风险评估
   */
  async assessRisk(transaction: any): Promise<RiskAssessmentResult> {
    // 1. 基础风险评估（规则引擎）
    const baseAssessment = await this.calculateBaseRisk(transaction);

    // 2. 使用Groq进行AI风险评估
    const aiAssessment = await this.foundationLLM.assessRisk(
      transaction,
      await this.getUserHistory(transaction.userId)
    );

    // 3. 合并结果（加权平均）
    return {
      riskScore: (baseAssessment.riskScore * 0.4 + aiAssessment.riskScore * 0.6),
      riskLevel: this.determineRiskLevel(
        (baseAssessment.riskScore * 0.4 + aiAssessment.riskScore * 0.6)
      ),
      riskFactors: {
        ...baseAssessment.riskFactors,
        ...aiAssessment.riskFactors,
      },
      recommendation: aiAssessment.recommendation || baseAssessment.recommendation,
    };
  }
}
```

**修改**: `backend/src/modules/foundation/asset-foundation.model.ts`

```typescript
@Injectable()
export class AssetFoundationModel {
  constructor(
    private readonly foundationLLM: IFoundationLLM, // 注入Groq实现
    // ... 其他依赖
  ) {}

  /**
   * 交易分类（增强版）
   * 使用Groq进行AI分类
   */
  async classifyTransaction(transaction: any): Promise<TransactionCategory> {
    // 1. 基础分类（规则引擎）
    const baseCategory = await this.classifyByRules(transaction);

    // 2. 使用Groq进行AI分类
    const aiCategory = await this.foundationLLM.classifyTransaction(
      transaction,
      await this.getUserContext(transaction.userId)
    );

    // 3. 如果AI分类置信度更高，使用AI分类
    if (aiCategory.confidence > baseCategory.confidence) {
      return aiCategory;
    }
    return baseCategory;
  }

  /**
   * 资产健康度报告（增强版）
   * 使用Groq进行资产分析
   */
  async generateHealthReport(userId: string): Promise<AssetHealthReport> {
    // 1. 聚合资产数据
    const assets = await this.aggregateAssets(userId);

    // 2. 使用Groq进行资产分析
    const analysis = await this.foundationLLM.analyzeAssets(
      assets,
      await this.getUserContext(userId)
    );

    // 3. 生成报告
    return {
      userId,
      reportDate: new Date(),
      totalAssets: assets.totalUsdValue,
      riskScore: analysis.riskScore,
      recommendations: analysis.recommendations,
      assetDistribution: analysis.distribution,
    };
  }
}
```

---

### 4. IntentEngine集成Groq

**修改**: `backend/src/modules/trading/intent-engine.service.ts`

```typescript
@Injectable()
export class IntentEngineService {
  constructor(
    // ... 现有依赖
    private readonly foundationLLM: IFoundationLLM, // 注入Groq实现
  ) {}

  /**
   * 识别交易意图（增强版）
   * 使用Groq进行意图识别
   */
  async recognizeIntent(
    intentText: string,
    userId: string,
    agentId?: string,
  ): Promise<IntentRecognitionResult> {
    // 1. 规则引擎识别（快速、低成本）
    const ruleBasedResult = this.recognizeByRules(intentText);

    // 2. 如果规则引擎置信度低，使用Groq进行AI识别
    if (ruleBasedResult.confidence < 70) {
      const aiResult = await this.foundationLLM.recognizeIntent(
        intentText,
        {
          userId,
          history: await this.getUserIntentHistory(userId),
        }
      );

      // 3. 如果AI识别置信度更高，使用AI结果
      if (aiResult.confidence > ruleBasedResult.confidence) {
        return aiResult;
      }
    }

    return ruleBasedResult;
  }
}
```

---

## 📊 架构对比

### 之前（错误）

```
┌─────────────┐
│   Agent     │
└──────┬──────┘
       │
┌──────▼──────────────┐
│  Groq集成           │
│  (Function Calling) │
└──────┬──────────────┘
       │
┌──────▼──────────────┐
│  PayMind功能        │
│  (search, buy...)   │
└─────────────────────┘
```

### 现在（正确）

```
┌─────────────────────────────────────┐
│  Groq (底座大模型)                  │
│  - 意图识别                          │
│  - 风险评估                          │
│  - 交易分类                          │
│  - 路由建议                          │
│  - 资产分析                          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Foundation Models                  │
│  - TransactionFoundationModel       │
│  - AssetFoundationModel             │
│  (使用Groq提供AI能力)                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Runtime / Skills                   │
│  (调用Foundation Models)            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Agent功能                          │
│  (通过Runtime使用智能能力)           │
└─────────────────────────────────────┘
```

---

## 🔧 实施步骤

### Step 1: 创建底座大模型接口

1. 创建 `backend/src/modules/foundation/interfaces/foundation-llm.interface.ts`
2. 定义 `IFoundationLLM` 接口

### Step 2: 实现Groq底座大模型

1. 创建 `backend/src/modules/foundation/llm-providers/groq-foundation-llm.service.ts`
2. 实现 `IFoundationLLM` 接口
3. 注册到 `FoundationModule`

### Step 3: 集成到Foundation Models

1. 修改 `TransactionFoundationModel`，注入 `IFoundationLLM`
2. 修改 `AssetFoundationModel`，注入 `IFoundationLLM`
3. 在关键方法中使用Groq提供AI能力

### Step 4: 集成到IntentEngine

1. 修改 `IntentEngineService`，注入 `IFoundationLLM`
2. 在 `recognizeIntent` 中使用Groq

### Step 5: 移除错误的Groq集成

1. 删除或重构 `backend/src/modules/ai-integration/groq/`（如果只是Function Calling）
2. 或者保留作为独立的Agent集成（如果确实需要）

---

## 📝 总结

**Groq的正确定位**：
- ✅ **临时底座大模型** - 为Foundation Models提供AI能力（当前阶段）
- ✅ **统一接口** - 通过`IFoundationLLM`接口接入，支持平滑过渡
- ✅ **智能增强** - 增强意图识别、风险评估、交易分类等能力
- ✅ **数据收集** - 自动收集训练数据，优化自建模型
- ✅ **AI生态之一** - 也可以作为AI平台集成，提供Function Calling能力
- ❌ **不是Agent集成** - 不是直接提供Function Calling给Agent（这是另一个角色）

**架构层次**：
```
Groq (临时底座) → Foundation Models (统一接口) → Runtime → Agent
     ↓
  收集数据 → 训练自建模型 → 逐步切换 → 完全使用自建模型
```

**三个场景的调用流程**：
- **SDK调用**：SDK → Agent Runtime → Foundation Models → IFoundationLLM
- **AI平台调用**：AI平台 → CapabilityExecutor → Foundation Models → IFoundationLLM
- **PayMind Agent**：Agent Runtime → Foundation Models → IFoundationLLM

详细说明请参考：`PayMind-底座大模型架构与调用流程说明.md`

---

**最后更新**: 2025-01-XX

