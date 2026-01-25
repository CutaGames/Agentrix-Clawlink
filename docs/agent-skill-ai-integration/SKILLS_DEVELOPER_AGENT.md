# Developer Agent — Skill Catalog & Readiness

Developer Agent is the “builder/integration” persona: create skills, export schemas, integrate into MCP / GPT Actions / Gemini tools, and validate execution.

## Skills / capabilities

| Skill / Capability | What it does | Primary surface | Backend implementation | Readiness | Evidence / gaps |
|---|---|---|---|---|---|
| Create/update/publish DB Skills | CRUD for AX skills registry | API: `/api/skills/*` | `backend/src/modules/skill/skill.controller.ts`, `skill.service.ts` | Commercial-ready (registry) | CRUD works and persists via TypeORM `Skill` entity. |
| Generate platform packs | Convert a skill into OpenAI/Claude/Gemini/OpenAPI schemas | API: `GET /api/skills/:id/pack/:platform` | `SkillConverterService` via `SkillService.generatePack` | Commercial-ready | Useful for “write once, export everywhere.” |
| Execute DB Skill (HTTP) | Execute a skill via outbound HTTP request | `SkillExecutorService` (`executor.type='http'`) | `backend/src/modules/skill/skill-executor.service.ts` | Commercial-ready (with constraints) | Real HTTP execution; needs allowlist, auth, SSRF protection, timeouts, observability, retries. |
| Execute DB Skill (internal) | Execute via internal handler name | `SkillExecutorService` (`executor.type='internal'`) | `skill-executor.service.ts` | Not usable (default handlers) | Default internal handlers are placeholders (return “integrate with X service”). Only safe if replaced with real implementations. |
| MCP tool exposure | Expose tools to ChatGPT/Claude via MCP | `/api/mcp/sse`, `/api/mcp/tool/:name`, `/api/mcp/openapi.json` | `backend/src/modules/mcp/*` | Partial | Dynamic DB skills are exposed; but auth/context hardening is needed (avoid userId-in-args patterns). |
| AI capability platform schemas | Generate function schemas per platform (OpenAI/Groq/Gemini/Claude) | `GET /api/ai-capability/platform/:platform` | `backend/src/modules/ai-capability/*` adapters + registry | Commercial-ready | Clean place to unify platform-specific tool schemas. |
| AI capability execution | Execute by executor id | `POST /api/ai-capability/execute` | `CapabilityExecutorService` + executors | Partial | Some executors are real; some are placeholders (e.g., agent auth update not implemented). |
| OpenAI integration (actions + function calling) | Provide OpenAI functions list and an execution endpoint | `/api/openai/functions`, `/api/openai/function-call`, `/api/openai/openapi.json` | `backend/src/modules/ai-integration/openai/*` | Partial | Strong integration surface, but overlaps with MCP/ai-capability; should route through a single canonical executor layer to avoid drift. |
| SDK + ecosystem integration docs | How to integrate into GPTs/MCP/Gemini | Docs in repo root (e.g. `Agent-SDK-AI-Ecosystem-Integration-Guide.md`) | N/A | Commercial-ready (docs) | Docs exist and are detailed; should be aligned with current runtime truth (auth modes, tool names). |

## Frontend status
- Developer Agent standalone wrapper exists: `frontend/components/agent/standalone/DeveloperAgentApp.tsx`.
- The “Skill management” UI (`frontend/components/agent/SkillManagementPanel.tsx`) currently uses `SAMPLE_SKILLS` in-memory data → **not wired to `/api/skills`**.

## Key commercial gaps
- Unify tool exposure (MCP/OpenAI/ai-capability) around one canonical layer.
- Replace placeholder internal skill handlers or disallow them in production.
- Add policy/security controls for HTTP skill execution (allowlist, per-tenant keys, logging).
