# 🎨 Agentrix 商户工作台 - UI 优化方案 V2.0

## **1. 核心理念：商品即技能 (Product as a Skill)**

### **1.1 什么是“商品即技能”？**
在 AI 时代，用户不再通过搜索框寻找商品，而是通过 AI Agent 表达意图（如：“帮我买一双适合跑步的鞋”）。
**商品即技能**意味着：商户上架的每一个商品，都会自动转化为 AI 可以理解并执行的“购买技能”。

### **1.2 核心优点**
- **AI 发现性 (AI Discoverability)**：商品不再是死的数据，而是带有 Input/Output 定义的原子能力，能被 ChatGPT/Claude 自动检索。
- **无缝支付 (Seamless Checkout)**：AI 可以直接调用 `buy_product` 技能，跳过繁琐的购物车流程，实现一键下单。
- **跨平台分发**：商户只需在 Agentrix 上架一次，商品就能出现在所有集成了 Agentrix MCP 的 AI 平台中。

### **1.3 应用场景**
- **智能导购**：用户在对话中询问：“最近有什么好书推荐？”，AI 直接调用 `search_books` 技能并展示购买按钮。
- **自动补货**：企业 Agent 监控库存，当纸张不足时，自动调用商户的 `order_office_supplies` 技能完成采购。

---

## **2. 商户工作台重构结构**

```
商户管理后台
├─ 📈 销售概览 (Sales Dashboard)
│   └─ AI 订单占比、转化率分析、实时收益
│
├─ 📦 商品与技能 (Products & Skills) ⭐ 核心
│   ├─ 商品列表 (自动同步为 Skill)
│   ├─ 技能预览 (查看 AI 如何描述你的商品)
│   └─ 批量导入 (Shopify/Amazon 同步)
│
├─ 🤖 AI 导购配置 (AI Sales Agent)
│   ├─ 知识库上传 (商品手册、FAQ)
│   └─ 话术风格设置
│
├─ 💳 财务与结算 (Finance)
│   ├─ 统一收款账户 (支持多链 USDC/法币)
│   └─ 自动分账设置
│
└─ 🛠️ 开发者集成 (Integration)
    ├─ API Keys & Webhooks
    └─ 插件市场 (一键集成到 Telegram/Discord)
```

---

## **3. 开发任务清单**

### **P0: 商品-技能自动同步 (后端)**
- [x] ✅ 实现 `Product` 变更时自动更新 `Skill` 表的 Hook - 已在 SkillService 中实现
- [x] ✅ 优化 `Product` 的 JSON Schema 生成逻辑 - Skill Entity 支持完整的 JSON Schema

### **P1: 商户 AI 仪表盘 (前端)**
- [x] ✅ 商户工作台已实现完整的17个标签功能模块
  - 📋 上线清单、📦 商品管理、📊 订单管理、💰 结算中心
  - 📈 数据分析、🔑 API Keys、🔗 Webhooks、🔍 审计日志
  - ⚙️ 设置、🛒 电商配置、📤 批量导入、👛 MPC钱包
  - 💳 出金管理、📚 集成指南、📜 订阅管理、🎨 收银台配置、📣 推广中心
- [ ] 增加"技能健康度"检查功能（待实现）
- [ ] AI 订单来源分析图表（待实现）

### **当前实现状态（2026年1月）**
```typescript
// MerchantModule.tsx 包含以下完整标签：
initialTab?: 'checklist' | 'products' | 'orders' | 'settlement' | 'analytics' 
  | 'api_keys' | 'webhooks' | 'audit' | 'settings' | 'ecommerce' 
  | 'batch_import' | 'mpc_wallet' | 'off_ramp' | 'integration_guide' 
  | 'subscriptions' | 'checkout_config' | 'promotion'
```

---

# 🛠️ Agentrix 开发者工作台 - UI 优化方案 V2.0

## **1. 核心理念：技能工厂 (Skill Factory)**

### **1.1 什么是“技能工厂”？**
开发者不再只是写代码，而是在生产“AI 零件”。**技能工厂**提供从开发、调试、发布到变现的全生命周期工具。

### **1.2 核心优点**
- **标准化**：统一的 MCP/OpenAI 协议适配，写一次代码，适配所有模型。
- **即时变现**：内置按次计费（Pay per Call）逻辑，开发者无需关心支付集成。
- **生态联动**：开发者的 Skill 可以被其他 Agent 组合使用，形成能力网络。

### **1.3 应用场景**
- **API 封装器**：将现有的天气、地图、金融 API 封装为 Skill 赚取佣金。
- **自定义逻辑**：开发特定的 DeFi 策略 Skill，供个人 Agent 调用。

