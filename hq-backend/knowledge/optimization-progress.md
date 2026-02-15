# Agentrix HQ 优化进展文档

**日期**: 2025年2月4日  
**执行者**: 首席架构师 (Claude Opus 4.5)  
**状态**: ✅ 本地完成，待部署到服务器

---

## 一、优化任务概览

| 序号 | 优化项 | 状态 | 说明 |
|------|--------|------|------|
| 1 | 统一对话入口 | ✅ 完成 | 创建 UnifiedChatService |
| 2 | 统一聊天记录存储 | ✅ 完成 | 创建 ChatSession 实体 |
| 3 | 统一系统提示词 | ✅ 完成 | 创建 PromptBuilderService |
| 4 | 简化导航结构 | ⏭️ 跳过 | 保持现有导航 |
| 5 | 工具可视化增强 | ✅ 完成 | 创建 ToolExecutionDisplay 组件 |
| 6 | 简化 API 调用 | ✅ 完成 | 统一为 /hq/unified-chat |

---

## 二、完成的工作

### 2.1 后端新增文件

#### 1. `prompt-builder.service.ts`
**位置**: `hq-backend/src/modules/core/prompt-builder.service.ts`

**功能**:
- 集中管理所有 Agent 的角色描述（11个Agent）
- 统一工具调用系统提示词格式
- 支持 Workspace 模式（代码相关）和 Staff 模式（战略讨论）

typescript
// 主要方法
buildSystemPrompt(options)      // 构建完整系统提示词
buildWorkspacePrompt(options)   // 代码工作台专用
buildStaffPrompt(options)       // 战略讨论专用
getToolsPrompt(workingDir)      // 获取工具调用说明
getAgentRole(agentCode)         // 获取 Agent 角色描述


#### 2. `unified-chat.service.ts`
**位置**: `hq-backend/src/modules/core/unified-chat.service.ts`

**功能**:
- 统一的聊天接口，替代分散的对话入口
- 自动管理会话持久化到数据库
- 支持多种对话模式（workspace/staff/general）

typescript
// 主要方法
chat(request)                   // 统一聊天接口
getAgentSessions(agentCode)     // 获取 Agent 历史会话
getSession(sessionId)           // 获取会话详情
deleteSession(sessionId)        // 删除会话


#### 3. `chat-session.entity.ts`
**位置**: `hq-backend/src/entities/chat-session.entity.ts`

**功能**:
- 聊天会话数据模型
- 支持按 agentCode + userId 索引
- 存储消息历史和上下文

typescript
interface ChatSession {
  id: string;              // UUID
  agentCode: string;       // ARCHITECT-01, CODER-01, etc.
  userId: string;          // 可选，多用户支持
  mode: string;            // workspace | staff | general
  workingDir: string;      // 工作目录
  messages: ChatMessage[]; // 消息历史
  context: object;         // 上下文信息
  isActive: boolean;
  lastMessageAt: Date;
}


### 2.2 后端更新文件

#### 1. `hq-core.controller.ts`
**更新内容**:
- 新增 `POST /hq/unified-chat` 端点
- 新增 `GET /hq/unified-chat/sessions/:agentCode` 端点
- 新增 `GET /hq/unified-chat/session/:sessionId` 端点
- 新增 `DELETE /hq/unified-chat/session/:sessionId` 端点

#### 2. `hq-core.module.ts`
**更新内容**:
- 注册 PromptBuilderService
- 注册 UnifiedChatService
- 导入 ChatSession 实体

### 2.3 前端新增文件

#### 1. `ToolExecutionDisplay.tsx`
**位置**: `hq-console/src/components/workspace/ToolExecutionDisplay.tsx`

**功能**:
- 工具执行状态可视化（pending/running/success/error）
- 文件读取结果展示（带复制功能）
- 文件写入/编辑结果展示（带 Diff 对比视图）
- 目录列表展示（带图标）
- 命令执行结果展示（带 exit code 和 stdout/stderr）

**特性**:
- 折叠/展开功能
- 一键复制内容
- Diff 对比（修改前 vs 修改后）
- 错误重试按钮
- 响应式设计

### 2.4 前端更新文件

#### 1. `api.ts`
**更新内容**:
- 新增 `unifiedChat()` 方法 - 统一聊天接口
- 新增 `getAgentSessions()` 方法 - 获取历史会话
- 新增 `getSession()` 方法 - 获取会话详情

---

## 三、API 变更说明

### 3.1 新增统一聊天 API（推荐使用）

http
POST /api/hq/unified-chat
Content-Type: application/json

{
  "agentCode": "ARCHITECT-01",
  "message": "帮我分析一下项目架构",
  "sessionId": "uuid (可选，不传则创建新会话)",
  "mode": "workspace | staff | general",
  "context": {
    "currentFile": "/path/to/file.ts",
    "selectedCode": "代码片段",
    "topic": "讨论主题"
  }
}

