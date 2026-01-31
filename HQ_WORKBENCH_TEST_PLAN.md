# Agentrix HQ Workbench 完整测试计划

**版本:** V1.0  
**日期:** 2026-01-29  
**适用范围:** HQ Console Phases 1-4 功能验证  

---

## 🎯 测试目标

验证 HQ Workbench 的以下核心功能模块：

1. **协议扫描功能** - UCP / X402 / MCP 协议审计
2. **知识库功能** - RAG 引擎和语义搜索
3. **工作区 IDE** - 代码浏览和编辑
4. **Dashboard** - 监控和统计
5. **Agent 管理** - Agent 账户和授权
6. **机房管理** - 用户、商户、交易监控

---

## 📋 测试用例清单

### 模块 1: 服务启动验证

| ID | 测试用例 | 预期结果 | 优先级 |
|----|----------|----------|--------|
| S-01 | HQ 服务独立启动 | 端口 3005 监听成功 | P0 |
| S-02 | 数据库连接 | PostgreSQL paymind 连接成功 | P0 |
| S-03 | AI 平台适配器注册 | openai/claude/gemini/groq 注册成功 | P0 |
| S-04 | RAG 引擎初始化 | 知识文件加载，分块完成 | P0 |
| S-05 | 路由映射完整性 | 所有 Controller 路由注册 | P0 |

### 模块 2: UCP 协议测试

| ID | 测试用例 | 预期结果 | 优先级 |
|----|----------|----------|--------|
| UCP-01 | 获取 UCP Discovery 文档 | `GET /.well-known/ucp` 返回 JSON 配置 | P0 |
| UCP-02 | 创建 Checkout Session | `POST /ucp/v1/checkout-sessions` 返回 sessionId | P0 |
| UCP-03 | 查询 Session 状态 | `GET /ucp/v1/checkout-sessions/:id` 返回状态 | P0 |
| UCP-04 | 完成 Session | `POST /ucp/v1/checkout-sessions/:id/complete` 成功 | P1 |
| UCP-05 | 取消 Session | `POST /ucp/v1/checkout-sessions/:id/cancel` 成功 | P1 |
| UCP-06 | 产品列表查询 | `GET /ucp/v1/products` 返回产品数组 | P1 |
| UCP-07 | 技能列表查询 | `GET /ucp/v1/skills` 返回技能数组 | P1 |

### 模块 3: X402 协议测试

| ID | 测试用例 | 预期结果 | 优先级 |
|----|----------|----------|--------|
| X402-01 | 获取授权列表 | `GET /payments/x402/authorization` 返回授权记录 | P0 |
| X402-02 | 创建支付授权 | `POST /payments/x402/authorization` 返回授权 ID | P0 |
| X402-03 | 创建支付会话 | `POST /payments/x402/session` 返回 sessionId | P0 |
| X402-04 | 执行支付 | `POST /payments/x402/session/:id/execute` 成功 | P1 |
| X402-05 | 资金路径审计 | 协议汇总显示资金流转 | P1 |

### 模块 4: MCP 协议测试

| ID | 测试用例 | 预期结果 | 优先级 |
|----|----------|----------|--------|
| MCP-01 | SSE 连接建立 | `GET /api/mcp/sse` 返回 SSE 事件流 | P0 |
| MCP-02 | OAuth Discovery | `GET /.well-known/oauth-authorization-server` 返回配置 | P0 |
| MCP-03 | JWKS 端点 | `GET /api/auth/mcp/jwks` 返回公钥 | P0 |
| MCP-04 | MCP 服务器列表 | `GET /skills/ecosystem/mcp-servers` 返回服务器数组 | P1 |
| MCP-05 | 工具调用记录 | 协议汇总显示工具调用统计 | P1 |
| MCP-06 | 技能导入 MCP | `POST /skills/ecosystem/import-mcp` 成功 | P2 |

### 模块 5: 知识库 (RAG) 测试

| ID | 测试用例 | 预期结果 | 优先级 |
|----|----------|----------|--------|
| RAG-01 | 知识库查询 | `POST /api/hq/knowledge-base` 返回相关内容 | P0 |
| RAG-02 | RAG 文件列表 | `GET /api/hq/rag-files` 返回文件数组 | P0 |
| RAG-03 | 语义搜索 | 查询返回按相关性排序的结果 | P0 |
| RAG-04 | 知识分块统计 | 显示加载的文件数和分块数 | P1 |
| RAG-05 | 多文件支持 | Markdown/PDF/代码文件均可加载 | P2 |

