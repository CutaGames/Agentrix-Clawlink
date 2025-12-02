# PayMind 服务调用架构讨论

## 🎯 核心问题

**如何统一触发和调用 PayMind 的检索、比价等服务，确保在 PayMind Agent 和其他 AI 生态（ChatGPT、Claude等）中都能正确工作？**

---

## 📊 当前架构分析

### 1. 现有服务入口

#### PayMind Agent 内部
- **入口**: `AgentService.processMessage()` → `AgentRuntimeIntegrationService`
- **触发方式**: 意图识别 → Workflow → Skill 执行
- **问题**: 
  - 意图识别不够准确（如"AI服务"可能识别失败）
  - 没有统一的服务调用层
  - 直接调用底层服务（SearchService、ProductService）

#### ChatGPT/其他AI平台
- **入口**: `OpenAIIntegrationService.executeFunctionCall()`
- **触发方式**: AI 平台 Function Calling → 直接调用服务方法
- **问题**:
  - 与 PayMind Agent 的调用路径不一致
  - 没有统一的执行器层

#### 系统级能力（已注册但未充分利用）
- **注册位置**: `CapabilityRegistryService.registerDefaultSystemCapabilities()`
- **已注册能力**:
  - `search_products` → `search_paymind_products`
  - `compare_prices` → `compare_paymind_prices`
  - `add_to_cart` → `add_to_paymind_cart`
  - `checkout_cart` → `checkout_paymind_cart`
  - `pay_order` → `pay_paymind_order`
  - `track_logistics` → `track_paymind_logistics`

---

## 🏗️ 统一架构方案

### 方案A：统一服务调用层（推荐）

```
┌─────────────────────────────────────────────────────────────┐
│                    AI 平台层                                  │
│  PayMind Agent  │  ChatGPT  │  Claude  │  Gemini  │  ...   │
└────────┬─────────┴─────┬─────┴─────┬─────┴─────┬─────┴──────┘
         │               │           │           │
         └───────────────┴───────────┴───────────┘
                           │
         ┌─────────────────▼─────────────────┐
         │    统一服务调用层 (Service Router)   │
         │                                     │
         │  • 意图识别/Function 解析            │
         │  • 参数提取和验证                    │
         │  • 服务路由                          │
         │  • 统一响应格式                      │
         └─────────────┬───────────────────────┘
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
┌───▼────┐      ┌──────▼──────┐    ┌──────▼──────┐
│ 搜索服务 │      │  比价服务    │    │  购物车服务  │
│ Router │      │  Router     │    │  Router     │
└───┬────┘      └──────┬──────┘    └──────┬──────┘
    │                  │                  │
    └──────────────────┼──────────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   核心业务服务层            │
         │                           │
         │  • SearchService          │
         │  • ProductService         │
         │  • CartService            │
         │  • OrderService           │
         │  • PaymentService         │
         └───────────────────────────┘
```

### 核心组件设计

#### 1. PayMind Service Router（统一服务路由）

```typescript
@Injectable()
export class PayMindServiceRouter {
  /**
   * 统一服务调用入口
   * 所有 AI 平台都通过这个入口调用 PayMind 服务
   */
  async callService(
    serviceName: string,
    params: Record<string, any>,
    context: {
      userId?: string;
      sessionId?: string;
      platform: 'paymind_agent' | 'chatgpt' | 'claude' | 'gemini' | 'sdk';
    },
  ): Promise<ServiceResponse> {
    // 1. 参数验证和标准化
    // 2. 路由到对应的服务执行器
    // 3. 统一格式化响应
    // 4. 记录日志和审计
  }
}
```

#### 2. 服务执行器（Service Executors）

```typescript
// 搜索服务执行器
@Injectable()
export class SearchServiceExecutor {
  async execute(params: SearchParams, context: ServiceContext): Promise<SearchResponse> {
    // 1. 调用 SearchService.semanticSearch()
    // 2. 使用统一格式化函数格式化商品
    // 3. 返回标准格式
  }
}

// 比价服务执行器
@Injectable()
export class PriceComparisonServiceExecutor {
  async execute(params: ComparisonParams, context: ServiceContext): Promise<ComparisonResponse> {
    // 1. 搜索相关商品
    // 2. 计算比价数据
    // 3. 返回标准格式
  }
}
```

---

## 🔄 统一调用流程

### 场景1：PayMind Agent 内部调用

```
用户输入: "我要买AI咨询服务"
    ↓
AgentService.processMessage()
    ↓
AgentRuntimeIntegrationService.processMessageWithRuntime()
    ↓
意图识别: "product_search"
    ↓
PayMindServiceRouter.callService('search_products', { query: 'AI咨询服务' }, { platform: 'paymind_agent' })
    ↓
SearchServiceExecutor.execute()
    ↓
SearchService.semanticSearch() + formatProductsForDisplay()
    ↓
返回统一格式: { products: [...], query, total }
    ↓
前端展示商品卡片
```

### 场景2：ChatGPT 调用

```
用户输入: "帮我找AI咨询服务"
    ↓
ChatGPT 识别需要调用 Function
    ↓
调用 search_paymind_products({ query: 'AI咨询服务' })
    ↓
OpenAIIntegrationService.executeFunctionCall()
    ↓
PayMindServiceRouter.callService('search_products', { query: 'AI咨询服务' }, { platform: 'chatgpt' })
    ↓
SearchServiceExecutor.execute()
    ↓
返回统一格式
    ↓
ChatGPT 格式化展示给用户
```

