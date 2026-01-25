# Agentrix Marketplace V2.0 升级方案：从“技术市场”到“Agent 价值交易所”

## 1. 核心理念：一切皆可交易 (Everything-as-a-Service)
弱化底层的 **UCP (电商协议)**、**X402 (支付协议)** 和 **Skill (能力组件)** 等技术术语。对于用户和 Agent 开发者，Marketplace 应展示为 **“Agent 可直接调用的资产与能力”**。

### 价值评估与四层架构 (Refined)
我们将所有可交易对象统一抽象为 Skill，但按价值层级分类：
*   **INFRA (基础能力)**: 支付、钱包、身份、授权。Agent 的“器官”。
*   **RESOURCE (资源资产)**: 实物商品、专业服务、数字资产。Agent 交易的“标的”。
*   **LOGIC (逻辑插件)**: 算法、分析工具、数据处理。Agent 的“大脑补丁”。
*   **COMPOSITE (复合实体)**: 工作流、多 Agent 协作体。Agent 的“外包团队”。

---

## 2. 商业化分类建议 (Marketplace 准入标准)
为了避免市场充斥低质量 Prompt，重点扶持以下高价值类别：

| 类别 | 定义 | 核心价值 | 付费逻辑 |
| :--- | :--- | :--- | :--- |
| **交易/权利型** | 改变现实世界状态的操作（购买、转账、锁柜开启） | **Action** | 为“完成任务”付费 |
| **结果交付型** | 输出确定性的可交付物（调研报告、法律合同、设计稿） | **Deliverable** | 为“质量/SLA”付费 |
| **高风险决策型** | 带有责任背书的专家判断（风控、合规、投资建议） | **Responsibility** | 为“风险对冲”付费 |
| **专有数据访问** | 独家、动态、高门槛的实时数据（供应链、私有知识库） | **Information** | 为“信息差”付费 |

---

## 3. UI/UX 优化清单

### A. 概念弱化与去术语化
*   **名称转换**: "Skill Marketplace" -> **"Capabilities & Assets"**。
*   **标签重写**: 
    *   `INFRA` -> **Essential Tools** (核心工具)
    *   `RESOURCE` -> **Marketplace Items** (商品与服务)
    *   `LOGIC` -> **Add-ons & Plugins** (插件扩展)
    *   `COMPOSITE` -> **Agent Workflows** (自动化流)
*   **协议图标化**: 
    *   ⚡️ 替代 "X402": 表示“瞬时调用/按次计费”。
    *   📦 替代 "UCP": 表示“物流履约/一次性购买”。

### B. 新增：深度详情页 (Detail View)
*   **多维展示**: 商品大图、详细规格、商家评分。
*   **Agent 集成指南**: 在页面上直接展示一段 JSON 示例，告诉开发者如何在其 Agent 代码中集成该项能力。
*   **Playground (演练场)**: 允许用户在购买前对“逻辑类”能力进行在线参数调试（Dry-run）。

### C. 商业透明度
*   **Revenue Share (分成展示)**: 显眼展示“开发者收益比”，吸引 Agent 开发者集成。
*   **SLA 标志**: 针对交付型和决策型资产，显示响应时间和正确率保障标志。

---

## 4. 落地 Action 清单 (待确认)

### 第一阶段：后端与协议层 (Backend & Protocol)
- [ ] **[ENTITY]** 修改 `Skill` 实体，增加 `ValueType` (ACTION/DELIVERABLE/DECISION/DATA) 和 `DetailedDescription` 字段。
- [ ] **[SECURITY]** 增加发布校验：非 FREE 的 Skill 必须提供有效的 Endpoint 或认证。
- [ ] **[INTERNAL]** 完善 `SkillExecutor`，支持带上下文的 Playground 预览调用。

### 第二阶段：前端 UI 重构 (Frontend UI)
- [ ] **[COMPONENTS]** 开发 `SkillDetailModal.tsx`，支持三种模板：商品类、工具类、Agent 类。
- [ ] **[UI]** 优化 `SkillCard.tsx`：移除技术标签，加入 ⚡️/📦 图标及分成比例。
- [ ] **[PAGES]** 重构 `unified-marketplace.tsx`：将侧边栏改为基于“意图”的分类（如“我要购物”、“我要办证”、“我要分析”）。

### 第三阶段：AI 生态联动 (AI Integration)
- [ ] **[GEMINI]** 自动同步逻辑优化：将高价值分类（Action 类）标记为 `high_priority` 工具，优先推送给 Gemini。

---

**请确认以上清单，确认后我将开始第一个任务。**
