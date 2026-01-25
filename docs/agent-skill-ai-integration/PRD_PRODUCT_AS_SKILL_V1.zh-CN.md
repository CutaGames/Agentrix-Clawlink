# PRD：Everything as a Skill（万物即技能）— V2.0

## 1. 理念定义
"Everything as a Skill" 是 Agentrix 核心的商业与技术架构。它将传统的商业流程（商品、支付、开户、营销、结算）解构为 AI 可直接调用的原子化能力（Skills/Tools）。

- **从 Product as Skill 到 Service as Skill**：不再局限于“卖货”，而是将 Agentrix 提供的所有金融与商业基础设施（入金、开户、自动赚钱、空投等）全部“技能化”。
- **AI 原生交互**：用户在 ChatGPT/Claude 等对话框中，通过自然语言直接驱动复杂的商业工作流（如：开户 -> 法币充值 -> 自动配置策略 -> 持续购买）。

## 2. 核心价值
1. **全链路闭环**：在 AI 生态内完成从身份识别、钱包开通到最终支付的完整动作，无需跳出。
2. **零门槛进入**：通过 MPC 钱包与 Transak 集成，法币用户可无感进入 Web3 商业生态。
3. **高频自动化**：基于 X402 协议与 Policy Engine，实现由 AI 驱动的高频、小额、自动执行业务。

## 3. 功能矩阵 (Skill Set)

### 3.1 基础设施类 (Infrastructure Skills)
- **`wallet_onboarding`**：JIT (Just-In-Time) 开通 MPC 托管钱包。
- **`onramp_fiat`**：通过 Transak 提供法币入金能力卡片。
- **`agent_authorize`**：在对话中设置单次/单日消费限额与策略。
- **`balance_query`**：聚合查询多链资产与订单状态。

### 3.2 商业零售类 (Retail & SKU Skills)
- **通用电商工具**：`search_products`, `get_product_details`, `create_order`。
- **X402 原生 SKU**：支持按次 (Pay-per-use)、按量 (Metered) 计费的功能性 Skill 映射。
- **自动映射引擎**：基于商户 SKU 自动生成动态 OpenAPI Tool Schema。

### 3.3 增值服务类 (Growth & Dev Skills)
- **营销工具**：`airdrop_discovery`, `claim_rewards`。
- **商户看板工具**：`sales_analytics`, `payout_summary`。
- **开发者工具**：`generate_api_key`, `verify_webhook`。

## 4. 关键技术实现

### 4.1 身份与钱包 (JIT Identity)
- **OAuth 绑定**：利用 ChatGPT Action OAuth，通过邮箱或社交账号登录。
- **静默开户**：新用户登录后，后台自动生成 MPC 推导地址，支持资产接收。

### 4.2 X402 支付闭环 (Seamless Checkout)
- **Session-key 策略**：用户通过 `agent_authorize` 预设限额。
- **原子结算**：扣款直接在后端通过 X-Session Key 签名完成，返回结果卡片给 AI，消除跳转。

## 5. 开发计划与交付物清单

### 第一阶段：基础设施“技能化” (第 1-2 周)
**目标**：打通开户与法币支付链路，让 ChatGPT 陌生用户能进场。
- **后端任务**：
  - 实现 `WalletOnboardService` (MPC 静默开户)。
  - 封装 `OnrampExecutor` (Transak 接口技能化)。
  - 暴露 `agent_authorize` 到 MCP 接口。
- **前端任务**：
  - 更新商户后台，支持发布 `X402_SKILL` 类型的商品。
- **交付物**：
  - 支持“静默开户”的 MCP Server 镜像。
  - `onramp_fiat` 技能演示 DEMO。

### 第二阶段：动态 SKU 映射引擎 (第 3-4 周)
**目标**：实现“SKU as Skill”，让商户商品自动变工具。
- **后端任务**：
  - 开发 `DynamicToolAdapter` (SKU 自动转 OpenAPI Schema)。
  - 完善 `ProductSearch` 的向量化检索，精准推送 Skill 定义。
- **前端任务**：
  - 商户工作台增加“技能预览”与“Schema 编辑器”。
- **交付物**：
  - 动态 Schema 生成引擎。
  - 商户端“一键生成 AI 技能”功能模块。

### 第三阶段：全场景商业闭环 (第 5-6 周)
**目标**：实现按量计费与自动策略执行。
- **后端/合约任务**：
  - 强化 X402 原生计费逻辑（按次/按量）。
  - 如需跨链或更复杂分账，更新链上 `Commission` 与 `Settlement` 合约支持。
- **前端任务**：
  - 用户工作台显示“授权额度实时消耗进度波形图”。
- **交付物**：
  - 支持 X402 自动扣款的生产环境闭环。
  - 开发者 SDK (Service-as-Skill 集成包)。

## 6. 合约设计要点 (如果涉及)
- **Commission 升级**：增加对 `SKILL_CALL` 类型收入的支持，实现微额（$0.01 级别）的高频分账延迟结算汇总，以降低 Gas 成本。
- **Session Key 验证**：链上或 TEE 侧验证 Session Key 的额度消耗是否符合 Policy 定义。

