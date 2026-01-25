# 商户端 - 开发者功能清单

本文件面向开发人员与维护者，汇总当前代码库中已实现的商户端（Merchant）后端服务、关键前端页面与对应路由/端点、以及实现细节与待办建议。

**快速说明**: 本项目将外部电商平台/第三方商品字段（如 images、sku、originalPrice）存放在 `Product.metadata` 中，避免改动数据库表结构。

**后端模块（主要服务）**
- **MerchantController**: 路由聚合，包含自动接单、AI客服、自动营销、Webhook、履约、对账/结算等端点。文件: `backend/src/modules/merchant/merchant.controller.ts`。
- **MerchantProfileService**: 获取与更新商户资料（含默认 profile 创建）。文件: `backend/src/modules/merchant/merchant-profile.service.ts`。
- **MerchantAutoOrderService**: 自动接单决策与流程，包含配置管理、风险评分与 mock AI 规则。文件: `backend/src/modules/merchant/merchant-auto-order.service.ts`。
- **MerchantAICustomerService**: AI 客服对话处理、会话持久化、建议动作（如产品推荐、退款、转人工）。文件: `backend/src/modules/merchant/merchant-ai-customer.service.ts`。
- **MerchantAutoMarketingService**:（如存在）自动营销规则、计划触发与配置接口。
- **MultiChainAccountService**: 汇总多链账户余额与支付记录，按链/币种聚合。文件: `backend/src/modules/merchant/multi-chain-account.service.ts`。
- **ReconciliationService**: 对账逻辑，按时间范围统计并输出 ReconciliationRecord（差额/未匹配项）。文件: `backend/src/modules/merchant/reconciliation.service.ts`。

**Product / 电商对接相关（商品管理）**
- **ProductBatchImportService / Controller**: 批量导入商品，支持 CSV/Excel 等（文件: `backend/src/modules/product/product-batch-import.*`）。
- **EcommerceSyncService / Controller**: 管理外部电商平台同步、映射规则、导入映射（将外部字段写入 `Product.metadata`），并提供前端页面同步操作。文件: `backend/src/modules/product/ecommerce-sync.*`。
- **ProductReviewService / Controller**: 商户提交与管理员审核流程、自动规则（如基于某些条件自动拒审/通过）。文件: `backend/src/modules/product/product-review.*`。

**Admin 相关（管理端）**
- **Admin ProductManagementService**: 管理端的商品管理接口（编辑、下架/上架、审核记录查询等）。文件: `backend/src/modules/admin/services/product-management.service.ts`。
- Admin Controller & Module: 将管理接口通过 `admin/` 路由暴露，并在 `admin.module.ts` 中注册。文件: `backend/src/modules/admin/admin.controller.ts`。

**前端页面（主要路径 & 功能）**
- `frontend/pages/app/merchant/index.tsx` — 商户仪表盘（概览、统计、最近订单）。
- `frontend/pages/app/merchant/products.tsx` — 商品管理（列表、搜索、跳转到编辑/上架）。
- `frontend/pages/app/merchant/batch-import.tsx` — 批量导入页面（上传文件、状态反馈）。
- `frontend/pages/app/merchant/ecommerce-sync.tsx` — 电商平台同步管理（映射配置、触发导入）。
- `frontend/pages/app/merchant/orders.tsx` — 订单管理页面（列表、详情）。
- `frontend/pages/app/merchant/profile.tsx` — 商户信息与支付设置。
- `frontend/pages/admin/products.tsx` — 管理端商品列表与操作。
- `frontend/pages/admin/product-review.tsx` — 管理端审核页面。

