# PRD: Agent + Skills (AI Ecosystem Integration) — V1

**Scope**: Define a single product surface that makes Agentrix capabilities usable as **skills/tools** across:
- Agentrix UI (personal/merchant/developer)
- AI ecosystems (ChatGPT Apps via MCP, Claude MCP, GPTs Actions, Gemini Extensions, Grok tools)
- Agentrix SDK consumers

This PRD is grounded in:
- `Personal-Agent-PRD-V1.0.md` (personal finance agent)
- `AGENTRIX_MCP_ECOSYSTEM_PRD.md` (MCP multi-ecosystem goals)
- Current repo implementation (MCP + ai-capability + runtime skills + DB skills)

---

## 1. Goals & success metrics

### 1.1 Goals
1. **One capability, many ecosystems**: expose core Agentrix operations as tools with consistent semantics across platforms.
2. **Safe execution**: enforce user identity, budgets/policies, and explicit confirmation for high-risk actions.
3. **Extensibility**: allow developers/merchants to add new skills safely (versioned, validated, observable).

### 1.2 Success metrics (initial)
- Tool-call success rate (by platform) ≥ 99% for read-only tools; ≥ 95% for write tools.
- Median tool latency ≤ 1.5s for read tools, ≤ 3s for write tools.
- 0 critical incidents caused by userId spoofing / cross-tenant access.
- % of tools using canonical executor layer ≥ 90%.

---

## 2. Personas & key flows

### 2.1 Personal user (finance)
- See wallet overview, policies, “airdrop opportunities”, and AutoEarn suggestions.
- Execute actions progressively: read-only → confirm-to-execute → limited automation.

### 2.2 Merchant
- Observe payments/transactions and optionally automate operations (webhooks, fulfillment, campaigns).
- Enable AI CS/auto-order only when safety/quality gates are met.

### 2.3 Developer
- Create skills, export schemas for MCP/GPTs/Gemini, run sandbox tests, and monitor usage.

---

## 3. Product requirements

### 3.1 Unified tool/skill model
- Canonical unit: **Capability**
  - Has `id`, `name`, `description`, `input schema`, `output schema`, `risk level`, `scopes`, `version`.
  - Maps to an **executor** (server-side implementation).
- Runtime agent skills remain as orchestration (memory, intent resolution), but must call canonical capability executors.

### 3.2 Exposure adapters

#### MCP adapter (ChatGPT/Claude)
- Must support:
  - SSE transport + stateless fallback.
  - OAuth/JWT binding to user identity; no user-supplied `userId` in tool args for production.
- Tools/list must reflect:
  - platform-approved subset (read-only by default)
  - per-tenant enablement

#### OpenAI Actions adapter
- Must expose OpenAPI 3.1 schema and stable endpoints.
- Must share the same canonical executor layer as MCP.

#### Gemini/Grok adapters
- Must generate OpenAPI/function schemas from the same canonical capability definitions.

### 3.3 Safety, authorization, and confirmation
- All write actions MUST have:
  - user identity bound from auth
  - policy enforcement (single limit, daily limit, protocol/action whitelist)
  - confirmation UX for untrusted/first-time actions
  - audit log + replayable execution record

### 3.4 Skill lifecycle (developer-facing)
- Create/Update → Validate → Publish → Deprecate
- Mandatory validation gates before publish:
  - JSON Schema correctness
  - auth scope requirements declared
  - risk level declared
  - executor reachable (for HTTP skills) or implemented (for internal skills)

### 3.5 Observability
- Per tool call:
  - request id, user id, platform, tool name
  - latency, status, error code
  - safe redaction of secrets
- Dashboards:
  - platform error rates
  - slowest tools
  - top skills by usage

---

## 4. Non-goals (V1)
- Full “skill marketplace” monetization UI (pricing, billing) beyond minimal plumbing.
- Fully autonomous trading/asset execution without strong policies + confirmations.
- AI customer service automation without quality evaluation and escalation workflows.

---

## 5. Acceptance criteria (must-have)
1. MCP + OpenAI + ai-capability all route through the same canonical execution layer for core tools.
2. Production mode forbids `userId` in tool args; identity is derived from auth.
3. Policy engine blocks transactions exceeding limits and returns actionable error messages.
4. Developer can create a new HTTP skill, publish it, and see it appear in MCP tools/list and OpenAI functions.
5. Merchant webhooks can be configured persistently and deliver with retries; logs visible.

---

## 6. Known gaps from current repo (to be addressed)
- Merchant AI customer service is explicitly rule-based MOCK.
- Airdrop eligibility/claim are MOCK/TODO.
- AutoEarn “toggle strategy” is MOCK/TODO.
- Agent authorization “update” is NOT_IMPLEMENTED.
- DB Skill internal handlers are placeholders by default.
- Some MCP tools accept `userId` from arguments.
