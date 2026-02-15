# HQ 项目核心问题诊断报告

**报告日期**: 2026-02-10
**诊断范围**: Agent 自动化无法产生真实外部输出
**严重程度**: 🔴 P0 - 阻塞性问题

---

## 执行摘要

虽然 Tick 系统在运行（349次执行，99.14%成功率），但 **Agent 无法执行真实工具**，导致：
- ❌ 没有发出任何推文
- ❌ 没有 GitHub/论坛外联
- ❌ 没有寻找免费资源的实际行动
- ❌ 所有任务只生成内部文本，无外部可见输出

**根本原因**: ToolService 已完整实现但未集成到 Tick → AI 调用链中。

---

## 问题1: 工具未集成到 AI 调用流程

### 当前架构（❌ 断链）

```
Tick Cron (每10分钟)
  ↓
AgentTriggerService.triggerAgent()
  ↓
UnifiedChatService.chat()
  ↓
HQAIService.chatForAgent()
  ↓
AI 模型（Bedrock/Gemini/Groq）
  ↓
返回纯文本 ⚠️ 工具调用被忽略
```

### 已存在但未使用的服务

✅ **ToolService** (`hq-backend/src/modules/tools/tool.service.ts`)
- 已注册 18+ 工具，包括：
  - `twitter_post` - 发推文
  - `twitter_search` - 搜索推文
  - `twitter_engage` - 点赞/转发/回复
  - `web_search` - Google 搜索
  - `github_action` - GitHub 互动
  - `send_email` - 邮件外发
  - `telegram_send` - Telegram 消息
  - `shell_execute` - 执行 shell 命令
  - `read_file` / `write_file` - 文件操作

✅ **工具执行器** (`tool.service.ts:134-176`)
```typescript
async executeTool(toolName, params, context): Promise<ToolExecutionResult> {
  // 完整实现，支持超时、权限控制、错误处理
}
```

✅ **多 AI 平台工具格式转换**
```typescript
getOpenAITools(agentRole)    // OpenAI function calling 格式
getClaudeTools(agentRole)     // Anthropic tools 格式
getGeminiTools(agentRole)     // Google function declaration 格式
```

### 缺失的集成点

❌ **HQAIService.chatForAgent()** 不接受 `tools` 参数
```typescript
// hq-backend/src/modules/ai/hq-ai.service.ts:24-30
export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  retryCount?: number;
  // ❌ 缺少: tools?: ToolDefinition[];
}
```

❌ **UnifiedChatService.chat()** 没有工具执行循环
```typescript
// hq-backend/src/modules/core/unified-chat.service.ts:125-129
const aiResult = await this.aiService.chatForAgent(
  agentCode,
  conversationMessages,
  { systemPrompt, maxTokens: 16384 },  // ❌ 未传 tools
);

// ❌ 没有处理 tool_use 响应
// ❌ 没有调用 ToolService.executeTool()
// ❌ 没有将工具结果回传给 AI
```

❌ **AgentTriggerService.triggerAgent()** 只期待文本响应
```typescript
// hq-backend/src/hq/tick/agent-trigger.service.ts:68-76
const chatResponse = await this.unifiedChatService.chat({
  agentCode,
  message: taskPrompt,
  mode: 'staff',
  // ❌ 没有传递工具列表
  // ❌ 没有处理工具执行结果
});

return {
  success: true,
  response: chatResponse.response,  // ❌ 只返回文本
};
```

---

## 问题2: AI Service 不支持工具调用

### Bedrock（Claude）调用示例缺失

当前 `bedrockChat()` 实现未传递 tools:
```typescript
// hq-backend/src/modules/ai/hq-ai.service.ts (估计 ~300 行)
async bedrockChat(messages, options) {
  const response = await axios.post(url, {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: options.maxTokens || 4096,
    messages: formattedMessages,
    // ❌ 缺少: tools: options.tools,
  });

  // ❌ 返回时未检查 stop_reason === 'tool_use'
  return {
    content: response.data.content[0].text,
    // ❌ 未返回 tool_use blocks
  };
}
```

### Gemini 调用示例缺失

Google Gemini 需要不同的 function calling 格式：
```typescript
// 应该的实现
const result = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: message }] }],
  tools: [{ functionDeclarations: geminiTools }],  // ❌ 缺失
});

// ❌ 未处理 functionCall 响应
```

