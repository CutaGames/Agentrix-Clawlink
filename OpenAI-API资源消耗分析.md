# Agentrix OpenAI API 资源消耗分析

## 📊 总结

**好消息**：Agentrix 目前**主要使用 Groq API（免费/低成本）**，而不是 OpenAI API！

只有在以下特定场景才会消耗 OpenAI API：

---

## 🔍 会消耗 OpenAI API 的场景

### 1. **ChatGPT 生态集成**（外部调用，不消耗我们的 API）✅

**位置**：`backend/src/modules/ai-integration/openai/`

**说明**：
- 这是**提供给外部 ChatGPT 调用的接口**
- ChatGPT 用户使用**他们自己的 OpenAI API Key**
- **不消耗我们的 OpenAI API 资源**

**API 端点**：
- `GET /api/openai/functions` - 返回 Function Schemas
- `POST /api/openai/function-call` - 执行 Function Call

**消耗情况**：**0 消耗**（外部用户自己付费）

---

### 2. **Embedding 服务**（可选，用于语义搜索）⚠️

**位置**：`backend/src/modules/search/embedding.service.ts`

**代码**：
```typescript
// 调用OpenAI或其他embedding API
const response = await fetch('https://api.openai.com/v1/embeddings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'text-embedding-ada-002',
    input: text,
  }),
});
```

**使用场景**：
- 商品语义搜索（如果启用）
- 文本相似度计算

**消耗情况**：
- **如果启用**：每次搜索可能消耗 ~$0.0001（取决于文本长度）
- **目前状态**：代码中有，但可能未启用或使用其他方案

**建议**：
- 如果使用，可以考虑使用免费的 embedding 服务（如 Hugging Face）
- 或者使用本地 embedding 模型

---

### 3. **Agent 对话系统**（目前使用 Groq，不消耗 OpenAI）✅

**位置**：`backend/src/modules/agent/agent.service.ts`

**实际使用的 LLM**：
- **Groq API**（免费/低成本）- 在 `groq-foundation-llm.service.ts` 中
- **不是 OpenAI**

**代码证据**：
```typescript
// backend/src/modules/foundation/llm-providers/groq-foundation-llm.service.ts
const response = await this.groq.chat.completions.create({
  model: 'llama-3.1-70b-versatile', // 使用 Groq 的模型
  messages: [...],
});
```

**消耗情况**：
- **Groq API**：免费额度很高，或成本极低
- **不消耗 OpenAI API**

---

## ✅ 不会消耗 OpenAI API 的场景

### 1. **Agent 对话** ✅
- 使用 Groq API（免费/低成本）
- 不消耗 OpenAI API

### 2. **商品搜索** ✅
- 使用数据库查询 + 可能的 embedding（如果启用）
- 不直接调用 OpenAI

### 3. **订单处理** ✅
- 纯业务逻辑，不涉及 AI

### 4. **支付处理** ✅
- 纯业务逻辑，不涉及 AI

### 5. **ChatGPT 集成** ✅
- 外部用户自己付费，不消耗我们的 API

---

## 💰 成本估算

### 如果启用 Embedding 服务：

**场景**：商品语义搜索

**成本**：
- OpenAI Embeddings: `text-embedding-ada-002`
- 价格：$0.0001 / 1K tokens
- 每次搜索：~100 tokens = **$0.00001**（约 0.00007 元）

**示例**：
- 1000 次搜索 = $0.01（约 0.07 元）
- 100,000 次搜索 = $1（约 7 元）

### 如果使用 OpenAI 作为 Agent LLM（目前未使用）：

**场景**：Agent 对话

**成本**：
- GPT-4: ~$0.03 / 1K input tokens, ~$0.06 / 1K output tokens
- 每次对话：~500 input + 200 output = **$0.027**（约 0.19 元）

**示例**：
- 1000 次对话 = $27（约 190 元）
- 10,000 次对话 = $270（约 1900 元）

---

## 🎯 建议

### 1. **保持现状**（推荐）✅

**当前架构**：
- Agent 对话使用 **Groq API**（免费/低成本）
- ChatGPT 集成由外部用户自己付费
- Embedding 可能未启用或使用其他方案

**优势**：
- **几乎零成本**
- 性能良好（Groq 速度快）
- 无需担心 OpenAI API 费用

### 2. **如果必须使用 OpenAI**

**场景**：需要 GPT-4 的更强能力

**建议**：
- 仅对**关键场景**使用 OpenAI（如复杂推理）
- 其他场景继续使用 Groq
- 实现**混合策略**：根据任务复杂度选择模型

### 3. **Embedding 优化**

**如果启用语义搜索**：
- 考虑使用**免费的 embedding 服务**（Hugging Face、本地模型）
- 或使用 OpenAI 的**批量 API**（更便宜）

---

## 📋 检查清单

### 检查当前配置：

```bash
# 检查环境变量
grep -r "OPENAI_API_KEY" backend/.env*

# 检查实际使用的 LLM Provider
grep -r "groq\|openai" backend/src/modules/foundation/
```

### 确认是否使用 OpenAI：

1. **Agent 对话**：检查 `foundation-llm.service.ts` 使用的 provider
2. **Embedding**：检查 `embedding.service.ts` 是否启用
3. **ChatGPT 集成**：确认是外部调用，不消耗我们的 API

---

## 🔧 如何切换到完全免费方案

### 1. Agent 对话
- ✅ 已使用 Groq（免费/低成本）
- 无需修改

### 2. Embedding
- 使用 Hugging Face 免费 API
- 或使用本地 embedding 模型（如 `sentence-transformers`）

### 3. ChatGPT 集成
- ✅ 外部用户自己付费
- 无需修改

---

## 📊 总结表

| 功能模块 | 当前使用 | 是否消耗 OpenAI API | 成本 |
|---------|---------|-------------------|------|
| Agent 对话 | Groq API | ❌ 否 | 免费/极低 |
| 商品搜索 | 数据库 + Embedding(可选) | ⚠️ 可能（如果启用） | 极低（$0.00001/次） |
| ChatGPT 集成 | 外部调用 | ❌ 否（外部付费） | 0 |
| 订单处理 | 业务逻辑 | ❌ 否 | 0 |
| 支付处理 | 业务逻辑 | ❌ 否 | 0 |

---

## 🎉 结论

**Agentrix 目前几乎不消耗 OpenAI API 资源！**

主要原因是：
1. ✅ Agent 对话使用 **Groq API**（免费/低成本）
2. ✅ ChatGPT 集成由**外部用户自己付费**
3. ⚠️ Embedding 服务可能未启用或使用其他方案

**只有在启用 Embedding 服务时才会产生少量 OpenAI API 费用**，且成本极低（每次搜索约 $0.00001）。