**关键 API 端点（示例）**
- `GET /merchant/profile` — 获取当前商户资料。
- `POST /merchant/profile` — 更新商户资料。
- `POST /merchant/auto-order/configure` — 配置自动接单策略。
- `POST /merchant/ai-customer/message` — 发送客户消息并获取 AI 回复。
- `POST /product/ecommerce-sync/import` — 触发电商平台商品导入/映射。
- `POST /product/batch-import` — 上传并导入批量商品文件。
- `GET /admin/products` — 管理端获取商品列表。
- `POST /admin/products/:id/approve` — 管理端审核通过商品（示例）。

（注）实际路径与参数请参考对应 `*.controller.ts` 文件中定义的路由签名。

**实现细节 / 约定**
- 外部平台字段统一写入 `Product.metadata`（JSON），前端和业务逻辑需从 `metadata` 读取 `images`, `sku`, `originalPrice` 等值。
- 自动化服务（自动接单、AI 客服、自动营销）目前使用 mock/规则引擎实现，真实 AI 接入（外部 LLM/对话服务）为后续任务。

**已知问题与改进建议（待办）**
- 添加并统一使用角色与权限守卫（`UserRole.ADMIN`, `RolesGuard`）以保护管理端接口。当前部分控制器直接使用简化鉴权。建议实现集中化 `RolesGuard` 并覆盖 `admin/` 路由。
- 将长时间运行的导入/同步任务（`ecommerce-sync`, `batch-import`）移动到后台队列（如 Bull / Redis），避免 HTTP 超时并提供重试/进度查询接口。
- 增加端到端测试覆盖：自动接单、AI 客服对话流程、对账结果的回归测试。
- 增加更多日志与监控：导入失败原因、同步统计、对账异常告警。

**参考文件**
- 后端控制器/服务所在路径（示例）:
  - `backend/src/modules/merchant/`*
  - `backend/src/modules/product/`*
  - `backend/src/modules/admin/`*

如需我把每个 controller 的完整路由和 DTO 列举到本文件里，我可以继续扫描并把详细 API 表（含请求/响应示例）追加进来。
# 商户后台功能说明（最新）

版本：feat/smartcheckout-layout（2025-12-11）

概述
- 本文档面向开发/运维与产品经理，说明当前商户后台（Merchant Dashboard）及相关管理员功能的完成情况、实现位置、重要 API 及已知问题与建议。

完成情况总览
- 批量导入（CSV / JSON）: 已完成
  - 功能：下载 CSV 模板、上传 CSV/JSON、解析预览、选择导入模式（create/upsert）、执行导入并返回统计与错误日志。
  - 前端页面：`frontend/pages/app/merchant/batch-import.tsx`
  - 后端：`backend/src/modules/product/product-batch-import.controller.ts`、`backend/src/modules/product/product-batch-import.service.ts`

- 电商平台同步（Ecommerce Sync）：已完成（基础实现 + 前端管理）
  - 功能：管理外部平台连接（Shopify、WooCommerce、Magento、BigCommerce、自定义 API）、手动/自动同步、生成同步映射（ProductSyncMapping）、将外部数据入库（存储在 `metadata` 中）。
  - 前端页面：`frontend/pages/app/merchant/ecommerce-sync.tsx`
  - 后端：`backend/src/modules/product/ecommerce-sync.service.ts`、`backend/src/modules/product/ecommerce-sync.controller.ts`
  - 注意：外部字段（images/sku/originalPrice 等）目前存入 `Product.metadata`，产品实体未新增单独字段以避免频繁迁移。

- 商品审核流程（Product Review）：已完成（服务 + 控制器 + 管理页面）
  - 功能：商户提交审核 → 系统自动审核（打分/问题检测）→ 管理员人工审核（通过/拒绝/请求修改）
  - 前端（管理员）：`frontend/pages/admin/product-review.tsx`
  - 后端：`backend/src/modules/product/product-review.service.ts`、`backend/src/modules/product/product-review.controller.ts`
  - 审核记录与快照：审核记录保存商品快照和自动审核结果，管理员可查看、批量审核。