### 模块 6: 工作区 IDE 测试

| ID | 测试用例 | 预期结果 | 优先级 |
|----|----------|----------|--------|
| IDE-01 | 工作区信息 | `GET /api/hq/workspace/info` 返回项目信息 | P0 |
| IDE-02 | 文件树浏览 | `GET /api/hq/workspace/tree` 返回目录结构 | P0 |
| IDE-03 | 文件读取 | `POST /api/hq/workspace/read` 返回文件内容 | P0 |
| IDE-04 | 代码搜索 | `GET /api/hq/workspace/search` 返回匹配结果 | P0 |
| IDE-05 | 文件写入 | `POST /api/hq/workspace/write` 成功写入 | P1 |
| IDE-06 | 命令执行 | `POST /api/hq/workspace/execute` 返回执行结果 | P2 |

### 模块 7: Dashboard 测试

| ID | 测试用例 | 预期结果 | 优先级 |
|----|----------|----------|--------|
| DASH-01 | 仪表盘统计 | `GET /api/hq/dashboard` 返回统计数据 | P0 |
| DASH-02 | 系统告警 | `GET /api/hq/dashboard/alerts` 返回告警列表 | P0 |
| DASH-03 | 实时指标 | `GET /api/hq/dashboard/metrics` 返回性能指标 | P1 |
| DASH-04 | 健康检查 | `GET /api/health` 返回服务状态 | P0 |

### 模块 8: Agent 管理测试

| ID | 测试用例 | 预期结果 | 优先级 |
|----|----------|----------|--------|
| AGT-01 | Agent 列表 | `GET /api/hq/agents` 返回 Agent 数组 | P0 |
| AGT-02 | Agent 详情 | `GET /api/hq/agents/:id` 返回 Agent 信息 | P0 |
| AGT-03 | 创建 Agent 账户 | `POST /api/agent-accounts` 返回新账户 | P1 |
| AGT-04 | Agent 激活 | `POST /api/agent-accounts/:id/activate` 成功 | P1 |
| AGT-05 | Agent 暂停 | `POST /api/agent-accounts/:id/suspend` 成功 | P1 |
| AGT-06 | 信用评分更新 | `POST /api/agent-accounts/:id/credit-score` 成功 | P2 |

### 模块 9: 机房管理测试

| ID | 测试用例 | 预期结果 | 优先级 |
|----|----------|----------|--------|
| ENG-01 | 用户列表 | `GET /api/hq/engine-room/users` 返回用户数组 | P0 |
| ENG-02 | 商户列表 | `GET /api/hq/engine-room/merchants` 返回商户数组 | P0 |
| ENG-03 | 产品列表 | `GET /api/hq/engine-room/products` 返回产品数组 | P0 |
| ENG-04 | 风险告警 | `GET /api/hq/engine-room/risk-alerts` 返回告警 | P0 |
| ENG-05 | 交易记录 | `GET /api/hq/engine-room/transactions` 返回交易 | P1 |
| ENG-06 | 财务统计 | `GET /api/hq/engine-room/finance-stats` 返回统计 | P1 |

---

## 🔧 测试环境配置

### 前置条件

1. **PostgreSQL 数据库**
   ```bash
   # 确保 paymind 数据库存在并可访问
   psql -h localhost -U postgres -d paymind
   ```

2. **环境变量**
   ```bash
   export HQ_PORT=3005
   export DATABASE_HOST=localhost
   export DATABASE_NAME=paymind
   ```

3. **Node.js 环境**
   ```bash
   node -v  # >= 18.x
   npm -v   # >= 9.x
   ```

### 启动 HQ 服务

```bash
# 方式 1: 开发模式
cd backend && npm run start:hq:dev

# 方式 2: 使用 Task
# 运行 VS Code Task: "Start HQ Backend Dev"

# 方式 3: WSL
wsl bash -c "cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend && npm run start:hq:dev"
```

### 运行测试脚本

```bash
# 完整测试套件
cd backend && npx ts-node -r tsconfig-paths/register src/scripts/test-hq-workbench.ts

# 单个模块测试
# 编辑 test-hq-workbench.ts 中的 runAllTests() 方法，注释不需要的模块
```

