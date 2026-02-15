# Agentrix HQ 架构分析与优化方案

> 作者: ARCHITECT-01 | 日期: 2026-02-06 | 版本: v1.0

---

## 1. 项目概览

| 模块 | 路径 | 说明 |
|------|------|------|
| 前端 | hq-console/ | Next.js 15 + React 19 |
| 后端 | hq-backend/ | NestJS + TypeORM + PostgreSQL |

### 关键文件行数

| 文件 | 行数 | 状态 |
|------|------|------|
| AgentChat.tsx | 1116 | ⚠️ 过大需拆分 |
| hq-core.service.ts | 947 | ⚠️ 过大职责过多 |
| hq-ai.service.ts | 766 | 正常 |
| workspace/page.tsx | 488 | 正常 |
| hq-core.controller.ts | 209 | 正常 |
| CodeEditor.tsx | 147 | ⚠️ 功能不足 |

---

## 2. 问题汇总

| 严重度 | 问题 | 影响 |
|--------|------|------|
| 🔴 P0 | 流式输出是伪流式 | 用户等30秒无反馈 |
| 🔴 P0 | AgentChat.tsx 1116行 | 难以维护和扩展 |
| 🔴 P0 | hq-core.service.ts 947行 | 职责过多耦合严重 |
| 🟡 P1 | CodeEditor功能简陋 | 不具备IDE能力 |
| 🟡 P1 | Agent自主行动未真正运行 | Tick系统未完全集成 |
| 🟢 P2 | Skills功能未实现 | 缺少可复用技能模块 |

---

## 3. 流式输出问题（最紧急 🔴）

### 3.1 问题根因

后端 hq-core.controller.ts 第130行:

typescript
// ❌ 当前代码 - 伪流式
const result = await this.hqCoreService.chat(request); // 阻塞30秒!
const chunkSize = 800;
for (let i = 0; i < content.length; i += chunkSize) {
  sendEvent('chunk', { content: chunk }); // 瞬间发完
}


而 hq-ai.service.ts 第729行已有真流式:

typescript
// ✅ 已存在但未被调用
async *chatStream(messages, options): AsyncGenerator<string> {
  const stream = await this.openai.chat.completions.create({ stream: true });
  for await (const chunk of stream) {
    yield chunk.choices[0]?.delta?.content;
  }
}


### 3.2 问题链路


前端 chatWithAgentStream()  ✅ SSE解析正确
    ↓
后端 chatStream() controller ❌ 等完整响应再分块
    ↓
hqCoreService.chat()         ❌ 阻塞30秒
    ↓
hq-ai chatStream()           ✅ 真流式已存在但未调用


### 3.3 修复方案

步骤1: hq-core.service.ts 添加 chatStream

typescript
async *chatStream(request: ChatRequest): AsyncGenerator<{ type: string; data: any }> {
  const agent = await this.getAgentByIdOrCode(request.agentId);
  const systemPrompt = request.toolPrompt || this.getDefaultSystemPrompt(agent);
  yield { type: 'meta', data: { agentId: agent.code, model: agent.config?.modelId } };
  for await (const chunk of this.aiService.chatStream(request.messages, {
    systemPrompt, provider: request.provider, model: request.model,
  })) {
    yield { type: 'chunk', data: { content: chunk } };
  }
  this.saveMemoryAsync(agent, request.messages);
}


步骤2: controller 改用真流式

typescript
try {
  for await (const event of this.hqCoreService.chatStream(request)) {
    sendEvent(event.type, event.data);
  }
  sendEvent('done', { timestamp: Date.now() });
} catch (error) {
  sendEvent('error', { message: error?.message });
} finally {
  res.end();
}


### 3.4 预期效果

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 首字延迟 | 30秒+ | 1-2秒 |
| 用户感知 | 等待后突然出现 | 逐字流出 |

---

## 4. Workspace IDE 优化

### 4.1 CodeEditor问题

缺少: 语法高亮、行号、代码折叠、自动补全、多标签页、搜索替换

### 4.2 方案: 集成 Monaco Editor

bash
npm install @monaco-editor/react


### 4.3 目标布局


