# PayMind Agent API真实对接情况与待完成工作

## 📊 API真实对接情况

### ✅ 已真实对接API的功能

#### 1. P0功能（100%真实API）
所有P0功能都通过真实的后端服务调用：

| 功能 | API服务 | 状态 |
|------|---------|------|
| **费用估算** | `FeeEstimationService` | ✅ 真实API |
| **风险评估** | `RiskAssessmentService` | ✅ 真实API |
| **KYC状态查询** | `KYCReuseService` | ✅ 真实API |
| **KYC复用检查** | `KYCReuseService` | ✅ 真实API |
| **商户信任度** | `MerchantTrustService` | ✅ 真实API |
| **支付记忆** | `PaymentMemoryService` | ✅ 真实API |
| **订阅管理** | `SubscriptionService` | ✅ 真实API |
| **预算管理** | `BudgetService` | ✅ 真实API |
| **交易分类** | `TransactionClassificationService` | ✅ 真实API |
| **多链余额查询** | `MultiChainAccountService` | ✅ 真实API |
| **对账** | `ReconciliationService` | ✅ 真实API |
| **结算规则** | `SettlementRulesService` | ✅ 真实API |
| **Webhook配置** | `WebhookHandlerService` | ✅ 真实API |
| **自动发货** | `AutoFulfillmentService` | ✅ 真实API |

#### 2. Agent核心功能（100%真实API）

| 功能 | API端点 | 状态 |
|------|---------|------|
| **Agent对话** | `POST /agent/chat` | ✅ 真实API |
| **商品搜索** | `POST /agent/search-products` | ✅ 真实API |
| **服务搜索** | `POST /agent/search-services` | ✅ 真实API |
| **链上资产搜索** | `POST /agent/search-onchain-assets` | ✅ 真实API |
| **自动下单** | `POST /agent/create-order` | ✅ 真实API |
| **订单查询** | `GET /agent/orders` | ✅ 真实API |
| **退款处理** | `POST /agent/refund` | ✅ 真实API |
| **代码生成** | `POST /agent/generate-code` | ✅ 真实API |
| **会话管理** | `GET /agent/sessions` | ✅ 真实API |

#### 3. 用户/商户/开发者模块（真实API + Fallback Mock）

| 功能 | API端点 | 状态 | Mock情况 |
|------|---------|------|----------|
| **支付历史** | `GET /user-agent/payments` | ✅ 真实API | ⚠️ 有Fallback Mock |
| **钱包列表** | `GET /wallets` | ✅ 真实API | ⚠️ 有Fallback Mock |
| **商品管理** | `GET /products` | ✅ 真实API | ⚠️ 有Fallback Mock |
| **订单管理** | `GET /orders` | ✅ 真实API | ⚠️ 有Fallback Mock |
| **API统计** | `GET /statistics/api` | ✅ 真实API | ⚠️ 有Fallback Mock |
| **收益查看** | `GET /statistics/revenue` | ✅ 真实API | ⚠️ 有Fallback Mock |
| **Agent列表** | `GET /user-agent/my-agents` | ✅ 真实API | ⚠️ 有Fallback Mock |

**说明**：Fallback Mock仅在API调用失败（非401错误）时使用，确保用户体验。

### ⚠️ 使用Mock数据的功能（需要开发）

#### 1. 新添加的对话功能（目前返回Mock数据）

| 功能 | 位置 | 状态 | 需要对接的API |
|------|------|------|--------------|
| **账单助手** | `handleBillAssistant` | ⚠️ Mock数据 | 需要账单分析API |
| **钱包管理（对话）** | `handleWalletManagement` | ⚠️ Mock数据 | 已有钱包API，需要集成 |
| **自动购买** | `handleAutoPurchase` | ⚠️ Mock数据 | 需要订阅优化API |
| **风控提醒** | `handleRiskAlert` | ⚠️ Mock数据 | 已有风险评估API，需要集成 |
| **收款管理（对话）** | `handlePaymentCollection` | ⚠️ Mock数据 | 需要支付链接生成API |
| **订单分析（对话）** | `handleOrderAnalysis` | ⚠️ Mock数据 | 需要订单分析API |
| **SDK生成器（对话）** | `handleSDKGenerator` | ⚠️ Mock数据 | 需要SDK生成API |
| **API助手（对话）** | `handleAPIAssistant` | ⚠️ Mock数据 | 需要API文档API |

