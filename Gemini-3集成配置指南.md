# Gemini 3 集成配置指南

## 📋 概述

本指南说明如何在 Gemini 3（Gemini Studio 或 Gemini API）中配置 Function Calling，使其能够检索和交易 Agentrix Marketplace 的商品。

## 🚀 配置步骤

### Step 1: 确保后端服务运行

确保后端服务正在运行，并且 Gemini 集成模块已正确加载：

```bash
# 检查服务状态
curl http://localhost:3001/api/gemini/functions

# 应该返回 Function Schemas
```

### Step 2: 配置 Gemini API Key

在 `backend/.env` 中配置：

```env
GEMINI_API_KEY=your-gemini-api-key
```

### Step 3: 在 Gemini Studio 中配置

#### 方式 A: 使用 Gemini Studio（推荐）

1. **打开 Gemini Studio**
   - 访问：https://aistudio.google.com/
   - 登录 Google 账号

2. **创建新的 Prompt**
   - 点击 "Create" → "New Prompt"
   - 选择 "Gemini 1.5 Pro" 或 "Gemini 1.5 Flash"

3. **配置 System Instruction**
   ```
   你是 Agentrix 购物助手，可以帮助用户搜索和购买商品。
   当用户想要搜索或购买商品时，使用 Agentrix 的 Functions。
   ```

4. **配置 Function Calling**
   - 在 "Tools" 或 "Functions" 部分
   - 添加 Function：`search_agentrix_products`
   - 添加 Function：`add_to_agentrix_cart`
   - 添加 Function：`view_agentrix_cart`
   - 添加 Function：`checkout_agentrix_cart`
   - 添加 Function：`buy_agentrix_product`
   - 添加 Function：`get_agentrix_order`

5. **配置 Function 端点**
   - Function URL: `http://your-server.com/api/gemini/function-call`
   - 或者使用本地测试：`http://localhost:3001/api/gemini/function-call`

#### 方式 B: 使用 Gemini API（编程方式）

使用 Gemini API 时，需要：

1. **获取 Function Schemas**
   ```bash
   curl http://localhost:3001/api/gemini/functions > gemini_functions.json
   ```

2. **在代码中配置**
   ```typescript
   import { GoogleGenerativeAI } from '@google/generative-ai';
   
   const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
   const model = genAI.getGenerativeModel({
     model: 'gemini-1.5-pro',
     tools: [{
       functionDeclarations: [
         // 从 /api/gemini/functions 获取的 Function Schemas
       ]
     }]
   });
   ```

### Step 4: 测试 Function Calling

在 Gemini Studio 中测试：

1. **测试搜索**
   ```
   用户：我要买 iPhone 15
   ```
   Gemini 应该自动调用 `search_agentrix_products` Function

2. **测试加入购物车**
   ```
   用户：把第一个商品加入购物车
   ```
   Gemini 应该调用 `add_to_agentrix_cart` Function

3. **测试查看购物车**
   ```
   用户：查看我的购物车
   ```
   Gemini 应该调用 `view_agentrix_cart` Function

## 🔧 API 端点说明

### 1. 获取 Function Schemas

```http
GET /api/gemini/functions
```

返回所有可用的 Function 定义，格式：

```json
{
  "functions": [
    {
      "name": "search_agentrix_products",
      "description": "搜索 Agentrix Marketplace 中的商品",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "搜索查询"
          }
        },
        "required": ["query"]
      }
    },
    ...
  ],
  "count": 7
}
```

### 2. 执行 Function Call

```http
POST /api/gemini/function-call
Content-Type: application/json

{
  "function": {
    "name": "search_agentrix_products",
    "arguments": {
      "query": "iPhone"
    }
  },
  "context": {
    "userId": "user-id",
    "sessionId": "session-id"
  }
}
```

### 3. 对话接口（完整流程）

```http
POST /api/gemini/chat
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
  }
}
```

## 📝 Function 列表

### 电商流程 Functions

1. **search_agentrix_products** - 搜索商品
   - 参数：`query` (必需), `category`, `priceMin`, `priceMax`, `currency`, `inStock`
   - 返回：商品列表

2. **add_to_agentrix_cart** - 加入购物车
   - 参数：`product_id` (必需), `quantity`
   - 返回：购物车信息

3. **view_agentrix_cart** - 查看购物车
   - 参数：无
   - 返回：购物车详情

4. **checkout_agentrix_cart** - 结算购物车
   - 参数：无
   - 返回：订单信息

5. **buy_agentrix_product** - 购买商品
   - 参数：`product_id` (必需), `quantity`, `shipping_address`, `appointment_time`, `contact_info`, `wallet_address`, `chain`
   - 返回：订单信息

6. **get_agentrix_order** - 查询订单
   - 参数：`order_id` (必需)
   - 返回：订单详情

7. **pay_agentrix_order** - 支付订单
   - 参数：`order_id` (必需), `payment_method`
   - 返回：支付意图信息

8. **compare_agentrix_prices** - 比价服务
   - 参数：`query`
   - 返回：价格比较结果

## 🌐 生产环境配置

### 使用公网地址

如果要在 Gemini Studio 中使用，需要：

1. **部署后端服务到公网**
   - 使用云服务器（如 AWS, GCP, Azure）
   - 或使用内网穿透工具（如 ngrok）

2. **配置 HTTPS**
   - Gemini 要求使用 HTTPS
   - 配置 SSL 证书

3. **更新 Function URL**
   ```
   https://your-domain.com/api/gemini/function-call
   ```

### 使用 ngrok（本地测试）

```bash
# 安装 ngrok
# 启动隧道
ngrok http 3001

# 使用返回的 HTTPS URL
# 例如：https://abc123.ngrok.io/api/gemini/function-call
```

## 🧪 测试脚本

使用提供的测试脚本：

```bash
python3 test_gemini_integration.py
```

## 📚 相关文档

- [Gemini API 文档](https://ai.google.dev/docs)
- [Function Calling 文档](https://ai.google.dev/docs/function_calling)
- [Gemini Studio](https://aistudio.google.com/)

## ✅ 检查清单

- [ ] 后端服务运行正常
- [ ] `GEMINI_API_KEY` 已配置
- [ ] `/api/gemini/functions` 返回 Function Schemas
- [ ] `/api/gemini/function-call` 可以执行 Function
- [ ] 在 Gemini Studio 中配置了 Functions
- [ ] 测试搜索功能
- [ ] 测试购物车功能
- [ ] 测试订单功能

## 🐛 常见问题

### 问题 1: 503 Service Unavailable

**原因**：后端服务未运行或模块未加载

**解决**：
1. 检查后端服务是否运行：`curl http://localhost:3001/api/health`
2. 检查日志是否有错误
3. 重启后端服务

### 问题 2: Function 未调用

**原因**：Function Schema 格式不正确或 Gemini 未识别

**解决**：
1. 检查 Function Schema 格式
2. 确保 System Instruction 中提到了使用 Functions
3. 使用更明确的用户指令

### 问题 3: Function Call 返回错误

**原因**：参数格式错误或服务端错误

**解决**：
1. 检查参数格式
2. 查看后端日志
3. 测试 Function 端点是否正常

## 🚀 下一步

1. 在 Gemini Studio 中测试完整流程
2. 集成到前端界面
3. 添加更多功能（物流查询、退款等）


