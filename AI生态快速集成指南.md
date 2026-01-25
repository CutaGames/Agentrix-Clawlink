# Agentrix AI生态快速集成指南

本指南帮助开发者快速将Agentrix的电商和支付能力集成到主流AI平台。

---

## 📌 支持的AI平台

| 平台 | 技术方案 | 状态 | 文档 |
|------|---------|------|------|
| OpenAI | Function Calling | ✅ 完成 | [详细说明](#openai-function-calling) |
| Claude | Tool Use | ✅ 完成 | [详细说明](#claude-tool-use) |
| Gemini | Function Calling | ✅ 完成 | [详细说明](#gemini-function-calling) |
| Groq | Function Calling | ✅ 完成 | [详细说明](#groq-integration) |

---

## 🚀 快速开始（5分钟集成）

### 方式一：使用SDK（推荐）

```bash
npm install @agentrix/sdk
```

```typescript
import { AgentrixClient, AIIntegration } from '@agentrix/sdk';

// 初始化客户端
const client = new AgentrixClient({
  apiKey: 'your-api-key',
  environment: 'production'
});

// 一键获取AI Function Calling配置
const openAITools = AIIntegration.getOpenAIFunctions();
const claudeTools = AIIntegration.getClaudeTools();
const geminiFunctions = AIIntegration.getGeminiFunctions();
```

### 方式二：REST API调用

```bash
# 获取OpenAI格式的Functions定义
curl -X GET "https://api.agentrix.top/v1/ai-integration/functions?format=openai" \
  -H "Authorization: Bearer YOUR_API_KEY"

# 获取Claude格式的Tools定义
curl -X GET "https://api.agentrix.top/v1/ai-integration/functions?format=claude" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 🔧 OpenAI Function Calling

### 完整集成示例

```typescript
import OpenAI from 'openai';
import { AgentrixClient, AIIntegration } from '@agentrix/sdk';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const agentrix = new AgentrixClient({ apiKey: process.env.AGENTRIX_API_KEY });

// 获取Agentrix Functions定义
const agentrixFunctions = AIIntegration.getOpenAIFunctions();

// 与OpenAI对话并执行Agentrix能力
async function chatWithAgentrix(userMessage: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { role: "system", content: "你是一个智能购物助手，可以帮用户搜索商品、比价和下单。" },
      { role: "user", content: userMessage }
    ],
    functions: agentrixFunctions,
    function_call: "auto"
  });

  // 处理Function Call
  const message = response.choices[0].message;
  if (message.function_call) {
    const result = await agentrix.executeFunction(
      message.function_call.name,
      JSON.parse(message.function_call.arguments)
    );
    
    // 将结果返回给OpenAI继续对话
    return await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "你是一个智能购物助手" },
        { role: "user", content: userMessage },
        message,
        { role: "function", name: message.function_call.name, content: JSON.stringify(result) }
      ]
    });
  }
  
  return response;
}

// 使用示例
await chatWithAgentrix("帮我搜索一下蓝牙耳机，预算500元以内");
```

### 可用Functions列表

| Function名称 | 描述 | 参数 |
|-------------|------|------|
| `search_products` | 搜索商品 | query, category?, priceMin?, priceMax?, currency? |
| `get_product_detail` | 获取商品详情 | productId |
| `add_to_cart` | 加入购物车 | productId, quantity? |
| `view_cart` | 查看购物车 | sessionId? |
| `compare_prices` | 比价 | productIds, includeHistory? |
| `create_order` | 创建订单 | items, shippingAddress?, paymentMethod? |
| `get_order_status` | 查询订单状态 | orderId |
| `process_payment` | 处理支付 | orderId, paymentMethod |

---

## 🤖 Claude Tool Use

### 完整集成示例

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { AgentrixClient, AIIntegration } from '@agentrix/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const agentrix = new AgentrixClient({ apiKey: process.env.AGENTRIX_API_KEY });

// 获取Claude Tools定义
const agentrixTools = AIIntegration.getClaudeTools();

async function chatWithClaude(userMessage: string) {
  const response = await anthropic.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 4096,
    system: "你是一个智能购物助手，可以帮用户搜索商品、管理购物车和完成支付。",
    tools: agentrixTools,
    messages: [{ role: "user", content: userMessage }]
  });

  // 处理Tool Use
  for (const block of response.content) {
    if (block.type === 'tool_use') {
      const result = await agentrix.executeFunction(block.name, block.input);
      
      // 继续对话
      return await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 4096,
        tools: agentrixTools,
        messages: [
          { role: "user", content: userMessage },
          { role: "assistant", content: response.content },
          { role: "user", content: [
            { type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) }
          ]}
        ]
      });
    }
  }
  
  return response;
}

// 使用示例
await chatWithClaude("查看我的购物车，帮我算一下总价");
```

