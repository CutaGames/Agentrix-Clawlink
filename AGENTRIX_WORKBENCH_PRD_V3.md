# Agentrix 工作台产品需求文档 (PRD) V3.0

**日期**: 2026-01-05  
**状态**: 草案 (功能对齐版)  
**版本**: 3.0

---

## 1. 核心愿景
Agentrix 工作台是 AI Agent 生态系统的核心枢纽，旨在打通 AI Agent、商户和开发者之间的商业闭环。V3.0 的核心目标是在保持 2025.12.29 版本功能完整性的基础上，完成 UI 架构的现代化重构，确保“功能即服务，界面即任务”。

## 2. 角色与核心任务
- **个人用户 (User)**: 侧重于“任务达成”（赚钱、购物、支付、资产管理）。
- **商户 (Merchant)**: 侧重于“商业化”（商品技能化、订单管理、结算）。
- **开发者 (Developer)**: 侧重于“构建与分发”（技能开发、多平台打包、沙盒测试）。

## 3. 功能清单与完成情况对比 (2025.12.29 vs 当前)

### 3.1 用户端 (User Module)
| 功能模块 | 12.29 功能状态 | 当前版本状态 | API/后端对接 |
| :--- | :--- | :--- | :--- |
| **控制台 (Dashboard)** | 引导式清单 (Checklist) 已打通 | 仅 UI 框架，逻辑待迁移 | `userApi`, `agentApi` |
| **自动赚钱 (Earn)** | 空投发现与自动任务面板可用 | 仅 UI 占位 | `autoEarnApi`, `airdropApi` |
| **智能购物 (Shop)** | 订单跟踪与购物车逻辑完整 | 仅 UI 占位 | `orderApi`, `cartApi` |
| **支付管理 (Pay)** | 支付历史、订阅管理已对接 | 仅 UI 占位 | `paymentApi`, `subscriptionApi` |
| **资产管理 (Assets)** | MPC 钱包、多链余额显示正常 | 仅 UI 占位 | `walletApi`, `mpcWalletApi` |
| **安全中心 (Security)** | 策略引擎 (PolicyEngine) 已集成 | 仅 UI 占位 | `agentAuthorizationApi` |

### 3.2 商户端 (Merchant Module)
| 功能模块 | 12.29 功能状态 | 当前版本状态 | API/后端对接 |
| :--- | :--- | :--- | :--- |
| **商品管理 (Products)** | 完整 CRUD、分类、库存管理 | 仅 UI 占位 | `productApi` |
| **订单管理 (Orders)** | 状态流转、详情查看功能完善 | 仅 UI 占位 | `orderApi` |
| **结算中心 (Finance)** | 佣金计算、提现申请逻辑已通 | 仅 UI 占位 | `commissionApi` |
| **数据分析 (Analytics)** | 实时 GMV、转化率图表可用 | 仅 UI 占位 | `analyticsApi` |
| **开发者工具 (Dev Tools)** | API Key、Webhook 配置完整 | 仅 UI 占位 | `apiKeyApi`, `webhookApi` |
| **电商同步 (Sync)** | Shopify/WooCommerce 逻辑已通 | 仅 UI 占位 | `ecommerceApi` |

### 3.3 开发者端 (Developer Module)
| 功能模块 | 12.29 功能状态 | 当前版本状态 | API/后端对接 |
| :--- | :--- | :--- | :--- |
| **技能工厂 (Build)** | 技能注册表、多平台打包器可用 | 仅 UI 占位 | `skillApi`, `packApi` |
| **测试沙盒 (Sandbox)** | E2E 逻辑验证、日志查看可用 | 仅 UI 占位 | `sandboxApi` |
| **发布中心 (Publish)** | 市场发布流程已打通 | 仅 UI 占位 | `marketplaceApi` |
| **收益统计 (Revenue)** | 开发者分成、调用量统计正常 | 仅 UI 占位 | `statisticsApi` |

## 4. 核心功能需求 (功能恢复重点)

### 4.1 技能化转换 (Skillification)
- **需求**: 恢复商户商品一键转换为 OpenAI Actions/MCP 技能的功能。
- **关键点**: 必须确保后端 `SkillConverterService` 的调用在 V3 UI 中重新挂载。

### 4.2 授权与审计 (Authorization & Audit)
- **需求**: 恢复人类可读的审计回执和基于策略的 QuickPay 授权。
- **关键点**: 重新集成 `PolicyEngine` 和 `ReceiptsCenter`。

### 4.3 自动化任务 (Auto-Tasks)
- **需求**: 恢复空投自动领取和 DeFi 策略执行的交互界面。
- **关键点**: 确保 `AutoEarnPanel` 的状态管理与新 UI 兼容。

## 5. 验收标准
- **功能对齐**: 所有在 12.29 版本中可用的 API 调用必须在新 UI 中恢复。
- **数据一致性**: 切换角色或标签页时，数据加载状态和错误处理需保持一致。
- **性能**: 复杂列表（如订单、支付历史）的加载时间需优化。
