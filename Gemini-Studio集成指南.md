# Gemini Studio 集成指南

## 📋 概述

本指南说明如何在 Google Gemini Studio 中配置 Agentrix Marketplace 的 Function Calling，实现通过 Gemini 对话进行商品搜索和购买。

## 🌐 API 地址

- **生产环境 API**: `https://api.agentrix.top/api`
- **前端网站**: `https://www.agentrix.top`

## ✅ 前置检查

### 1. 验证 API 可访问性

```bash
# 测试 Functions 端点
curl https://api.agentrix.top/api/gemini/functions

# 应该返回 JSON 格式的 Function Schemas
```

### 2. 验证 Function Call 端点

```bash
curl -X POST https://api.agentrix.top/api/gemini/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "function": {
      "name": "search_agentrix_products",
      "arguments": {"query": "iPhone"}
    },
    "context": {"sessionId": "test-123"}
  }'
```

## 🚀 在 Gemini Studio 中配置

### 方式 A: 使用 Gemini Studio UI（推荐用于快速测试）

#### 步骤 1: 访问 Gemini Studio

1. 打开浏览器，访问：https://aistudio.google.com/
2. 使用 Google 账号登录

#### 步骤 2: 创建新的 Prompt

1. 点击 **"Create"** → **"New Prompt"**
2. 选择模型：**Gemini 3 Pro** 或 **Gemini 1.5 Pro**

#### 步骤 3: 配置 System Instruction

在 **System instruction** 框中输入：

```
你是 Agentrix 购物助手，可以帮助用户搜索和购买商品。
当用户想要搜索或购买商品时，使用 Agentrix 的 Functions。

支持的 Function：
- search_agentrix_products: 搜索商品
- add_to_agentrix_cart: 加入购物车
- view_agentrix_cart: 查看购物车
- checkout_agentrix_cart: 结算购物车
- buy_agentrix_product: 购买商品
- get_agentrix_order: 查询订单
- pay_agentrix_order: 支付订单
- compare_agentrix_prices: 比价服务
```

#### 步骤 4: 获取 Function Schemas

在终端执行：

```bash
curl https://api.agentrix.top/api/gemini/functions > functions.json
```

打开 `functions.json`，你会看到所有可用的 Function 定义。

#### 步骤 5: 在 Gemini Studio 中添加 Functions

**注意**：Gemini Studio 的 UI 可能不支持直接添加外部 Function。如果 UI 中没有 "Functions" 或 "Tools" 选项，请使用方式 B（编程方式）。

### 方式 B: 使用 Gemini API（编程方式，推荐用于生产）

#### 步骤 1: 获取 Function Schemas

```bash
# 获取所有 Functions
curl https://api.agentrix.top/api/gemini/functions > functions.json

# 查看 Functions 列表
cat functions.json | jq '.functions[].name'
```

#### 步骤 2: 在代码中配置

**Python 示例**：

```python
import google.generativeai as genai
import requests
import json

# 配置 API Key
genai.configure(api_key="YOUR_GEMINI_API_KEY")

# 获取 Function Schemas
response = requests.get("https://api.agentrix.top/api/gemini/functions")
functions_data = response.json()
functions = functions_data["functions"]

# 创建模型并配置 Functions
model = genai.GenerativeModel(
    model_name="gemini-3-pro",
    tools=[{
        "function_declarations": functions
    }]
)

# 开始对话
chat = model.start_chat(history=[])

# 发送消息
response = chat.send_message("我要买 iPhone 15")

# 检查是否有 Function Call
if response.function_calls:
    for call in response.function_calls:
        # 调用 Agentrix API
        result = requests.post(
            "https://api.agentrix.top/api/gemini/function-call",
            json={
                "function": {
                    "name": call.name,
                    "arguments": call.args
                },
                "context": {"sessionId": "user-session-123"}
            }
        )
        
        # 将结果发送回 Gemini
        response = chat.send_message(result.json())
        
print(response.text)
```

**Node.js/TypeScript 示例**：

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// 获取 Function Schemas
const functionsResponse = await axios.get('https://api.agentrix.top/api/gemini/functions');
const functions = functionsResponse.data.functions;

// 创建模型
const model = genAI.getGenerativeModel({
  model: 'gemini-3-pro',
  tools: [{
    functionDeclarations: functions
  }]
});

// 开始对话
const chat = model.startChat({
  history: []
});

// 发送消息
const result = await chat.sendMessage('我要买 iPhone 15');
const response = result.response;

