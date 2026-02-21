# Agentrix Claw (Mobile App) 产品需求与进展报告

**版本**: 1.0  
**日期**: 2026-02-21  
**状态**: 开发中 (In Progress)  
**定位**: AI Agent OS 的移动端物理触角 (Physical Actuator)

---

## 1. 产品定位与竞品对齐分析

Agentrix Claw 的核心目标是成为连接云端 AI 大脑与移动端物理设备的“爪子”。为了评估当前进展，我们将其与行业标杆 **Kimi Claw** 和开源标杆 **OpenClaw** 进行了能力对齐分析。

### 1.1 能力对齐矩阵

| 能力维度 | Kimi Claw (Moonshot) | OpenClaw (开源生态) | Agentrix Claw (当前状态) | 对齐状态 |
| :--- | :--- | :--- | :--- | :--- |
| **部署模式** | 纯云端闭源 | 本地/云端/BYOC | **云端(10GB免费)/本地/BYOC** | ✅ **已超越** (提供更灵活的商业化与存储方案) |
| **生态接入** | 封闭生态 | 依赖开源脚本 | **5200+ Skills, X402 协议结算** | ✅ **已超越** (原生集成去中心化任务市场与支付) |
| **屏幕感知 (Vision)** | 深度 OS 级截屏与视图树解析 | MediaProjection + Accessibility | **UI 框架已就绪，底层原生能力待开发** | ❌ **存在差距** (需补充原生截屏与视图树解析) |
| **动作执行 (Action)** | 智能手势、点击、输入 | Accessibility / ADB 桥接 | **仅支持 App 内 Chat 与 API 调用** | ❌ **存在差距** (需补充无障碍服务手势分发) |
| **后台常驻** | 系统级保活 | 前台服务 (Foreground Service) | **暂无后台保活机制** | ❌ **存在差距** (需补充 Android 前台服务保活) |
| **商业化闭环** | 订阅制 | 无 | **Storage Plans (Stripe), 任务佣金** | ✅ **已超越** (完整的 Web3+Fiat 支付闭环) |

**结论**：
Agentrix Claw 在 **商业化、部署灵活性、生态接入（Skills/X402）** 方面已经完全超越了竞品。但在 **底层的设备控制（感知与执行）** 方面，目前仍停留在“套壳对话与 API 调用”阶段，尚未真正长出“物理爪子”。

---

## 2. 当前开发进展 (截至 2026-02-21)

### 2.1 已完成模块 (100%)
- **多模式部署架构 (DeploySelectScreen)**
  - 支持 One-Tap Cloud Deploy (赠送 10GB 存储)。
  - 支持 Local/Private Deploy (端侧模型/隐私模式)。
  - 支持 BYOC (Bring Your Own Cloud) 自定义节点。
- **商业化与存储体系 (StoragePlanScreen)**
  - 完整的存储层级定义：Free (10GB) -> Starter (40GB, $4.9/mo) -> Pro (100GB, $12/mo)。
  - 集成 Stripe Checkout 支付链路。
  - Agent Console 仪表盘实时展示存储使用进度条。
- **任务与生态集市 (TaskMarketScreen)**
  - 接入 5200+ Agentrix Skills。
  - 顶部集成 X402 Protocol 实时结算横幅（Agent-to-Agent 支付）。
- **基础对话与交互 (AgentConsoleScreen)**
  - 统一的 Chat UI，支持流式响应。
  - 结构化卡片渲染（订单、商品、技能卡片）。

---

## 3. 待开发事项 (To-Do List)

为了完全对齐并超越 Kimi Claw / OpenClaw，下一阶段的核心任务是补齐**设备控制层 (Device Control Layer)**。

### 3.1 核心原生能力 (P0 - 极高优先级)
- [ ] **屏幕感知服务 (Screen Perception Service)**
  - 集成 Android `MediaProjection API` 实现实时截屏流。
  - 集成 `AccessibilityService` 获取当前界面的 View Hierarchy (视图树) 并转化为 XML/JSON 供大模型理解。
