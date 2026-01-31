# Agentrix HQ Backend

独立的 CEO 指挥室后端服务，用于多项目管理和 AI Agent 协调。

## 特性

- 🧠 **Agent 长期记忆** - 类似 Moltbot 的持久化记忆能力
- 🏢 **多项目管理** - 同时管理 Agentrix、HQ 及其他项目
- 🤖 **AI Agent 编排** - 调度和监控多个 AI Agent
- 📊 **统一仪表盘** - 聚合所有项目的 KPI
- 🚨 **告警中心** - 跨项目风险监控

## 快速开始

### 1. 安装依赖

```bash
cd hq-backend
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 配置数据库和 API 密钥
```

### 3. 创建数据库

```bash
# 创建 HQ 专用数据库
psql -U postgres -c "CREATE DATABASE hq_database;"
psql -U postgres -c "CREATE USER hq_admin WITH PASSWORD 'hq_secure_2026';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE hq_database TO hq_admin;"
```

### 4. 启动服务

```bash
# 开发模式
npm run start:dev

# 生产模式
npm run build
npm run start:prod
```

### 5. 访问服务

- API: http://localhost:3005
- Swagger: http://localhost:3005/api/docs

## API 概览

### 项目管理

```
POST   /api/projects           # 注册新项目
GET    /api/projects           # 获取所有项目
GET    /api/projects/:id       # 获取单个项目
PUT    /api/projects/:id       # 更新项目
DELETE /api/projects/:id       # 删除项目
GET    /api/projects/metrics   # 获取汇总指标
```

### HQ 核心

```
GET    /api/hq/dashboard       # 仪表盘统计
GET    /api/hq/agents          # Agent 列表
POST   /api/hq/chat            # 与 Agent 对话（含记忆）
GET    /api/hq/alerts          # 告警列表
```

### 记忆管理

```
POST   /api/memory              # 存储记忆
POST   /api/memory/conversation # 存储对话
POST   /api/memory/decision     # 存储决策
POST   /api/memory/insight      # 存储洞察
GET    /api/memory/agent/:id    # 获取 Agent 记忆
POST   /api/memory/search       # 搜索记忆
GET    /api/memory/context/:id  # 构建上下文
GET    /api/memory/stats/:id    # 记忆统计
```

## 记忆系统

Agent 记忆分为以下类型：

| 类型 | 说明 |
|------|------|
| `conversation` | 对话历史 |
| `project_context` | 项目上下文 |
| `user_preference` | 用户偏好 |
| `decision` | 决策历史 |
| `knowledge` | 知识记忆 |
| `insight` | 洞察记忆 |

记忆会自动：
- 按重要性排序
- 语义搜索检索
- 过期清理
- 压缩合并

## 与 Agentrix 的关系

```
                    ┌─────────────────┐
                    │   HQ Backend    │
                    │   (Port 3005)   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐          ┌─────────────────┐
    │    Agentrix     │          │   Future Proj   │
    │   (Port 3001)   │          │   (Port xxxx)   │
    └─────────────────┘          └─────────────────┘
```

HQ 通过 REST API 与各项目通信，完全解耦，互不影响开发。

## Docker 部署

```bash
# 使用独立的 docker-compose 配置
docker-compose -f docker-compose.hq.yml up -d
```

## 开发指南

HQ 和 Agentrix 是独立项目，可以同时开发：

```bash
# 终端 1: 启动 Agentrix
cd backend && npm run start:dev

# 终端 2: 启动 HQ
cd hq-backend && npm run start:dev

# 终端 3: 启动 HQ Console
cd hq-console && npm run dev
```

两个项目使用不同的数据库，完全独立。