**说明**：这些功能在对话中返回的是硬编码的Mock数据，需要对接真实的后端服务。

## 📋 待完成工作清单

### 🔴 P0 - 必须完成（上线前）

#### 1. 完善新功能的真实API集成

**优先级**：🔴 最高

- [ ] **账单助手API集成**
  - 位置：`backend/src/modules/agent/agent-p0-integration.service.ts:handleBillAssistant`
  - 需要：创建账单分析服务或集成现有支付历史API
  - 工作量：2-3天

- [ ] **钱包管理API集成**
  - 位置：`backend/src/modules/agent/agent-p0-integration.service.ts:handleWalletManagement`
  - 需要：集成现有的`walletApi.list()`和`MultiChainAccountService`
  - 工作量：1天

- [ ] **风控提醒API集成**
  - 位置：`backend/src/modules/agent/agent-p0-integration.service.ts:handleRiskAlert`
  - 需要：集成现有的`RiskAssessmentService`，添加异常交易查询
  - 工作量：1-2天

- [ ] **收款管理API集成**
  - 位置：`backend/src/modules/agent/agent-p0-integration.service.ts:handlePaymentCollection`
  - 需要：集成支付链接生成API（`PaymentLinkService`）
  - 工作量：1-2天

- [ ] **订单分析API集成**
  - 位置：`backend/src/modules/agent/agent-p0-integration.service.ts:handleOrderAnalysis`
  - 需要：创建订单分析服务或集成现有订单API
  - 工作量：2-3天

#### 2. Agent Builder优化

**优先级**：🔴 最高

- [ ] **可视化工作流编辑器**
  - 位置：`paymindfrontend/components/agent/builder/`
  - 需要：实现拖拽式工作流编辑器
  - 功能：
    - 节点类型：Intent、Action、Decision、Wait、Loop、Webhook、Notify
    - 节点配置：参数、超时、重试策略
    - 导入/导出JSON（DSL）
  - 工作量：5-7天

- [ ] **Agent导出功能**
  - 位置：`paymindfrontend/components/agent/builder/AgentGenerator.tsx`
  - 需要：实现导出为独立运行的能力
  - 功能：
    - 导出为Docker镜像
    - 导出为Serverless函数（AWS Lambda/Cloud Run）
    - 导出为Edge Worker
    - 包含：Agent二进制、env示例、Webhook配置、监控配置、Dockerfile、部署脚本
  - 工作量：3-5天

- [ ] **独立Agent界面生成**
  - 位置：`paymindfrontend/components/agent/builder/`
  - 需要：根据Agent类型生成对应的独立界面
  - 功能：
    - 个人Agent界面：参考`UserModule`的功能
    - 商家Agent界面：参考`MerchantModule`的功能
    - 开发者Agent界面：参考`DeveloperModule`的功能
    - 独立运行，不依赖PayMind工作台
  - 工作量：5-7天

- [ ] **Agent部署选项**
  - 位置：`paymindfrontend/components/agent/builder/AgentGenerator.tsx`
  - 需要：完善部署选项
  - 功能：
    - 托管在PayMind Cloud（SaaS模式）
    - 导出为Docker镜像（自托管）
    - 导出为Serverless函数
    - 部署状态跟踪
    - 部署日志查看
  - 工作量：2-3天

#### 3. 模板库扩展

**优先级**：🟡 中

- [ ] **预置模板完善**
  - 位置：`backend/src/modules/agent/agent-template.service.ts`
  - 需要：添加更多预置模板
  - 模板类型：
    - Auto-Shopper（自动购物）
    - Airdrop-Farmer（空投农场）
    - DCA-Investor（定投策略）
    - Merchant-AutoResponder（商户自动响应）
    - Launchpad-Manager（Launchpad管理）
    - NFT-Reseller（NFT转售）
  - 工作量：3-5天

### 🟡 P1 - 应该完成（增强体验）

#### 1. 功能完善

- [ ] **订阅优化API**
  - 位置：`backend/src/modules/user-agent/subscription.service.ts`
  - 需要：实现订阅优化算法
  - 工作量：2-3天

