# POS Edge P0 开发/测试计划

**版本**：V1.0  
**日期**：2025-01-21  
**负责人**：Edge 产品组  
**范围**：围绕《Agentrix-POS-Edge-AI-Agent-PRD-V1.0》中的 P0 场景，规划开发、测试与 Guardrail 配合路径。

---

## 1. 目标与范围
- 打通语音收银、退换货、经营快报、OTA、日志 5 大核心链路，支持 Qwen3 0.6B 端侧推理与 Guardrail 1.0 协同。
- 确保 Edge 指令 → 意图解析 → Guardrail 校验 → 云 API → POS 响应 全链路可观测、可回滚。

KPI：
1. 每个核心场景端到端通过率 ≥ 95%。
2. 平均语音响应 < 500ms；端云往返 < 200ms。
3. 弱网/离线模式下缓存 SKU ≥ 200，离线订单对账成功率 100%。

---

## 2. 迭代拆解
| Sprint | 时间 | 核心交付 | 说明 |
| --- | --- | --- | --- |
| Sprint 0 | 1/22 – 1/26 | Edge 基础设施 | Edge runtime 守护进程、模型加载、日志 SDK、设备白名单 |
| Sprint 1 | 1/27 – 2/09 | 语音收银链路 | 意图→商品识别→SmartRouter→支付→小票；Guardrail：额度/角色校验 |
| Sprint 2 | 2/10 – 2/23 | 退换货 + 经营快报 | 订单检索、退款流程；经营报表查询；Guardrail：退款风险规则 |
| Sprint 3 | 2/24 – 3/08 | OTA + 离线兜底 | 差分包、回滚、弱网缓存、离线订单对账；日志管控 |
| Sprint 4 | 3/09 – 3/22 | Beta 收尾 | 100 台试点、自动化测试、观测看板、故障演练 |

---

## 3. 能力矩阵
### 3.1 功能 vs 团队
| 功能模块 | Owner | 协作方 | 备注 |
| --- | --- | --- | --- |
| 意图/语音管道 | Edge Runtime 团队 | AI 平台 | 接入 Qwen0.6B，支持热更新 |
| 商品/订单 API | Backend Commerce | 数据组 | 复用 Marketplace & Order 服务 |
| 支付与路由 | Payment 团队 | Guardrail | 开放 `/payments`, `/routing` Edge SDK |
| Guardrail 1.0 | 安全/合规 | Edge | Rule Engine、权限配置、日志审计 |
| OTA & 日志 | Edge Infra | DevOps | 差分包、回滚、遥测 |

### 3.2 Guardrail 对照
| 场景 | 本地 Guardrail | 云侧 Guardrail | 触发动作 |
| --- | --- | --- | --- |
| 语音收银 | 意图白名单、额度缓存、设备验签 | 支付额度、黑名单、反洗钱 | 拒绝/二次确认/允许 |
| 退换货 | 订单存在性、本地授权 | 退款上限、异常频次 | 拒绝/人工审批 |
| 经营快报 | 数据权限 | 敏感字段脱敏 | 局部字段遮蔽 |
| OTA | 包签名、本地校验 | 灰度策略、回滚 | 自动回滚 |

---

## 4. 测试计划
- **环境**：
  - Edge 仿真：Android POS（NPU 有/无）、Linux POS、弱网脚本。
  - 云端：Staging + Guardrail 沙盒。
- **测试类型**：
  1. 功能：语音指令、退款流程、报表查询、OTA。
  2. 性能：端侧响应、端云延迟、离线缓存写入。
  3. 异常：断网、模型加载失败、Guardrail 拒绝、OTA 回滚。
  4. 安全：权限绕过、日志脱敏、签名校验。
- **验收标准**：每个场景提供自动化脚本 + 录屏证据，Guardrail 事件写入审计日志。

---

## 5. 依赖与风险
| 事项 | 状态 | 解决方案 |
| --- | --- | --- |
| 真实支付 Provider | 未接入 | Sprint1 前完成至少一条 Provider 沙盒联调 |
| Agent Workbench API 稳定性 | 功能不可用 | 回归 `Agentrix-Agent` 功能，修复核心接口 |
| Guardrail Rule Engine | 开发中 | 明确 2/09 前可覆盖 P0 场景 |
| POS 硬件差异 | 需要白名单 | 发布硬件兼容列表，提供 Lite 模式 |

---

## 6. 输出与看板
- 文档：
  - `POS-Edge-P0-Plan.md`（本文件）
  - 每个 Sprint 输出 Demo 录屏 + 测试报告。
- 看板：
  - 建议在 Linear/Jira 新建 `POS Edge P0` 项目，按照“意图流”管理 Story。
- 周会 / 里程碑：
  - 每周三同步进度；Sprint 结束进行复盘，更新 Guardrail/支付等依赖状态。

---

> 注：本计划应与五角战略中的 `Model Intelligence / Agent Ecosystem / Transactional Settlement / Security` 四条路线保持联动，若依赖项目延期需及时更新。


