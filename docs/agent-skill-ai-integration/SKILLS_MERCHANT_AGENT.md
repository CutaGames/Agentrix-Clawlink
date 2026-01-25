# Merchant Agent — Skill Catalog & Readiness

Merchant Agent is meant to help merchants run payments/fulfillment/ops with optional automation (auto-order, marketing, AI customer service).

## Skills / capabilities

| Skill / Capability | What it does | Primary surface | Backend implementation | Readiness | Evidence / gaps |
|---|---|---|---|---|---|
| Merchant stats | GMV, success rate, daily chart | API: `GET /api/merchant/stats` | `backend/src/modules/merchant/merchant.controller.ts` + `PayIntent` queries | Commercial-ready | Uses real DB aggregation over `PayIntent` records. |
| Transactions list | Paginated pay intents for merchant | API: `GET /api/merchant/transactions` | `merchant.controller.ts` + `payIntentRepository.findAndCount` | Commercial-ready | Real DB query; auth guarded via `JwtAuthGuard`. |
| Audit proofs list | Retrieve audit proofs (scoped) | API: `GET /api/merchant/audit-proofs` | `merchant.controller.ts` + `auditProofRepository.find` | Partial | Scoping depends on `payIntentId` check; broader multi-tenant filtering should be reviewed (proofs query itself isn’t merchant-filtered unless payIntentId provided). |
| Auto order: configure/get | Set auto-order rules | API: `POST/GET /api/merchant/auto-order/*` | `MerchantAutoOrderService` | Partial | Config is in-memory `Map` (not persisted). |
| Auto order: decisioning | Decide accept/reject/manual review | `MerchantAutoOrderService.makeOrderDecision` | `merchant-auto-order.service.ts` | Not usable (AI path) / Partial (rules) | AI decision is explicitly MOCK/TODO; rule checks exist but don’t update real order state. |
| Auto order: process | Apply decision (accept/reject/manual) | API: `POST /api/merchant/auto-order/process` | `MerchantAutoOrderService.processOrder` | Not usable | Explicit TODOs for updating status / notifications. |
| AI customer service: configure/get | Configure AI CS settings | API: `POST/GET /api/merchant/ai-customer/*` | `MerchantAICustomerService` | Partial | Config is in-memory `Map` (not persisted). |
| AI customer service: reply | Respond to customer message with actions | API: `POST /api/merchant/ai-customer/message` | `merchant-ai-customer.service.ts` | Not usable | Explicit TODO “integrate real AI model”; current reply is rule-based MOCK. |
| Auto marketing: configure/get | Set marketing strategies | API: `POST/GET /api/merchant/auto-marketing/*` | `MerchantAutoMarketingService` | Partial | Config in-memory; may be acceptable for demo but not production. |
| Auto marketing: trigger campaigns | Create campaigns/coupons | API: `POST /api/merchant/auto-marketing/trigger` | `merchant-auto-marketing.service.ts` | Not usable | Most “inputs” are MOCK (abandoned cart/new customers/etc). Needs real data sources + messaging delivery. |
| Webhook: send on paid | Notify merchant system on events | Internal service method | `WebhookHandlerService.handleOrderWebhook` | Partial | Webhook sending + retry exists; persistence of config/logs is TODO. |
| Webhook: configure/get/logs | Store configs + logs | API: `POST/GET /api/merchant/webhook/*` | `WebhookHandlerService` | Not usable | `getWebhookConfig` returns null; logs return empty; persistence is TODO. |
| **Product as Skill** | Convert products to AI Tools | API: `GET /api/products/skills` | `product.controller.ts` | **Commercial-ready** | UI for description/params done; Mapping logic supports OpenAI/MCP. |

## Frontend status
The standalone Merchant Agent wrapper exists (`frontend/components/agent/standalone/MerchantAgentApp.tsx`) but currently contains mostly placeholder panels (today stats are hard-coded `¥0.00`).

## Key commercial gaps
- Persist automation configs (auto-order, AI CS, auto-marketing, webhook config/logs).
- Replace MOCK AI behavior with real model routing + evaluation + safe-guarded actions.
- Ensure multi-tenant scoping for audit proofs and all merchant data access.
