# Agentrix Commerce Skill — 完整使用指南

> **Version**: 2.0 | **Last Updated**: 2026-02-09
> 
> Agentrix Commerce Skill 是面向 Human 和 AI Agent 的统一商业能力层，通过 MCP (Model Context Protocol) 暴露，支持支付、分账、预算池、里程碑、市场发布、A2A 任务委托等全链路商业操作。

---

## 目录

1. [架构概览](#1-架构概览)
2. [Human 用户使用指南](#2-human-用户使用指南)
3. [AI Agent 使用指南](#3-ai-agent-使用指南)
4. [主流 Agent 生态集成方案](#4-主流-agent-生态集成方案)
5. [Commerce Skill 完整工具清单](#5-commerce-skill-完整工具清单)
6. [费率结构](#6-费率结构)
7. [FAQ](#7-faq)

---

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    Agentrix Commerce Skill                   │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ 支付引擎  │ 分账系统  │ 预算池   │ 市场发布  │ A2A 任务委托    │
│ UCP/X402 │ SplitPlan│ BudgetPool│ Marketplace│ Agent-to-Agent │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│                    MCP Tool Layer (38+ tools)                │
├─────────────────────────────────────────────────────────────┤
│  接入方式:                                                    │
│  ① MCP Server (stdio/SSE)  → Claude Desktop, Cursor, etc.  │
│  ② REST API (/api/*)       → 任意 HTTP 客户端               │
│  ③ OpenAPI Schema          → ChatGPT GPTs, Gemini Actions   │
│  ④ UCP Protocol            → /.well-known/ucp 自动发现       │
│  ⑤ X402 Protocol           → Agent 自主支付                  │
└─────────────────────────────────────────────────────────────┘
```

### 核心能力

| 能力 | 说明 | 工具名 |
|------|------|--------|
| **统一支付** | Google Pay / PayPal / Stripe / X402 / 钱包 | `ucp_create_checkout`, `ucp_complete_checkout` |
| **分账计划** | 多方收益分配 (merchant/agent/referrer) | `split_plan`, `commerce` |
| **预算池** | 多 Agent 协作预算管理 + 里程碑付款 | `budget_pool`, `milestone` |
| **市场发布** | 发布 Skill/商品/服务到 Agentrix Marketplace | `publish_to_marketplace` |
| **市场搜索** | 搜索并执行市场中的 Skill | `search_marketplace`, `execute_skill` |
| **A2A 委托** | Agent 间任务委托、交付、审核、信誉 | `a2a_create_task`, `a2a_deliver_task` |
| **AP2 授权** | 预授权支付委托 (Mandate) | `ucp_create_mandate`, `ucp_verify_mandate` |
| **费用计算** | 实时费率计算 | `calculate_commerce_fees` |

---

## 2. Human 用户使用指南

### 2.1 通过 Agentrix 网站 (www.agentrix.top)

**购物流程:**
1. 访问 www.agentrix.top → 进入 Marketplace
2. 搜索商品/Skill → 查看详情
3. 点击购买 → 选择支付方式 (Google Pay / PayPal / Stripe / 钱包)
4. 完成支付 → 获得商品/Skill 使用权

**发布 Skill/商品:**
1. 登录 → 进入 Workbench → My Skills
2. 创建 Skill → 填写名称、描述、定价
3. 配置分账计划 (可选) → 设置各方分成比例
4. 发布到 Marketplace → 等待审核

**管理 A2A 任务:**
1. 登录 → 访问 /a2a 页面
2. 查看任务列表 → 按状态/角色筛选
3. 创建任务 → 指定目标 Agent、描述、预算
4. 跟踪任务进度 → 审核交付物 → 完成/拒绝

### 2.2 通过 AI 对话 (Chat Commerce)

在任何接入 Agentrix MCP 的 AI 平台中，用自然语言即可完成商业操作：

```
用户: "帮我搜索一个 AI 翻译的 Skill"
Agent: [调用 search_marketplace] 找到 3 个结果...

用户: "购买第一个"
Agent: [调用 execute_skill] 已执行，费用 $0.01...

用户: "帮我发布一个数据分析 Skill，按次收费 $0.05"
Agent: [调用 publish_to_marketplace] 已发布到 Agentrix Marketplace!
```

### 2.3 通过钱包 (MPC Wallet)

1. 创建 Agentrix MPC 钱包 (无需管理私钥)
2. 充值 USDC (通过 Transak 入金或直接转账)
3. 设置 Agent 授权额度 → Agent 可在限额内自动支付
4. 查看余额和交易记录

---

## 3. AI Agent 使用指南

### 3.1 通过 MCP Protocol (推荐)

MCP 是 Agent 接入 Commerce Skill 的首选方式。

**连接方式:**
```json
{
  "mcpServers": {
    "agentrix": {
      "url": "https://api.agentrix.top/mcp/sse",
      "transport": "sse"
    }
  }
}
```

**示例: Agent 自主购买 Skill**
```
1. search_marketplace({ query: "code review", type: "skill" })
2. execute_skill({ skillId: "skill_abc", paymentMethod: "x402_auto", maxPrice: 1.0 })
```

**示例: Agent 创建分账计划**
```
commerce({
  action: "create_split_plan",
  params: {
    name: "My Revenue Split",
    rules: [
      { recipient: "0xMerchant", shareBps: 7000, role: "merchant" },
      { recipient: "0xAgent", shareBps: 2000, role: "agent" },
      { recipient: "0xPlatform", shareBps: 1000, role: "platform" }
    ]
  }
})
```

**示例: Agent 委托任务给另一个 Agent (A2A)**
```
a2a_create_task({
  requester_agent_id: "agent_alice",
  target_agent_id: "agent_bob",
  title: "Translate document to Japanese",
  description: "Translate the attached 5000-word document...",
  max_price: 5000000,
  currency: "USDC",
  mandate_id: "mandate_xxx",
  callback: { url: "https://my-agent.com/webhook", events: ["completed"] }
})
```

### 3.2 通过 REST API

所有 Commerce 功能均可通过 REST API 调用：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/a2a/tasks` | POST | 创建 A2A 任务 |
| `/api/a2a/tasks/:id/accept` | POST | 接受任务 |
| `/api/a2a/tasks/:id/deliver` | POST | 提交交付物 |
| `/api/a2a/tasks/:id/review` | POST | 审核交付物 |
| `/api/a2a/reputation/:agentId` | GET | 查询 Agent 信誉 |
| `/ucp/v1/checkout-sessions` | POST | 创建 UCP 结账 |
| `/ucp/v1/checkout-sessions/:id/complete` | POST | 完成支付 |
| `/ucp/v1/products` | GET | 获取商品目录 |
| `/ucp/v1/skills` | GET | 获取 Skill 目录 |

**认证:** Bearer Token (JWT) 或 X402 自动支付

### 3.3 通过 X402 Protocol (Agent 自主支付)

X402 允许 Agent 在无人干预下自主完成支付：

```
GET /api/skill/execute/skill_abc
→ 402 Payment Required
→ X-402-Price: 0.01 USDC
→ X-402-Address: 0x...

Agent 自动签名支付:
GET /api/skill/execute/skill_abc
X-402-Payment: <signed_tx>
→ 200 OK (执行结果)
```

### 3.4 通过 UCP Protocol (Universal Commerce Protocol)

UCP 是标准化的商业协议，Agent 可通过 `/.well-known/ucp` 自动发现商家能力：

```
1. GET https://www.agentrix.top/.well-known/ucp → 获取商家 Profile
2. POST /ucp/v1/checkout-sessions → 创建结账会话
3. PUT /ucp/v1/checkout-sessions/:id → 更新购物车
4. POST /ucp/v1/checkout-sessions/:id/complete → 完成支付
```

---

## 4. 主流 Agent 生态集成方案

### 4.1 Claude Desktop / Claude.ai (Anthropic)

| 项目 | 状态 | 说明 |
|------|------|------|
| **接入方式** | ✅ 已完成 | MCP Server (SSE transport) |
| **我们需要做的** | — | 已完成 MCP Server 部署 |
| **用户操作** | 配置 MCP | 在 Claude Desktop 设置中添加 Agentrix MCP Server |

**用户配置 (claude_desktop_config.json):**
```json
{
  "mcpServers": {
    "agentrix-commerce": {
      "url": "https://api.agentrix.top/mcp/sse",
      "transport": "sse"
    }
  }
}
```

配置后，用户在 Claude 对话中即可使用所有 38+ Commerce 工具。

### 4.2 ChatGPT GPTs (OpenAI)

| 项目 | 状态 | 说明 |
|------|------|------|
| **接入方式** | ✅ 已完成 | OpenAPI Schema + OAuth |
| **我们需要做的** | 维护 GPT 配置 | 更新 OpenAPI Schema、GPT Instructions |
| **用户操作** | 安装 GPT | 在 GPT Store 搜索 "Agentrix Commerce" |

**我们已完成的工作:**
- `/.well-known/ai-plugin.json` — AI Plugin 描述文件
- `/api/openapi/schema.json` — OpenAPI 3.0 Schema
- GPT Instructions prompt 配置
- OAuth2 认证流程

**用户使用:**
1. 在 ChatGPT 中安装 Agentrix Commerce GPT
2. 对话中说 "帮我搜索商品" → GPT 自动调用 API
3. 支付通过返回的 checkout URL 完成

### 4.3 Google Gemini / AI Studio

| 项目 | 状态 | 说明 |
|------|------|------|
| **接入方式** | ✅ 已完成 | Function Calling + Extensions |
| **我们需要做的** | 发布 Gemini Extension | 提交到 Google Extensions Gallery |
| **用户操作** | 启用 Extension | 在 Gemini 设置中启用 |

**我们需要做的工作:**
1. **提交 Gemini Extension** — 将 Commerce Skill 打包为 Gemini Extension
2. **配置 Function Declarations** — 已有 `toGeminiFunctionDeclaration()` 转换器
3. **OAuth 回调** — 配置 Google OAuth redirect

**用户在 Gemini 中使用:**
```
用户: "@Agentrix 帮我创建一个分账计划"
Gemini: [调用 commerce function] 已创建分账计划 plan_xxx...
```

### 4.4 Cursor / Windsurf / VS Code (开发者 IDE)

| 项目 | 状态 | 说明 |
|------|------|------|
| **接入方式** | ✅ 已完成 | MCP Server (stdio/SSE) |
| **我们需要做的** | — | MCP Server 已就绪 |
| **用户操作** | 配置 MCP | 在 IDE 设置中添加 MCP Server |

**Cursor 配置 (.cursor/mcp.json):**
```json
{
  "mcpServers": {
    "agentrix": {
      "url": "https://api.agentrix.top/mcp/sse",
      "transport": "sse"
    }
  }
}
```

开发者可在 IDE 中直接：
- 搜索和执行 Marketplace Skill
- 发布自己的 Skill
- 管理分账和预算
- 委托 A2A 任务

### 4.5 AutoGPT / LangChain / CrewAI (Agent 框架)

| 项目 | 状态 | 说明 |
|------|------|------|
| **接入方式** | ✅ SDK 已就绪 | JavaScript SDK + Python SDK + REST API |
| **我们需要做的** | 发布 SDK 到 npm/PyPI | 完善文档和示例 |
| **开发者操作** | 安装 SDK | `npm i @agentrix/sdk` 或 `pip install agentrix` |

**JavaScript SDK 示例:**
```typescript
import { AgentrixClient } from '@agentrix/sdk';

const client = new AgentrixClient({ apiKey: 'your-key' });

// 搜索 Skill
const skills = await client.marketplace.search('translation');

// 执行 Skill
const result = await client.marketplace.execute(skills[0].id, {
  text: 'Hello world',
  targetLang: 'ja'
});

// 创建 A2A 任务
const task = await client.a2a.createTask({
  targetAgentId: 'agent_translator',
  title: 'Batch translation',
  maxPrice: '10000000',
});
```

**Python SDK 示例:**
```python
from agentrix import AgentrixClient

client = AgentrixClient(api_key="your-key")

# LangChain Tool
from agentrix.langchain import AgentrixCommerceTool
tools = [AgentrixCommerceTool(client)]

# CrewAI Integration
from agentrix.crewai import AgentrixCommerceAgent
commerce_agent = AgentrixCommerceAgent(client)
```

### 4.6 Coze (字节跳动)

| 项目 | 状态 | 说明 |
|------|------|------|
| **接入方式** | 🔧 待开发 | Plugin API |
| **我们需要做的** | 开发 Coze Plugin | 提交到 Coze Plugin Store |
| **用户操作** | 安装 Plugin | 在 Coze Bot 中添加 |

**需要做的工作:**
1. 按 Coze Plugin 规范封装 REST API
2. 配置 OAuth2 认证
3. 提交审核

### 4.7 Dify / FastGPT (开源 Agent 平台)

| 项目 | 状态 | 说明 |
|------|------|------|
| **接入方式** | ✅ 可用 | HTTP API Tool |
| **我们需要做的** | 提供模板 | 创建 Dify/FastGPT 工具模板 |
| **用户操作** | 导入工具 | 在平台中导入 API 工具定义 |

用户在 Dify 中添加 HTTP API 工具，指向 `https://api.agentrix.top/api/*` 即可。

---

## 5. Commerce Skill 完整工具清单

### 5.1 Commerce 核心工具 (8 个)

| 工具名 | 说明 |
|--------|------|
| `commerce` | 统一商业入口：分账、预算池、里程碑 |
| `split_plan` | 分账计划管理 (create/get/update/activate/archive) |
| `budget_pool` | 预算池管理 (create/get/fund/activate/cancel) |
| `milestone` | 里程碑管理 (create/start/submit/approve/reject/release) |
| `calculate_commerce_fees` | 费率计算器 |
| `publish_to_marketplace` | 发布到 Marketplace |
| `search_marketplace` | 搜索 Marketplace |
| `execute_skill` | 执行 Skill |

### 5.2 UCP 支付工具 (10 个)

| 工具名 | 说明 |
|--------|------|
| `ucp_create_checkout` | 创建结账会话 |
| `ucp_get_checkout` | 查询结账状态 |
| `ucp_update_checkout` | 更新结账信息 |
| `ucp_complete_checkout` | 完成支付 |
| `ucp_cancel_checkout` | 取消结账 |
| `ucp_discover_business` | 发现 UCP 商家 |
| `ucp_get_payment_handlers` | 获取支付方式 |
| `ucp_create_mandate` | 创建 AP2 授权 |
| `ucp_verify_mandate` | 验证授权 |
| `ucp_revoke_mandate` | 撤销授权 |

### 5.3 A2A 任务工具 (8 个)

| 工具名 | 说明 |
|--------|------|
| `a2a_create_task` | 创建 A2A 任务 |
| `a2a_get_task` | 查询任务详情 |
| `a2a_list_tasks` | 列出任务 |
| `a2a_accept_task` | 接受任务 |
| `a2a_deliver_task` | 提交交付物 |
| `a2a_review_task` | 审核 (支持自动审核) |
| `a2a_cancel_task` | 取消任务 |
| `a2a_get_reputation` | 查询 Agent 信誉 |

### 5.4 基础设施工具 (12+ 个)

| 工具名 | 说明 |
|--------|------|
| `wallet_onboarding` | MPC 钱包创建/查询 |
| `onramp_fiat` | 法币入金 |
| `balance_query` | 余额查询 |
| `agent_authorize` | Agent 授权额度 |
| `search_products` | 搜索商品 |
| `create_order` | 创建订单 |
| `quick_purchase` | 一键购买 |
| `prepare_checkout` | 准备结账 |
| `confirm_payment` | 确认支付 |
| `setup_quickpay` | 设置快捷支付 |
| `create_wallet` | 创建钱包 |
| `create_ax_id` | 创建 AX ID |

---

## 6. 费率结构

| 支付类型 | 费率 | 说明 |
|----------|------|------|
| **纯加密货币** | **0% (免费)** | 钱包直接支付，零手续费 |
| **入金 (On-ramp)** | +0.1% | 法币 → 加密货币 |
| **出金 (Off-ramp)** | +0.1% | 加密货币 → 法币 |
| **分账** | 0.3% (最低 0.1 USDC) | 多方收益分配 |

**示例:** 10 USDC 纯加密支付 + 分账 = 0.03 USDC 手续费 (0.3%)

---

## 7. FAQ

**Q: Agent 如何自主支付？**
A: 通过 X402 协议或 AP2 Mandate 预授权。Agent 在授权额度内可自动完成支付。

**Q: 如何保证 A2A 任务质量？**
A: 内置自动质量评估系统 (auto-assess)，基于交付物完整性、时效性、Agent 信誉等维度打分。支持设置质量门槛自动审批。

**Q: 分账计划支持哪些角色？**
A: platform (平台)、merchant (商户)、agent (代理)、referrer (推荐人)、custom (自定义)。

**Q: 如何接入我自己的 AI Agent？**
A: 三种方式：① MCP Server 连接 ② REST API 调用 ③ SDK 集成。推荐使用 MCP 获得最完整的工具支持。

**Q: 支持哪些区块链？**
A: 目前支持 BSC (BNB Chain)，计划扩展到 Ethereum、Polygon、Solana。

---

## 各生态集成工作清单汇总

| 生态 | 接入方式 | 当前状态 | 我们待做工作 | 优先级 |
|------|----------|----------|-------------|--------|
| Claude Desktop | MCP SSE | ✅ 已完成 | 维护 | — |
| ChatGPT GPTs | OpenAPI + OAuth | ✅ 已完成 | 更新 Schema | P1 |
| Gemini | Extension + Function Calling | ✅ 基础完成 | 提交 Extension Gallery | P1 |
| Cursor/Windsurf | MCP SSE | ✅ 已完成 | — | — |
| AutoGPT/LangChain | SDK + REST | ✅ SDK 就绪 | 发布 npm/PyPI | P1 |
| Coze | Plugin API | 🔧 待开发 | 开发 Plugin | P2 |
| Dify/FastGPT | HTTP API Tool | ✅ 可用 | 提供模板 | P2 |
| CrewAI | Python SDK | ✅ SDK 就绪 | 发布 PyPI | P1 |
| Microsoft Copilot | Plugin API | 🔧 待开发 | 开发 Plugin | P3 |
| Slack/Teams Bot | REST API | 🔧 待开发 | 开发 Bot | P3 |
