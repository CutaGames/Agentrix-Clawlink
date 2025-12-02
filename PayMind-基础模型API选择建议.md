# PayMind 基础模型API选择建议

## 📋 概述

基于当前项目已有适配器和免费额度，推荐最适合的商用API用于Function Calling。

---

## ✅ 当前项目状态

### 已有适配器
- ✅ **OpenAI Adapter** - 已实现
- ✅ **Claude Adapter** - 已实现  
- ✅ **Gemini Adapter** - 已实现

### Function Calling支持
- ✅ OpenAI: Function Calling（原生支持）
- ✅ Claude: Tools（原生支持）
- ✅ Gemini: Function Calling（原生支持）

---

## 🎯 推荐方案（按优先级）

### 🥇 **首选：Groq API** ⭐（已集成）

**推荐理由**：
1. ✅ **免费额度最大**：每天14,400次API调用（最适合前期测试和种子用户）
2. ✅ **速度极快**：推理速度极快，适合高频调用
3. ✅ **支持Function Calling**：llama-3-groq-*-tool-use系列模型专门优化
4. ✅ **已集成**：项目已完成Groq集成
5. ✅ **性价比高**：免费额度足够支持前期测试和种子用户

**免费额度**：
- 每天14,400次API调用
- 每分钟30次请求
- 每分钟6,000个令牌

**推荐模型**：
- `llama-3-groq-70b-tool-use` - 70B模型，性能更好（默认）
- `llama-3-groq-8b-tool-use` - 8B模型，速度更快

**API文档**：
- https://console.groq.com/docs
- https://console.groq.com/playground

**集成成本**：⭐ 低（已完成集成）

**文件位置**：
- `backend/src/modules/ai-capability/adapters/groq.adapter.ts`
- `backend/src/modules/ai-integration/groq/`

---

### 🥈 **备选：Anthropic Claude API**

**推荐理由**：
1. ✅ **已有适配器**：项目已实现Claude Adapter
2. ✅ **原生Tools支持**：Claude 3.x原生支持Tools（Function Calling）
3. ✅ **免费试用额度**：新用户有免费试用额度
4. ✅ **质量高**：Claude在复杂推理和Function Calling方面表现优秀
5. ✅ **稳定性好**：Anthropic官方API，稳定可靠

**免费额度**：
- 新用户注册可获得免费试用额度
- 具体额度需要查看Anthropic官网最新政策

**API文档**：
- https://docs.anthropic.com/claude/docs/tool-use
- https://console.anthropic.com/

**集成成本**：⭐ 低（已有适配器）

---

### 🥈 **备选1：Groq API**

**推荐理由**：
1. ✅ **免费额度最大**：每天14,400次API调用
2. ✅ **速度快**：推理速度极快（适合高频调用）
3. ✅ **多模型支持**：Llama、Gemma、Mixtral等
4. ⚠️ **需要确认Function Calling支持**：需要验证是否支持Function Calling

**免费额度**：
- 每天14,400次API调用
- 语音转文字每天2,000次

**API文档**：
- https://console.groq.com/docs
- https://console.groq.com/playground

**集成成本**：⭐⭐ 中（需要创建新适配器）

**注意事项**：
- 需要确认Groq是否支持Function Calling
- 如果支持，需要创建GroqAdapter

---

### 🥉 **备选2：Google AI Studio (Gemini) - 推荐用于要求不高的场景** ⭐

**推荐理由**：
1. ✅ **已有适配器**：项目已实现Gemini Adapter
2. ✅ **原生Function Calling支持**：Gemini 1.5 Pro和2.0 Flash都支持Function Calling
3. ✅ **免费额度充足**：每天1,500次API调用（对于要求不高的场景足够）
4. ✅ **Google官方**：稳定可靠
5. ✅ **性价比高**：如果对大模型要求不高，Gemini Pro 1.5完全够用

**模型选择**：
- **Gemini 1.5 Pro**：✅ 支持Function Calling，适合要求不高的场景
- **Gemini 2.0 Flash**：✅ 更新版本，性能更好，也支持Function Calling（推荐使用）