### Claude Tools格式

```typescript
// Agentrix自动生成的Claude Tools格式
const tools = [
  {
    name: "search_products",
    description: "搜索Agentrix商城中的商品，支持多种筛选条件",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词" },
        category: { type: "string", description: "商品分类" },
        priceMin: { type: "number", description: "最低价格" },
        priceMax: { type: "number", description: "最高价格" },
        assetType: { 
          type: "string", 
          enum: ["physical", "service", "nft", "ft", "game_asset", "rwa"],
          description: "资产类型" 
        }
      },
      required: ["query"]
    }
  },
  // ... 更多工具
];
```

---

## 💎 Gemini Function Calling

### 完整集成示例

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentrixClient, AIIntegration } from '@agentrix/sdk';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
const agentrix = new AgentrixClient({ apiKey: process.env.AGENTRIX_API_KEY });

// 获取Gemini格式的Functions
const functions = AIIntegration.getGeminiFunctions();

async function chatWithGemini(userMessage: string) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-pro",
    tools: [{ functionDeclarations: functions }]
  });

  const chat = model.startChat({
    history: [],
    generationConfig: { maxOutputTokens: 4096 }
  });

  const result = await chat.sendMessage(userMessage);
  
  // 处理Function Call
  const response = await result.response;
  const functionCalls = response.functionCalls();
  
  if (functionCalls && functionCalls.length > 0) {
    for (const call of functionCalls) {
      const functionResult = await agentrix.executeFunction(call.name, call.args);
      
      // 发送function结果继续对话
      const finalResult = await chat.sendMessage([{
        functionResponse: {
          name: call.name,
          response: functionResult
        }
      }]);
      
      return finalResult;
    }
  }
  
  return result;
}
```

---

## ⚡ Groq Integration

```typescript
import Groq from 'groq-sdk';
import { AgentrixClient, AIIntegration } from '@agentrix/sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const agentrix = new AgentrixClient({ apiKey: process.env.AGENTRIX_API_KEY });

// Groq使用OpenAI兼容的Function Calling格式
const functions = AIIntegration.getOpenAIFunctions();

async function chatWithGroq(userMessage: string) {
  const response = await groq.chat.completions.create({
    model: "llama-3.1-70b-versatile",
    messages: [
      { role: "system", content: "你是一个智能购物助手" },
      { role: "user", content: userMessage }
    ],
    tools: functions.map(f => ({ type: "function", function: f })),
    tool_choice: "auto"
  });

  // 处理Tool Calls
  const toolCalls = response.choices[0].message.tool_calls;
  if (toolCalls) {
    for (const call of toolCalls) {
      const result = await agentrix.executeFunction(
        call.function.name,
        JSON.parse(call.function.arguments)
      );
      // 继续对话...
    }
  }
  
  return response;
}
```

---

## 🛒 多资产类型支持

Agentrix支持多种资产类型，AI可以智能识别并处理：

### 资产类型列表

| 类型 | 描述 | 支付方式 | 特殊处理 |
|------|------|---------|---------|
| `physical` | 实物商品 | 法币/加密货币 | 需要物流地址 |
| `service` | 服务类商品 | 法币/加密货币 | 预约时间 |
| `nft` | NFT数字藏品 | 加密货币 | 链上转账 |
| `ft` | 同质化代币 | 加密货币 | 代币兑换 |
| `game_asset` | 游戏资产 | 法币/加密货币 | 游戏内发放 |
| `rwa` | 真实世界资产 | 法币/加密货币 | 资产证明 |

### AI识别示例

```typescript
// 搜索NFT商品
await chatWithAgentrix("帮我找一些数字藏品NFT，预算100美元以内");