---

## 问题3: 前端工具执行与后端断开

### 前端已实现完整工具循环

✅ **useChatStream** (`hq-console/src/hooks/useChatStream.ts:400-500`)
```typescript
// 最多 20 轮工具执行
while (toolCalls.length > 0 && iterationCount < maxIterations) {
  iterationCount++;

  // 过滤权限
  const allowedToolCalls = toolCalls.filter(tc =>
    isToolAllowed(agentPermissionKey, tc.tool)
  );

  // 执行工具（调用前端 API routes）
  const { results } = await onToolExecute(allowedToolCalls);

  // 将结果回传给 AI
  const followUpResponse = await fetch('/api/hq/chat/stream', {
    body: JSON.stringify({
      messages: [...conversationHistory, toolResultMessage],
    }),
  });
}
```

### 后端 Tick 流程缺失此循环

❌ **AgentTriggerService** 是单次调用，没有工具循环：
```typescript
// 当前实现
const chatResponse = await this.unifiedChatService.chat({...});
return { response: chatResponse.response };  // 结束

// ❌ 应该实现类似前端的循环：
// 1. 调用 AI 获取 tool_use
// 2. 执行工具
// 3. 将结果回传给 AI
// 4. 重复直到 AI 返回最终文本
```

---

## 问题4: 社交媒体 API 凭证未验证

### Twitter API 配置检查

需要验证环境变量：
```bash
TWITTER_API_KEY=xxx
TWITTER_API_SECRET=xxx
TWITTER_ACCESS_TOKEN=xxx
TWITTER_ACCESS_SECRET=xxx
TWITTER_BEARER_TOKEN=xxx
```

### 工具实现验证

✅ **twitter_post executor** (`hq-backend/src/modules/tools/builtin/social-tool.ts`)
```typescript
export async function tweetToolExecutor(params, context) {
  const { text, media_urls, reply_to } = params;

  // ⚠️ 需要检查: Twitter API 调用是否正确配置
  // 1. OAuth 1.0a 认证
  // 2. 媒体上传（如有图片）
  // 3. 推文发布
  // 4. 错误处理
}
```

---

## 修复方案

### 方案A: 最小改动（推荐 - 快速验证）

**目标**: 在 Tick 流程中集成工具执行，复用前端逻辑

**步骤**:
1. 修改 `HQAIService.chatForAgent()` 添加 `tools` 参数
2. 修改 Bedrock/Gemini 调用逻辑支持工具
3. 在 `AgentTriggerService.triggerAgent()` 中实现工具循环
4. 添加简单的工具执行日志

**预计工作量**: 2-3 小时
**风险**: 低

**文件修改清单**:
```
hq-backend/src/modules/ai/hq-ai.service.ts
  - 添加 ChatCompletionOptions.tools
  - 修改 bedrockChat() 传递 tools
  - 修改返回值包含 tool_use blocks

hq-backend/src/hq/tick/agent-trigger.service.ts
  - 注入 ToolService
  - 实现工具执行循环（最多5轮）
  - 记录工具调用日志

hq-backend/src/modules/core/unified-chat.service.ts
  - 注入 ToolService
  - 传递工具列表给 AI Service
  - (可选) 支持流式工具执行
```

### 方案B: 完整重构（长期方案）

**目标**: 统一前后端工具执行架构

**步骤**:
1. 创建共享的 ToolExecutionEngine
2. 前端和后端都调用此引擎
3. 添加工具执行审计日志
4. 实现工具执行率限制
5. 添加工具成本追踪

**预计工作量**: 1-2 天
**风险**: 中

---

## 立即可执行的验证步骤

### 1. 检查 Twitter API 配置

```bash
# 检查环境变量
ssh -i agentrix.pem ubuntu@57.182.89.146
cd /home/ubuntu/agentrix-hq
grep TWITTER .env

# 测试 Twitter API
curl -X POST "https://api.twitter.com/2/tweets" \
  -H "Authorization: Bearer $TWITTER_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test from Agentrix HQ"}'
```

### 2. 手动触发 Agent 任务测试

```bash
# 调用 Tick API 手动触发
curl -X POST http://57.182.89.146:8080/api/hq/tick \
  -H "Content-Type: application/json"

# 查看执行日志
ssh -i agentrix.pem ubuntu@57.182.89.146
pm2 logs hq-backend | grep -A 10 "twitter_post\|tool"
```

