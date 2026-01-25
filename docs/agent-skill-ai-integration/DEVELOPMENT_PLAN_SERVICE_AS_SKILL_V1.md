# PRD：Service as a Skill & Everything as a Skill — V2.0

## 1. 理念演进
从 "Product as Skill" 升级为 **"Everything as a Skill" (EaaS)**。Agentrix 不再仅仅是商品的载体，而是 AI 生态的**基础设施服务层**。
- **SKU 即技能**：商品（实物、数字、API）自动转化为 AI 可调用的工具。
- **服务即技能**：开户、法币入金、转账、授权等金融与链上操作全量 Skill 化。

## 2. 核心应用场景与 Skill 全景图

### 2.1 基础设施技能 (Infrastructure Skills)
针对无 Crypto 经验用户实现的“零门槛”闭环。
- **`wallet_onboard`**：为 OAuth 登录的 AI 用户静默创建或绑定 MPC 钱包。
- **`onramp_fiat` / `offramp_fiat`**：在对话框内通过 Transak 调起法币支付卡片，完成余额充值。
- **`balance_query`**：聚合显示用户在 Agentrix 账户下的多链资产。
- **`agent_authorize`**：核心支付策略控制。用户可输入“授权该 Agent 每日最多消费 $20”来控制 X-Session Key。

### 2.2 个人用户技能 (Consumer Skills)
- **`shopping_discovery`**：智能搜索、比价、推荐。
- **`order_checkout`**：基于 X402 的原子化下单，支持“直接支付”与“策略扣款”。
- **`airdrop_hunt` / `autoearn_stats`**：将平台的营销与收益功能 Skill 化。

### 2.3 商户与开发者技能 (Business & Dev Skills)
- **`sku_skill_deploy`**：商户一键将 API 商品映射为专属 OpenAPI Schema。
- **`sales_analytics`**：商户通过 AI 实时查询销售趋势与佣金结算状态。

## 3. 核心技术升级与支付架构

### 3.1 X402 原生 SKU 重新定义
SKU 分为两个逻辑分支：
1. **通用网关 SKU**：适用于实物/数字商品，点击式跳转，实时查库。
2. **X402 原生 SKU**：面向 API、高频、流式资源。
   - **计费模型**：支持按次（Pay-per-use）、按量（Pay-per-token/time）。
   - **执行流**：AI 调用 -> 校验 Policy 限额 -> X-Session Key 静默扣款 -> 触发业务回调。

### 3.2 跨国用户全兼容路径
- **Crypto Native**：OAuth 绑定钱包 -> 策略授权 -> 无感支付。
- **Fiat User**：OAuth 入口 -> 自动生成 MPC 钱包 -> `onramp_fiat` 充值 -> 无感支付。

---

# 详细开发计划：商业化部署 Roadmap

## 第一阶段：基础设施 Skill 化与静默开户 (Week 1-2)
**目标**：打通 AI 环境下的用户身份识别与资产充值。

### 任务分解：
- **后端**：
  - 实现 `WalletOnboardService`：针对新用户自动调用私钥分片管理（MPC）生成托管地址。
  - 封装 `OnrampSkill`：集成 Transak API，生成可在 AI 终端直接展示的支付短链/卡片。
  - 暴露 `agent_authorize` 工具：支持参数 `dailyLimit`, `singleLimit`, `expiresIn`。
- **交付物**：
  - `wallet_onboard` & `onramp_fiat` MCP 工具。
  - 自动钱包生成中间件逻辑。

## 第二阶段：X402 原生 SKU 与动态映射 (Week 3-4)
**目标**：实现商品到 Skill 的自动化转换与高频计价逻辑。

### 任务分解：
- **后端**：
  - 数据库字段扩展：在 `Product` 表增加计费单位（Unit）、单价（Price_per_unit）和计费模型。
  - 开发 `DynamicSkillAdapter`：基于商品描述实时生成 JSON Schema，并注入 MCP 工具列表。
- **前端**：
  - 商户端增加 "X402 Functional Item" 发布模板。
  - 实现 Skill 参数定义的可视化界面（Field Builder）。
- **交付物**：
  - 扩展后的 SKU 数据模型。
  - 自动化 Tool Schema 生成引擎。

## 第三阶段：全闭环支付与合约分账 (Week 5-6)
**目标**：落地链上自动分账与最终的商用级支付体验。

### 任务分解：
- **合约 (Smart Contract)**：
  - 优化 `CommissionContract`：支持针对小额高频交易的“批处理结算（Batch Settlement）”以节省 Gas。
  - 部署至多链（BSC/Solana）并与后端监听器挂钩。
- **后端**：
  - 联动 `PolicyEngine` 与 `X-SessionKey`：实现扣费后的自动分账触发。
  - 完善 Webhook 通知系统：支付成功后回调商户定义的 `execution_url`。
- **交付物**：
  - 优化后的分账合约代码与部署地址。
  - 完整的支付-执行-分账自动化链路记录。

## 第四阶段：生态推广与集成测试 (Week 7-8)
**目标**：在 ChatGPT/Claude 商店上线并邀请商户入驻。

### 任务分解：
- **文档**：提供商户接入 SDK 文档。
- **测试**：模拟跨国法币用户全流程支付压测。
- **交付物**：
  - 官方 MCP 配置文件 (agentrix-mcp.json)。
  - 商业化部署验收报告。
