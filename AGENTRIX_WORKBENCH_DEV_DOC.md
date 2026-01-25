# Agentrix 工作台开发文档

**日期**: 2026-01-05  
**版本**: 2.0 (实现) / 3.0 (设计)

---

## 1. 前端架构与功能恢复策略

### 1.1 组件结构
- **统一入口**: `frontend/components/agent/workspace/UnifiedWorkspace.tsx`
  - 负责角色切换 (`AgentModeContext`) 和命令处理 (`CommandHandler.ts`)。
- **模块视图 (V2/V3 架构)**:
  - `UserModuleV2.tsx`: 实现 9 标签页层级结构。
  - `MerchantModuleV2.tsx`: 商户任务专用视图。
  - `DeveloperModuleV2.tsx`: 开发者工具专用视图。
- **功能恢复源 (V1 逻辑)**:
  - `UserModule.tsx` (12.29 版): 包含支付、钱包、KYC、订单的完整 API 调用逻辑。
  - `MerchantModule.tsx` (12.29 版): 包含商品 CRUD、结算、分析、Shopify 同步的复杂逻辑。
  - `DeveloperModule.tsx` (12.29 版): 包含技能注册、打包、沙盒测试的集成逻辑。

### 1.2 状态管理
- `UserContext`: 处理身份验证、个人资料和角色权限。
- `AgentModeContext`: 管理当前激活的角色模式（个人、商户、开发者）。
- `Web3Context`: 负责多链钱包连接与交互。

## 2. 后端核心模块与 API 状态

### 2.1 核心服务
- **技能模块 (`backend/src/modules/skill`)**:
  - `SkillConverterService`: 负责将内部技能定义转换为 OpenAPI/MCP/Gemini Schema。
  - **状态**: 后端已就绪，前端 V3 需重新挂载调用。
- **Agent 模块 (`backend/src/modules/agent`)**:
  - `AgentService`: 生命周期管理。
  - `AgentAuthorizationService`: 管理权限与 Mandates。
  - **状态**: 接口稳定，前端 V3 需恢复授权管理界面。
- **支付与结算 (`backend/src/modules/payment`, `commission`)**:
  - 处理 Stripe/Transak 支付及商户分佣。
  - **状态**: 12.29 版已验证可用，前端 V3 需恢复支付历史与结算面板。

### 2.2 关键 API 端点
- `GET /api/products`: 获取商户商品列表。
- `POST /api/skills/pack`: 打包技能至指定生态。
- `GET /api/payments/history`: 获取用户支付记录。
- `POST /api/mcp/sse`: MCP 连接端点。

## 3. 功能恢复路线图 (API 重新挂载)

### 3.1 第一步：逻辑迁移
从 12.29 版的 `MerchantModule.tsx` 中提取 `useEffect` 数据加载逻辑和 `handleSave` 等交互函数，迁移至 `MerchantModuleV2.tsx`。

### 3.2 第二步：组件复用
直接在 V3 视图中引用已成熟的面板组件：
- `MyAgentsPanel.tsx`
- `SkillManagementPanel.tsx`
- `AutoEarnPanel.tsx`
- `PromotionPanel.tsx`

### 3.3 第三步：联调验证
确保每个标签页下的“占位符”被真实的 API 调用和数据展示组件替换，并进行 E2E 测试。

## 4. 测试与质量保证
- **回归测试**: 重点测试 12.29 版本中已跑通的支付流和技能打包流。
- **沙盒验证**: 在 `DeveloperModuleV2` 中恢复沙盒环境，确保开发者可实时调试。
