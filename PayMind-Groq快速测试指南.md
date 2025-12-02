# Groq快速测试指南

## ✅ API Key已配置

Groq API Key已成功配置，现在可以开始测试和使用。

---

## 🧪 快速测试

### 方法1：使用测试脚本（推荐）

```bash
# 运行测试脚本
npm run ts-node backend/scripts/test-groq-integration.ts
```

测试脚本会验证：
- ✅ API连接是否正常
- ✅ Function Schemas获取是否正常
- ✅ Function Calling是否工作
- ✅ Function执行是否正常

### 方法2：使用API端点测试

#### 1. 测试获取Functions

```bash
curl http://localhost:3000/api/groq/functions
```

应该返回所有Function定义。

#### 2. 测试简单对话

```bash
curl "http://localhost:3000/api/groq/test?query=你好"
```

应该返回Groq的回复。

#### 3. 测试Function Calling

```bash
curl -X POST http://localhost:3000/api/groq/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "function": {
      "name": "search_paymind_products",
      "arguments": "{\"query\": \"耳机\"}"
    },
    "context": {
      "userId": "test-user-123"
    }
  }'
```

---

## 💻 在代码中使用

### 示例1：简单对话

```typescript
import { GroqIntegrationService } from './modules/ai-integration/groq/groq-integration.service';

const response = await groqIntegrationService.chatWithFunctions([
  {
    role: 'user',
    content: '你好，请介绍一下你自己',
  },
], {
  model: 'llama-3-groq-70b-tool-use',
  temperature: 0.7,
});

console.log(response.choices[0]?.message?.content);
```

### 示例2：Function Calling

```typescript
const response = await groqIntegrationService.chatWithFunctions([
  {
    role: 'system',
    content: '你是一个购物助手，可以帮助用户搜索和购买PayMind Marketplace的商品。',
  },
  {
    role: 'user',
    content: '帮我搜索耳机',
  },
], {
  model: 'llama-3-groq-70b-tool-use',
});

const message = response.choices[0]?.message;

// 检查是否有Function Call
if (message.tool_calls && message.tool_calls.length > 0) {
  for (const toolCall of message.tool_calls) {
    const functionName = toolCall.function.name;
    const parameters = JSON.parse(toolCall.function.arguments);
    
    // 执行Function
    const result = await groqIntegrationService.executeFunctionCall(
      functionName,
      parameters,
      { userId: 'user-123' },
    );
    
    console.log('Function执行结果:', result);
  }
}
```

### 示例3：在Agent Runtime中使用

```typescript
// 在Agent处理用户请求时
import { GroqIntegrationService } from './modules/ai-integration/groq/groq-integration.service';

async function handleUserRequest(userMessage: string, userId: string) {
  const response = await groqIntegrationService.chatWithFunctions([
    {
      role: 'system',
      content: '你是一个智能助手，可以帮助用户完成各种任务。',
    },
    {
      role: 'user',
      content: userMessage,
    },
  ], {
    model: 'llama-3-groq-70b-tool-use',
  });

  // 处理响应...
  return response;
}
```

---

## 📊 验证清单

- [ ] API Key已配置（环境变量 `GROQ_API_KEY`）
- [ ] 依赖已安装（`groq-sdk`）
- [ ] 服务已重启
- [ ] 测试脚本运行成功
- [ ] API端点可访问
- [ ] Function Calling正常工作

---

## 🎯 下一步

1. ✅ **测试Function Calling功能**
   - 运行测试脚本
   - 验证Function调用是否正常

2. ✅ **集成到Agent Runtime**
   - 在Agent处理用户请求时使用Groq
   - 测试完整流程

3. ✅ **集成到Intent Engine**
   - 使用Groq进行意图识别
   - 转换为策略图

4. ✅ **监控使用量**
   - 监控API调用次数
   - 确保不超过免费额度（每天14,400次）

---

## 📝 注意事项

### 免费额度限制

- **每天**：14,400次API调用
- **每分钟**：30次请求
- **每分钟**：6,000个令牌

### 推荐模型

- `llama-3-groq-70b-tool-use` - 70B模型，性能更好（默认）
- `llama-3-groq-8b-tool-use` - 8B模型，速度更快

### 错误处理

如果遇到错误：
1. 检查API Key是否正确
2. 检查网络连接
3. 检查是否超过速率限制
4. 查看日志获取详细错误信息

---

**状态**: ✅ API Key已配置，可以开始使用

