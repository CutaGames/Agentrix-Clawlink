# Gemini 官网用户使用指南

## 🎯 目标

让使用 **Gemini 官网**（Gemini Studio 或 Gemini Web 界面）的用户，能够在 Gemini 的对话框中直接搜索和交易 Agentrix Marketplace 的商品。

## ⚠️ 重要说明

**Gemini 目前不支持类似 ChatGPT Actions 的外部扩展配置**。因此，我们提供以下两种方案：

## 📋 方案一：通过我们的代理服务（推荐，最简单）

我们提供一个公开的 API 服务，用户输入自己的 Gemini API Key，我们代理调用 Gemini 并处理 Function Calling。

### Step 1: 部署公开 API（需要 HTTPS）

#### 选项 A: 使用 ngrok（开发测试）

```bash
# 安装 ngrok
# 启动隧道
ngrok http 3001

# 会得到一个 HTTPS 地址，例如：https://abc123.ngrok.io
```

#### 选项 B: 部署到服务器（生产环境）

- 部署后端服务到云服务器
- 配置域名和 SSL 证书
- 确保 API 可以通过 HTTPS 访问

### Step 2: 用户使用方式

**用户只需要：**

1. **访问我们的 API**：`POST https://your-api.com/api/gemini/chat`
2. **提供自己的 Gemini API Key**：在请求体中包含 `geminiApiKey`
3. **开始对话**：发送消息 "我要买 iPhone 15"

**示例请求：**

```bash
curl -X POST https://your-api.com/api/gemini/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "我要买 iPhone 15"
      }
    ],
    "geminiApiKey": "用户自己的-Gemini-API-Key",
    "context": {
      "sessionId": "user-session-123"
    }
  }'
```

**我们的服务会：**
1. 使用用户的 Gemini API Key 调用 Gemini
2. 自动配置 Function Calling（包含所有 Agentrix Functions）
3. 处理 Function Calls（搜索商品、加入购物车等）
4. 返回结果给用户

### Step 3: 创建前端界面（可选）

为了方便用户使用，可以创建一个简单的 Web 界面：

- 用户输入自己的 Gemini API Key
- 提供对话界面
- 自动调用我们的 `/api/gemini/chat` 接口

## 📋 方案二：提供 OpenAPI 规范（开发者使用）

为开发者提供 OpenAPI 规范，让他们在自己的应用中集成。

### Step 1: 创建 OpenAPI 规范端点

我们需要创建一个类似 ChatGPT Actions 的 OpenAPI 规范：

```typescript
// GET /api/gemini/openapi.json
```

### Step 2: 开发者集成步骤

开发者需要：

1. **获取 Function Schemas**
   ```bash
   curl https://your-api.com/api/gemini/functions
   ```

2. **在自己的代码中配置**
   ```typescript
   import { GoogleGenerativeAI } from '@google/generative-ai';
   
   // 1. 获取 Function Schemas
   const functionsResponse = await fetch('https://your-api.com/api/gemini/functions');
   const { functions } = await functionsResponse.json();
   
   // 2. 配置 Gemini
   const genAI = new GoogleGenerativeAI(userGeminiApiKey);
   const model = genAI.getGenerativeModel({
     model: 'gemini-1.5-pro',
     tools: [{
       functionDeclarations: functions
     }]
   });
   
   // 3. 处理 Function Calls
   const chat = model.startChat();
   const result = await chat.sendMessage('我要买 iPhone 15');
   
   const functionCalls = result.response.functionCalls();
   if (functionCalls) {
     for (const call of functionCalls) {
       // 调用我们的 API 执行 Function
       const funcResult = await fetch('https://your-api.com/api/gemini/function-call', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           function: {
             name: call.name,
             arguments: call.args
           }
         })
       });
       
       // 将结果发送回 Gemini
       await chat.sendMessage([{
         functionResponse: {
           name: call.name,
           response: await funcResult.json()
         }
       }]);
     }
   }
   ```

## 🚀 推荐实现：创建 Web 界面

创建一个简单的 Web 界面，让用户可以直接使用：

### 功能特点

1. **用户输入自己的 Gemini API Key**
2. **自动配置 Function Calling**
3. **处理所有 Function Calls**
4. **提供友好的对话界面**

### 实现步骤

1. 创建前端页面：`/gemini-chat`
2. 用户输入 Gemini API Key
3. 前端调用我们的 `/api/gemini/chat` 接口
4. 我们的后端使用用户的 API Key 调用 Gemini
5. 自动处理 Function Calling

## ✅ 已完成的代码

### 1. ✅ 已添加 OpenAPI 规范端点

访问：`GET /api/gemini/openapi.json`

### 2. ✅ 已修改 chat 接口支持用户 API Key

现在 `/api/gemini/chat` 接口支持：
- `geminiApiKey`（可选）：用户提供的 Gemini API Key
- 如果提供，使用用户的 API Key
- 如果不提供，使用系统配置的 API Key

### 3. ✅ 已更新 service 支持用户 API Key

`GeminiIntegrationService.chatWithFunctions` 现在支持：
- `userApiKey` 参数
- 动态创建 `GoogleGenerativeAI` 实例

## ✅ 已完成的工作

1. ✅ **添加 OpenAPI 规范端点** - `/api/gemini/openapi.json`
2. ✅ **支持用户 API Key** - `/api/gemini/chat` 接口
3. ✅ **自动处理 Function Calling** - 所有电商流程 Functions

## 🚀 下一步行动

1. **部署到公网** - 使用 HTTPS（必需）
2. **创建 Web 界面**（可选）- 让普通用户更方便使用
3. **提供使用文档** - 告诉用户如何使用

## 📖 用户使用步骤

### 方式 A: 直接调用 API（开发者）

```bash
curl -X POST https://your-api.com/api/gemini/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "我要买 iPhone 15"}],
    "geminiApiKey": "YOUR_GEMINI_API_KEY",
    "context": {"sessionId": "session-123"}
  }'
```

### 方式 B: 使用 Web 界面（普通用户）

1. 访问：`https://your-api.com/gemini-chat`（需要创建）
2. 输入自己的 Gemini API Key
3. 开始对话："我要买 iPhone 15"
4. 系统自动搜索商品、加入购物车、创建订单等

## 🔗 相关文档

- `Gemini-3集成配置指南.md` - 技术配置说明
- `Gemini-3使用指南.md` - 使用说明

