# Gemini 3 使用指南 - 在对话框中检索和交易商品

## 🎯 目标

在 Gemini 3 的对话框中，让用户可以直接说"我要买 iPhone"，Gemini 会自动搜索商品、加入购物车、创建订单等。

## 📋 两种使用方式

### 方式 1: 使用我们的集成接口（推荐，最简单）

我们已经创建了 `/api/gemini/chat` 接口，它已经集成了 Function Calling。你只需要：

1. **调用对话接口**
   ```bash
   curl -X POST http://localhost:3001/api/gemini/chat \
     -H "Content-Type: application/json" \
     -d '{
       "messages": [
         {
           "role": "user",
           "content": "我要买 iPhone 15"
         }
       ],
       "context": {
         "sessionId": "test-session-123"
       }
     }'
   ```

2. **前端集成示例**
   ```typescript
   const response = await fetch('http://localhost:3001/api/gemini/chat', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       messages: [
         { role: 'user', content: '我要买 iPhone 15' }
       ],
       context: { sessionId: 'user-session-id' }
     })
   });
   ```

### 方式 2: 直接使用 Gemini API（需要自己处理 Function Calling）

如果你想在前端直接调用 Gemini API，需要：

1. **获取 Function Schemas**
   ```bash
   curl http://localhost:3001/api/gemini/functions
   ```

2. **在代码中配置**
   ```typescript
   import { GoogleGenerativeAI } from '@google/generative-ai';
   
   const genAI = new GoogleGenerativeAI('your-gemini-api-key');
   const model = genAI.getGenerativeModel({
     model: 'gemini-1.5-pro',
     tools: [{
       functionDeclarations: [
         // 从 /api/gemini/functions 获取的 Function Schemas
         {
           name: 'search_agentrix_products',
           description: '搜索 Agentrix Marketplace 中的商品',
           parameters: {
             type: 'object',
             properties: {
               query: { type: 'string', description: '搜索查询' }
             },
             required: ['query']
           }
         },
         // ... 其他 Functions
       ]
     }]
   });
   
   const chat = model.startChat({
     systemInstruction: '你是 Agentrix 购物助手，可以帮助用户搜索和购买商品。'
   });
   
   const result = await chat.sendMessage('我要买 iPhone 15');
   const response = result.response;
   
   // 检查是否有 Function Call
   const functionCalls = response.functionCalls();
   if (functionCalls) {
     // 调用我们的 API 执行 Function
     for (const call of functionCalls) {
       const result = await fetch('http://localhost:3001/api/gemini/function-call', {
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
           response: await result.json()
         }
       }]);
     }
   }
   ```

## 🔧 解决 503 错误

如果遇到 503 错误，检查：

1. **后端服务是否运行**
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Gemini 模块是否加载**
   - 检查 `app.module.ts` 中是否导入了 `GeminiIntegrationModule`
   - 检查后端日志是否有错误

3. **重启后端服务**
   ```bash
   cd backend
   npm run start:dev
   ```

## 🚀 快速开始

### Step 1: 确保后端运行

```bash
# 检查服务
curl http://localhost:3001/api/health

# 检查 Functions
curl http://localhost:3001/api/gemini/functions
```

### Step 2: 测试对话接口

```bash
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

### Step 3: 在前端集成

创建一个简单的聊天界面，调用 `/api/gemini/chat` 接口即可。

## 📝 完整示例

### 前端 React 组件示例

```typescript
import { useState } from 'react';

export function GeminiShoppingChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    const userMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');

    try {
      const response = await fetch('http://localhost:3001/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context: {
            sessionId: 'user-session-id'
          }
        })
      });

      const result = await response.json();
      
      setMessages([
        ...messages,
        userMessage,
        { role: 'assistant', content: result.text }
      ]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <div>
        {messages.map((msg, i) => (
          <div key={i}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>发送</button>
    </div>
  );
}
```

## ✅ 检查清单

- [ ] 后端服务运行正常
- [ ] `GEMINI_API_KEY` 已配置
- [ ] `/api/gemini/functions` 返回 Function Schemas
- [ ] `/api/gemini/chat` 可以正常对话
- [ ] 测试搜索功能
- [ ] 测试购物车功能
- [ ] 测试订单功能

## 🎯 使用场景示例

### 场景 1: 搜索商品

```
用户：我要买 iPhone 15
→ Gemini 调用 search_agentrix_products
→ 返回商品列表
```

### 场景 2: 加入购物车

```
用户：把第一个商品加入购物车
→ Gemini 调用 add_to_agentrix_cart
→ 商品已加入购物车
```

### 场景 3: 查看购物车

```
用户：查看我的购物车
→ Gemini 调用 view_agentrix_cart
→ 显示购物车内容
```

### 场景 4: 结算

```
用户：结算购物车
→ Gemini 调用 checkout_agentrix_cart
→ 创建订单
```

## 🔗 相关文档

- `Gemini-3集成配置指南.md` - 详细配置说明
- `Gemini电商流程集成说明.md` - 功能说明