// 检查 Function Calls
const functionCalls = response.functionCalls();
if (functionCalls && functionCalls.length > 0) {
  for (const call of functionCalls) {
    // 调用 Agentrix API
    const apiResult = await axios.post(
      'https://api.agentrix.top/api/gemini/function-call',
      {
        function: {
          name: call.name,
          arguments: call.args
        },
        context: { sessionId: 'user-session-123' }
      }
    );
    
    // 将结果发送回 Gemini
    await chat.sendMessage(apiResult.data);
  }
}

console.log(await response.text());
```

## 🧪 测试流程

### 测试 1: 搜索商品

```
用户：我要买 iPhone 15
```

预期：Gemini 应该调用 `search_agentrix_products` Function

### 测试 2: 加入购物车

```
用户：把第一个商品加入购物车
```

预期：Gemini 应该调用 `add_to_agentrix_cart` Function

### 测试 3: 查看购物车

```
用户：查看我的购物车
```

预期：Gemini 应该调用 `view_agentrix_cart` Function

### 测试 4: 完整购买流程

```
用户：我要买 iPhone 15，直接购买
```

预期：Gemini 应该：
1. 调用 `search_agentrix_products` 搜索商品
2. 调用 `buy_agentrix_product` 创建订单

## 📝 可用的 Functions

当前 API 返回 **26 个 Functions**，分为以下几类：

### 🛒 电商功能（8个）

#### 1. search_agentrix_products
搜索商品

**参数**：
- `query` (必需): 搜索关键词
- `category` (可选): 商品分类
- `priceMin` (可选): 最低价格
- `priceMax` (可选): 最高价格
- `currency` (可选): 货币类型
- `inStock` (可选): 是否仅显示有库存商品

### 2. add_to_agentrix_cart
加入购物车

**参数**：
- `product_id` (必需): 商品ID
- `quantity` (可选): 数量，默认 1

### 3. view_agentrix_cart
查看购物车

**参数**：无

### 4. checkout_agentrix_cart
结算购物车

**参数**：无

### 5. buy_agentrix_product
购买商品

**参数**：
- `product_id` (必需): 商品ID
- `quantity` (可选): 数量
- `shipping_address` (可选): 收货地址
- `appointment_time` (可选): 预约时间
- `contact_info` (可选): 联系方式
- `wallet_address` (可选): 钱包地址（NFT类商品）
- `chain` (可选): 区块链网络

### 6. get_agentrix_order
查询订单

**参数**：
- `order_id` (必需): 订单ID

### 7. pay_agentrix_order
支付订单

**参数**：
- `order_id` (必需): 订单ID
- `payment_method` (可选): 支付方式

### 8. compare_agentrix_prices
比价服务

**参数**：
- `query` (可选): 要比较的商品查询

### 🎁 空投功能（4个）

#### 9. discover_agentrix_airdrops
发现可领取的空投机会

**参数**：
- `chain` (可选): 区块链网络（如ethereum、solana、bsc等）

#### 10. get_agentrix_airdrops
获取用户的空投列表

**参数**：
- `status` (可选): 空投状态筛选（monitoring、eligible、claimed、expired、failed）

#### 11. check_agentrix_airdrop_eligibility
检查空投是否符合领取条件

**参数**：
- `airdrop_id` (必需): 空投ID

#### 12. claim_agentrix_airdrop
领取空投

**参数**：
- `airdrop_id` (必需): 空投ID

### 💰 Auto-Earn 功能（4个）

#### 13. get_agentrix_auto_earn_tasks
获取Auto-Earn任务列表

**参数**：
- `type` (可选): 任务类型筛选（airdrop、task、strategy、referral）

#### 14. execute_agentrix_auto_earn_task
执行Auto-Earn任务

**参数**：
- `task_id` (必需): 任务ID

#### 15. get_agentrix_auto_earn_stats
获取Auto-Earn统计数据

**参数**：无

#### 16. toggle_agentrix_auto_earn_strategy
启动或停止Auto-Earn策略

**参数**：
- `strategy_id` (必需): 策略ID
- `enabled` (必需): 是否启用

### 🔐 Agent 授权功能（3个）

#### 17. create_agentrix_agent_authorization
创建Agent授权，设置限额和权限

**参数**：
- `agentId` (必需): Agent ID
- `authorizationType` (必需): 授权类型（trading、airdrop、autoearn、all）
- `singleLimit` (可选): 单次限额（USD）
- `dailyLimit` (可选): 每日限额（USD）
- `strategyPermissions` (可选): 策略级权限配置

#### 18. get_agentrix_agent_authorization
查询Agent授权信息

**参数**：
- `agentId` (必需): Agent ID

#### 19. update_agentrix_agent_authorization
更新Agent授权

**参数**：
- `authorizationId` (必需): 授权ID
- `singleLimit` (可选): 单次限额（USD）
- `dailyLimit` (可选): 每日限额（USD）
- `strategyPermissions` (可选): 策略级权限配置

### ⚛️ 原子结算功能（3个）

#### 20. create_agentrix_atomic_settlement
创建原子结算

**参数**：
- `transactions` (必需): 交易列表
- `condition` (必需): 执行条件（all_or_none、partial）

#### 21. execute_agentrix_atomic_settlement
执行原子结算

**参数**：
- `settlementId` (必需): 结算ID

#### 22. get_agentrix_atomic_settlement_status
查询原子结算状态

**参数**：
- `settlementId` (必需): 结算ID

### 💱 DEX 交易功能（2个）

#### 23. get_agentrix_best_execution
获取多DEX最优执行路径

**参数**：
- `fromToken` (必需): 源代币地址或符号
- `toToken` (必需): 目标代币地址或符号
- `amount` (必需): 数量
- `chain` (可选): 区块链网络
- `dexes` (可选): DEX列表

#### 24. execute_agentrix_best_swap
执行最优代币交换

**参数**：
- `fromToken` (必需): 源代币地址或符号
- `toToken` (必需): 目标代币地址或符号
- `amount` (必需): 数量
- `chain` (必需): 区块链网络
- `slippageTolerance` (可选): 滑点容忍度（百分比，默认0.5）

### 📈 交易策略功能（2个）

#### 25. create_agentrix_intent_strategy
通过自然语言创建交易策略

**参数**：
- `intentText` (必需): 用户意图文本，如"帮我把10%资产换成BTC，每周自动定投"
- `userId` (必需): 用户ID

#### 26. get_agentrix_strategy_status
查询交易策略状态

**参数**：
- `strategyId` (必需): 策略ID

## 🔧 API 端点详情

### 1. 获取 Function Schemas

```http
GET https://api.agentrix.top/api/gemini/functions
```

返回所有可用的 Function 定义。

### 2. 执行 Function Call

```http
POST https://api.agentrix.top/api/gemini/function-call
Content-Type: application/json