**免费额度**：
- 每天1,500次API调用
- 对于要求不高的场景，这个额度通常足够

**API文档**：
- https://ai.google.dev/docs/function_calling
- https://aistudio.google.com/
- https://ai.google.dev/models/gemini

**集成成本**：⭐ 低（已有适配器）

**适用场景**：
- ✅ 对模型能力要求不高
- ✅ 主要是Function Calling调用
- ✅ 不需要复杂推理
- ✅ 预算有限或想先用免费额度测试

---

### 🔄 **备选3：智谱AI（BigModel）**

**推荐理由**：
1. ✅ **免费额度大**：新用户注册即赠送2,000万tokens体验包
2. ✅ **中文支持好**：适合中文场景
3. ⚠️ **需要确认Function Calling支持**：需要验证是否支持Function Calling
4. ⚠️ **需要创建适配器**：项目中没有适配器

**免费额度**：
- 新用户注册即赠送2,000万tokens体验包

**API文档**：
- https://www.bigmodel.cn/
- https://open.bigmodel.cn/

**集成成本**：⭐⭐⭐ 高（需要创建新适配器）

---

## 📊 对比表

| API | 免费额度 | Function Calling | 已有适配器 | 集成成本 | 推荐度 |
|-----|---------|-----------------|-----------|---------|--------|
| **Groq** | 每天14,400次 | ✅ 原生支持 | ✅ 已集成 | ⭐ 低 | 🥇 首选（已集成） |
| **Claude (Anthropic)** | 试用额度 | ✅ 原生支持 | ✅ 已有 | ⭐ 低 | 🥈 备选 |
| **Gemini (Google)** | 每天1,500次 | ✅ 原生支持 | ✅ 已有 | ⭐ 低 | 🥉 备选（要求不高时） |
| **智谱AI** | 2,000万tokens | ⚠️ 需确认 | ❌ 无 | ⭐⭐⭐ 高 | 🔄 备选3 |
| **OpenAI** | 较少 | ✅ 原生支持 | ✅ 已有 | ⭐ 低 | ⚠️ 额度少 |

---

## 🚀 实施建议

### 方案1：直接使用Groq（推荐）⭐（已集成）

**优势**：
- ✅ 已集成，可直接使用
- ✅ 免费额度最大（每天14,400次）
- ✅ 速度极快
- ✅ 支持Function Calling
- ✅ 最适合前期测试和种子用户

**步骤**：
1. 注册Groq账号获取API Key
   - ⚠️ 如果创建API Key时提示"no cftokens"，这是Cloudflare验证问题
   - 解决方案：禁用VPN、使用Chrome无痕模式、禁用广告拦截器
   - 如果无法解决，可以先使用Claude或Gemini（见备选方案）
2. 配置环境变量：`GROQ_API_KEY`
3. 重启服务
4. 测试Function Calling功能

**⚠️ 如果Groq API Key创建失败**：
- 可以先使用Claude或Gemini进行开发
- 等Groq问题解决后再切换回来
- 代码已支持多平台，切换很简单

**代码示例**：
```typescript
import { GroqIntegrationService } from './modules/ai-integration/groq/groq-integration.service';

// 调用Groq API（带Function Calling）
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
  model: 'llama-3-groq-70b-tool-use', // 支持Function Calling的模型
});

// 检查是否有Function Call
const message = response.choices[0]?.message;
if (message.tool_calls) {
  // 处理Function Call
  for (const toolCall of message.tool_calls) {
    const result = await groqIntegrationService.executeFunctionCall(
      toolCall.function.name,
      JSON.parse(toolCall.function.arguments),
      { userId: 'user-123' },
    );
  }
}
```

---

### 方案2：使用Claude（备选）⭐

**优势**：
- 已有适配器，集成成本最低
- 原生Tools支持，质量高
- 适合复杂推理场景

**步骤**：
1. 注册Anthropic账号获取API Key
2. 配置环境变量：`ANTHROPIC_API_KEY`
3. 在代码中切换到Claude平台
4. 测试Function Calling功能

