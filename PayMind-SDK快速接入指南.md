# PayMind SDK 快速接入指南

## 🚀 10 分钟快速接入

让您的 Agent 快速拥有 PayMind Marketplace 交易能力。

---

## 📦 安装

```bash
npm install @paymind/sdk
# 或
yarn add @paymind/sdk
```

---

## 🎯 基础使用

### 1. 初始化 SDK

```typescript
import { PayMind } from '@paymind/sdk';

const paymind = new PayMind({
  apiKey: process.env.PAYMIND_API_KEY,
  baseUrl: 'https://api.paymind.com', // 或您的自定义域名
});
```

### 2. 启用 Marketplace（一行代码）

```typescript
// 启用 Marketplace 能力
paymind.enableMarketplace({
  autoSearch: true,    // 自动语义搜索
  showPrices: true,     // 显示价格
  enableCart: true,     // 启用购物车
  enableRAG: true,      // 启用智能推荐
});
```

**完成！** 现在您的 Agent 已经拥有所有 PayMind Marketplace 交易能力。

---

## 🔍 核心功能

### 1. 语义搜索商品

```typescript
// 使用语义搜索
const results = await paymind.marketplace.searchProducts({
  query: '适合跑步的鞋子，不要超过150美元',
  filters: {
    priceMax: 150,
    currency: 'USD',
    inStock: true,
  },
  limit: 10,
});

console.log(`找到 ${results.total} 件商品`);
results.products.forEach(product => {
  console.log(`${product.title}: ${product.price} ${product.currency}`);
});
```

### 2. 智能推荐（RAG API）

```typescript
// 使用 RAG API 进行智能推荐
const recommendations = await paymind.capabilities.ragSearch(
  '我要给女朋友买生日礼物',
  {
    context: {
      userId: 'user-123',
      preferences: {
        priceRange: { min: 50, max: 500 },
        categories: ['jewelry', 'perfume'],
      },
    },
    limit: 5,
  }
);

recommendations.recommendations.forEach(rec => {
  console.log(`${rec.product.name}: ${rec.reason}`);
  console.log(`  价格: ${rec.product.price} ${rec.product.currency}`);
});
```

### 3. 创建订单

```typescript
// 创建订单
const order = await paymind.marketplace.createOrder({
  productId: 'product-123',
  userId: 'user-123',
  quantity: 1,
  shippingAddress: {
    name: '张三',
    address: '北京市朝阳区xxx',
    city: '北京',
    country: 'CN',
    zipCode: '100000',
    phone: '13800138000',
  },
});

console.log(`订单创建成功: ${order.id}`);
```

### 4. 处理支付

```typescript
// 处理支付
const payment = await paymind.payments.create({
  amount: order.amount,
  currency: order.currency,
  description: `订单支付: ${order.id}`,
  merchantId: order.merchantId,
  metadata: {
    orderId: order.id,
    productId: order.productId,
  },
});

console.log(`支付创建成功: ${payment.id}`);
```

### 5. 获取平台能力

```typescript
// 获取所有已注册的平台
const platforms = await paymind.capabilities.getAllPlatforms();
console.log('支持的平台:', platforms); // ['openai', 'claude', 'gemini', ...]

// 获取指定平台的能力
const openaiCapabilities = await paymind.capabilities.getPlatformCapabilities('openai');
console.log(`OpenAI 平台有 ${openaiCapabilities.count} 个能力`);
```

---

## 🤖 集成到 Agent

### LangChain 集成示例

```typescript
import { PayMind } from '@paymind/sdk';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';

// 初始化
const paymind = new PayMind({ apiKey: process.env.PAYMIND_API_KEY });
paymind.enableMarketplace();

// 创建 Agent
const model = new ChatOpenAI({ temperature: 0 });
const tools = [
  // 添加 PayMind 能力作为工具
  {
    name: 'search_products',
    description: '搜索商品',
    func: async (query: string) => {
      const results = await paymind.marketplace.searchProducts({ query });
      return JSON.stringify(results.products);
    },
  },
  {
    name: 'create_order',
    description: '创建订单',
    func: async (productId: string, quantity: number) => {
      return await paymind.marketplace.createOrder({
        productId,
        userId: 'user-123',
        quantity,
      });
    },
  },
];

const agent = await createOpenAIFunctionsAgent({
  llm: model,
  tools,
  prompt: /* ... */,
});

const executor = new AgentExecutor({ agent, tools });

// 使用
const result = await executor.invoke({
  input: '帮我买一双跑步鞋',
});
```