┌────────┬──────────────────────────┬─────────────────┐
│  File  │  Tab1.tsx | Tab2.ts | ×  │  Agent Chat     │
│  Tree  │──────────────────────────│                 │
│        │  Monaco Editor           │  对话区域        │
│  📁 src│  (语法高亮/行号/折叠)     │                 │
│        ├──────────────────────────│                 │
│        │  Terminal                │  [输入框] [发送] │
└────────┴──────────────────────────┴─────────────────┘


---

## 5. Agent 交互优化

### 5.1 AgentChat.tsx 拆分方案 (1116行→8个文件)

- AgentChat.tsx (主容器, ~150行)
- ChatMessageList.tsx (消息列表, ~200行)
- ChatMessage.tsx (单条消息+Markdown, ~150行)
- ChatInput.tsx (输入框+附件, ~200行)
- ToolCallResult.tsx (工具执行结果, ~150行)
- AgentSelector.tsx (Agent选择器, ~100行)
- hooks/useChatStream.ts (流式处理, ~150行)
- hooks/useChatHistory.ts (历史管理, ~100行)

### 5.2 增强功能

| 功能 | 当前 | 目标 |
|------|------|------|
| Markdown渲染 | 基础 | react-markdown+代码高亮 |
| 打字机效果 | ❌ | 逐字显示(依赖流式修复) |
| 代码块操作 | ❌ | 复制/应用到编辑器 |
| 对话历史 | ❌ 刷新丢失 | 持久化到后端 |
| 断线重连 | ❌ | 自动重连+重试 |

---

## 6. Agent 自主行动系统

### 6.1 当前状态

| 组件 | 状态 |
|------|------|
| tick.service.ts (@Cron) | ✅ 已创建 |
| agent-scheduler.service.ts | ✅ 已创建 |
| agent-trigger.service.ts | ✅ 已创建 |
| budget-monitor.service.ts | ✅ 已创建 |
| 上下文注入 | ❌ 缺失 |
| 任务队列 | ❌ 缺失 |
| 实际运行验证 | ❌ 未验证 |

### 6.2 核心缺失: 上下文注入

Agent被触发时不知道整体计划和当前任务。
需要新建 TaskContextService 为每次触发构建上下文。

### 6.3 任务队列设计

需要新建 agent_tasks 表:
- id, agentCode, title, description
- status (pending/running/done/failed)
- priority (critical/high/medium/low)
- assignedBy, result, createdAt, completedAt

---

## 7. Skills 功能

当前状态: 未实现

建议首批Skills:
- Web Scraping (抓取网页数据)
- Code Review (自动代码审查)
- Content Writer (生成营销内容)
- Grant Finder (搜索Grant机会)
- Deploy Service (自动部署)

---

## 8. 实施计划

### Phase 1: 紧急修复 (1-2天)
1.1 修复流式输出(后端controller) - 2小时
1.2 扩展AI Service流式支持所有模型 - 4小时
1.3 移除前端流式回退逻辑 - 30分钟

### Phase 2: IDE体验 (3-5天)
2.1 集成Monaco Editor - 1天
2.2 多标签页支持 - 4小时
2.3 集成xterm.js终端 - 1天

### Phase 3: Agent交互 (3-5天)
3.1 拆分AgentChat.tsx - 1天
3.2 Markdown+代码高亮 - 4小时
3.3 打字机效果 - 2小时

### Phase 4: Agent自主行动 (5-7天)
4.1 任务队列系统 - 1天
4.2 上下文注入 - 1天
4.3 Agent间通信 - 1天
4.4 验证Tick运行 - 4小时

### Phase 5: Skills系统 (7-10天)
5.1 Skill接口定义 - 4小时
5.2 Skill Registry - 1天
5.3 内置Skills(5个) - 3天
5.4 Marketplace UI - 2天

---

## 附录: 关键代码位置

| 文件 | 行号 | 内容 |
|------|------|------|
| hq-core.controller.ts | 130 | 伪流式瓶颈 |
| hq-ai.service.ts | 729 | 真流式(未调用) |
| AgentChat.tsx | 全文 | 1116行需拆分 |
| hq-core.service.ts | 188 | chat方法需添加chatStream |

---

*文档由 ARCHITECT-01 生成 | 2026-02-06*
