# Gemini 电商流程集成说明

## 📋 概述

已成功集成 Google Gemini API 实现电商流程，支持通过 Gemini 进行商品搜索、购物车管理、订单处理等操作。

## 🚀 功能特性

### 支持的电商功能

1. **商品搜索** (`search_agentrix_products`)
   - 搜索商品
   - 支持分类、价格范围、库存筛选

2. **购物车管理**
   - 加入购物车 (`add_to_agentrix_cart`)
   - 查看购物车 (`view_agentrix_cart`)
   - 结算购物车 (`checkout_agentrix_cart`)

3. **订单处理**
   - 购买商品 (`buy_agentrix_product`)
   - 查询订单 (`get_agentrix_order`)
   - 支付订单 (`pay_agentrix_order`)

4. **比价服务** (`compare_agentrix_prices`)

## 📦 安装依赖

```bash
cd backend
npm install @google/generative-ai
```

## ⚙️ 环境配置

在 `backend/.env` 文件中添加：

```env
GEMINI_API_KEY=your-gemini-api-key
```

## 🔌 API 端点

### 1. 获取 Function Schemas

```http
GET /api/gemini/functions
```

返回所有可用的 Function 定义。

### 2. 执行 Function Call

```http
POST /api/gemini/function-call
Content-Type: application/json

{
  "function": {
    "name": "search_agentrix_products",
    "arguments": "{\"query\": \"iPhone\"}"
  },
  "context": {
    "userId": "user-id",
    "sessionId": "session-id"
  }
}
```

### 3. 对话接口（带 Function Calling）

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
    "userId": "user-id",
    "sessionId": "session-id"
  },
  "options": {
    "model": "gemini-1.5-pro",
    "temperature": 0.7,
    "maxTokens": 2048
  }
}
```

### 4. 快速测试

```http
GET /api/gemini/test?query=iPhone
```

## 🧪 测试示例

### 使用 curl 测试

```bash
# 1. 获取 Functions
curl http://localhost:3001/api/gemini/functions

# 2. 测试搜索
curl "http://localhost:3001/api/gemini/test?query=iPhone"

# 3. 执行 Function Call
curl -X POST http://localhost:3001/api/gemini/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "function": {
      "name": "search_agentrix_products",
      "arguments": "{\"query\": \"iPhone\"}"
    }
  }'

# 4. 对话测试
curl -X POST http://localhost:3001/api/gemini/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "我要买 iPhone 15"
      }
    ]
  }'
```

## 📝 代码结构

```
backend/src/modules/ai-integration/gemini/
├── gemini-integration.service.ts    # Gemini 集成服务
├── gemini-integration.controller.ts # API 控制器
└── gemini-integration.module.ts     # NestJS 模块
```

## 🔄 与现有系统的集成

- 使用 `CapabilityRegistryService` 注册系统能力
- 使用 `CapabilityExecutorService` 执行能力
- 支持匿名用户（通过 sessionId）
- 支持登录用户（通过 userId）

## 🎯 使用场景

### 场景 1: 商品搜索

用户说："我要买 iPhone 15"

Gemini 会自动调用 `search_agentrix_products` Function，返回搜索结果。

### 场景 2: 加入购物车

用户说："把第一个商品加入购物车"

Gemini 会调用 `add_to_agentrix_cart` Function。

### 场景 3: 查看购物车

用户说："查看我的购物车"

Gemini 会调用 `view_agentrix_cart` Function。

### 场景 4: 结算

用户说："结算购物车"

Gemini 会调用 `checkout_agentrix_cart` Function。

## 🔧 配置说明

### 默认模型

- 默认使用 `gemini-1.5-pro`
- 支持 Function Calling

### 温度设置

- 默认 `temperature: 0.7`
- 可在请求中自定义

### Token 限制

- 默认 `maxOutputTokens: 2048`
- 可在请求中自定义

## 📚 相关文档

- [Gemini API 文档](https://ai.google.dev/docs)
- [Function Calling 文档](https://ai.google.dev/docs/function_calling)

## ✅ 完成状态

- ✅ Gemini 集成服务
- ✅ API 控制器
- ✅ NestJS 模块
- ✅ 电商流程 Functions
- ✅ Function Calling 支持
- ✅ 测试接口

## 🚀 下一步

1. 在 Gemini Studio 中测试 Function Calling
2. 集成到前端界面
3. 添加更多电商功能（如物流查询、退款等）

