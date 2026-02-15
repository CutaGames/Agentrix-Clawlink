# Agent 工具执行修复实施方案

**目标**: 让 Agent 能真实调用工具（发推文、找资源、GitHub 互动等）
**范围**: Tick 自动化 + 对话框交互
**预计时间**: 1-2 小时

---

## 修改清单

### 1. AI Service 添加工具支持 ⚡ P0

**文件**: `hq-backend/src/modules/ai/hq-ai.service.ts`

**修改点 1.1**: 添加 tools 参数到接口
```typescript
// Line 24-30
export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  retryCount?: number;
  tools?: any[];  // ✅ 新增：工具定义数组
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  usage: { ... };
  finishReason: string;
  toolCalls?: Array<{  // ✅ 新增：工具调用
    id: string;
    name: string;
    arguments: any;
  }>;
}
```

**修改点 1.2**: Bedrock 调用传递 tools
```typescript
// 估计在 Line 300-350
async bedrockChat(messages, options) {
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: options.maxTokens || 4096,
    messages: formattedMessages,
    tools: options.tools || [],  // ✅ 传递工具
  };

  const response = await axios.post(url, payload, ...);

  // ✅ 检查 stop_reason
  if (response.data.stop_reason === 'tool_use') {
    const toolUseBlocks = response.data.content.filter(
      block => block.type === 'tool_use'
    );
    return {
      content: '',
      toolCalls: toolUseBlocks.map(block => ({
        id: block.id,
        name: block.name,
        arguments: block.input,
      })),
      model: options.model,
      usage: { ... },
      finishReason: 'tool_use',
    };
  }

  return { content: response.data.content[0].text, ... };
}
```

**修改点 1.3**: Gemini 调用传递 tools
```typescript
// 估计在 Line 400-450
async geminiChat(messages, options) {
  const tools = options.tools?.length > 0 ? [{
    functionDeclarations: options.tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.input_schema || t.parameters,
    })),
  }] : undefined;

  const result = await model.generateContent({
    contents: [...],
    tools,  // ✅ 传递工具
  });

  // ✅ 检查 functionCall
  const functionCall = result.response.functionCalls()?.[0];
  if (functionCall) {
    return {
      content: '',
      toolCalls: [{
        id: `gemini_${Date.now()}`,
        name: functionCall.name,
        arguments: functionCall.args,
      }],
      finishReason: 'tool_use',
      ...
    };
  }

  return { content: result.response.text(), ... };
}
```

---

## 测试计划

### 单元测试 - 工具执行

```bash
# 1. 测试 ToolService
curl -X POST http://57.182.89.146:8080/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "web_search",
    "params": {"query": "free API 2026"},
    "context": {"agentCode": "BD-01", "workspaceId": "test"}
  }'
```

### 集成测试 - 对话工具调用

```bash
# 2. 测试对话框调用工具
curl -X POST http://57.182.89.146:8080/api/hq/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agentCode": "SOCIAL-01",
    "message": "发一条推文说：Agentrix HQ 现在可以自动工作了！🎉",
    "mode": "staff"
  }'
```

---

## 成功标准

✅ **对话框测试**:
- 用户: "帮我发一条推文"
- Agent 调用 `twitter_post` 工具
- 返回: "已发布推文，ID: 1234567890"

✅ **Tick 自动化**:
- 每 10 分钟 Tick 执行
- SOCIAL-01 自动发推 ✅
- BD-01 自动搜索免费资源 ✅

✅ **Twitter 账号**:
- 24 小时内至少 5 条新推文
