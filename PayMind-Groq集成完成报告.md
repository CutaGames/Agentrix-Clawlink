# PayMind Groq集成完成报告

## 📋 概述

已完成Groq API集成，支持Function Calling功能。Groq提供最大的免费额度（每天14,400次），非常适合前期测试和种子用户使用。

---

## ✅ 已完成功能

### 1. Groq Adapter ✅

**文件位置**: `backend/src/modules/ai-capability/adapters/groq.adapter.ts`

**功能**：
- ✅ 实现 `IPlatformAdapter` 接口
- ✅ 将产品转换为Groq Function Schema（兼容OpenAI格式）
- ✅ 支持所有能力类型（purchase、book、mint、query等）
- ✅ Schema验证功能

**特点**：
- Groq API兼容OpenAI格式，所以使用 `OpenAIFunctionSchema`
- 函数名格式：`paymind_{capability}_{type}`
- 自动生成参数和描述

### 2. Groq集成服务 ✅

**文件位置**: `backend/src/modules/ai-integration/groq/groq-integration.service.ts`

**核心功能**：
- ✅ `getFunctionSchemas()` - 获取所有Function定义
- ✅ `executeFunctionCall()` - 执行Function调用
- ✅ `chatWithFunctions()` - 调用Groq API（带Function Calling）
- ✅ 支持系统级Functions（search、buy、get_order）
- ✅ 支持产品特定Functions

**推荐模型**：
- `llama-3-groq-70b-tool-use` - 70B模型，性能更好（默认）
- `llama-3-groq-8b-tool-use` - 8B模型，速度更快

### 3. Groq集成控制器 ✅

**文件位置**: `backend/src/modules/ai-integration/groq/groq-integration.controller.ts`

**API端点**：
- `GET /api/groq/functions` - 获取Function Schemas
- `POST /api/groq/function-call` - 执行Function Call
- `GET /api/groq/test?query={query}` - 快速测试接口

### 4. 模块注册 ✅

**已更新**：
- ✅ `PlatformRegistryService` - 注册Groq适配器
- ✅ `AiCapabilityModule` - 添加GroqAdapter
- ✅ `AppModule` - 添加GroqIntegrationModule

---

## 🚀 快速开始

### 1. 注册Groq账号

访问：https://console.groq.com/

### 2. 获取API Key

在控制台创建API Key

**⚠️ 注意事项**：
- 如果创建API Key时提示"no cftokens"，这是Cloudflare验证问题
- 解决方案：
  1. 禁用VPN/代理
  2. 使用Chrome浏览器（无痕模式）
  3. 禁用广告拦截器
  4. 等待Cloudflare验证完成
  5. 如果仍无法解决，联系Groq支持或先使用Claude/Gemini
- 详细解决方案见：`PayMind-Groq-API-Key创建问题解决方案.md`

### 3. 安装依赖

```bash
npm install groq-sdk
```

### 4. 配置环境变量

```env
# .env
GROQ_API_KEY=gsk_xxx
```

### 5. 使用示例

```typescript
import { GroqIntegrationService } from './modules/ai-integration/groq/groq-integration.service';

// 调用Groq API（带Function Calling）
const response = await groqService.chatWithFunctions([
  {
    role: 'system',
    content: '你是一个购物助手，可以帮助用户搜索和购买PayMind Marketplace的商品。',
  },
  {
    role: 'user',
    content: '帮我搜索耳机',
  },
]);

// 检查是否有Function Call
const message = response.choices[0]?.message;
if (message.tool_calls) {
  // 处理Function Call
  for (const toolCall of message.tool_calls) {
    const functionName = toolCall.function.name;
    const parameters = JSON.parse(toolCall.function.arguments);
    
    // 执行Function
    const result = await groqService.executeFunctionCall(
      functionName,
      parameters,
      { userId: 'user-123' },
    );
    
    // 将结果返回给Groq
    // ...
  }
}
```

---

## 📊 Groq免费额度

### 免费套餐限制

- **请求限制**：
  - 每分钟最多 30 次请求
  - 每天最多 14,400 次请求
- **令牌限制**：
  - 每分钟最多 6,000 个令牌

### 适用场景

✅ **非常适合**：
- 前期测试
- 种子用户使用
- 中小规模应用
- 开发环境

⚠️ **注意事项**：
- 如果超出免费额度，可以考虑：
  - 升级到开发者套餐
  - 使用其他API作为备选（Claude、Gemini）

---

## 🔧 支持Function Calling的模型

### 推荐模型

1. **llama-3-groq-70b-tool-use** ⭐（默认）
   - 70B参数模型
   - 性能更好
   - 适合复杂场景

2. **llama-3-groq-8b-tool-use**
   - 8B参数模型
   - 速度更快
   - 适合简单场景

### 其他可用模型

