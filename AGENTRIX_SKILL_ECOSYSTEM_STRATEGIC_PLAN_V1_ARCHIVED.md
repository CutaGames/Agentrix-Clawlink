# Agentrix Skill 生态全景战略规划 (Integrated Version)

**版本**: v2.0 | **日期**: 2026-01-11 | **状态**: 核心战略准则 (Approved)

---

## 1. 核心愿景：万事万物皆可 Skill (Everything is a Skill)

在 AI Agent 时代，传统的“App、插件”以及孤立的“商品”概念正在被重构。Agentrix 认为未来的数字与实体资源应该是**“以自然语言为入口、以 Skill 协议为载体”**的。

*   **去插件化 (Post-Plugin Era)**：停止开发封闭的私有插件体系，全面拥抱 **OpenAI Actions** 与 **Claude MCP (Model Context Protocol)** 兼容的原子化技能架构。
*   **资源技能化 (Asset-as-a-Skill)**：实物商品、专业服务、数字资产以及逻辑代码，全部封装为标准 Skill。
*   **交互式商业 (Conversational Commerce)**：使 Agent 能在对话中检索、比价并执行复杂的经济活动，而人类用户只需关注结果，无需理解底层技术名词。

---

## 2. Skill 生态三层架构 (The Stack)

按能力的提供方与属性，将全网资源划分为三个层级：

| 层级 | 类型 | 核心能力示例 | 交互表现 (对人) | 核心执行逻辑 |
| :--- | :--- | :--- | :--- | :--- |
| **基础层 (Infra)** | **System Skills** | 钱包创建、入金 (Onramp)、X402 支付授权、跨链兑换。 | “设置我的支付预算” | 协议底层原子操作 |
| **资源层 (Resources)** | **Fulfilment Skills** | **实物商品**: 购显卡、买咖啡<br>**专业服务**: 翻译、设计、咨询<br>**资产/数据**: NFT、实时行情。 | “帮我买个最便宜的显卡”<br>“找个专家翻译这段代码” | 触发 ERP/物流、建立协作流或锁价交付。 |
| **扩展层 (Extensions)** | **Logic Skills** | 逻辑工具、收益算法、社交分析、特定的代码处理逻辑。 | “分析下这条推文的情绪” | 开发者编写的无状态/有状态逻辑代码。 |

---

## 3. Marketplace 的重构计划 (The Hub)

Marketplace 从“软件商店”进化为 **“Agent 赋能中心”**，实现全域展示与管理：

### A. 可视化生态仪表盘
*   **Skill 拓扑图**：动态展示 Skill 之间的依赖与组合关系。
*   **实时流量墙 (Live Feed)**：显示当前全网 Agent 调用的活跃技能与成交资源。
*   **收益归因 (Attribution)**：开发者可实时查看其 Skill 被哪些 Agent 调用并产生了多少分成。

### B. 常规开发者技能的商品化
*   开发者编写的代码逻辑属于“数字劳动力/生产力外包”。
*   **双向销售**：既可以对 Agent 销售（通过 API），也可以封装成直面消费者的服务（通过 Agent 包装）。

---

## 4. 交互层革命：对话框即操作台

无论是内生 Agent 还是通过 SDK/外网集成的 Agent，对话框均具备以下核心能力：

1.  **即时检索 (In-Chat Discovery)**：用户提出需求，Agent 在 Marketplace 实时检索匹配的技能或商品。
2.  **动态比价 (Smart Routing)**：调用 Skill 进行多源比价（如：比价多个物流提供商或算力商）。
3.  **即时安装支付 (Quick-Pay Grant)**：**“支付即授权，授权即安装”**。用户点击确认支付，后台自动完成该次 Skill 的临时安装和 X402 结算，流程无缝感知。

---

## 5. 全域分发与集成 (Omni-Channel)

一套 Skill 资源，通过 Agentrix 平台实现“一次编写，全域分发”：

*   **介入主流生态 (Platform Bridge)**：
    *   **ChatGPT Actions**: 自动生成 OpenAPI Schema，将 Marketplace 资源无缝导入 GPTs。
    *   **Claude MCP**: 通过 SSE/stdio 暴露工具，让 Claude 直接操控 Agentrix 资源。
*   **SDK 赋能**: 第三方 Agent 集成 Agentrix SDK 后，自动获得整个 Marketplace 的检索与执行能力。

---

## 6. 经济协议：智能分佣与谈判 (AI Economics)

基于 **X402 协议** 与 **Commission.sol** 合约，构建自治的分润网络：

*   **佣金 Skill 化**：暴露 `negotiate_commission` 接口，允许 Agent 之间通过自然语言协商利润比例。
*   **自动分润机制**：
    *   商户可以为实物/服务 Skill 设定基础返佣比例。
    *   开发者可以为逻辑 Skill 设定按次付费单价。
    *   推广 Agent 自动捕捉这些利润点，形成自发的推广协作网络。

---

## 7. 落地指南 (Roadmap)

1.  **[Backend]** 归并 `plugins` 表与 `skills` 表，新增 `resourceType` 类型（Physical/Service/Digital/Logic）。
2.  **[Backend]** 开发 MCP Host 适配器与 OpenAPI 导出器。
3.  **[Frontend]** 重构 AgentBuilder，从“模版安装”转向“技能组装”模式。
4.  **[Contract]** 建立基于 Skill 触发的链上分佣比例对齐机制。

---

*“在 Agentrix 中，我们不再销售工具，我们销售的是赋予 AI 改变现实世界的能力。”*