**代码示例**：
```typescript
// 使用Claude Adapter
const claudeAdapter = new ClaudeAdapter();
const tools = claudeAdapter.convertProductsToFunctions(products, 'purchase');

// 调用Claude API
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  tools: tools,
  messages: [/* ... */],
});
```

---

### 方案2：Groq + 创建适配器（如果支持Function Calling）

**优势**：
- 免费额度最大（每天14,400次）
- 推理速度快

**步骤**：
1. 验证Groq是否支持Function Calling
2. 如果支持，创建GroqAdapter
3. 注册Groq账号获取API Key
4. 配置环境变量：`GROQ_API_KEY`
5. 测试Function Calling功能

**代码示例**（如果支持）：
```typescript
// 创建GroqAdapter（需要实现）
const groqAdapter = new GroqAdapter();
const functions = groqAdapter.convertProductsToFunctions(products, 'purchase');

// 调用Groq API
const response = await groq.chat.completions.create({
  model: 'llama-3.1-70b-versatile',
  messages: [/* ... */],
  tools: functions,
});
```

---

### 方案3：Gemini（已有适配器）- 如果要求不高，这是最佳选择 ⭐

**优势**：
- 已有适配器，集成成本低
- 免费额度充足（每天1,500次，对于要求不高的场景足够）
- Gemini Pro 1.5完全支持Function Calling
- 如果要求不高，Gemini Pro 1.5就能满足需求

**步骤**：
1. 注册Google AI Studio账号获取API Key
2. 配置环境变量：`GOOGLE_AI_API_KEY`
3. 在代码中切换到Gemini平台
4. 使用模型：`gemini-1.5-pro` 或 `gemini-2.0-flash-exp`（推荐）
5. 测试Function Calling功能

**代码示例**：
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiAdapter } from './adapters/gemini.adapter';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-pro', // 或 'gemini-2.0-flash-exp'
});

const geminiAdapter = new GeminiAdapter();
const functions = geminiAdapter.convertProductsToFunctions(products, 'purchase');

const result = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: '帮我搜索商品' }] }],
  tools: [{ functionDeclarations: functions }],
});
```

---

## 🔧 快速开始（Claude）

### 1. 注册Anthropic账号

访问：https://console.anthropic.com/

### 2. 获取API Key

在控制台创建API Key

### 3. 配置环境变量

```env
# .env
ANTHROPIC_API_KEY=sk-ant-xxx
```

### 4. 安装依赖

```bash
npm install @anthropic-ai/sdk
```

### 5. 使用Claude Adapter

```typescript
import { ClaudeAdapter } from './adapters/claude.adapter';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const claudeAdapter = new ClaudeAdapter();
const tools = claudeAdapter.convertProductsToFunctions(products, 'purchase');

const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  tools: tools,
  messages: [
    {
      role: 'user',
      content: '帮我搜索商品',
    },
  ],
});
```

---

## 📝 总结

### 推荐顺序

1. **🥇 Claude (Anthropic)** - 首选
   - 已有适配器
   - 原生Tools支持
   - 质量高
   - 集成成本最低

2. **🥈 Groq** - 备选（如果支持Function Calling）
   - 免费额度最大
   - 速度快
   - 需要创建适配器

3. **🥉 Gemini (Google)** - 备选
   - 已有适配器
   - 免费额度中等
   - 集成成本低

### 建议

**立即使用**（推荐）：
1. ✅ **优先使用Groq**（已集成，免费额度最大，速度极快，完全支持Function Calling）
2. ✅ 最适合前期测试和种子用户使用

**备选方案**：
1. ✅ 如果Groq免费额度不够，使用Claude（质量高）
2. ✅ 如果要求不高，使用Gemini（免费额度中等）

**总结**：
- **要求不高** → Gemini Pro 1.5 ⭐（最佳选择）
- **要求较高** → Claude（首选）

**长期规划**：
- 可以同时支持多个API，根据使用情况动态切换
- 实现API负载均衡和降级策略

---

**最后更新**: 2025年1月
**建议审查**: 技术团队

