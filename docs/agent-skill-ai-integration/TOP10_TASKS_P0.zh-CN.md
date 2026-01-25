# P0 优先级最高的 10 个任务（Agent + Skills）

> 目标：把当前 repo 的“可用但分散/不一致/有 MOCK 的能力”快速拉到 **可外测 + 可商用基线**。

## 1) 生产环境禁止从工具参数读取 `userId`
- **原因**：存在越权/伪造风险，是商业化的硬门槛。
- **范围**：MCP 工具、skill HTTP/internal 执行、OpenAI integration、任何 REST bridge。
- **验收**：所有写操作都从 auth 派生用户身份，工具参数里传 `userId` 不生效。

## 2) 统一工具调用的错误协议与 requestId
- **原因**：跨 MCP/OpenAI/REST 排障困难。
- **验收**：每次调用返回/记录 `requestId`，错误包含 `errorCode`/`message`/`details`。

## 3) MCP 静态工具统一走 canonical executor（CapabilityExecutorService）
- **原因**：当前多套执行路径容易行为漂移。
- **验收**：MCP 的核心工具不再直接走分散 service 逻辑，而是调用统一 capability。

## 4) 补齐 agent authorization “update” 的 NOT_IMPLEMENTED
- **原因**：生态接入（MCP/OAuth）依赖授权更新/撤销能力。
- **验收**：支持更新 scope/状态，审计可追踪。

## 5) 商户 webhook 配置与投递日志持久化
- **原因**：商户自动化的最小商用能力。
- **验收**：配置可存储/查询；投递失败可重试；日志可查看。

## 6) Skill 发布前强校验（schema/scope/risk/executor health）
- **原因**：避免“发布即崩”和安全事故。
- **验收**：未通过校验的 skill 不能发布；发布后能自动生成 packs。

## 7) HTTP Skill 出站安全（allowlist + 可选签名）
- **原因**：HTTP skill 是最容易被滥用的执行面。
- **验收**：只允许访问白名单域名；支持请求签名或服务间鉴权策略。

## 8) 写操作的确认与策略拦截（Policy Engine 覆盖面扩展）
- **原因**：交易/支付是高风险动作。
- **验收**：超限/不在白名单/高风险动作必须被拦截或要求确认。

## 9) 替换/明确标注空投 claim/eligibility 与 AutoEarn toggle 的 MOCK
- **原因**：用户侧最直观的“不可商用”点。
- **验收**：要么接真实集成，要么在 API/前端明确模拟模式，并隔离到非生产。

## 10) 统一观测：工具调用指标 + TOP 慢调用/错误率
- **原因**：上线后要能运营与优化。
- **验收**：按 platform/toolName 维度有成功率、P50/P95 延迟、错误码分布。
