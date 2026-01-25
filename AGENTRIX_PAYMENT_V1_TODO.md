# Agentrix 支付 V1.0 实施待办清单 (Todo List)

## 第一阶段：通用支付底座 (Layer A) 增强 ✅

### 1. 模型与状态机对齐 ✅
- [x] 更新 `PayIntent` 实体状态枚举，对齐 PRD。
- [x] 在 `PayIntent` 中增加 `mode` (sandbox/production) 支持。
- [x] 在 `PayIntent` 中增加 `idempotency_key` 支持。

### 2. Webhook 系统升级 ✅
- [x] 实现 Webhook HMAC 签名校验机制 (`WebhookService`)。
- [x] 开发 Webhook 自动重试逻辑（指数退避算法）。
- [x] 增加 Webhook 发送日志记录，方便商户调试。

### 3. 托管收银台 (Hosted Checkout) ✅
- [x] 开发独立托管的支付页面 `frontend/pages/pay/intent/[id].tsx`。
- [x] 实现支付成功/失败后的商户页面跳转逻辑。
- [x] 支持支付链接 (Payment Links) 的生成与管理。

### 4. 开发者基础设施 ✅
- [x] 实现 API Key 体系（区分 `agx_test_` 和 `agx_live_`）。
- [x] 开发沙箱环境 (Sandbox Mode)，模拟支付流程 (`PayIntentService` 模拟逻辑)。
- [x] 统一鉴权守卫 `UnifiedAuthGuard` (支持 JWT + API Key)。
- [x] 修复 `AgentModule` 中的 `ApiKeyGuard` 依赖注入问题。

## 第二阶段：Agent 编排增强 (Layer B) 落地 🏗️

### 5. Agent 注册与 EAS 身份背书 ✅
- [x] 实现 `AgentRegistry` 实体与管理接口。
- [x] 为 Agent 提供 API Key 鉴权机制。
- [x] 集成 EAS (Ethereum Attestation Service) SDK。
- [x] 实现 Agent 注册时的链上 Attestation 发布逻辑 (`EasService`)。

### 6. 授权与策略引擎 🏗️
- [ ] 实现 `Authorization` 实体，存储用户对 Agent 的授权（额度、有效期、范围）。
- [ ] 开发策略评估器 (Policy Evaluator)，在支付时自动校验 ERC8004 限额。

### 7. Agent 直接支付接口 (Agent Execute) 🏗️
- [ ] 开发 `POST /v1/agent/execute_payment` 接口。
- [ ] 实现“直接扣款”与“降级为用户确认”的逻辑分支。
- [x] 实现 `AuditProof` 链式审计证据逻辑 (Hash Chaining)。
- [x] 实现每日审计 Root 的链上锚定 (EAS Anchoring)。

## 附录：手动任务清单
- [ ] 完成 Web2 社交登录 (OAuth) 配置。详见 [AGENTRIX_PAYMENT_V1_MANUAL_TASKS.md](AGENTRIX_PAYMENT_V1_MANUAL_TASKS.md)
- [ ] 完成 EAS Schema 注册与环境变量配置。
- [ ] 执行数据库迁移 `npm run migration:run`。


## 第三阶段：商业化与线下场景 🏗️

### 8. 商户后台 (Console) 升级 ✅
- [x] 增加交易概览图表 `frontend/pages/merchants/dashboard.tsx`。
- [x] 实现订单与交易的 CSV 导出功能。
- [x] 增加 Webhook 配置与 API Key 管理界面 `frontend/pages/developers/console.tsx`。

### 9. 线下 QR 支付 🏗️
- [ ] 实现动态 QR 码生成接口。
- [ ] 为商户后台增加“收银员”角色，支持快速核销。

### 10. 归因与分润 🏗️
- [ ] 在订单中记录 `agent_id` 和 `channel`。
- [ ] 实现基础的分润计算逻辑与报表。

