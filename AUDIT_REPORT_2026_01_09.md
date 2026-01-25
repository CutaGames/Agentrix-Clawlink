# Agentrix 深度审计报告（2026-01-09）

> 说明：本报告基于对仓库 `Agentrix-website`（含 `frontend/`、`backend/`、`sdk-*`、`contract/`、`tests/` 与大量设计/部署文档）的静态审计与关键路径抽样阅读。
> 
> **重点提醒**：仓库中存在疑似已提交的真实密钥/Token（见“P0-01 密钥泄露”）。本报告不会复述任何密钥内容，但这本身属于最高优先级安全事件。

---

## 1. 执行摘要

### 1.1 结论概览

当前 Agentrix 项目在「产品闭环」与「生态接入」层面（MCP + 统一支付 + SDK + 合约）方向清晰，但**安全边界与生产化治理明显滞后**：

- **MCP 对外暴露面过大**：`/api/mcp/*` 标记为 Public，且工具调用在多处接受外部传入 `userId`，存在“未授权即可触发用户级动作/越权读写”的明显风险。
- **CORS 配置为 GPTs 兼容而放宽到全域**，并同时启用 `credentials: true`，对基于 Cookie 的会话安全（CSRF/跨站凭证滥用）极不友好。
- **Webhook（Stripe 等）处理缺少签名校验**，叠加 raw body 配置，存在被伪造事件驱动订单状态变更的风险。
- **前端 CSP 使用 `unsafe-inline`/`unsafe-eval`** 且全站生效，扩大 XSS 影响面。
- **合约侧存在可验证的逻辑缺陷**（例如 `executeBatchWithSession` 通过 `this.executeWithSession` 进行外部调用，导致 `onlyRelayer` 校验失败，批量执行函数实际不可用；以及缺少对 `paymentId` 的重放保护）。
- **仓库工程治理问题**：根目录脚本引用的 `start-all.sh/test-all.sh` 与实际文件不一致，且出现 `node_modules/` 目录；文档数量巨大但缺少“单一真相源”，增加维护成本与误配置风险。

### 1.2 风险分级

- **P0（立即处理 / 24h 内）**：密钥泄露、未授权 MCP 工具调用、CORS+credentials 全开放、Webhook 未验签。
- **P1（短期 / 1-2 周）**：OAuth/MCP 路由与 Token 语义不一致、日志/监控对敏感信息缺乏脱敏、CSP 全站放宽。
- **P2（中期 / 1-2 月）**：架构边界、数据治理、合约审计与升级策略、测试与发布流程治理。

---

## 2. 范围与方法

### 2.1 审计范围

- 后端：NestJS（`backend/`）
- 前端：Next.js 13（`frontend/`）
- 合约：Hardhat + Solidity（`contract/`）
- SDK：`sdk-js/`、`sdk-python/`、`sdk-react/`（抽样）
- 测试：`tests/`、Playwright/Jest
- 运维：启动脚本、Nginx 配置、部署文档

### 2.2 方法

- 关键入口文件精读（server bootstrap、auth、mcp、payments、webhook）
- 安全关键字检索（oauth/openid/jwt/cors/webhook/stripe/transak/x402/session 等）
- 合约核心文件抽样审计（Router / AutoPay / Commission / SessionManager）
- 以“攻击者视角”审阅对外暴露的 HTTP 与 MCP bridge 面

---

## 3. 系统架构与生态定位（概览）

### 3.1 目标形态

Agentrix 试图成为：

- **Agent 商业闭环基础设施**：身份（AX/三层ID/Session Key）、支付（Stripe/Transak/X402/钱包）、履约（订单/物流）、分润（Commission）
- **AI 生态接入层**：MCP（ChatGPT/Claude/Gemini 等）+ OpenAPI bridge + SDK

### 3.2 当前实现形态（从代码观测）

- `backend/src/main.ts`：Nest 启动、CORS、Session、Swagger。
- `backend/src/modules/mcp/*`：
  - `/api/mcp/sse`、`/api/mcp/messages`：MCP SSE + 无状态 JSON-RPC 兼容。
  - `/api/mcp/tool/:name`：REST bridge。
  - `.well-known/*`：为 ChatGPT/Claude OAuth discovery 提供。
  - 大量工具封装：搜索商品/下单/支付/钱包授权/X402 等。
