# Agentrix HQ 指挥室 - 系统分析与优化方案

**作者**: 首席架构师 (Claude Opus 4.5)  
**日期**: 2025年2月

---

## 一、项目概述

Agentrix HQ 是一个 AI 驱动的 CEO 指挥中心，核心特点：

- 真实工具执行（不是模拟，真正操作文件）
- 多模型智能路由（不同 Agent 用不同 AI）
- 跨境架构（后端东京服务器，前端本地执行工具）

---

## 二、系统架构

### 2.1 整体架构


本地前端 (localhost:4000)
├── Next.js 14 + TypeScript
├── /api/tools - 本地工具执行
└── /api/knowledge - 知识库操作
        │
        │ HTTP (跨域)
        ▼
东京后端 (57.182.89.146:8080)
├── NestJS 10 + TypeScript  
├── AI 模块 - 多模型路由
├── Core 模块 - 主聊天逻辑
└── Workspace 模块 - Agent协作
        │
        ▼
AI 模型层
├── AWS Bedrock (Claude 4.5 系列)
├── Google Gemini 2.5 Flash
└── OpenAI (备用)


### 2.2 前端页面结构

| 页面 | 路径 | 功能 | 对话能力 |
|------|------|------|----------|
| Bridge | `/` | CEO仪表盘，KPI监控 | ❌ |
| Staff | `/staff` | 作战室，战略讨论 | ✅ |
| Workspace | `/workspace` | IDE工作台，代码开发 | ✅ |

### 2.3 后端模块结构


hq-backend/src/modules/
├── ai/         # AI服务，多模型路由
├── core/       # 核心聊天逻辑
├── workspace/  # 工作空间管理
├── knowledge/  # 知识库服务
├── memory/     # Agent记忆
├── skill/      # 技能管理
├── social/     # 社交集成
└── telegram/   # Telegram Bot


---

## 三、Agent 配置

| Agent | 角色 | AI 模型 | 成本 |
|-------|------|---------|------|
| ARCHITECT-01 | 首席架构师 | Claude Opus 4.5 | 高 |
| CODER-01 | 开发工程师 | Claude Sonnet 4.5 | 中 |
| GROWTH-01 | 增长负责人 | Claude Haiku 4.5 | 低 |
| BD-01 | 生态发展 | Claude Haiku 4.5 | 低 |
| ANALYST-01 | 业务分析 | Gemini 2.5 Flash | 低 |
| SOCIAL-01 | 社交运营 | Gemini 2.5 Flash | 低 |
| CONTENT-01 | 内容创作 | Gemini 2.5 Flash | 低 |
| SUPPORT-01 | 客户成功 | Gemini 2.5 Flash | 低 |

---

## 四、工具系统

工具在本地前端执行（通过 Next.js API Routes）：

| 工具 | 功能 | 安全级别 |
|------|------|----------|
| read_file | 读取文件 | 安全 |
| write_file | 写入文件 | 中等 |
| edit_file | 编辑文件 | 中等 |
| list_dir | 列出目录 | 安全 |
| run_command | 执行命令 | 高危，需授权 |
| fetch_url | 获取网页 | 安全 |
| search_knowledge | 搜索知识库 | 安全 |

---

## 五、发现的问题

### 5.1 架构问题

**问题1: 对话入口分散**

当前有两个独立的对话组件：
- Staff 页面: CommandConsole → /hq/chat
- Workspace 页面: AgentChat → /workspace/agent-chat

导致：代码重复、提示词不一致、记录不共享。

**问题2: 聊天记录存储混乱**

| 入口 | 存储方式 | 问题 |
|------|----------|------|
| Staff | localStorage | 独立存储 |
| Workspace | useState | 刷新丢失 |
| Core后端 | 数据库 | 独立存储 |

三种存储方式，无法共享历史。

**问题3: 系统提示词分散**

提示词分布在4个地方：
- hq-core.service.ts（后端）
- workspace.service.ts（后端）
- tools.ts（前端）
- api.ts（前端）

修改时容易遗漏。

### 5.2 代码问题

**问题4: API 调用链复杂**

