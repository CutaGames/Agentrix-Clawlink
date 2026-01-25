# Agentrix Agent / Skill / AI Integration — Architecture

This repo currently contains **four overlapping “skill/tool” systems**. They can be used together, but today they are not fully unified.

## 1) Execution surfaces (what calls what)

### A. MCP server (AI ecosystems: ChatGPT Apps, Claude MCP)
- Code: `backend/src/modules/mcp/mcp.controller.ts`, `backend/src/modules/mcp/mcp.service.ts`
- Transport:
  - SSE: `GET /api/mcp/sse` + `POST /api/mcp/messages`
  - Stateless fallback (JSON-RPC over HTTP): `POST /api/mcp/messages` (when SSE unavailable)
  - REST bridge: `POST /api/mcp/tool/:name`
- Tool inventory:
  - **Static tools** (hard-coded in `McpService`): `search_products`, `get_product_details`, `create_order`, `get_checkout_url`, `create_pay_intent`, `purchase_asset`, `get_balance`, `agent_authorize`, `airdrop_discover`, `autoearn_stats`
  - **Dynamic tools** from DB Skills table via `SkillService.findAll()` (name normalized to `[a-zA-Z0-9_]`)
- Important behavior notes:
  - Some tools are “real” (e.g., product search uses `ProductService`), but some are simplified (e.g., `create_order` returns a checkout URL instead of creating an order via `OrderService`).
  - Several tools require `userId` passed as an argument (instead of using auth context), which is a production risk for multi-tenant AI integrations.

### B. OpenAI integration (GPTs Actions + function calling)
- Code: `backend/src/modules/ai-integration/openai/openai-integration.controller.ts`
- Endpoints:
  - `GET /api/openai/functions` (function schemas)
  - `POST /api/openai/function-call` (exec)
  - `POST /api/openai/chat` (chat + function calling)
  - `GET /api/openai/openapi.json` (GPT Actions OpenAPI)
- Purpose:
  - A parallel “tool exposure” path for OpenAI ecosystems.

### C. AI capability layer (unified schemas + executor map)
- Code: `backend/src/modules/ai-capability/*`
- Endpoints:
  - `GET /api/ai-capability/platform/:platform` (platform-specific function schemas)
  - `GET /api/ai-capability/system-capabilities` (system capability list + schemas)
  - `POST /api/ai-capability/execute` (exec by executor id)
- Execution model:
  - Capabilities are mapped to executor names in `CapabilityExecutorService`.
  - Personal-agent “capabilities” exist (airdrop/auto-earn/agent-auth), plus commerce (search/buy), plus Phase2 placeholders.

### D. Agent runtime skills (chat runtime: intents → skills)
- Code: `backend/src/modules/agent/runtime/skills/*`
- Examples:
  - `product_search` skill delegates to AI capability executor `executor_search`.
  - Cart/checkout/payment skills call real services (`CartService`, `OrderService`, `PaymentService`) and persist “memory” (`AgentMemory`).
- Positioning:
  - This is the most “agent-like” layer: it handles conversational references (e.g., “第一个”), uses memory, and guides next steps.

### E. DB-defined “AX Skills” (registry + converters + executor)
- Code: `backend/src/modules/skill/*` and `backend/src/entities/skill.entity.ts`
- Endpoints:
  - CRUD: `POST/GET/PATCH/DELETE /api/skills`
  - Packs: `GET /api/skills/:id/pack/:platform` where `platform ∈ {openai, claude, gemini, openapi}`
  - Publish: `POST /api/skills/:id/publish`
- Execution:
  - `SkillExecutorService` supports `http` executor (real) and `internal` executor.
  - Default internal handlers include placeholders (`search_products`, `create_order`, `get_balance` returning mock messages).

## 2) Current “truth”: why skills appear duplicated

A single end-user action (e.g., “search a product”) can be represented as:
- MCP tool `search_products` (MCP static tool)
- Capability `search_products` (AI capability system capability)
- Runtime skill `product_search` (agent runtime)
- DB skill `search_products` (dynamic skill, if present)

Today, these layers differ in:
- auth/context handling (some expect `userId` in args; others use JWT-authenticated APIs)
- output shape (AI-friendly text vs structured vs domain DTOs)
- “real vs mock” status

## 3) Recommended unification direction (roadmap also covers this)

- Treat **AI capability** as the canonical “function schema + execution contract” layer.
- Keep **runtime skills** for chat/memory/UX orchestration.
- Make MCP and OpenAI integration thin adapters that:
  - authenticate users
  - map tool calls → capability executors
  - return platform-appropriate response formats
- Keep DB skills as “extensibility”, but:
  - require explicit publish + validation
  - strongly discourage `internal` handlers unless they are real, tested service methods.