- `backend/src/modules/auth/*`：
  - Web2 登录（Google/Twitter 等）
  - 同时存在一套 “MCP OAuth dummy” 端点（见 P1）
- `contract/contracts/*`：支付路由、自动扣款、SessionKey、分润结算等。

---

## 4. 关键安全审计（结论 + 证据点）

> 说明：证据点以“文件/行号”给出，方便直接跳转确认。

### P0-01：密钥/敏感配置疑似被提交（立即响应）

**现象**：后端存在 `.env/.env.prod` 等文件，包含 JWT/OAuth/Provider 等敏感项。

**影响**：
- JWT 签名密钥泄露 = 历史 token 可能被伪造；
- OAuth client secret 泄露 = 第三方登录/回调可被滥用；
- Provider secret 泄露 = 资金/交易流与 webhook 可信度受影响。

**证据**：
- backend/.env（包含 JWT_SECRET/OAuth secret 等敏感键）
- backend/.env.prod（同上）

**建议（立即）**：
- 视为已泄露：立即轮换全部密钥/Token。
- 清理 git 历史（BFG / filter-repo），并开启 secret scanning。

### P0-02：生产环境 CORS 全放开 + credentials=true

**现象**：为了“允许 GPTs Actions”，生产环境将 `origin` 设为 `true`（等价于反射任意 Origin），同时启用 `credentials: true`。

**影响**：
- 任意网站可在用户浏览器上下文发起跨站请求并携带 Cookie（若 Cookie 存在），使 CSRF/跨站会话滥用风险显著上升。
- 如果后端存在任何 Cookie/session-based 鉴权端点（Twitter OAuth 1.0a 使用 session），影响面扩大。

**证据**：
- backend/src/main.ts: `origin: allowGPTs ? true : corsOrigins` + `credentials: true`

### P0-03：MCP 对外暴露面过大，缺少强认证边界

**现象**：MCP Controller 与 Guest Checkout 等模块标记为 `@Public()`，意味着默认不强制 JWT。

**影响**：
- 未授权客户端可直接调用 `/api/mcp/messages`（无状态 JSON-RPC）或 `/api/mcp/tool/:name`（REST bridge），触发业务逻辑。
- 某些工具实现接受 `args.userId` 并下传到 Service 层：潜在越权/数据泄露/伪造支付意图。

**证据**：
- backend/src/modules/mcp/mcp.controller.ts（Public）
- backend/src/modules/mcp/mcp.service.ts 多处使用 `args.userId`

### P0-04：Webhook 未做签名校验（Stripe 等）

**现象**：Stripe webhook handler 直接信任传入 payload，未见 signature header 校验。

**影响**：
- 攻击者可伪造 `checkout.session.completed` 等事件，驱动系统将订单/支付标记为成功。

**证据**：
- backend/src/modules/mcp/guest-checkout.controller.ts: `stripeWebhook()`

### P0-05：前端 CSP 全站放宽（unsafe-inline/unsafe-eval）

**现象**：Next headers 对全站设置 CSP，其中 `script-src` 包含 `unsafe-inline` 与 `unsafe-eval`。

**影响**：
- 一旦存在任意 XSS 注入点，攻击链更短、影响更大。
- `unsafe-eval` 对供应链攻击/第三方脚本注入容忍度更高。

**证据**：
- frontend/next.config.js：CSP 配置。

---

## 5. 认证与授权（AuthN/AuthZ）审计

### 5.1 认证模式分裂：多套 OAuth/Token 语义并存

观察到至少三条并行路线：

1) `backend/src/modules/auth/oauth.controller.ts`：dummy OAuth controller（满足 MCP connector 要求）。
2) `backend/src/modules/auth/auth.controller.ts`：`/api/auth/mcp/*` dummy 端点（OIDC 指向这里）。
3) `backend/src/modules/mcp/oauth.controller.ts`：实现了“更真实”的授权码流，但仍缺少 client secret 校验/Redis 存储等。

风险：
- 路由冲突（两个模块都挂载 `/oauth`）
- 客户端/文档难以判断“哪套才是生产级”
- Token 不被 MCP 工具强制使用，形成“形式认证”

---

## 6. MCP 生态接口审计

### 6.1 无状态 MCP 模式的安全边界

`/api/mcp/messages` 在无 transport 时会走 `handleStatelessMessage`，允许调用：
- `tools/list`
- `tools/call`

如果工具本身没有强认证与参数约束，就形成“公开 RPC”。

