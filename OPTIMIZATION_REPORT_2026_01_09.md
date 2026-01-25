# Agentrix 优化与整改方案（2026-01-09）

本方案与审计报告配套，目标是：

1) **在不改变核心业务方向的前提下**，快速补齐安全与生产化底座；
2) 让 Agentrix 的 “MCP + 支付 + 合约 + SDK” 生态接入具备可控的信任边界；
3) 将“工程可运行性、可观测性、可维护性”拉齐到可持续迭代水位。

---

## A. P0（24 小时内）应急整改清单

### A1. 密钥应急处置（最高优先级）

**目标**：避免 token 伪造、OAuth 滥用、Provider 被盗用。

- 立即轮换：JWT、OAuth（Google/Twitter）、Transak、Stripe webhook secret、任何 relayer/private key。
- 清理仓库历史：使用 `git filter-repo` 或 BFG 删除历史中的 `.env*` 与密钥片段。
- 上线 secret 扫描：GitHub Advanced Security / pre-commit hooks / CI job（至少对 PR 做阻断）。
- 统一机密管理：生产环境使用 KMS/Secrets Manager（AWS/GCP/Azure）或 Vault；禁止在 repo 里出现真实 secret。

### A2. 收敛 CORS（避免“全站带凭证跨域”）

**现状风险**：生产 `origin: true` + `credentials: true`。

**推荐落地**：

- 对“浏览器前端”与“AI 平台回调/Actions”分流：
  - 浏览器前端：严格 allowlist（`https://agentrix.top`、`https://www.agentrix.top` 等），允许 credentials。
  - AI 平台：不要依赖 CORS+cookie，改为 **服务端凭证**（API key / OAuth bearer token / HMAC 签名），并把 `credentials` 设为 false。
- 为 MCP/Actions 新增独立子域名（例如 `mcp.api.agentrix.top`）并单独配置 CORS。

### A3. MCP 工具调用加“强认证门”

**目标**：任何会触发用户级动作、资金动作、数据访问的工具调用，必须从认证上下文推导用户身份。

最小可行做法（立即）：

- 关闭无状态 `tools/call` 或对其加 API key/allowlist；至少：
  - 仅允许 `tools/list` 公开；
  - `tools/call` 必须带 `Authorization: Bearer <token>` 或 `X-API-Key`。
- MCP 工具实现禁止接收 `args.userId`：
  - 从 JWT/OAuth token 的 `sub` 获取用户；
  - 未登录只允许“游客型”工具（只生成支付链接，不触发钱包扣款/授权）。
- 加速率限制：对 `/api/mcp/*`、`/api/checkout/*` 做 IP/Token 维度限流。

### A4. Webhook 验签

- Stripe：使用官方签名校验（`Stripe.webhooks.constructEvent`），依赖 raw body，但必须校验 `Stripe-Signature`。
- Transak：启用 webhook secret 校验。
- 所有 webhook endpoint：
  - IP allowlist（如供应商提供）
  - 单独的 rate limit
  - 事件幂等（event id 去重）

---

## B. P1（1-2 周）结构性修复

### B1. 统一 OAuth/MCP 的“单一真相源”

当前存在多套 `/oauth` 与 `/auth/mcp/*` 混杂：

- 选择一个生产路径：建议以 `/.well-known/*` -> `/api/auth/mcp/*` 为准。
- 删除或明确标注 dummy 端点（仅开发环境启用），避免误用。
- OAuth 授权码流：
  - 强制 PKCE（S256）
  - code 存储迁移到 Redis，并做一次性消费/过期清理
  - client registry（client_id/redirect_uri 精确匹配）

### B2. 前端 CSP 收敛

- 不要全站 `unsafe-eval/unsafe-inline`。
- 只对需要嵌入 Transak 的页面放宽，并尽量用：
  - nonce/hash
  - `strict-dynamic`（如可行）
- 增加额外安全头：`X-Frame-Options`（或 CSP frame-ancestors）、`Referrer-Policy`、`Permissions-Policy`。

### B3. 会话与 CSRF

- 若继续使用 cookie/session：
  - 对敏感写操作引入 CSRF token（或将写操作全部改为 bearer token）。
  - session secret 必须来自环境变量，不要有默认硬编码回退。

### B4. 日志与隐私

- MCP 工具入参、checkout/email/地址等属于 PII：
  - 统一脱敏策略（mask email、phone、address）
  - 结构化日志（JSON）+ requestId/traceId
- 数据保留策略：订单/支付日志/对话日志分类存储与保留周期。

---

## C. P2（1-2 月）生态与体系化提升

### C1. MCP Gateway 服务化

- 将 MCP 从“业务主后端”拆分为独立 Gateway：
  - 对外协议（MCP/OpenAPI）稳定
  - 内部调用通过服务间鉴权（mTLS / JWT audience / service token）
  - 风险隔离：即使 gateway 出现漏洞，也不直接拥有全量业务权限

### C2. 合约正式审计与升级策略

- 对 `Commission`、`ERC8004SessionManager`、`X402Adapter`、`PaymentRouter` 做第三方审计。
- 引入：
  - `paymentId` 重放保护
  - 事件幂等与状态机一致性测试
  - 明确升级方式（Proxy/不可升级/迁移策略）

### C3. 工程治理

- 修复根目录脚本与实际文件不一致（start/test）。
- 清理或禁止提交 `node_modules`。
- 文档治理：建立 index + 版本化。

### C4. 测试与发布

- 为 P0/P1 风险点补齐回归测试：
  - MCP tool 认证与越权用例
  - webhook 验签与幂等
  - CORS 行为（含 credentials）
  - 合约：batch 执行与重放测试

---

## D. 建议的里程碑拆解（可直接用于排期）

- 里程碑 0（当天）：密钥轮换 + MCP 门禁 + CORS 收敛 + Stripe webhook 验签。
- 里程碑 1（两周）：统一 OAuth/MCP；CSP 收敛；日志脱敏；限流上线。
- 里程碑 2（两月）：MCP gateway 拆分；合约审计；工程与文档治理；发布流程固化。

---

## E. 需要业务方确认的关键决策（避免返工）

1) MCP 对外是否允许“完全游客模式”调用？如果允许，游客可做哪些操作（仅搜索/仅生成支付链接/禁止创建钱包/禁止扣款/禁止授权）。
2) GPTs/Claude 的接入到底采用哪种认证：OAuth（推荐）还是 API Key（最小成本）？
3) 支付闭环的核心风控策略：限额、频次、地理/设备、黑名单、争议/冻结与退款流程。
4) 合约升级策略：要不要可升级？如果要，治理与权限如何设计？