// 系统自动识别为NFT搜索，添加assetType过滤
// search_products({ query: "数字藏品", assetType: "nft", priceMax: 100, currency: "USD" })

// 搜索服务类商品
await chatWithAgentrix("我想预约一个在线咨询服务");

// 系统自动识别为服务类搜索
// search_products({ query: "在线咨询", assetType: "service" })
```

---

## 🔐 支付集成

### 支持的支付方式

| 方式 | 描述 | 适用场景 |
|------|------|---------|
| QuickPay | 预授权快速支付 | 小额高频 |
| Wallet Pay | 链上钱包支付 | 加密货币 |
| Fiat Pay | 法币支付（Transak） | 跨境购物 |
| MPC Wallet | 多签钱包 | 大额安全 |

### AI触发支付流程

```typescript
// 用户说"帮我下单这个商品"时，AI自动：
// 1. 检查购物车
// 2. 确认地址
// 3. 选择支付方式
// 4. 创建订单
// 5. 返回支付链接

const orderResult = await agentrix.executeFunction('create_order', {
  items: [{ productId: 'xxx', quantity: 1 }],
  shippingAddress: { /* ... */ },
  paymentMethod: 'quickpay'
});

// 返回给用户
// "已为您创建订单，订单号：xxx，请点击下方链接完成支付：[支付链接]"
```

---

## 📊 Webhook回调

当订单状态变化时，Agentrix会向配置的Webhook URL发送通知：

```typescript
// Webhook配置
await agentrix.webhooks.create({
  url: 'https://your-server.com/webhooks/agentrix',
  events: ['order.created', 'order.paid', 'order.shipped', 'order.completed'],
  secret: 'your-webhook-secret'
});

// Webhook处理示例
app.post('/webhooks/agentrix', (req, res) => {
  const signature = req.headers['x-agentrix-signature'];
  
  // 验证签名
  if (!verifySignature(req.body, signature, webhookSecret)) {
    return res.status(401).send('Invalid signature');
  }
  
  const { event, data } = req.body;
  
  switch (event) {
    case 'order.paid':
      // 通知AI订单已支付
      notifyAI(`订单 ${data.orderId} 已支付成功`);
      break;
    case 'order.shipped':
      // 通知AI订单已发货
      notifyAI(`订单 ${data.orderId} 已发货，快递单号：${data.trackingNumber}`);
      break;
  }
  
  res.status(200).send('OK');
});
```

---

## 🎯 最佳实践

### 1. 上下文管理

```typescript
// 保持会话上下文，让AI记住购物历史
const sessionId = 'user-session-123';

const result = await agentrix.executeFunction('search_products', {
  query: '运动鞋',
  sessionId  // 传入sessionId保持上下文
});

// AI可以引用之前的搜索结果
// "刚才搜索的第3个商品"
```

### 2. 错误处理

```typescript
try {
  const result = await agentrix.executeFunction('create_order', params);
  if (!result.success) {
    // 告诉用户具体原因
    return `订单创建失败：${result.message}`;
  }
} catch (error) {
  // 优雅降级
  return "抱歉，订单服务暂时不可用，请稍后再试";
}
```

### 3. 用户确认

```typescript
// 对于敏感操作（如支付），始终要求用户确认
const response = await chatWithAI(userMessage);

if (response.requiresConfirmation) {
  // 展示确认对话框
  const confirmed = await showConfirmDialog({
    title: '确认支付',
    message: `即将支付 ${response.amount} ${response.currency}，是否继续？`,
    actions: ['确认', '取消']
  });
  
  if (confirmed) {
    await agentrix.executeFunction('process_payment', response.paymentParams);
  }
}
```

---

## 🆘 技术支持

- 文档：https://docs.agentrix.top
- API参考：https://api.agentrix.top/docs
- GitHub：https://github.com/agentrix/sdk-js
- Discord：https://discord.gg/agentrix
- 邮箱：support@agentrix.top

---

## 📝 更新日志

- **v2.2.0** (2025-01) - 添加多资产类型支持，优化Agent对话框
- **v2.1.0** (2024-12) - 添加Groq集成，优化Function Calling格式
- **v2.0.0** (2024-11) - 重构AI集成架构，统一能力执行器

