# Agentrix 五层架构产品需求文档（The Pentagonal Architecture PRD）V1.0

**版本**：V1.0  
**日期**：2025-01-21  
**撰写人**：产品战略组（Edge + Cloud + Protocol）  
**范围**：Agentrix Pentagonal Architecture（Fat Edge, Thin Cloud / Code is Law / AI First）

---

## 1. 总览
- **目标**：构建面向 Agent 时代的支付与商业基础设施，形成 *终端→编排→交易大脑→协议结算→基础设施* 的闭环。
- **战略哲学**：
  1. *Fat Edge, Thin Cloud* —— 分布式算力在 POS/Edge，上云仅做协调；
  2. *Code is Law* —— 以协议层和智能合约保障信任、分润、审计；
  3. *AI First* —— 从交互、决策到执行全链路由 AI 驱动。
- **演进路线**：POS Edge MVP（Qwen0.6B）→ 云端 Agentrix-Brain（MoE）→ 协议与 DePIN 规模化。

---

## 2. 五层架构详述

### 2.1 用户触达层（User Interface Layer）
- **定位**：Omni-Channel + Multimodal + Persona Agents。
- **能力**：
  - Voice-Native（POS 语音指令）、Vision-Ready（客显屏/摄像头）、Text/Mobile/Web/IM。
  - Persona Agents：Consumer Agent、Merchant Copilot、Developer Studio。
  - Adaptive Terminals：POS、移动端、小程序、WhatsApp/TG Bot。
- **关键指标**：<500ms 响应、跨端一致度 ≥ 95%、多模态意图覆盖 90%。

### 2.2 智能体编排层（Agent Orchestration Layer）
- **定位**：AI OS（Planning + Tooling + Guardrails）。
- **能力**：
  - CoT 任务规划、Context Manager（Session + Memory）、Tool & Plugin Bus（API Gateway + IoT Driver）。
  - AI Guardrails：反幻觉校验、权限管控（额度/角色/链路）、合规触发器。
- **关键指标**：任务拆解准确率 ≥ 95%；高风险指令漏报 < 0.5%；端云协同延迟 < 200ms。

### 2.3 交易大脑层（Agentrix Transaction Intelligence）
- **定位**：垂直行业大模型（Cloud MoE + Edge SLM）。
- **能力**：
  - Agentrix-Brain（Cloud MoE）：风险专家、财务专家、合约专家、联邦学习中心。
  - Agentrix-Nano（Edge SLM）：Qwen3 0.6B 起步，未来自研 1.3B/2B，负责意图前置、离线推理、隐私风控。
  - 知识蒸馏：云端每周/每月同步到 Edge，保持一致性。
- **关键指标**：风控识别率 > 99%；端侧推理 < 300ms；模型更新周期 < 7 天。

### 2.4 协议结算层（Settlement & Ledger Layer）
- **定位**：Value Internet Protocol（X402 + Unified Ledger + Compliance Oracle）。
- **能力**：
  - X402 Protocol：原子分润、混合清算（Fiat + Crypto）、毫秒级拆分。
  - Unified Ledger：链上复式记账、不可篡改审计轨迹、外部审计接口。
  - Compliance Oracle：实时 KYC/AML/Sanction 检查、合规评分。
- **关键指标**：分润确认 < 1s；Ledger 匹配率 100%；合规拦截准确率 ≥ 99.5%。

### 2.5 基础设施层（Infrastructure Layer）
- **定位**：POS DePIN + Multi-Chain Connectivity。
- **能力**：
  - POS Edge 节点网络：数百万 POS 作为算力/数据节点，贡献即获得 Token 激励。
  - Multi-Chain：以太坊、Solana、Tron、Layer2 高可用节点；跨链消息总线。
  - 运维体系：OTA、遥测、可信硬件、密钥管理。
- **关键指标**：节点在线率 ≥ 99%；DePIN 激励及时率 100%；多链交易成功率 ≥ 99.9%。

---