- [ ] **动作执行引擎 (Action Actuator)**
  - 基于 `AccessibilityService` 的 `dispatchGesture` 实现模拟点击、滑动、长按。
  - 支持文本框的自动焦点获取与输入 (`ACTION_SET_TEXT`)。
- [ ] **后台保活机制 (Foreground Service)**
  - 实现 Android Foreground Service，确保 Agentrix Claw 在切换到后台时仍能持续执行多步任务。
  - 状态栏常驻通知，显示当前 Agent 正在执行的任务状态（如：“正在为您点外卖...”）。

### 3.2 智能与上下文能力 (P1 - 高优先级)
- [ ] **意图理解与任务规划 (Task Planner)**
  - 移动端本地轻量级模型 (SLM) 或云端大模型配合，将用户的自然语言指令拆解为具体的 UI 操作步骤。
- [ ] **上下文自动提取 (Context Awareness)**
  - 当用户在其他 App 中呼出 Agentrix Claw 时，自动截取当前屏幕并提取关键信息（如：在小红书看到商品，呼出 Claw 直接比价购买）。

---

## 4. 待优化完善事项 (Optimization)

- [ ] **性能与功耗优化**
  - 屏幕截屏流的帧率控制与压缩，降低云端推理的带宽消耗与端侧发热。
  - 电池优化：在无任务执行时自动休眠感知服务。
- [ ] **跨端通信稳定性**
  - 优化 WebSocket/SSE 在移动网络切换（如 5G -> Wi-Fi）时的重连机制。
- [ ] **UI/UX 细节**
  - 增加悬浮窗 (Floating Window) 模式，允许用户在不离开当前 App 的情况下与 Agent 交互。
  - 完善 X402 支付在移动端的生物识别（指纹/FaceID）二次确认流程。

---

## 5. 演进路线图 (Roadmap)

- **Phase 1 (已完成)**: 基础框架、部署模式、商业化闭环、生态接入。
- **Phase 2 (当前重点)**: 全局悬浮窗 + 语音唤醒 (HeyLemon 式交互)、BYOK、Token 用量监控。
- **Phase 3 (下一阶段)**: 接入 Accessibility 与 MediaProjection，实现基础的"看"和"点"能力。
- **Phase 4 (未来)**: 跨 App 上下文感知、端侧小模型 (SLM) 离线执行、多 Agent 协作频道。

---

## 6. HeyLemon.ai 交互范式借鉴

HeyLemon.ai 代表了一种 **"无所不在、零摩擦、语音优先"** 的 AI Agent 交互形态。其核心理念是：

> "You're not unproductive. You're interrupted." — 平均知识工作者每天打字 3 小时、切换标签 1100 次。

### 6.1 HeyLemon 核心特性
- **全局唤醒**: 单一热键 (fn 键) 即可在任何 App 中唤出 Agent。
- **语音优先**: "Say what you want. Watch it get done."
- **覆盖层交互**: Agent 界面覆盖在当前应用之上，而非独立窗口。
- **即时执行**: 从想法到行动的路径最短化。

### 6.2 Agentrix Claw 移动端对应方案
| HeyLemon 特性 | 移动端实现 | 技术方案 |
|---|---|---|
| fn 键全局唤醒 | **悬浮球 + "Hey Claw" 语音唤醒** | `SYSTEM_ALERT_WINDOW` + `SpeechRecognizer` |
| 覆盖层交互 | **悬浮窗迷你 Chat 面板** | React Native 悬浮窗或原生 Service |
| 看懂当前屏幕 | **屏幕感知服务** | `MediaProjection` + `AccessibilityService` |
| 在当前 App 操作 | **动作执行引擎** | `dispatchGesture()` + `ACTION_SET_TEXT` |

### 6.3 预期用户体验提升
- **当前**: 用户必须打开 Agentrix Claw App → 进入 AgentConsole → 打字输入任务。
- **Phase 2 后**: 用户说 "Hey Claw, 帮我回复这条消息" → 悬浮窗弹出 → Agent 自动执行。
- **Phase 3 后**: 用户在任何 App 中呼叫 Claw → Agent 看懂屏幕 → 自动操作 → 零接触完成任务。