### 3. 测试单个工具执行

前端测试（HQ Console）:
```typescript
// 在浏览器 console 执行
const response = await fetch('http://57.182.89.146:8080/api/tools/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    toolName: 'twitter_post',
    params: { text: 'Hello from Agentrix! 🤖' },
    context: { agentCode: 'SOCIAL-01', workspaceId: 'test' }
  })
});
console.log(await response.json());
```

---

## 成功指标

修复完成后应该看到：

✅ **Tick 执行日志**:
```
[TickService] Starting tick execution...
[AgentTriggerService] Triggering SOCIAL-01 for task: Daily Twitter engagement
[HQAIService] Agent SOCIAL-01 using bedrock-sonnet (Claude Sonnet 4.5)
[HQAIService] AI returned tool_use: twitter_post
[ToolService] Executing tool: twitter_post (agent: SOCIAL-01)
[TwitterAPI] Posted tweet: "Agentrix进展更新 🚀..." (ID: 1234567890)
[ToolService] Tool twitter_post completed (success: true, 1243ms)
[AgentTriggerService] SOCIAL-01 completed task in 5.34s
```

✅ **Twitter 账号**:
- 每天自动发推 3-5 条
- 搜索并回复相关话题
- 转发 AI Agent 相关内容

✅ **日志文件**:
```
hq_tool_executions.log:
2026-02-10 15:30:21 | SOCIAL-01 | twitter_post | ✅ | Tweet ID: 123456 | Cost: $0.001
2026-02-10 15:35:12 | BD-01 | web_search | ✅ | Found 15 free APIs | Cost: $0.002
2026-02-10 15:40:05 | DEVREL-01 | github_action | ✅ | Commented on issue #42 | Cost: $0
```

✅ **数据库记录**:
```sql
SELECT * FROM tool_executions
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 应该看到每小时 10-20 条工具执行记录
```

---

## 附录A: 工具清单

| 工具名 | 功能 | 允许角色 | 状态 |
|-------|------|---------|------|
| twitter_post | 发推文 | social, growth | ✅ 已注册 ❌ 未使用 |
| twitter_search | 搜索推文 | social, analyst | ✅ 已注册 ❌ 未使用 |
| twitter_engage | 点赞/转发/回复 | social, devrel | ✅ 已注册 ❌ 未使用 |
| web_search | Google搜索 | analyst, bd | ✅ 已注册 ❌ 未使用 |
| github_action | GitHub操作 | coder, devrel | ✅ 已注册 ❌ 未使用 |
| send_email | 发邮件 | support, bd | ✅ 已注册 ❌ 未使用 |
| telegram_send | Telegram消息 | social | ✅ 已注册 ❌ 未使用 |
| http_request | HTTP请求 | all | ✅ 已注册 ❌ 未使用 |
| shell_execute | 执行命令 | coder | ✅ 已注册 ❌ 未使用 |
| read_file | 读文件 | coder, analyst | ✅ 已注册 ❌ 未使用 |
| write_file | 写文件 | coder, content | ✅ 已注册 ❌ 未使用 |

---

## 附录B: Agent 工作流示例

### SOCIAL-01 理想的每日工作流

**上午 9:00**:
1. 🔍 `web_search("AI Agent news today")`
2. 📝 生成推文内容
3. 🐦 `twitter_post("分享今日AI Agent重大进展...")`

**中午 12:00**:
1. 🔍 `twitter_search("#AIAgents #Web3")`
2. 💬 `twitter_engage(tweetId, action: "reply", text: "...")`
3. ♻️ `twitter_engage(tweetId, action: "retweet")`

**下午 18:00**:
1. 📊 `web_search("Agentrix mentions")`
2. 🐦 `twitter_post("今日互动统计：...")`

**晚上 22:00**:
1. 📱 `telegram_send(channel, "每日总结...")`

### BD-01 理想的每周工作流

**周一**:
1. 🔍 `web_search("free AI API 2026")`
2. 📝 整理免费资源列表
3. 📧 `send_email(team, "本周免费资源清单")`

**周三**:
1. 🔍 `web_search("startup grants AI")`
2. 📄 `write_file("grants.md", content)`
3. 💬 `github_action("create_issue", title: "申请XX Grant")`

---

**下一步**: 选择修复方案并开始实施