### 场景3：SDK 调用

```
开发者代码: agent.marketplace.searchProducts('AI咨询服务')
    ↓
SDK 发送请求到 /api/marketplace/search
    ↓
MarketplaceController.search()
    ↓
PayMindServiceRouter.callService('search_products', { query: 'AI咨询服务' }, { platform: 'sdk' })
    ↓
SearchServiceExecutor.execute()
    ↓
返回统一格式
```

---

## 📋 需要讨论的问题

### 1. 服务路由策略

**问题**: 如何确定调用哪个服务？

**选项A**: 基于服务名称映射
```typescript
const SERVICE_MAP = {
  'search_products': SearchServiceExecutor,
  'compare_prices': PriceComparisonServiceExecutor,
  'add_to_cart': CartServiceExecutor,
  // ...
};
```

**选项B**: 基于系统级能力注册表
```typescript
// 从 CapabilityRegistryService 获取执行器信息
const capability = this.capabilityRegistry.getSystemCapability('search_products');
const executor = this.getExecutor(capability.executor);
```

### 2. 参数标准化

**问题**: 不同平台传入的参数格式可能不同，如何统一？

**方案**: 参数适配器
```typescript
class ParameterAdapter {
  adapt(platform: string, rawParams: any): StandardParams {
    switch (platform) {
      case 'chatgpt':
        return this.adaptFromChatGPT(rawParams);
      case 'paymind_agent':
        return this.adaptFromAgent(rawParams);
      // ...
    }
  }
}
```

### 3. 响应格式统一

**问题**: 不同平台需要的响应格式可能不同？

**方案**: 响应适配器
```typescript
class ResponseAdapter {
  adapt(platform: string, standardResponse: any): any {
    switch (platform) {
      case 'chatgpt':
        return this.formatForChatGPT(standardResponse);
      case 'paymind_agent':
        return this.formatForAgent(standardResponse);
      // ...
    }
  }
}
```

### 4. 意图识别 vs Function Calling

**问题**: PayMind Agent 使用意图识别，其他平台使用 Function Calling，如何统一？

**方案A**: 统一使用 Function Calling 模式
- PayMind Agent 也通过 Function Calling 调用服务
- 意图识别只用于路由，不直接调用服务

**方案B**: 保持现状，但统一底层服务调用
- PayMind Agent 继续使用意图识别
- 但最终都调用 PayMindServiceRouter

### 5. 比价服务的触发

**问题**: 比价服务何时触发？如何触发？

**选项A**: 独立的比价 Function
- ChatGPT: `compare_paymind_prices({ query: '...' })`
- PayMind Agent: 用户说"比价" → 调用比价服务

**选项B**: 搜索时自动比价
- 搜索商品时，如果结果数量 > 1，自动计算比价数据
- 在响应中包含比价信息

**选项C**: 混合模式
- 搜索时包含基础比价信息（最便宜、最贵、平均价）
- 用户明确要求比价时，返回详细比价报告

---

## 🎯 推荐方案

### 阶段1：扩展现有执行器系统（推荐，利用现有架构）

**现状分析**：
- ✅ 已有 `CapabilityExecutorService` 和执行器接口
- ✅ 已有 `CapabilityRegistryService` 注册系统级能力
- ❌ 但系统级能力（搜索、比价）没有对应的执行器

**实施方案**：

1. **扩展 CapabilityExecutorService**
   - 添加系统级能力执行器：
     - `SearchProductsExecutor` (对应 `executor_search`)
     - `PriceComparisonExecutor` (对应 `executor_compare`)
     - `CartExecutor` (对应 `executor_cart`)
     - `CheckoutExecutor` (对应 `executor_checkout`)
     - `PaymentExecutor` (对应 `executor_payment`)
     - `LogisticsExecutor` (对应 `executor_logistics`)

2. **统一调用入口**
   - PayMind Agent: 通过 `CapabilityExecutorService.execute()` 调用
   - ChatGPT: 通过 `CapabilityExecutorService.execute()` 调用
   - SDK: 通过 `CapabilityExecutorService.execute()` 调用

3. **修改现有调用路径**
   - `OpenAIIntegrationService`: 改为调用 `CapabilityExecutorService`
   - `AgentRuntimeIntegrationService`: 改为调用 `CapabilityExecutorService`
   - `AgentService`: 改为调用 `CapabilityExecutorService`

### 阶段2：统一响应格式（后续优化）

1. **定义标准响应格式**
2. **实现响应适配器**
3. **各平台使用适配器格式化响应**

---

## ❓ 需要确认的问题

1. **比价服务触发时机**：搜索时自动包含，还是需要单独调用？
2. **意图识别策略**：PayMind Agent 是否继续使用意图识别，还是改为 Function Calling？
3. **服务执行器粒度**：每个服务一个执行器，还是按功能模块分组？
4. **错误处理**：统一错误格式，还是各平台自定义？
5. **日志和审计**：是否需要统一的日志格式？

---

## 📝 下一步行动

1. **讨论并确认上述问题**
2. **设计 PayMindServiceRouter 接口**
3. **实现核心服务执行器**
4. **逐步迁移现有调用**
5. **测试各平台集成**

