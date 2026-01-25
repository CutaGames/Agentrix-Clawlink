**Purpose**: Brief, actionable guidance for AI coding agents working in this repo.

**Big Picture**:
- **Monorepo-like layout**: top-level contains multiple subprojects: `frontend` (Next.js), `backend` (NestJS), `sdk-js` (typedoc + SDK), `contract`, and `tests`.
- **Service boundaries**: frontend (port 3000) communicates with backend API (port 3001). SDK docs served on 3002 by `start-all.sh`.
- **Why this structure**: separation between UI (`frontend`), API (`backend`) and SDK/docs (`sdk-js`) keeps deployment and testing independent.

**Where to start (local dev)**:
- Quick: run `./start-all.sh` from repo root (WSL). This starts frontend, backend, and SDK docs and includes WSL↔Windows tips.
- Individual services:
  - Frontend: `cd frontend && npm run dev` (Next.js 13, port 3000).
  - Backend: `cd backend && npm run start:dev` (NestJS, port 3001).
  - SDK docs: `cd sdk-js && npm run docs:generate` then `npx serve docs -p 3002`.
- Health check: backend exposes `/api/health` (used by `test-all.sh`).

**Testing & CI**:
- Root-level helpers: `npm run test` runs `./test-all.sh` which orchestrates Playwright (E2E) and Jest (API/SDK).
- Playwright: `npx playwright test` (see `package.json` scripts `test:e2e` and `test:report`).
- Jest: API/SDK tests under `tests/api` and `tests/sdk` (`npm run test:api`, `npm run test:sdk`).
- Generated reports live in `tests/reports` and `tests/reports/e2e-html`.

**Build & deploy**:
- Frontend build: `cd frontend && npm run build` then production start via `bash start-production.sh` (script at `frontend/start-production.sh`).
- Backend build: `cd backend && npm run build` (uses `tsc` / Nest build and verifies `dist/main.js`).
- Deployment helpers: `deploy-backend.sh` and `deploy.sh` at repo root — inspect them before changing deployment logic.

**Project-specific conventions & patterns**:
- TypeScript everywhere: prefer `ts-node`/`ts-node-dev` for dev; `dist` is produced for prod runs.
- **Entity Mapping**: `User` entity maps `agentrixId` to the `paymindId` column in the database for backward compatibility.
- **MCP (Model Context Protocol)**:
  - SSE Transport: `/api/mcp/sse` (GET for connection, POST for messages).
  - OAuth Discovery: `/.well-known/oauth-authorization-server` and `/.well-known/openid-configuration` are implemented to support ChatGPT/Claude.
  - Dummy OAuth: `api/auth/mcp/authorize` and `api/auth/mcp/token` provide a simplified flow for AI ecosystem integration.
- **Payments**:
  - Stripe: Standard fiat payments.
  - Transak: Fiat-to-Crypto on-ramp. Optimized to skip KYC/Email when possible. CNY is converted to USD before session creation.
  - X402: Unified payment protocol for agent-to-agent transactions.
- **Authentication**:
  - Supports Google, Twitter (X), and Wallet (EVM/Solana) logins.
  - Twitter OAuth 1.0a requires `express-session` support in `main.ts`.
- NestJS conventions: `backend` follows Nest CLI layout; migrations are managed via `typeorm-ts-node-commonjs` commands in `package.json` (look at `src/config/data-source.ts`).
- SDK docs: `sdk-js` uses TypeDoc and `typedoc` may be installed on-demand by `start-all.sh`.
- Tests orchestration uses shell scripts that assume a POSIX shell (WSL). Windows users should use WSL or adapt commands.

**Important files to inspect for behavior examples**:
- `start-all.sh` — how services are launched and WSL↔Windows port forwarding explained.
- `test-all.sh` — full testing workflow and report generation.
- `frontend/package.json` — Next.js dev/build/start scripts.
- `backend/package.json` — build, migration, test scripts and many helper scripts.
- `sdk-js` — TypeDoc + SDK build and examples.

**Rules for generated changes**:
- When editing runtime scripts or service entrypoints, update both `start-all.sh` and `test-all.sh` to keep orchestration consistent.
- Keep API surface stable — many tests and E2E specs expect `http://localhost:3001/api/*` endpoints.
- **Full Verification Cycle**: After making modifications, you MUST follow these steps to ensure system integrity:
  1. **Build**: Run the build command for the affected service(s) (e.g., `cd frontend && npm run build` and `cd backend && npm run build`).
  2. **Run**: Start the backend and frontend servers using `./start-all.sh` or individual dev commands.
  3. **Verify**: Use `test-all.sh` or manual endpoint checks (e.g., `curl http://localhost:3001/api/health`) to confirm that changes behave as expected and haven't introduced regressions.

**Quick examples**:
- Start everything (WSL): `./start-all.sh`
- Run full test suite (WSL): `./test-all.sh`
- Run frontend only: `cd frontend; npm run dev`
- Run backend only (dev): `cd backend; npm run start:dev`

If any section is unclear or you need more detail (e.g., specific files to reference for a feature), tell me which area to expand.