### LlamaIndex 集成示例

```typescript
import { PayMind } from '@paymind/sdk';
import { QueryEngineTool } from 'llamaindex';

const paymind = new PayMind({ apiKey: process.env.PAYMIND_API_KEY });
paymind.enableMarketplace();

// 创建工具
const marketplaceTool = new QueryEngineTool({
  queryEngine: {
    query: async (query: string) => {
      const results = await paymind.marketplace.searchProducts({ query });
      return JSON.stringify(results.products);
    },
  },
  metadata: {
    name: 'marketplace_search',
    description: '搜索 PayMind Marketplace 商品',
  },
});

// 添加到 Agent
const agent = new ReActAgent({
  tools: [marketplaceTool],
  // ...
});
```

---

## 🎨 完整示例

```typescript
import { PayMind } from '@paymind/sdk';

async function agentExample() {
  // 1. 初始化
  const paymind = new PayMind({
    apiKey: process.env.PAYMIND_API_KEY,
  });

  // 2. 启用 Marketplace
  paymind.enableMarketplace({
    autoSearch: true,
    enableRAG: true,
  });

  // 3. 用户查询
  const userQuery = '我要买 iPhone 15';

  // 4. 智能推荐
  const recommendations = await paymind.capabilities.ragSearch(userQuery, {
    context: {
      userId: 'user-123',
      preferences: {
        priceRange: { max: 10000 },
      },
    },
    limit: 5,
  });

  // 5. 展示推荐结果
  console.log('推荐商品:');
  recommendations.recommendations.forEach(rec => {
    console.log(`- ${rec.product.name}: ${rec.product.price} ${rec.product.currency}`);
    console.log(`  推荐理由: ${rec.reason}`);
  });

  // 6. 用户选择商品后创建订单
  const selectedProduct = recommendations.recommendations[0];
  const order = await paymind.marketplace.createOrder({
    productId: selectedProduct.productId,
    userId: 'user-123',
    quantity: 1,
  });

  // 7. 处理支付
  const payment = await paymind.payments.create({
    amount: order.amount,
    currency: order.currency,
    description: `订单: ${order.id}`,
    merchantId: order.merchantId,
    metadata: { orderId: order.id },
  });

  console.log(`订单创建成功: ${order.id}`);
  console.log(`支付链接: ${payment.paymentUrl}`);
}
```

---

## 📚 API 参考

### enableMarketplace(options?)

启用 Marketplace 能力。

**参数**：
- `autoSearch?: boolean` - 自动语义搜索（默认: true）
- `showPrices?: boolean` - 显示价格（默认: true）
- `enableCart?: boolean` - 启用购物车（默认: true）
- `enableRAG?: boolean` - 启用智能推荐（默认: true）

### marketplace.searchProducts(request)

语义搜索商品。

**参数**：
- `query: string` - 搜索查询
- `filters?: object` - 过滤条件
- `limit?: number` - 返回数量

### capabilities.ragSearch(query, options?)

使用 RAG API 进行智能推荐。

**参数**：
- `query: string` - 搜索查询
- `options?: object` - 选项（上下文、过滤条件等）

### capabilities.getAllPlatforms()

获取所有已注册的 AI 平台。

### capabilities.getPlatformCapabilities(platform)

获取指定平台的所有能力。

---

## 🎯 最佳实践

### 1. 错误处理

```typescript
try {
  const results = await paymind.marketplace.searchProducts({ query: '...' });
} catch (error) {
  if (error.message.includes('Search query is required')) {
    // 处理错误
  }
}
```

### 2. 缓存能力

```typescript
// 启动时预加载能力
await paymind.capabilities.getAllPlatforms();
```

### 3. 用户上下文

```typescript
// 使用用户上下文提升推荐质量
const recommendations = await paymind.capabilities.ragSearch(query, {
  context: {
    userId: user.id,
    preferences: user.preferences,
    history: user.purchaseHistory,
  },
});
```

---

## 🚀 下一步

- 📖 查看 [完整 API 文档](./docs/api.md)
- 💡 查看 [示例代码](./examples/)
- 🤝 加入 [开发者社区](https://community.paymind.com)

---

**10 分钟接入，让您的 Agent 拥有完整的商业能力！** 🎉