- [ ] **账单分析API**
  - 位置：`backend/src/modules/user-agent/`
  - 需要：创建账单分析服务
  - 工作量：3-4天

- [ ] **订单分析API**
  - 位置：`backend/src/modules/merchant/`
  - 需要：创建订单分析服务
  - 工作量：3-4天

- [ ] **SDK生成API**
  - 位置：`backend/src/modules/agent/`
  - 需要：实现多语言SDK生成
  - 工作量：4-5天

#### 2. UI/UX优化

- [ ] **结构化数据交互**
  - 位置：`paymindfrontend/components/agent/StructuredResponseCard.tsx`
  - 需要：添加交互功能（点击、展开、操作按钮）
  - 工作量：2-3天

- [ ] **错误处理和重试**
  - 位置：所有API调用处
  - 需要：统一错误处理，添加重试机制
  - 工作量：2-3天

### 🟢 P2 - 可以完成（优化）

- [ ] **长期记忆功能**
- [ ] **工作流编排**
- [ ] **多模态理解**
- [ ] **性能优化**

## 📊 工作量估算

### 总工作量

| 优先级 | 任务数 | 预估工作量 | 累计 |
|--------|--------|-----------|------|
| **P0（必须）** | 12个任务 | 25-35天 | 25-35天 |
| **P1（应该）** | 6个任务 | 16-22天 | 41-57天 |
| **P2（可以）** | 3个任务 | 10-15天 | 51-72天 |

### 上线前必须完成（P0）

**预计工作量：25-35个工作日（5-7周）**

1. **新功能API集成**：8-12天
2. **Agent Builder优化**：15-22天
   - 可视化工作流编辑器：5-7天
   - Agent导出功能：3-5天
   - 独立Agent界面生成：5-7天
   - 部署选项完善：2-3天

## 🎯 Agent Builder优化方案

### 1. 可视化工作流编辑器

**实现方案**：
- 使用React Flow或类似库实现拖拽式编辑器
- 支持节点类型：Intent、Action、Decision、Wait、Loop、Webhook、Notify
- 节点配置面板：参数、超时、重试策略
- 工作流验证：检查连接、循环检测
- 导入/导出JSON（DSL）

**文件位置**：
- `paymindfrontend/components/agent/builder/WorkflowEditor.tsx`（新建）
- `paymindfrontend/components/agent/builder/WorkflowNode.tsx`（新建）
- `paymindfrontend/components/agent/builder/WorkflowConfigPanel.tsx`（新建）

### 2. Agent导出功能

**实现方案**：
- 后端API：`POST /agent/export`
  - 参数：agentId、exportType（docker/serverless/edge）
  - 返回：下载链接或部署包
- 前端实现导出按钮和选项
- 生成包含所有依赖的完整部署包

**文件位置**：
- `backend/src/modules/agent/agent-export.service.ts`（新建）
- `paymindfrontend/components/agent/builder/AgentExportPanel.tsx`（新建）

### 3. 独立Agent界面生成

**实现方案**：
- 根据Agent类型生成对应的React组件
- 个人Agent：集成账单助手、支付助手、钱包管理等功能
- 商家Agent：集成收款管理、订单分析、风控中心等功能
- 开发者Agent：集成SDK生成器、API助手、沙盒调试等功能
- 独立运行：不依赖PayMind工作台，可以嵌入任何网站

**文件位置**：
- `paymindfrontend/components/agent/standalone/PersonalAgentApp.tsx`（新建）
- `paymindfrontend/components/agent/standalone/MerchantAgentApp.tsx`（新建）
- `paymindfrontend/components/agent/standalone/DeveloperAgentApp.tsx`（新建）

## 📝 下一步行动

### 立即开始（本周）

1. ✅ **完善新功能的真实API集成**
   - 优先：钱包管理、风控提醒（已有API，只需集成）
   - 其次：账单助手、订单分析（需要创建新服务）

2. ✅ **开始Agent Builder优化**
   - 先实现可视化工作流编辑器的基础框架
   - 再实现Agent导出功能
   - 最后实现独立Agent界面生成

### 下周计划

1. 完成所有P0任务的50%
2. 测试和优化已完成功能
3. 准备上线检查清单

