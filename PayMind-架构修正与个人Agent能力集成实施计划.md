# PayMind 架构修正与个人Agent能力集成实施计划

**日期**: 2025-01-XX  
**目标**: 
1. 修正Groq定位：从Agent集成改为底座大模型
2. 注册个人agent能力（airdrop、autoearn）到CapabilityRegistry
3. 确保个人agent能力可被AI平台和SDK调用

---

## 📋 实施任务清单

### Phase 1: 修正Groq定位（底座大模型）

#### 1.1 创建底座大模型接口和实现

- [ ] 创建 `IFoundationLLM` 接口
  - 文件: `backend/src/modules/foundation/interfaces/foundation-llm.interface.ts`
  - 定义: `recognizeIntent`, `assessRisk`, `classifyTransaction`, `suggestPaymentRoute`, `analyzeAssets`

- [ ] 实现 `GroqFoundationLLM`
  - 文件: `backend/src/modules/foundation/llm-providers/groq-foundation-llm.service.ts`
  - 实现 `IFoundationLLM` 接口
  - 使用Groq API提供AI能力

- [ ] 注册到 `FoundationModule`
  - 文件: `backend/src/modules/foundation/foundation.module.ts`
  - 配置提供者选择（groq/paymind/openai等）

#### 1.2 集成到Foundation Models

- [ ] 修改 `TransactionFoundationModel`
  - 注入 `IFoundationLLM`
  - 在 `routePayment` 和 `assessRisk` 中使用底座大模型

- [ ] 修改 `AssetFoundationModel`
  - 注入 `IFoundationLLM`
  - 在 `classifyTransaction` 和 `generateHealthReport` 中使用底座大模型

#### 1.3 集成到IntentEngine

- [ ] 修改 `IntentEngineService`
  - 注入 `IFoundationLLM`
  - 在 `recognizeIntent` 中使用底座大模型

---

### Phase 2: 注册个人Agent能力

#### 2.1 注册Airdrop能力

- [ ] 在 `CapabilityRegistryService` 中注册airdrop能力
  - `discover_airdrops` - 发现空投机会
  - `get_airdrops` - 获取空投列表
  - `check_airdrop_eligibility` - 检查空投资格
  - `claim_airdrop` - 领取空投

#### 2.2 注册AutoEarn能力

- [ ] 在 `CapabilityRegistryService` 中注册autoearn能力
  - `get_auto_earn_tasks` - 获取任务列表
  - `execute_auto_earn_task` - 执行任务
  - `get_auto_earn_stats` - 获取统计数据
  - `toggle_auto_earn_strategy` - 启动/停止策略

#### 2.3 创建执行器

- [ ] 创建 `AirdropExecutor`
  - 文件: `backend/src/modules/ai-capability/executors/airdrop.executor.ts`
  - 实现airdrop相关能力执行

- [ ] 创建 `AutoEarnExecutor`
  - 文件: `backend/src/modules/ai-capability/executors/auto-earn.executor.ts`
  - 实现autoearn相关能力执行

- [ ] 注册执行器到 `CapabilityExecutorService`

---

### Phase 3: 修正Groq集成（如果保留作为AI平台）

#### 3.1 使用CapabilityRegistry

- [ ] 修改 `GroqIntegrationService.getFunctionSchemas()`
  - 使用 `CapabilityRegistryService.getSystemCapabilitySchemas(['groq'])`
  - 移除硬编码的Function

- [ ] 修改 `GroqIntegrationService.executeFunctionCall()`
  - 使用 `CapabilityExecutorService` 执行所有能力
  - 移除硬编码的switch语句

---

### Phase 4: 验证和测试

- [ ] 测试底座大模型集成
  - 测试意图识别
  - 测试风险评估
  - 测试路由建议

- [ ] 测试个人Agent能力
  - 测试airdrop能力通过AI平台调用
  - 测试autoearn能力通过SDK调用
  - 验证能力注册和执行

---

## 🔧 详细实施步骤

### Step 1: 创建底座大模型接口

**文件**: `backend/src/modules/foundation/interfaces/foundation-llm.interface.ts`

```typescript
export interface IFoundationLLM {
  recognizeIntent(text: string, context?: any): Promise<IntentRecognitionResult>;
  assessRisk(transaction: any, userHistory?: any[]): Promise<RiskAssessmentResult>;
  classifyTransaction(transaction: any, userContext?: any): Promise<TransactionCategory>;
  suggestPaymentRoute(context: RoutingContext, options?: RouteOptions[]): Promise<RouteSuggestion>;
  analyzeAssets(assets: AggregatedAssets, userContext?: any): Promise<AssetAnalysis>;
  getModelInfo(): { provider: string; modelName: string; version: string; isTemporary: boolean };
}
```

### Step 2: 实现GroqFoundationLLM

**文件**: `backend/src/modules/foundation/llm-providers/groq-foundation-llm.service.ts`

实现所有接口方法，使用Groq API。

### Step 3: 注册个人Agent能力

**文件**: `backend/src/modules/ai-capability/services/capability-registry.service.ts`

在 `registerDefaultSystemCapabilities()` 中添加：

```typescript
// Airdrop能力
this.registerSystemCapability({
  id: 'discover_airdrops',
  name: 'discover_paymind_airdrops',
  description: '发现可领取的空投机会',
  category: 'airdrop',
  executor: 'executor_airdrop',
  parameters: { ... },
  enabled: true,
});

// AutoEarn能力
this.registerSystemCapability({
  id: 'get_auto_earn_tasks',
  name: 'get_paymind_auto_earn_tasks',
  description: '获取Auto-Earn任务列表',
  category: 'autoearn',
  executor: 'executor_autoearn',
  parameters: { ... },
  enabled: true,
});
```

### Step 4: 创建执行器

创建执行器，调用对应的Service方法。

---

## 📝 注意事项

1. **Groq的双重角色**：
   - 底座大模型：通过IFoundationLLM接口（主要）
   - AI平台集成：通过CapabilityRegistry（可选，类似ChatGPT）

2. **能力确认机制**：
   - 个人agent能力需要经过确认后才能被其他AI平台调用
   - 可以通过 `enabled` 字段控制

3. **向后兼容**：
   - 保持现有ChatGPT集成不变
   - 确保SDK调用路径正常

---

**最后更新**: 2025-01-XX

