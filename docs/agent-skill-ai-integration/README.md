# Agent / Skill / AI Integration Deliverables

This folder is a **repo-truth** (code-backed) inventory + PRD/roadmap focused on:
- Agent architecture & execution surfaces
- Skills/tools exposed to AI ecosystems (MCP / OpenAI / Function Calling)
- Skill catalogs for the 3 agent roles: **Personal (finance)**, **Merchant**, **Developer**
- Commercial readiness: **Commercial-ready / Partial / Not usable**

## Files
- [ARCHITECTURE.md](docs/agent-skill-ai-integration/ARCHITECTURE.md) — how MCP / AI capability / runtime skills / DB skills fit together
- [SKILLS_PERSONAL_AGENT.md](docs/agent-skill-ai-integration/SKILLS_PERSONAL_AGENT.md) — Personal Agent (finance) skills inventory + readiness
- [SKILLS_MERCHANT_AGENT.md](docs/agent-skill-ai-integration/SKILLS_MERCHANT_AGENT.md) — Merchant Agent skills inventory + readiness
- [SKILLS_DEVELOPER_AGENT.md](docs/agent-skill-ai-integration/SKILLS_DEVELOPER_AGENT.md) — Developer Agent skills inventory + readiness
- [PRD_AGENT_SKILLS_V1.md](docs/agent-skill-ai-integration/PRD_AGENT_SKILLS_V1.md) — consolidated PRD for “Agent + Skills” as a product surface
- [ROADMAP_V1.md](docs/agent-skill-ai-integration/ROADMAP_V1.md) — phased roadmap + future skill backlog

## 中文版本
- [PRD_AGENT_SKILLS_V1.zh-CN.md](docs/agent-skill-ai-integration/PRD_AGENT_SKILLS_V1.zh-CN.md) — PRD（中文）
- [ROADMAP_V1.zh-CN.md](docs/agent-skill-ai-integration/ROADMAP_V1.zh-CN.md) — Roadmap（中文）
- [TOP10_TASKS_P0.zh-CN.md](docs/agent-skill-ai-integration/TOP10_TASKS_P0.zh-CN.md) — P0 优先级最高的 10 个任务

## Readiness rubric (used across catalogs)
- **Commercial-ready**: real service integration + auth + persistence; not explicitly MOCK/TODO; predictable contracts.
- **Partial**: some real wiring exists, but gaps remain (e.g., uses `userId` passed by AI args, in-memory configs, simplified flow, or TODOs in critical paths).
- **Not usable**: explicit `MOCK` / `TODO` / `NOT_IMPLEMENTED` for core behavior.

## Primary code entrypoints referenced
- MCP server: `backend/src/modules/mcp/*`
- AI capability (schemas + executors): `backend/src/modules/ai-capability/*`
- Runtime skills (agent conversation runtime): `backend/src/modules/agent/runtime/skills/*`
- DB skill registry + converter + executor: `backend/src/modules/skill/*`
- Personal-agent services (policy, bills, auto-earn): `backend/src/modules/user-agent/*`, `backend/src/modules/auto-earn/*`
- Merchant automation: `backend/src/modules/merchant/*`
- OpenAI integration surface: `backend/src/modules/ai-integration/openai/*`