### 6.2 Tool 实现存在越权参数风险

典型模式（风险）：
- 通过 `args.userId` 指定任意用户，然后调用 Wallet/Payment/Authorization 相关服务。

这在 MCP 场景尤其危险：AI 平台不会可信地提供 `userId`，服务端必须从认证上下文推导。

---

## 7. 支付系统审计（Web2 + Web3 + Provider）

### 7.1 Web2 支付（Stripe）

- Webhook 未验签（P0）。
- Guest checkout 用 URL 参数传递 email/guestSessionId，需审视是否存在可枚举或会话固定风险。

### 7.2 Provider（Transak）

- MCP tool 构造 Transak URL 可能会在返回内容中包含 API Key（取决于 Transak 的 key 属性是否“可公开”）。
- 需明确：Transak API Key 是否允许公开、Secret 必须只在后端使用。

### 7.3 Web3 支付（X402 / SessionKey / 合约）

- ERC8004SessionManager：
  - 批量执行函数疑似不可用（见合约审计）。
  - 缺少 paymentId 重放保护。
- AutoPay/PaymentRouter：更像 Demo 版本，需要补齐资金托管/授权模型与审计。

---

## 8. 合约审计（抽样结论）

> 说明：这不是“正式链上审计”，只做静态抽样与确定性 bug 识别。

### 8.1 ERC8004SessionManager 存在确定性缺陷

- `executeBatchWithSession()` 通过 `this.executeWithSession()` 调用，会触发外部调用语义，导致 `onlyRelayer` 的 `msg.sender` 变为合约自身，进而失败；从而该批量接口在默认配置下无法使用。
- 未见 `paymentId` 的“已执行”状态记录，存在同一签名/同一 paymentId 被重放的风险（取决于 relayer 行为与上层约束）。

### 8.2 PaymentRouter 资金与记录一致性

- `routePayment()` 允许 `msg.value >= amount` 但不退款多余部分，多余 ETH 将沉淀在合约内，且不记入任何 `balances`。
- `payments[paymentId]` 可被覆盖（未校验是否已存在），导致支付记录被重写。

### 8.3 AutoPay 模型未生产化

- 资金来源依赖合约余额，未展示 ERC20 approve/transferFrom 模式或账户抽象（AA）策略。

### 8.4 Commission（分润）

- 合约体量大、场景多（Provider、Relayer、争议/冻结、自动拆分等），建议做专业第三方审计。
- 关注点：授权边界（owner/relayer/provider）、资金路径、重入/溢出、状态机一致性。

---

## 9. 工程治理与可维护性

### 9.1 启动/测试脚本不一致

- 根目录 package.json 指向 `./start-all.sh`、`./test-all.sh`，但仓库实际存在 `start-all-services.sh` 等，且脚本中引用 `agentrixfrontend` 文件夹，与当前结构（`frontend/`）不一致。

影响：
- 新人/CI 容易跑不起来；文档与现实脱节。

### 9.2 node_modules 出现在仓库

仓库根目录出现 `node_modules/`，即使 `.gitignore` 忽略，仍说明存在“依赖目录曾被引入或用于打包上传”的可能。

建议：
- 强制 CI 检查禁止提交依赖目录与构建产物。

### 9.3 文档治理

- 文档极多（PRD/Plan/Guide/Verification/Runbook 等），但缺少“当前生效版本”的索引与版本策略。

建议：
- 建立 `docs/index.md` 作为唯一入口，按“现行规范 / 历史归档”拆分。

---

## 10. 建议的整改优先级（摘要）

- P0：密钥轮换 + MCP 强鉴权 + CORS 收敛 + Webhook 验签。
- P1：统一 OAuth/MCP 路由与 Token 语义；日志脱敏；CSP 收敛到最小可用。
- P2：合约正式审计与升级策略；工程脚本与文档治理；完善测试与发布流程。

---

## 11. 附：关键证据跳转索引（建议先看）

- CORS 全开放：backend/src/main.ts
- MCP Public 入口：backend/src/modules/mcp/mcp.controller.ts
- MCP 工具越权参数：backend/src/modules/mcp/mcp.service.ts
- Dummy MCP OAuth：backend/src/modules/auth/auth.controller.ts
- 前端 CSP：frontend/next.config.js
- ERC8004 批量执行缺陷：contract/contracts/ERC8004SessionManager.sol

