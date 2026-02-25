# Agentrix (ClawLink) 移动端终极演进蓝图：从坚实底座到全能形态

## 核心演进策略
**“基础先行，模块化验证，最终升维交互”**
没有扎实的基础模块支持，再酷炫的交互形态（如全局悬浮、语音唤醒）也只是空中楼阁。因此，移动端的整体演进将严格遵循**模块化优化**的节奏：
`Marketplace (交易与分发) -> Agent (智能体操控) -> Social (社交与社区) -> 交互升维 (悬浮/语音/自动化)`。
**每个阶段优化完毕后，必须提交独立 Build (如 Build 52, 53, 54) 进行真实环境验证，确认底盘稳固后再开启下一阶段。**

---

## 阶段一：Marketplace (集市与交易模块) 优化【目标：Build 52 / 当前进行中】
**定位**：统一 Web 与 App 端大集市，打通发现、购买、分佣、裂变的商业闭环。

1. **资源与技能聚合 (✅ 已完成)**
   - 整合 OpenClaw 5200+ 技能与 Compute 资源。
   - 全面对接后端 `/unified-marketplace/search`，修复分类、搜索与过滤（仅展示含真实价格的资产）。
2. **分享与裂变传播 (✅ 已完成)**
   - 优化 `ShareCardView`，在移动端生成精美带二维码的分享海报。
   - 详情页接入分享功能，并自动拼接专属的 Referral Code (`?ref=userId`)。
3. **支付与结算链路 (✅ 已完成)**
   - 重构 `CheckoutScreen` 页面，对接全新的 `/unified-marketplace/purchase`。
   - 修复多币种显示与混合支付链路（Credit Card / Crypto）。
4. **Task Market (任务大厅) 闭环 (⏳ 待优化)**
   - 移动端实现任务悬赏大厅 (`TaskMarketScreen`) 的发单与接单展现。
   - 补齐 Developer (开发者) 身份的移动端状态管理。
5. **分佣结算看板 (Commission Dashboard) (⏳ 待优化)**
   - 在个人中心 (`MeStack`) 补充佣金与邀请奖励的可视化看板。

---

## 阶段二：Agent (智能体操控与状态模块) 优化【目标：Build 53】
**定位**：建立移动端与云端/本地 Agent 的极速、稳定连接，完善移动端的控制台体验。

1. **核心通信层重构 (关键底座)**
   - 彻底废弃当前的 HTTP 轮询聊天模式，全面转为全双工 **WebSocket / Server-Sent Events (SSE)**。
   - 实现**流式对话 (Streaming Response)**，Agent 的回复与思维链 (Thought) 逐字输出，消灭等待空白期。
2. **工作流与状态可视化**
   - 移动端解析并渲染 Agent 的执行轨迹 (Trajectory)，可视化展示复杂 Workflow 的当前执行节点。
3. **记忆库 (Memory) 管理面板**
   - 在移动端增加 Memory 控制台，允许用户随时查看、修改、删除 Agent 对自己的长期/短期记忆偏好。
4. **端侧基础能力打通 (Device Bridging)**
   - 封装 Expo 基础插件，赋予 Agent 请求获取移动端 GPS、读取剪贴板、访问相册的基础能力，为后续多模态和自动化做铺垫。

---

## 阶段三：Social (社交与社区生态模块) 优化【目标：Build 54】
**定位**：打造“人机混编”的智能体网络，通过社区内容反哺 Marketplace 的活跃与交易。

1. **人机混编群聊 (Agent Social)**
   - 重构 `GroupChatScreen`，支持在人类聊天群组中 `@Agent` 呼叫智能体参与讨论或执行群管任务。
   - 优化聊天流中的 UI，区分“人类消息”与“智能体执行消息”。
2. **Community Feed (社区瀑布流)**
   - 搭建动态社区信息流。用户在 Agent 聊天中得到优质结果后，一键生成 Record/Trajectory 并 Share 到大厅。
   - **一键复刻 (Fork & Install)**：用户在 Feed 刷到别人的优秀 Agent 组合或技能，点击即可拉起 Checkout 购买并挂载到自己的实例。
3. **系统级消息推送 (Push Notifications)**
   - 接入 FCM / APNs。当云端 Agent 历时数小时的爬虫任务完成，或 Marketplace 中有佣金到账时，通过原生系统级推送通知移动端用户。

---

## 阶段四：终极交互形态升级 (HeyLemon / Manus 级别)【目标：Build 55+】
**定位**：在底座极其稳固的基础上，打破 App 壳限制，使 Agentrix 成为操作系统级的伴生助手。

1. **全局悬浮唤醒 (Floating Window / Live Activities)**
   - **Android**：编写原生模块获取 `SYSTEM_ALERT_WINDOW` 权限，实现桌面级全局悬浮球，后台驻留不死。
   - **iOS**：深度集成 Live Activities（灵动岛）和 Siri Shortcuts 捷径，实现一键极速唤醒。
2. **全天候流式语音 (Voice-to-Voice)**
   - 引入 VAD (语音端点检测) 与本地极小模型唤醒词。
   - 双击悬浮球或耳机，直接进入全双工音频流对话，消灭传统的“录音-转文字-发请求”长延迟。
3. **跨应用设备协同 (App Automation)**
   - 利用 Android Accessibility Service (无障碍服务)。
   - 结合多模态（截屏识别），Agent 可理解当前屏幕 UI 树，并模拟点击，跨应用为用户执行发微信、点外卖等深度操作。