{
  "function": {
    "name": "search_agentrix_products",
    "arguments": {
      "query": "iPhone"
    }
  },
  "context": {
    "userId": "user-id",      // 可选，登录用户
    "sessionId": "session-id" // 必需，会话ID
  }
}
```

### 3. 对话接口（完整流程）

```http
POST https://api.agentrix.top/api/gemini/chat
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "我要买 iPhone 15"
    }
  ],
  "context": {
    "sessionId": "session-id"
  },
  "options": {
    "model": "gemini-3-pro",
    "temperature": 0.7
  }
}
```

### 4. OpenAPI 规范

```http
GET https://api.agentrix.top/api/gemini/openapi.json
```

返回完整的 OpenAPI 3.1.0 规范。

## 🐛 常见问题

### 问题 1: Function 未被调用

**可能原因**：
- System instruction 中没有明确说明使用 Functions
- Function Schema 格式不正确
- 用户指令不够明确

**解决方案**：
1. 确保 System instruction 中明确提到使用 Functions
2. 使用更明确的用户指令，如"搜索 iPhone"而不是"iPhone"
3. 检查 Function Schema 是否正确获取

### 问题 2: Function Call 返回错误

**可能原因**：
- API 端点不可访问
- 参数格式错误
- 服务端错误

**解决方案**：
1. 测试 API 端点是否可访问
2. 检查参数格式是否符合 Function Schema
3. 查看后端日志

### 问题 3: HTTPS 证书错误

**可能原因**：
- SSL 证书未配置或过期

**解决方案**：
1. 检查 SSL 证书配置
2. 确保使用有效的 HTTPS 证书

## ✅ 检查清单

- [ ] API 可以通过 HTTPS 访问
- [ ] `/api/gemini/functions` 返回正确的 Function Schemas
- [ ] `/api/gemini/function-call` 可以正常执行
- [ ] 在 Gemini Studio 或代码中配置了 Functions
- [ ] 测试搜索功能
- [ ] 测试购物车功能
- [ ] 测试订单功能

## 📚 相关资源

- [Gemini API 文档](https://ai.google.dev/docs)
- [Function Calling 文档](https://ai.google.dev/docs/function_calling)
- [Gemini Studio](https://aistudio.google.com/)
- [Agentrix API 文档](https://api.agentrix.top/api/docs)

## 🚀 下一步

1. 在 Gemini Studio 中测试完整流程
2. 集成到前端界面
3. 添加更多功能（物流查询、退款等）
4. 优化 Function 描述以提高调用准确性