---

## **2. 开发者工作台重构结构**

```
开发者中心（已实现）
├─ 🛠️ 技能开发 (Skill Builder)
│   ├─ 技能注册表 (Skill Registry) ✅
│   ├─ 技能包中心 (Pack Center) ✅
│   └─ 测试沙盒 (Test Harness) ✅
│
├─ 📊 收益中心 (Revenue) ✅
│   ├─ 调用量统计 (Call Count)
│   └─ 佣金结算明细
│
├─ 🤖 Agent 管理 ✅
│   └─ Agent 列表、状态管理、发布控制
│
├─ 📦 技能包管理 (Skill Packs) ✅
│   └─ 组合多个 Skill 形成行业解决方案
│
├─ 🏪 技能市场 (Marketplace) ✅
│   └─ 浏览和购买其他开发者的 Skill
│
└─ 🔧 开发者工具 ✅
    ├─ API 统计、Webhooks 配置
    ├─ 日志查看、模拟器
    └─ API Keys 管理、推广中心
```

---

## **3. 开发任务清单**

### **P0: 调试沙盒 (前端)**
- [x] ✅ 实现在线调试器 - TestHarness 组件已完成
- [x] ✅ 支持输入 JSON 参数并查看 Skill 执行结果
- [x] ✅ Schema 校验工具 - 在 SkillRegistry 中实现

### **P1: 计费与分账逻辑 (后端)**
- [x] ✅ 完善 `SkillService` 中的技能使用记录
- [x] ✅ 实现 `SkillExecutorService` 执行技能调用
- [ ] ⏳ 对接 `PaymentService` 实现自动结算（开发中）
- [ ] 📋 实现开发者提现功能（待实现）

### **当前实现状态（2026年1月）**
```typescript
// DeveloperModule.tsx 包含以下完整标签：
initialTab?: 'checklist' | 'api' | 'revenue' | 'agents' | 'code' 
  | 'webhooks' | 'logs' | 'simulator' | 'settings' | 'skills' 
  | 'packs' | 'marketplace' | 'promotion'

// 核心组件已实现：
// - SkillRegistry: 技能注册与Schema编辑 ✅
// - PackCenter: 技能包管理 ✅
// - TestHarness: 调试沙盒 ✅
// - Revenue Dashboard: 收益统计 ✅
// - API Keys & Webhooks: 集成工具 ✅
```

---

## **4. 架构与组件总结**

### **后端实现**
- **Skill Entity** (`backend/src/entities/skill.entity.ts`)
  - 支持完整的 MCP Tool Schema
  - `skillType`: 'http' | 'internal' | 'composite'
  - `category`: SkillCategory 枚举分类
  - 版本管理和发布状态控制

- **Skill Service** (`backend/src/modules/skill/skill.service.ts`)
  - CRUD 操作、搜索、分类
  - 技能调用统计
  - 费用计算和记录

- **Skill Executor** (`backend/src/modules/skill/skill-executor.service.ts`)
  - HTTP 技能执行
  - Internal 技能执行
  - Composite 技能编排

- **MCP Service** (`backend/src/modules/mcp/mcp.service.ts`)
  - MCP 协议实现
  - Tool discovery
  - ChatGPT/Claude 集成

### **前端实现**
- **SkillManagementPanel** (`frontend/components/agent/SkillManagementPanel.tsx`)
  - 技能列表展示、创建/编辑、Schema 可视化

- **SkillRegistry** (`frontend/components/workspace/SkillRegistry.tsx`)
  - 可视化 Schema 编辑器、参数验证、实时预览

- **Unified Workspace** (`frontend/components/agent/workspace/`)
  - **UserModule**: 13个标签 - 个人用户完整功能
  - **MerchantModule**: 17个标签 - 商户完整功能
  - **DeveloperModule**: 13个标签 - 开发者完整功能

---

## **5. 下一步优化方向**

### **短期目标（Q1 2026）**
1. [ ] 完善技能市场搜索和过滤功能
2. [ ] 实现技能评分和评论系统
3. [ ] 添加技能使用示例和文档
4. [ ] 优化开发者收益结算流程

### **中期目标（Q2-Q3 2026）**
1. [ ] AI 辅助技能开发（根据描述自动生成 Schema）
2. [ ] 技能组合推荐引擎
3. [ ] 跨平台技能分发（Telegram Bot、Discord Bot）
4. [ ] 技能性能监控和优化建议

### **长期愿景**
- 建立 Agentrix 技能生态系统
- 成为 AI Agent 的能力中心和技能市场
- 实现"商品即技能"的完整闭环
- [ ] 实现开发者提现功能。
