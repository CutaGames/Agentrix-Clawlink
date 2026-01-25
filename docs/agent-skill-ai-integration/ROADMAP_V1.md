# Roadmap: Agent + Skills (AI Ecosystem Integration) — V1

This roadmap is organized around converging multiple “skill/tool” systems into one canonical capability layer, then exposing it reliably across MCP + OpenAI Actions and powering three agent personas.

---

## Phase 0 — Baseline hardening (1–2 weeks)
**Goal**: make current tool execution safe enough for internal + limited external testing.

- Enforce identity binding: remove/ignore `userId` passed via tool args in production.
- Add consistent error codes and structured logging for tool calls (MCP + OpenAI + REST).
- Add a single “capability registry” view (even if read-only) that shows:
  - tool/capability name, executor type, readiness status, required scopes

**Exit criteria**
- MCP SSE + stateless fallback stable.
- Tool calls have trace ids and consistent error envelopes.

---

## Phase 1 — Canonical capability execution (2–4 weeks)
**Goal**: converge execution paths so “one capability” behaves identically across adapters.

- Define canonical capability interface:
  - schema, risk, scopes, version
- Route MCP static tools through `CapabilityExecutorService` for shared behavior.
- Ensure OpenAI functions / OpenAPI routes execute the same canonical capabilities.
- Close obvious NOT_IMPLEMENTED:
  - agent authorization update
- Establish “read tools first” policy:
  - read-only tools enabled by default
  - write tools require explicit enablement + confirmation

**Exit criteria**
- ≥ 10 core tools are fully canonicalized (search, product details, checkout url, pay intent, balance, airdrop discover/stats, etc.).

---

## Phase 2 — Skill lifecycle + publishing (3–6 weeks)
**Goal**: developers can safely publish skills that appear in ecosystems.

- Skill validation gates (schema, scopes, executor health).
- Versioning + deprecation policies.
- Publish pipeline:
  - “draft → published” and pack generation for MCP/OpenAI/Gemini
- Improve HTTP skill execution security:
  - outbound allowlist
  - request signing / auth passthrough model

**Exit criteria**
- A developer can create an HTTP skill end-to-end and invoke it via MCP tools.

---

## Phase 3 — Persona enablement (4–8 weeks)
**Goal**: deliver a coherent skill set per persona with real, non-mock backends.

### Personal agent
- Replace airdrop eligibility/claim MOCK with real provider integrations or clearly labeled simulation.
- AutoEarn strategy: implement persistence + real execution scheduling.
- Expand policy UX and enforcement coverage.

### Merchant agent
- Persist webhook configuration + delivery logs; add admin UX for failures.
- Replace auto-order and AI CS MOCK with:
  - deterministic rules engine first
  - then optional LLM decisions with evaluation + human escalation

### Developer agent
- Provide “Skill Studio” essentials:
  - schema editor
  - test runner
  - pack export (MCP/OpenAI)

**Exit criteria**
- Each persona has ≥ 5 “commercial-ready” skills and clear constraints for the rest.

---

## Backlog: future skills (examples)
- Portfolio rebalancing assistant with explicit approvals
- Tax lot tracking and export
- Merchant campaign generator with A/B experiments
- Developer tool: “skill lint + security scan”
- On-chain proof/audit skill packs
