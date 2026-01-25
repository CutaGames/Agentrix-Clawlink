# Merchant Go-Live Readiness (Agentrix)

This doc summarizes the **current merchant-side capabilities** implemented in this repo, and a **go-live gap checklist** for getting merchants onboarded quickly (merchant console + agent workbench) and operationally ready.

## 1) Architecture Snapshot

- **Frontend**: Next.js (Pages Router)
  - Merchant console routes live under `frontend/pages/app/merchant/*`.
  - Workbench entry (per docs) is `/agent-enhanced`.
- **Backend**: NestJS
  - REST API is served under `/api/*` (frontend API client auto-appends `/api`).
  - Merchant-specific endpoints: `/api/merchant/*` (guarded by JWT).
  - Public/merchant endpoints: `/api/products`, `/api/orders`, etc.
- **SDK**: `sdk-js` provides typed resources/examples (helpful for merchant/developer integration).

## 2) Merchant Console: What’s Implemented (Evidence-Based)

Below is the most reliable view: **merchant pages + the API routes they call**.

### 2.1 “Works end-to-end” (UI + API route exists and matches)

- **API Keys**
  - UI: `frontend/pages/app/merchant/api-keys.tsx`
  - API: `POST/GET/DELETE /api/api-keys*` via `backend/src/modules/api-key/api-key.controller.ts`
  - Notes: full key returned only once (good security UX).

- **Webhooks (generic user webhooks)**
  - UI: `frontend/pages/app/merchant/webhooks.tsx`
  - API: `/api/webhooks` via `backend/src/modules/webhook/webhook.controller.ts`

- **Products (core CRUD)**
  - UI: `frontend/pages/app/merchant/products.tsx`
  - API: `/api/products` via `backend/src/modules/product/product.controller.ts`
  - Notes: backend supports “merchant defaults”: if logged-in user has MERCHANT role and no `merchantId` query, it uses `req.user.id`.

- **Orders (list + cancel only)**
  - UI: `frontend/pages/app/merchant/orders.tsx` loads via `GET /api/orders`
  - API: `backend/src/modules/order/order.controller.ts` supports `POST /orders` (optional auth), `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel`.

- **Merchant payment settings (metadata-backed)**
  - UI: `frontend/pages/app/merchant/payment-settings.tsx`
  - API: `GET/POST /api/merchant/payment-settings` in `backend/src/modules/merchant/merchant.controller.ts`

- **Merchant “ops” features (merchant module)**
  - **Multi-chain summary**: UI `multi-chain-accounts.tsx` → `GET /api/merchant/multi-chain/summary`
  - **Reconciliation**: UI `reconciliation.tsx` → `GET/POST /api/merchant/reconciliation/*`
  - **Settlement rules**: UI `settlement-config.tsx` → `GET/POST /api/merchant/settlement/rules` and `POST /api/merchant/settlement/perform`
  - **Fulfillment records**: UI `fulfillment.tsx` → `GET /api/merchant/fulfillment/records` and `POST /api/merchant/fulfillment/auto`

### 2.2 “Partially implemented / contract mismatches” (P0 to fix for go-live)

These are high-risk because the UI is present but will likely fail at runtime due to **endpoint mismatch** or **response shape mismatch**.

- **Merchant Customers**
  - UI: `frontend/pages/app/merchant/customers.tsx` expects `GET /api/merchant/customers` to return `{ customers, total }`.
  - Backend: `backend/src/modules/merchant/merchant.controller.ts` returns `{ success: true, data: customers }`.

- **Merchant Refunds**
  - UI: `frontend/pages/app/merchant/refunds.tsx` calls:
    - `GET /api/merchant/refunds` expecting an array
    - `POST /api/merchant/refunds/:id/approve|reject`
  - Backend: `backend/src/modules/merchant/merchant.controller.ts` implements:
    - `GET /merchant/refunds` returning `{ success: true, data: refunds }`
    - `POST /merchant/refunds/:refundId/process` with body `{ action: 'approve'|'reject', reason? }`