- 管理员商品管理：已完成（页面 + API）
  - 功能：平台商品汇总（筛选、搜索、分页）、统计、上架/下架、删除、查看详情、按类型分布。
  - 前端：`frontend/pages/admin/products.tsx`
  - 后端：`backend/src/modules/admin/services/product-management.service.ts`、`backend/src/modules/admin/admin.controller.ts`（已新增端点）

实现细节与关键文件
- Product 实体（关键字段）：`backend/src/entities/product.entity.ts`
  - 重要说明：外部平台字段（images、sku、originalPrice）采用 `metadata` 存储（访问示例：`product.metadata.images`）。
  - 审核字段：`reviewedBy`, `reviewedAt`, `reviewNote`, `syncSource`, `externalId`, `lastSyncAt`。

- 前端布局与入口
  - 商户侧 Dashboard 布局：`frontend/components/layout/DashboardLayout.tsx`
  - 管理后台布局：`frontend/components/admin/AdminLayout.tsx`（已添加菜单项：`商品管理`、`商品审核`）

后端主要 API（摘要）
- 批量导入
  - `GET  /products/batch/template` — 下载模板
  - `POST /products/batch/preview` — 解析并返回预览
  - `POST /products/batch/import` — 按 JSON 执行导入
  - `POST /products/batch/import/csv` — 上传 CSV 并导入

- 电商同步
  - `GET  /products/ecommerce/connections` — 列表
  - `POST /products/ecommerce/connections` — 创建连接
  - `PATCH /products/ecommerce/connections/:id` — 更新（启用/停用）
  - `DELETE /products/ecommerce/connections/:id` — 删除
  - `POST /products/ecommerce/connections/:id/sync` — 手动触发同步

- 审核
  - `POST /products/review/submit` — 商户提交审核
  - `GET  /products/review/merchant/list` — 商户的审核记录
  - `GET  /products/review/:id` — 审核详情
  - 管理员端：`GET /products/review/admin/list`, `POST /products/review/admin/action`, `POST /products/review/admin/batch`, `GET /products/review/admin/stats`

- 管理员商品管理
  - `GET  /admin/products` — 列表
  - `GET  /admin/products/stats` — 统计
  - `GET  /admin/products/categories` — 分类列表
  - `GET  /admin/products/:id` — 详情
  - `PATCH /admin/products/:id/status` — 更新状态
  - `POST  /admin/products/batch-status` — 批量更新状态
  - `DELETE /admin/products/:id` — 删除（软删除）

测试 / 构建验证（快速命令，WSL 环境）
- 前端
```
# 在 PowerShell 中运行 WSL 命令
wsl -d Ubuntu-24.04 -e bash -c "cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/frontend && npm install && npm run build"
```
- 后端
```
wsl -d Ubuntu-24.04 -e bash -c "cd /mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/backend && npm install && npm run build"
```

已知问题与注意事项
- `UserRole` 中当前未包含 `ADMIN` 枚举：若要做细粒度角色守卫（RolesGuard），推荐在 `backend/src/entities/user.entity.ts` 中扩展 `UserRole.ADMIN` 并实现 `RolesGuard`、`Roles` 装饰器。当前管理员权限主要通过单独的 admin_token 或路由层面控制。
- Product 实体选择将外部字段放入 `metadata`，这可降低迁移成本，但需要在文档中明确定义 `metadata` 的 schema。
- 电商同步为同步逻辑的基础实现，建议将长时同步任务移到后台队列（Bull）并提供进度接口，以避免 HTTP 请求超时。

下一步建议（可选）
- 1) 将 `metadata` 结构定义为 TS 接口并在实体注释或 docs 中固定 schema。  
- 2) 补充 `UserRole.ADMIN` 与 `RolesGuard`，保护管理员端点。  
- 3) 为电商同步实现队列与 webhook 支持（Shopify）  

如果你希望我把这份文档放到仓库其他位置或转换为中文/英文双语版，我可以继续更新。
