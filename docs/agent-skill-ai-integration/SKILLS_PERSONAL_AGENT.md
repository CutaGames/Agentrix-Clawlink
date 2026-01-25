# Personal Agent (Finance) — Skill Catalog & Readiness

Source PRD: `Personal-Agent-PRD-V1.0.md`.

## Summary
Personal Agent is positioned as an “account-level intelligent asset assistant” with:
- MPC wallet + external wallet binding
- Progressive authorization (policy engine)
- Airdrop discovery/claim
- AutoEarn strategy suggestions/execution
- Bill / transaction classification

In code, these capabilities are spread across **JWT-authenticated REST APIs** and **AI-facing adapters** (MCP/OpenAI/ai-capability).

## Skills / capabilities

| Skill / Capability | What it does | Primary surface | Backend implementation | Readiness | Evidence / gaps |
|---|---|---|---|---|---|
| Wallet management (balances) | View wallet balances, chains/assets | Frontend: `WalletManagement` (standalone app feature) | `WalletService` via MCP tool `get_balance` | Partial | MCP requires `userId` argument; ensure production uses auth context instead of user-supplied IDs. MPC wallet creation flows not verified here. |
| Policy engine (authorization center) | Single limit, daily limit, protocol whitelist | Frontend: `PolicyEngine`; API: `/api/user-agent/policies` | `backend/src/modules/user-agent/policy-engine.service.ts`, `user-agent.controller.ts` | Commercial-ready (core), Partial (UX) | Core rule evaluation exists; some policy types listed but not all are enforced (e.g., action whitelist depends on metadata). Frontend “visual config” may still be incomplete per PRD. |
| Transaction classification (“bill assistant”) | Classify transactions + show category statistics | API: `/api/user-agent/transactions/:paymentId/classify`, `/api/user-agent/transactions/category-statistics` | `TransactionClassificationService` (Gemini-based per PRD) | Partial | Depends on external model/provider and quality; requires dataset + eval. Not validated end-to-end here. |
| Airdrop discovery | Discover airdrops and persist them | Frontend: `AirdropDiscovery` → `/api/auto-earn/airdrops/discover` | `backend/src/modules/auto-earn/airdrop.service.ts` | Partial | Uses real DB persistence; but discovery falls back to MOCK airdrops if API keys unavailable. Eligibility checks are TODO. |
| Airdrop eligibility check | Decide if claimable | API: `/api/auto-earn/airdrops/:id/check-eligibility` | `AirdropService.checkEligibility` | Not usable | Eligibility is largely TODO; currently mocked and does not verify real requirements. |
| Airdrop claim | Execute claim and track tx hash | Frontend: `AirdropDiscovery` → `/api/auto-earn/airdrops/:id/claim` | `AirdropService.claimAirdrop` | Not usable | Explicit MOCK claim (simulated delay + random tx hash). Needs real onchain/API claim logic + risk checks. |
| AutoEarn tasks list | List tasks (airdrop/task/strategy/referral) | Frontend: `AutoEarnPanel` → `/api/auto-earn/tasks` | `AutoEarnService.getTasks` | Partial | Backed by DB tasks; auto-seeds from airdrops if none exist. Tasks quality depends on airdrop data quality. |
| AutoEarn execute task | Execute a task and update status | Frontend: `AutoEarnPanel` → `/api/auto-earn/tasks/:taskId/execute` | `TaskExecutorService` via `AutoEarnService.executeTask` | Partial | Requires review of `TaskExecutorService` per task type; not validated end-to-end here. |
| AutoEarn stats | Aggregate earnings and activity | Frontend: `AutoEarnPanel` → `/api/auto-earn/stats` | `AutoEarnService.getStats` | Commercial-ready (data), Partial (meaning) | Aggregation is real; but business meaning depends on task definitions (some seeded/mocked). |
| AutoEarn toggle strategy | Enable/disable strategy | Frontend: `AutoEarnPanel` → `/api/auto-earn/strategies/:id/toggle` | `AutoEarnService.toggleStrategy` | Not usable | Explicit MOCK (“TODO: connect real strategy engine”). |
| Agent authorization (Phase2) | Create/get/update an agent authorization | AI capability executor: `AgentAuthExecutor` | `backend/src/modules/ai-capability/executors/agent-auth.executor.ts` | Partial | Create/get exist; update is NOT_IMPLEMENTED. Needs proper authZ checks and update path. |
| Commerce: product search | Search marketplace products | Runtime skill: `ProductSearchSkill`; MCP tool `search_products` | Runtime: `backend/src/modules/agent/runtime/skills/product-search.skill.ts`; MCP: `mcp.service.ts` | Commercial-ready (search), Partial (unification) | Uses real `ProductService` (MCP) and capability executor (runtime). Output formats differ; unify via capability layer recommended. |
| Commerce: cart management | Add/view/update/remove items | Runtime skills: `add_to_cart`, `view_cart`, `update_cart_item`, `remove_from_cart` | `backend/src/modules/agent/runtime/skills/*cart*.ts` | Commercial-ready | Uses `CartService`, supports guest session carts; includes memory support for “第一个/第二个”. |
| Commerce: checkout | Create order from cart (currency normalization) | Runtime skill: `checkout` | `backend/src/modules/agent/runtime/skills/checkout.skill.ts` | Commercial-ready (core) | Creates order via `OrderService`, handles session-cart migration, converts to USDC (with fallback rates). |
| Commerce: payment | Process payment for an order | Runtime skill: `payment` | `backend/src/modules/agent/runtime/skills/payment.skill.ts` | Partial | Calls `PaymentService.processPayment`; readiness depends on payment providers + policy enforcement + fraud checks. |
| Cancel order | Cancel an order by id | Runtime skill: `cancel_order` | `backend/src/modules/agent/runtime/skills/cancel-order.skill.ts` | Partial | Calls `OrderService.cancelOrder`. Refund logic is not verified here. |

## AI ecosystem exposure (Personal-relevant)

| Surface | What is exposed | Notes |
|---|---|---|
| MCP | `airdrop_discover`, `autoearn_stats`, `get_balance`, `agent_authorize` | Several tools accept `userId` in args; production should bind to auth context via OAuth/JWT. |
| AI capability | `discover_airdrops`, `get_auto_earn_stats`, etc. | Execution expects `context.userId`. This is safer than MCP’s arg-based userId. |
| OpenAI integration | Functions + actions OpenAPI | Separate exposure path; should call into capability/runtime rather than parallel logic where possible. |
