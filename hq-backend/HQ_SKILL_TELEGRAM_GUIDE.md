# HQ Backend - Agent 技能包与远程控制系统

## 功能概览

### 🛠️ 技能包系统 (Skill System)

类似 Moltbot，Agent 可以配备技能包，根据任务自动调用合适的技能。

**内置技能:**
- `CODE_GEN` - 代码生成
- `CODE_REVIEW` - 代码审查
- `DATA_ANALYSIS` - 数据分析
- `BIZ_STRATEGY` - 商业策略
- `CONTENT_WRITE` - 内容写作
- `AUTOMATION` - 任务自动化
- `API_INTEGRATION` - API 集成
- `RESEARCH` - 研究分析

### 📱 Telegram 远程控制

通过 Telegram Bot 远程与 Agent 交互：

**命令列表:**
```
/start     - 开始使用
/help      - 帮助信息
/agents    - 列出所有 Agent
/agent X   - 选择 Agent
/projects  - 列出项目
/project X - 选择项目
/status    - 查看当前状态
/task X    - 发送任务
/skills    - 查看 Agent 技能
```

### 💻 IDE/CLI 接口

在终端中直接调用技能：

```bash
# 列出技能
npm run cli skills

# 调用技能
npm run cli invoke CODE_GEN "Create a React login form"

# 智能执行（自动选择技能）
npm run cli execute "Analyze this code and suggest improvements"

# 与 Agent 对话
npm run cli chat "How do I optimize this function?"

# 快捷命令
npm run cli codegen "TypeScript sorting function" typescript
npm run cli review "function foo() { ... }"
```

### 🔌 WebSocket 实时通信

连接 WebSocket 实时接收更新：

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3005/hq');

// 认证
socket.emit('auth', { userId: 'user-123' });

// 订阅 Agent
socket.emit('subscribe:agent', { agentId: 'agent-id' });

// 发送消息
socket.emit('chat:message', { agentId: 'agent-id', message: 'Hello' });

// 调用技能
socket.emit('skill:invoke', { skillCode: 'CODE_GEN', input: 'Create a button' });

// 接收响应
socket.on('chat:response', (data) => console.log(data));
socket.on('skill:result', (data) => console.log(data));
socket.on('agent:status', (data) => console.log(data));
socket.on('alert', (data) => console.log(data));
```

## API 端点

### 技能管理
```
GET    /api/hq/skills              - 列出所有技能
POST   /api/hq/skills              - 创建技能
GET    /api/hq/skills/:id          - 获取技能详情
PUT    /api/hq/skills/:id          - 更新技能
DELETE /api/hq/skills/:id          - 删除技能
POST   /api/hq/skills/assign/:agentId - 为 Agent 分配技能
GET    /api/hq/skills/agent/:agentId  - 获取 Agent 技能
GET    /api/hq/skills/stats        - 技能统计
```

### CLI 接口
```
GET    /api/hq/cli/skills          - 列出可用技能
GET    /api/hq/cli/agents          - 列出 Agent
POST   /api/hq/cli/invoke          - 调用指定技能
POST   /api/hq/cli/execute         - 智能执行（自动选技能）
POST   /api/hq/cli/chat            - 与 Agent 对话
POST   /api/hq/cli/codegen         - 快速代码生成
POST   /api/hq/cli/review          - 快速代码审查
POST   /api/hq/cli/analyze         - 快速数据分析
```

### Telegram
```
POST   /api/hq/telegram/alert      - 发送告警通知
POST   /api/hq/telegram/notify     - 发送通知给用户
GET    /api/hq/telegram/health     - 健康检查
```

### WebSocket
```
GET    /api/hq/websocket/status    - WebSocket 状态
GET    /api/hq/websocket/health    - 健康检查
```

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入 API keys
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动服务

```bash
npm run start:dev
```

### 4. 配置 Telegram Bot

1. 在 Telegram 中找 @BotFather
2. 发送 `/newbot` 创建机器人
3. 复制 token 到 `.env` 的 `TELEGRAM_BOT_TOKEN`
4. 找 @userinfobot 获取你的 user ID
5. 添加到 `TELEGRAM_AUTHORIZED_USERS`

### 5. 测试 CLI

```bash
# 检查健康状态
curl http://localhost:3005/api/hq/cli/health

# 列出技能
curl http://localhost:3005/api/hq/cli/skills

# 调用代码生成
curl -X POST http://localhost:3005/api/hq/cli/invoke \
  -H "Content-Type: application/json" \
  -d '{"skillCode": "CODE_GEN", "input": "Create a hello world function in Python"}'
```

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      HQ Backend (Port 3005)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │ Telegram │   │ WebSocket│   │   CLI    │   │  REST    │ │
│  │   Bot    │   │ Gateway  │   │ Interface│   │   API    │ │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘ │
│       │              │              │              │        │
│       └──────────────┴──────────────┴──────────────┘        │
│                            │                                 │
│                    ┌───────┴───────┐                        │
│                    │ Event Emitter │                        │
│                    └───────┬───────┘                        │
│                            │                                 │
│  ┌─────────────────────────┴─────────────────────────┐     │
│  │                  Core Services                     │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐│     │
│  │  │  Agent   │  │  Skill   │  │ Skill Executor   ││     │
│  │  │ Service  │  │ Service  │  │ (Auto-selection) ││     │
│  │  └──────────┘  └──────────┘  └──────────────────┘│     │
│  └───────────────────────────────────────────────────┘     │
│                            │                                 │
│                    ┌───────┴───────┐                        │
│                    │   AI Service  │                        │
│                    │ OpenAI/Claude │                        │
│                    │   DeepSeek    │                        │
│                    └───────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 技能调用流程

```
User Request
     │
     ▼
┌─────────────────┐
│ Skill Executor  │
│ analyzeTask()   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Analysis    │
│ (Select Skills) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Execute Skills  │
│   (Chain)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Record Usage    │
│   Statistics    │
└────────┬────────┘
         │
         ▼
    Return Result
```