---

## 📊 测试执行步骤

### Step 1: 环境准备
```bash
# 1. 启动 PostgreSQL
# 2. 启动 HQ 服务
cd backend && npm run start:hq:dev

# 3. 等待看到:
# ✅ HQ Pilot is running on: http://0.0.0.0:3005
# [RagService] RAG 引擎初始化成功：加载了 X 个文件，共 Y 个知识分块
```

### Step 2: 健康检查
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3005/api/health" -Method GET

# 或 curl
curl http://localhost:3005/api/health
```

### Step 3: 执行测试
```bash
cd backend && npx ts-node -r tsconfig-paths/register src/scripts/test-hq-workbench.ts
```

### Step 4: 查看报告
测试完成后，报告将生成在:
```
d:\wsl\Ubuntu-24.04\Code\Agentrix\Agentrix-website\HQ_WORKBENCH_TEST_REPORT.md
```

---

## 🔍 手动 API 测试命令

### UCP 测试
```powershell
# UCP Discovery
Invoke-RestMethod -Uri "http://localhost:3005/api/.well-known/ucp" -Method GET | ConvertTo-Json

# 产品列表
Invoke-RestMethod -Uri "http://localhost:3005/api/ucp/v1/products" -Method GET | ConvertTo-Json
```

### 知识库测试
```powershell
# RAG 文件列表
Invoke-RestMethod -Uri "http://localhost:3005/api/hq/rag-files" -Method GET | ConvertTo-Json

# 语义搜索
$body = @{query="如何创建Agent账户"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3005/api/hq/knowledge-base" -Method POST -Body $body -ContentType "application/json"
```

### 工作区测试
```powershell
# 工作区信息
Invoke-RestMethod -Uri "http://localhost:3005/api/hq/workspace/info" -Method GET | ConvertTo-Json

# 文件树
Invoke-RestMethod -Uri "http://localhost:3005/api/hq/workspace/tree" -Method GET | ConvertTo-Json
```

---

## ✅ 验收标准

### P0 级别（必须通过）
- [ ] HQ 服务独立启动成功
- [ ] UCP Discovery 文档可访问
- [ ] RAG 引擎初始化成功
- [ ] 工作区文件读取正常
- [ ] Dashboard 统计数据返回

### P1 级别（应该通过）
- [ ] 完整的 UCP 会话生命周期
- [ ] X402 支付授权流程
- [ ] MCP 工具调用记录
- [ ] Agent 账户 CRUD 操作
- [ ] 机房管理数据查询

### P2 级别（可选）
- [ ] 文件写入和命令执行
- [ ] MCP 服务器导入
- [ ] 高级语义搜索
- [ ] 自定义告警规则

---

## 📌 已知问题与解决方案

### 1. WSL 网络隔离
**问题:** WSL NAT 模式下无法从 Windows 访问 localhost:3005  
**解决:** 
- 方案 A: 在 WSL 内部运行测试
- 方案 B: 配置 WSL 镜像网络模式
- 方案 C: 使用 `$(hostname).local` 替代 localhost

### 2. Transak API 403
**问题:** Cloudflare 阻断 Transak API 请求  
**解决:** 
- 使用 VPN
- 配置 Transak API 白名单
- 使用 Mock Provider 测试

### 3. 测试脚本被中断
**问题:** 在同一终端运行 HQ 服务和测试脚本时，测试脚本可能中断服务  
**解决:** 
- 使用两个独立终端
- 使用 VS Code Task 后台运行服务
- 使用 `isBackground: true` 配置

---

## 📅 测试计划时间表

| 阶段 | 日期 | 内容 |
|------|------|------|
| Phase 1 | 2026-01-29 | 服务启动 + UCP 测试 |
| Phase 2 | 2026-01-30 | X402 + MCP 测试 |
| Phase 3 | 2026-01-31 | 知识库 + IDE 测试 |
| Phase 4 | 2026-02-01 | Dashboard + Agent 测试 |
| Phase 5 | 2026-02-02 | 机房管理 + 回归测试 |
| 最终报告 | 2026-02-03 | 汇总报告 + 发布决策 |

---

**文档维护者:** Agentrix Team  
**最后更新:** 2026-01-29