api.ts 中有三层 fallback：
1. /hq/chat
2. /hq/chat/completion
3. /hq/cli/chat

调试困难。

**问题5: 导航过于复杂**

Sidebar 有太多菜单项，HQ 核心功能不突出。

### 5.3 体验问题

| 问题 | 现状 |
|------|------|
| 停止按钮 | ✅ 已添加 |
| 文件 Diff 显示 | ❌ 无 |
| 终端联动 | ❌ 无 |
| @ 提及切换Agent | ❌ 无 |
| 历史记录搜索 | ❌ 无 |

---

## 六、优化方案

### 6.1 短期优化（1-2周）

**1. 统一对话入口**

将 Staff 和 Workspace 的对话统一为一个组件：


统一的 UnifiedChat 组件
├── 支持 @ 提及切换 Agent
├── 统一的后端 API（/hq/chat）
└── 统一的聊天记录存储


**2. 统一聊天记录存储**

全部使用数据库存储，以 agentCode + userId 为维度：

typescript
interface AgentConversation {
  id: string;
  agentCode: string;  // ARCHITECT-01
  userId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}


**3. 统一系统提示词**

创建 PromptBuilder 服务，集中管理所有提示词：

typescript
class PromptBuilder {
  buildSystemPrompt(agentCode: string, context: Context): string;
  getToolsPrompt(): string;
  getAgentRolePrompt(agentCode: string): string;
}


### 6.2 中期优化（2-4周）

**4. 简化页面结构**


优化后的导航：
├── 🏠 Dashboard - CEO 概览
├── 💬 Command - 统一对话入口（核心）
├── 💼 Workspace - 代码工作台
└── ⚙️ Settings - 系统设置


**5. 增强工具可视化**

- 文件修改显示 Diff 对比
- 命令执行显示在终端面板
- 工具调用显示进度和结果

**6. 简化 API 调用**

统一为单一 API 入口：


POST /hq/chat
{
  agentCode: 'ARCHITECT-01',
  message: '...',
  sessionId: '...',
  context: {...}
}


### 6.3 长期优化（1-2月）

**7. Agent 协作**

支持多 Agent 协作对话：


用户: @架构师 设计一下支付系统，@开发者 实现它
架构师: [输出设计方案]
开发者: [基于方案编写代码]


**8. 任务系统**

支持创建和跟踪 Agent 任务：

typescript
interface AgentTask {
  id: string;
  title: string;
  assignedTo: string[];  // Agent codes
  status: 'pending' | 'in_progress' | 'completed';
  artifacts: Artifact[];  // 产出物
}


**9. 知识库增强**

- 自动从对话中提取知识
- 支持向量搜索
- 与 Agent 记忆系统集成

---

## 七、实施优先级

| 优先级 | 任务 | 工作量 | 影响 |
|--------|------|--------|------|
| P0 | 统一对话组件 | 3天 | 高 |
| P0 | 统一聊天记录存储 | 2天 | 高 |
| P1 | 统一系统提示词 | 1天 | 中 |
| P1 | 简化 API 调用 | 2天 | 中 |
| P2 | 简化导航结构 | 1天 | 低 |
| P2 | 文件 Diff 显示 | 2天 | 中 |
| P3 | @ 提及功能 | 3天 | 中 |
| P3 | 多 Agent 协作 | 5天 | 高 |

---

## 八、总结

### 核心问题

1. **对话入口分散** - 两套代码，两个API，记录不共享
2. **存储方式混乱** - localStorage/useState/数据库混用
3. **提示词管理分散** - 四处维护，容易不同步

### 核心建议

1. **统一** - 一个对话组件，一个API，一个存储
2. **简化** - 减少导航项，聚焦核心功能
3. **增强** - Diff显示、终端联动、@提及

### 你的设计思路（认同）

- **Staff** → 战略讨论，非编程问题
- **Workspace** → 代码工作，有文件浏览器和终端

这个分工是合理的，建议保持。关键是让两边共享：
- 相同的 Agent 对话能力
- 相同的聊天记录
- 相同的系统提示词