## 3. 现状 vs 目标（按层对照）

| 层级 | 当前状态（2025Q1） | 目标状态（2025Q4） | 差距与行动 |
| --- | --- | --- | --- |
| 用户触达层 | Web/桌面 Agent 已上线，POS Demo 语音原型 | 全渠道（POS/Mobile/IM）统一 Persona，支持语音+视觉 | 需完成 Edge 客显 SDK、IM Bot、统一意图协议 |
| 智能体编排层 | Planner/Tool Router 已在云端运行；权限分层基础版 | 引入 Guardrail 引擎、IoT Driver、端云共享内存 | 增加 Rule Engine、Session Sync、IoT API |
| 交易大脑层 | Agentrix-Brain 已有风险/支付/定价模型，Edge SLM 缺失 | Cloud MoE + Edge Nano 联动，周级蒸馏 | Qwen3 0.6B 落地、MoE 专家拆分、蒸馏流水线 |
| 协议结算层 | X402 链下模拟、Ledger 多账本、Compliance 半自动 | 全链路上链、混合清算、实时合规 Oracle | 上链部署、Provider 接入、Compliance API 聚合 |
| 基础设施层 | POS 节点 <100，DePIN 激励未启用，多链节点局部 | 1万+ Edge 节点、Token 激励试点、全链路节点 | OTA 基建、Token 经济设计、跨链服务扩容 |

---

## 4. 需求优先级（跨层）
1. **P0**：POS Edge MVP（Qwen0.6B）、Guardrail 1.0、X402 链上化、Ledger 云端统一视图。
2. **P1**：IM/移动多端同步、Edge OTA、Agentrix-Brain MoE 化、Compliance Oracle、DePIN 激励 PoC。
3. **P2**：自研 Edge 模型 1.3B、第三方插件市场、跨链清算自动化、全球节点激励。

---

## 5. 技术路线图
| 时间 | 关键交付 | 说明 |
| --- | --- | --- |
| 2025 Q1 | POS Edge MVP、X402 链上 Beta | 端侧 Qwen + 链上分账初版 |
| 2025 Q2 | Guardrail 1.0、Compliance Oracle、MoE 专家拆分 | 风控 + 审计闭环 |
| 2025 Q3 | Edge 自主蒸馏、DePIN 激励 PoC、Multi-chain Router | Edge 节点变现 |
| 2025 Q4 | 五层联调 GA、插件市场、全渠道 Persona | Pentagonal 架构全面交付 |

---

## 6. 依赖与风险
| 风险 | 影响层级 | 缓解措施 |
| --- | --- | --- |
| Edge 硬件碎片化 | 用户层 / 基础层 | 制定 POS 硬件白名单、提供虚拟化 SDK |
| 数据合规 | 交易层 / 协议层 | 数据脱敏、差分隐私、合规存证 |
| 多链拥堵 | 协议层 / 基础层 | 引入 Layer2、Rollup、异步结算缓冲 |
| 模型漂移 | 交易层 | 周级蒸馏、在线评估、A/B 守卫 |

---

## 7. 与其他文档的关系
- `Agentrix-POS-Edge-AI-Agent-PRD-V1.0.md`：对应第 1 层与第 3 层 Edge 能力的 MVP 落地。
- `Agentrix-V7.0-执行摘要.md`、`Agentrix统一支付流程与时序图`：提供协议层与支付引擎参考。
- `Agentrix-Agent工作台重构说明.md`：Persona & UI 架构输入。

---

## 8. 下一步行动
1. 完成 POS Edge & Guardrail MVP（对应 P0）。
2. 组建 “Pentagonal PMT” 跨部门小组（UI/Agent/Brain/Protocol/Infra）。
3. 明确数据/模型蒸馏通道，制定云边知识同步 SLA。
4. 启动 DePIN 经济模型设计（含 Token 预算、节点奖励规则）。

---

> 本 PRD 与 POS Edge PRD 联动维护，版本更新记录在 `docs/prd/changelog.md`。

