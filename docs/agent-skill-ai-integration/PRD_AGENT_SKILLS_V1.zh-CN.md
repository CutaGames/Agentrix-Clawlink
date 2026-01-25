# PRD：Agent + Skills（AI 生态集成）— V1（中文）

**范围**：定义一个统一的产品面（Product Surface），使 Agentrix 的能力以 **skills/tools** 形式稳定、可控地对外提供，并可同时服务：
- Agentrix 前端应用（个人 / 商户 / 开发者）
- AI 生态（ChatGPT/Claude 的 MCP、GPTs Actions、Gemini Extensions、Grok tools 等）
- Agentrix SDK 调用方

**依据**（repo-truth + 需求文档）：
- `Personal-Agent-PRD-V1.0.md`
- `AGENTRIX_MCP_ECOSYSTEM_PRD.md`
- 现有实现：MCP + `ai-capability` + runtime skills + DB skills

---

## 1. 目标与成功指标

### 1.1 目标
1. **一次定义，多处复用**：同一能力（capability）在 MCP/OpenAI Actions/Gemini 等平台上语义一致。
2. **安全可控执行**：强绑定用户身份、预算/策略/白名单，并对高风险操作提供明确确认与审计。
3. **可扩展可运营**：开发者/商户可以安全发布技能，支持版本管理、校验、观测与下线。

### 1.2 成功指标（初版）
- 只读工具成功率 ≥ 99%；写操作工具成功率 ≥ 95%。
- 只读工具 P50 延迟 ≤ 1.5s；写操作 P50 延迟 ≤ 3s。
- `userId` 伪造/越权导致的严重事故为 0。
- ≥ 90% 的对外工具调用统一走“规范化执行层”（canonical executor）。

---

## 2. 角色与核心流程

### 2.1 个人用户（金融理财方向）
- 查看：钱包/余额、策略与风控、空投机会、AutoEarn 建议。
- 执行：只读 → 确认后执行 → 在策略约束下的有限自动化。

### 2.2 商户
- 观察：支付、交易、对账与审计证明。
- 自动化：webhook、履约、营销、客服（必须有安全/质量闸门）。

### 2.3 开发者
- 创建/管理技能：发布为 MCP 工具 / OpenAI functions / OpenAPI。
- 沙盒测试 + 观测：调用追踪、错误分析、配额与权限管理。

---

## 3. 产品需求（V1）

### 3.1 统一的能力/技能模型（Canonical Capability）
- 规范化单元：**Capability**
  - 字段：`id`、`name`、`description`、输入/输出 schema、风险等级、所需 scope、版本号。
  - 指向：一个唯一的 **executor**（服务端执行实现）。
- **核心理念：Product as Skill (商品即技能)**
  - 每一个商户发布的商品（物理、数字、服务）都由系统自动/手动生成对应的 **Tool Capability**。
  - Agent 通过对话可以直接检索商品、调起购买意图（Purchase Intent），实现“语义化购物”。
- runtime skills（对话/记忆/编排）仍可保留，但**必须**调用 canonical capability executor，不得各自走私有逻辑。

### 3.2 对外暴露适配层（Adapters）

#### MCP（ChatGPT/Claude）
- 必须支持 SSE + stateless fallback。
- 必须使用 OAuth/JWT 绑定用户身份：**生产环境禁止从工具参数传入 `userId` 作为身份来源**。
- tools/list 需要可控：按平台、租户、环境（prod/staging）进行开关与灰度。

#### OpenAI Actions
- 输出 OpenAPI 3.1 schema + 稳定 endpoint。
- 执行必须复用 canonical executor（与 MCP 一致）。

#### Gemini / Grok
- 从同一 capability 定义自动生成 OpenAPI / function schema。

### 3.3 安全、鉴权与确认
- 所有写操作必须具备：
  - 用户身份强绑定（来自 auth，不来自工具参数）
  - 策略/预算执行（单次限额、日限额、协议/动作白名单）
  - 高风险操作确认（首单/首次协议/高金额等）
  - 审计日志 + 可回放执行记录

### 3.4 技能生命周期（面向开发者/运营）
- Create/Update → Validate → Publish → Deprecate
- 发布前强校验：
  - JSON Schema 正确性
  - scope/权限声明完整
  - 风险等级声明
  - executor 可达（HTTP skill）或已实现（internal skill）

### 3.5 可观测性
- 每次工具调用至少记录：
  - requestId、userId、platform、toolName
  - latency、status、errorCode
  - 脱敏后入库/日志
- 仪表盘：
  - 平台错误率
  - 慢调用 Top
  - 技能调用量 Top

---

## 4. 非目标（V1 不做）
- 完整的“技能市场变现 UI”（定价/计费/分账等）只做最小可用的底层能力。
- 在缺少强策略与确认的情况下做全自动交易/资产执行。
- 未做质量评测与人工升级机制前，直接上线 LLM 自主客服/自主下单。

---

## 5. 验收标准（Must-have）
1. MCP + OpenAI + `ai-capability` 的核心工具调用统一走同一 canonical 执行层。
2. 生产环境严格禁止把 `userId` 放在工具参数里作为身份来源（从 auth 派生）。
3. 策略引擎可阻断超限/不在白名单的操作，并返回可操作的错误提示。
4. 开发者可以创建一个 HTTP 技能 → 发布 → 在 MCP tools/list 与 OpenAI functions 中出现并可调用。
5. 商户 webhook 配置可持久化；投递具备重试；日志可查看。

---

## 6. 代码现状已知缺口（需在 V1 补齐）
- 商户 AI 客服：目前为规则/占位逻辑（MOCK/TODO）。
- 空投 eligibility/claim：存在 MOCK/TODO。
- AutoEarn 策略开关：MOCK/TODO。
- agent authorization “update”：NOT_IMPLEMENTED。
- DB Skill internal handlers：默认占位。
- 部分 MCP 工具仍接受 `userId` 参数（存在安全风险）。