响应:
{
  "sessionId": "uuid",
  "agentCode": "ARCHITECT-01",
  "response": "AI 回复内容",
  "model": "claude-opus-4-5",
  "timestamp": "2025-02-04T..."
}


### 3.2 获取历史会话

http
GET /api/hq/unified-chat/sessions/:agentCode?limit=10

响应: ChatSession[]


### 3.3 获取会话详情

http
GET /api/hq/unified-chat/session/:sessionId

响应: ChatSession


### 3.4 删除会话

http
DELETE /api/hq/unified-chat/session/:sessionId

响应: { success: true }


---

## 四、部署状态

### 4.1 代码提交


✅ Git 提交: feat(hq): 优化1-6完成 - 统一对话入口、聊天记录存储、系统提示词、工具可视化、简化API
✅ Git 推送: main -> origin/main
   提交 ID: 7490e83
   修改文件: 327 files changed


### 4.2 服务器状态


服务器: 57.182.89.146 (东京)
PM2 进程: hq-backend (在线)
当前运行路径: /home/ubuntu/Agentrix-independent-HQ/hq-backend

⚠️ 注意: 服务器运行的是 Agentrix-independent-HQ 目录
        需要手动同步代码或切换部署源


### 4.3 Agent 团队状态（服务器日志确认）


✅ HQ Agent Team Initialized (11 members):

📊 Core Team (Bedrock Claude):
   ANALYST-01: Claude Haiku 4.5
   ARCHITECT-01: Claude Opus 4.5
   CODER-01: Claude Sonnet 4.5
   GROWTH-01: Claude Haiku 4.5
   BD-01: Claude Haiku 4.5

🌟 Extended Team (Gemini):
   SOCIAL-01: Gemini 2.5 Flash
   CONTENT-01: Gemini 2.5 Flash
   SUPPORT-01: Gemini 2.5 Flash
   SECURITY-01: Gemini 2.5 Flash
   DEVREL-01: Gemini 1.5 Flash
   LEGAL-01: Claude Haiku 4.5


---

## 五、待完成工作

### 5.1 服务器部署

需要将新代码部署到服务器：

bash
# 方案1: 更新 Agentrix-independent-HQ 仓库
ssh ubuntu@57.182.89.146
cd /home/ubuntu/Agentrix-independent-HQ
git pull origin main
cd hq-backend && npm run build && pm2 restart hq-backend

# 方案2: 直接复制文件
scp -r hq-backend/src/modules/core/*.ts ubuntu@57.182.89.146:/home/ubuntu/Agentrix-independent-HQ/hq-backend/src/modules/core/
scp -r hq-backend/src/entities/*.ts ubuntu@57.182.89.146:/home/ubuntu/Agentrix-independent-HQ/hq-backend/src/entities/


### 5.2 前端迁移

当前前端仍使用旧的分散 API，建议逐步迁移：

1. **Staff 页面** → 使用 `hqApi.unifiedChat({ mode: 'staff' })`
2. **Workspace 页面** → 使用 `hqApi.unifiedChat({ mode: 'workspace' })`
3. **删除旧代码** → 移除 `sendAgentCommand` 的三层 fallback

### 5.3 数据库迁移

新增的 `chat_sessions` 表需要在数据库中创建：

sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code VARCHAR(50) NOT NULL,
  user_id VARCHAR(100),
  mode VARCHAR(50) DEFAULT 'general',
  working_dir VARCHAR(500),
  title VARCHAR(200),
  messages JSONB DEFAULT '[]',
  context JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP
);

CREATE INDEX idx_chat_sessions_agent ON chat_sessions(agent_code);
CREATE INDEX idx_chat_sessions_user_agent ON chat_sessions(user_id, agent_code);


---

## 六、后续优化建议

| 功能 | 优先级 | 说明 |
|------|--------|------|
| @ 提及切换 Agent | P2 | 在对话中 @架构师 切换 Agent |
| 多 Agent 协作 | P3 | 多个 Agent 参与同一对话 |
| 历史记录搜索 | P2 | 搜索历史对话内容 |
| 终端联动 | P1 | 命令执行结果显示在终端面板 |
| 文件 Diff 增强 | P2 | 使用 diff 库显示精确差异 |

---

## 七、文件清单

### 新增文件


hq-backend/
├── src/
│   ├── entities/
│   │   └── chat-session.entity.ts       # 新增
│   └── modules/core/
│       ├── prompt-builder.service.ts    # 新增
│       └── unified-chat.service.ts      # 新增
└── knowledge/
    ├── hq-system-analysis.md            # 新增 (分析文档)
    └── optimization-progress.md         # 新增 (本文档)

hq-console/
└── src/components/workspace/
    └── ToolExecutionDisplay.tsx         # 新增


### 修改文件


hq-backend/
├── src/
│   ├── entities/index.ts                # 添加 ChatSession 导出
│   └── modules/core/
│       ├── hq-core.controller.ts        # 添加统一聊天端点
│       └── hq-core.module.ts            # 注册新服务

hq-console/
└── src/lib/api.ts                       # 添加统一聊天 API


---

**文档结束**