- **Merchant Orders actions**
  - UI tries to call `PUT /api/orders/:id/status` and `POST /api/orders/:id/refund` (see `frontend/lib/api/order.api.ts`).
  - Backend order controller currently does **not** implement these routes.

- **Ecommerce sync UI**
  - UI: `frontend/pages/app/merchant/ecommerce-sync.tsx` calls `/api/products/ecommerce/*`.
  - Backend implementation exists as `backend/src/modules/product/ecommerce-sync.controller.ts` but:
    - It is mounted at `/api/ecommerce/*` (not `/api/products/ecommerce/*`).
    - It is currently not registered in a Nest module (no module wiring found), so it may not be reachable at all.
    - UI uses `PATCH` for toggling active, but controller exposes `PUT`.

- **Batch import UI**
  - UI: `frontend/pages/app/merchant/batch-import.tsx` calls `/api/products/batch/*`.
  - Backend: `backend/src/modules/product/product-batch-import.controller.ts` appears to implement template/preview/import routes, but must be confirmed wired into the Nest module graph.
  - UI uses `localStorage.getItem('token')` in some places; the rest of the app uses `access_token`.

### 2.3 “Backend implemented but not used by merchant UI” (needs wiring decisions)

- `backend/src/modules/merchant/merchant.controller.ts` contains `merchant/webhook/*` endpoints, but current merchant UI uses the generic `/api/webhooks` module instead.

## 3) Merchant-Side “Completed Features” (module view)

From a go-live perspective, the merchant product surface is already broad:

- **Commerce core**: products list/create/update/delete; order list + cancel.
- **Integration**: API keys; webhooks; audit proofs endpoint exists (merchant can query proofs tied to pay intents).
- **Financial ops**: payment settings, reconciliation, settlement rules, withdrawals (frontend calls `/api/payments/withdraw*`, needs backend verification).
- **Automation (merchant module)**: auto-order, AI customer service, auto-marketing endpoints exist; validate UI wiring if these pages are intended for go-live.
- **Wallet / multi-chain**: multi-chain summary + chain balances.

## 4) Go-Live Checklist (what to add/finish)

### P0 (must-have for “merchants can use it”)

- Fix **API contract mismatches** for Customers/Refunds/Orders actions (choose one):
  - Option A: update frontend to match backend routes + response shapes.
  - Option B: adjust backend to match existing frontend expectations.
- Ensure **ecommerce sync + batch import** are actually reachable:
  - Confirm module wiring for `EcommerceSyncController` and `ProductBatchImportController`.
  - Align route prefixes used by UI (`/products/ecommerce/*`, `/products/batch/*`) to backend.
- Token consistency: standardize on `access_token` across all merchant pages (upload, batch import, etc.).
- Operational minimums:
  - Merchant onboarding “happy path” works: create account → create API key → add product → create order → receive webhook.
  - Production env vars + provider configuration validated for payments.

### P1 (strongly recommended for first public launch)

- Add **Order lifecycle controls** merchants actually need (ship/complete/refund) with proper authorization.
- Add **monitoring/alerting runbook** for merchant-impacting workflows (webhook delivery failures, withdrawal stuck, settlement failures).
- Add **merchant-facing docs**:
  - Quickstart (10 minutes)
  - Webhooks & signature verification
  - API keys/scopes explanation
  - Testing in sandbox

### P2 (can iterate after launch)

- Full analytics dashboards, export flows, rich reporting.
- Advanced automation configuration UX (AI客服/营销/自动接单) and guardrails.
- Marketplace/commission automation end-to-end, if monetization depends on it.

## 5) “Merchant Quick Onboarding” Suggested Flow

This is the shortest path to value that also supports support/ops:

1. Create merchant account and login
2. Configure payment settings (fiat/crypto/both; off-ramp optional)
3. Create an API key (sandbox first)
4. Add 1–3 products (or import/sync)
5. Configure webhook endpoint and verify delivery
6. Run a sandbox purchase from a test user/agent
7. Go-live: switch API key mode to production + configure payout/withdrawal

---

If you want, I can turn section 4 into a tracked engineering TODO list (P0/P1/P2) and/or propose a minimal “Go-Live acceptance test script” for QA and ops.
