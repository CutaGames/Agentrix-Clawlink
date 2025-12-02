# PayMind AI商业API层评估 - 方案A：统一AI Agent能力接口

## 📋 方案概述

**核心思路**：为 PayMind Marketplace 所有商品/服务/链上资产/插件建立一个统一能力 API（Unified Capability API），供所有模型调用。

## ✅ 优势分析

### 1. 技术可行性 ⭐⭐⭐⭐⭐
- **标准化格式**：OpenAI Function Schema / Anthropic Tool Schema 是成熟标准
- **已有基础**：产品数据标准已定义 `aiCompatible` 字段（见 `PayMind-产品数据标准-01-核心规范.md`）
- **实现路径清晰**：从 `UnifiedProduct` → Function Schema 的转换逻辑已规划

### 2. 商家友好性 ⭐⭐⭐⭐⭐
- **零学习成本**：商家只需上架商品，无需了解 AI 技术
- **自动化生成**：商品上架时自动生成 capability schema
- **统一管理**：一个商品，自动适配所有 AI 平台

### 3. 扩展性 ⭐⭐⭐⭐⭐
- **类型无关**：实物、服务、NFT、插件统一抽象
- **平台无关**：一套标准，多平台适配
- **版本演进**：支持标准版本升级

## ⚠️ 挑战与风险

### 1. 能力抽象粒度问题
**挑战**：
- 不同商品类型的能力差异大（实物需要物流，服务需要预约，NFT需要链上操作）
- 如何设计统一的能力调用接口？

**建议**：
```typescript
// 能力分类，而非单一接口
interface CapabilityNode {
  id: string;
  type: 'purchase' | 'book' | 'mint' | 'execute';
  productId: string;
  schema: FunctionSchema; // OpenAI/Claude/Gemini格式
  executor: string; // 执行器URL或函数名
}
```

### 2. 执行上下文管理
**挑战**：
- AI 调用能力时，需要传递用户身份、支付信息、地址等上下文
- 如何安全地传递这些敏感信息？

**建议**：
- 使用 OAuth 2.0 / API Key 认证
- 上下文通过 session token 传递，而非直接暴露
- 支持权限最小化原则

### 3. 错误处理与回滚
**挑战**：
- AI 调用失败时如何反馈？
- 部分成功场景如何处理（如：下单成功但支付失败）？

**建议**：
- 定义标准错误码和错误格式
- 支持事务性操作（下单+支付原子性）
- 提供状态查询接口

## 🎯 实施优先级

### Phase 1：核心能力抽象（2-3周）
1. **定义 Capability Schema 标准**
   - 基于现有 `UnifiedProduct` 结构
   - 扩展 `metadata.aiCompatible` 字段
   - 支持 OpenAI/Claude/Gemini 三种格式

2. **实现自动生成逻辑**
   - 商品创建/更新时自动生成 capability schema
   - 缓存机制优化性能

3. **基础执行器**
   - 实现 `buy_item`、`book_service`、`mint_nft` 等核心能力
   - 与现有 OrderService、PaymentService 集成

### Phase 2：多平台适配（2周）
1. **平台适配器**
   - OpenAI Adapter（Function Calling）
   - Claude Adapter（Tool Use）
   - Gemini Adapter（Functions）

2. **统一注册机制**
   - 提供 API 端点供各平台注册
   - 支持批量注册和增量更新

### Phase 3：高级能力（3-4周）
1. **复杂场景支持**
   - 购物车批量操作
   - 服务预约时间选择
   - 链上资产组合操作

2. **能力组合**
   - 支持能力链式调用
   - 工作流编排

## 💡 技术实现建议

### 1. 能力注册表设计

```typescript
// backend/src/modules/ai-capability/capability-registry.service.ts
interface CapabilityRegistry {
  // 注册能力
  register(productId: string, platform: string): Promise<FunctionSchema>;
  
  // 批量注册
  registerBatch(productIds: string[], platform: string): Promise<FunctionSchema[]>;
  
  // 获取所有能力
  getAllCapabilities(platform: string): Promise<FunctionSchema[]>;
  
  // 执行能力
  execute(capabilityId: string, params: any, context: ExecutionContext): Promise<ExecutionResult>;
}
```

### 2. 与现有系统集成

```typescript
// 商品创建时自动注册能力
async createProduct(product: CreateProductDto) {
  const savedProduct = await this.productService.create(product);
  
  // 自动生成并注册能力
  await this.capabilityRegistry.register(savedProduct.id, 'openai');
  await this.capabilityRegistry.register(savedProduct.id, 'claude');
  await this.capabilityRegistry.register(savedProduct.id, 'gemini');
  
  return savedProduct;
}
```

### 3. 执行器设计

```typescript
// backend/src/modules/ai-capability/executors/
interface CapabilityExecutor {
  execute(params: any, context: ExecutionContext): Promise<ExecutionResult>;
}

// 示例：购买商品执行器
class BuyItemExecutor implements CapabilityExecutor {
  async execute(params: { sku_id: string; quantity: number }, context: ExecutionContext) {
    // 1. 验证商品
    // 2. 创建订单
    // 3. 处理支付
    // 4. 返回结果
  }
}
```

## 📊 评估结论

**可行性评分**：⭐⭐⭐⭐⭐ (5/5)
**优先级**：**P0 - 核心方案**

**理由**：
1. 这是实现"AI商业API层"的核心基础
2. 技术路径清晰，已有产品数据标准支撑
3. 商家零学习成本，符合"自动同步"愿景
4. 其他方案（B/C/D）都依赖此方案

**建议**：
- **立即启动**：这是所有方案的基础
- **分阶段实施**：先核心能力，再扩展
- **与产品数据标准同步**：确保数据模型一致性

