# Roadmap：Agent + Skills（AI 生态集成）— V1（中文）

路线图目标：把当前多套“skill/tool”体系收敛为统一的 canonical capability，并可靠地暴露给 MCP + OpenAI Actions 等生态，同时落地个人/商户/开发者三类 Agent 的可商用能力集。

---

## Phase 0：基线加固（1–2 周）
**目标**：让现有工具调用达到“可内部/小流量外测”的安全与稳定门槛。

- 身份绑定：生产环境移除/忽略工具参数里的 `userId`，统一从 auth 派生。
- 统一错误规范：MCP + OpenAI + REST 返回统一 errorCode/errorMessage/requestId。
- 统一调用日志：按 platform/toolName/userId 维度结构化记录。
- 能力注册表（只读也可）：展示 tool/capability、executor 类型、readiness、所需 scope。

**退出标准**
- MCP SSE + stateless fallback 稳定。
- 每次调用都能串起 requestId（便于排障）。

---

## Phase 1：统一执行层（2–4 周）
**目标**：实现“一次定义、到处执行一致”。

- 定义 canonical capability 元数据：schema、风险等级、scope、版本。
- MCP 静态工具统一改为走 `CapabilityExecutorService`（避免重复逻辑/差异）。
- OpenAI functions / OpenAPI 路由同样走 canonical executor。
- 补齐 NOT_IMPLEMENTED：agent authorization update。
- 默认“先只读，后写入”：
  - read-only 默认开启
  - write 需要显式 enable + 确认

**退出标准**
- 至少 10 个核心工具完成 canonical 化（例如：搜索/详情/checkout url/pay intent/balance/airdrop discover/stats 等）。

---

## Phase 2：技能生命周期与发布（3–6 周）
**目标**：开发者可以安全发布技能并出现在各生态。

- 校验闸门：schema、scope、executor 健康检查。
- 版本管理与下线策略：deprecated/removed 流程。
- 发布流水线：draft → published；自动生成 MCP/OpenAI/Gemini 的 packs。
- HTTP 技能执行安全：
  - 出站 allowlist
  - 请求签名/鉴权透传模型

**退出标准**
- 开发者创建一个 HTTP 技能 → 发布 → MCP 侧可调用（含日志/追踪）。

---

## Phase 3：三类 Agent 可商用化（4–8 周）

### 个人 Agent
- 空投 eligibility/claim：替换 MOCK 为真实集成，或明确“模拟模式”并前端标注。
- AutoEarn：策略持久化 + 实际调度/执行。
- 策略引擎覆盖更多交易/资产相关动作。

### 商户 Agent
- **Product as Skill 落地**：实现从商品库到 MCP Tools 的自动映射映射。
- webhook 配置 + 投递日志持久化；失败重试可观测；提供管理入口。
- 自动下单/客服：先落地确定性规则引擎；再逐步引入 LLM 决策（含评测与人工升级）。

### 开发者 Agent
- Skill Studio（最小集）：schema 编辑、测试运行、pack 导出。

**退出标准**
- 每类 Agent 至少 5 个“可商用”技能，并对不可用项明确约束与计划。

---

## Backlog（示例）
- 带审批的组合再平衡
- 税务/账单导出
- 商户营销 A/B 与实验平台
- 技能 lint + 安全扫描
- 链上审计/证明相关 skill packs