- `llama-3.1-70b-versatile`
- `llama-3.1-8b-instant`
- `mixtral-8x7b-32768`
- `gemma-7b-it`

**注意**：只有 `llama-3-groq-*-tool-use` 系列专门为Function Calling优化。

---

## 📝 API使用示例

### 1. 获取Function Schemas

```bash
curl http://localhost:3000/api/groq/functions
```

**响应**：
```json
{
  "functions": [
    {
      "type": "function",
      "function": {
        "name": "search_paymind_products",
        "description": "搜索PayMind Marketplace中的商品...",
        "parameters": { ... }
      }
    },
    ...
  ],
  "count": 10
}
```

### 2. 执行Function Call

```bash
curl -X POST http://localhost:3000/api/groq/function-call \
  -H "Content-Type: application/json" \
  -d '{
    "function": {
      "name": "search_paymind_products",
      "arguments": "{\"query\": \"耳机\"}"
    },
    "context": {
      "userId": "user-123"
    }
  }'
```

### 3. 测试接口

```bash
curl "http://localhost:3000/api/groq/test?query=帮我搜索耳机"
```

---

## 🎯 集成到现有系统

### 在Agent Runtime中使用

```typescript
import { GroqIntegrationService } from './modules/ai-integration/groq/groq-integration.service';

// 在Agent处理用户请求时
const response = await groqIntegrationService.chatWithFunctions(
  [
    { role: 'user', content: userMessage },
  ],
  {
    model: 'llama-3-groq-70b-tool-use',
    temperature: 0.7,
  },
);
```

### 在Intent Engine中使用

```typescript
// 在意图识别时使用Groq
const intent = await groqIntegrationService.chatWithFunctions([
  {
    role: 'system',
    content: '识别用户的交易意图，转换为策略类型。',
  },
  {
    role: 'user',
    content: '帮我把10%资产换成BTC，每周自动定投',
  },
]);
```

---

## 📊 对比其他API

| API | 免费额度 | Function Calling | 速度 | 推荐度 |
|-----|---------|-----------------|------|--------|
| **Groq** | 每天14,400次 | ✅ 支持 | ⚡ 极快 | 🥇 首选 |
| Claude | 试用额度 | ✅ 支持 | 快 | 🥈 备选 |
| Gemini | 每天1,500次 | ✅ 支持 | 快 | 🥉 备选 |
| OpenAI | 较少 | ✅ 支持 | 快 | ⚠️ 额度少 |

---

## 🔒 安全考虑

### 1. API Key保护
- ✅ 使用环境变量存储API Key
- ✅ 不要提交到代码仓库
- ✅ 生产环境使用密钥管理服务

### 2. 速率限制
- ✅ 实现客户端速率限制
- ✅ 监控API使用量
- ✅ 设置告警阈值

### 3. 错误处理
- ✅ 处理API调用失败
- ✅ 实现重试机制
- ✅ 降级策略（切换到其他API）

---

## 🧪 测试建议

### 1. 单元测试

```typescript
describe('GroqAdapter', () => {
  it('应该转换产品为Function Schema', () => {
    const adapter = new GroqAdapter();
    const functionSchema = adapter.convertProductToFunction(product, 'purchase');
    expect(functionSchema.name).toBeDefined();
    expect(functionSchema.parameters).toBeDefined();
  });
});
```

### 2. 集成测试

```typescript
describe('GroqIntegrationService', () => {
  it('应该调用Groq API并返回响应', async () => {
    const response = await groqService.chatWithFunctions([
      { role: 'user', content: '测试' },
    ]);
    expect(response.choices).toBeDefined();
  });
});
```

### 3. 端到端测试

```typescript
describe('Groq Function Calling E2E', () => {
  it('应该完整流程：用户请求 -> Groq调用Function -> 执行 -> 返回结果', async () => {
    // 测试完整流程
  });
});
```

---

## 📈 性能优化建议

### 1. 缓存Function Schemas
- Function Schemas可以缓存，避免每次都查询数据库
- 当产品更新时，清除缓存

### 2. 批量处理
- 如果有多个Function Call，可以批量执行
- 减少API调用次数

### 3. 模型选择
- 简单场景使用 `llama-3-groq-8b-tool-use`（更快）
- 复杂场景使用 `llama-3-groq-70b-tool-use`（更好）

---

## ✅ 总结

**已完成**：
- ✅ GroqAdapter实现
- ✅ Groq集成服务
- ✅ Groq集成控制器
- ✅ 模块注册

**优势**：
- ✅ 免费额度最大（每天14,400次）
- ✅ 速度极快
- ✅ 支持Function Calling
- ✅ 适合前期测试和种子用户

**下一步**：
- ⚠️ 测试Function Calling功能
- ⚠️ 集成到Agent Runtime
- ⚠️ 监控API使用量
- ⚠️ 实现降级策略

---

**完成日期**: 2025年1月
**状态**: ✅ 已完成，待测试

