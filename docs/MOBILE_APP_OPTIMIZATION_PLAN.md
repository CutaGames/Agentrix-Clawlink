# Agentrix (ClawLink) 移动端优化与统一计划

## 背景与现状
目前 Agentrix 的移动端 (ClawLink) 存在两个主要的源码分支结构：
1. 根目录下的 `src/` (遗留的旧版分支，已被清理)
2. `mobile-app/src/` (主干分支，采用 Expo 构建)

在功能对齐上，移动端需要与 Web 端保持完全一致的体验，特别是：
- 同一套账户体系 (Unified Account)
- 同一套 Marketplace (OpenClaw Skill Hub & 资源商品集市)
- 同一套支付、佣金 (Commission) 与传播分销 (Referral) 体系

本计划旨在系统性梳理移动端的现状，并制定后续的优化与完善路径。

## 阶段一：架构统一与基础问题修复（✅ 已完成）
1. **代码库清理**：移除根目录下冲突的 `src/` 目录，统一以 `mobile-app/` 为唯一移动端工程。
2. **API 环境统一**：修改 `mobile-app/src/config/env.ts`，确保移动端 API 指向东京主服务器 `https://api.agentrix.top/api`，Share URL 指向 `https://clawlink.app`。
3. **Marketplace 核心修复**：
   - **OpenClaw Skills (5200+)**：修复了 OpenClaw Hub 接口无法正确获取及展示 5200+ 技能的问题，优化了失败时的降级 Mock 体验。
   - **Resources & Goods (资源商品)**：修复了资源列表为空的问题，现在正确对接后端 `/unified-marketplace/search`，并过滤显示含价格属性的商品。
   - **Share Card (分享海报)**：将旧版中优秀的分享海报功能 (`ShareCardView`) 成功移植到主干版本，并在 `ClawSkillDetailScreen` (技能详情页) 中添加了分享入口，打通传播链路。

## 阶段二：支付与分佣体系深度融合（🔥 正在进行/高优先级）
目前移动端的展示与分享已经通畅，但交易链路需要与后端的统一佣金体系彻底打通：
1. **统一支付链路 (Checkout)**：
   - 优化 `mobile-app/src/screens/market/CheckoutScreen.tsx`。
   - 对接后端 `/unified-marketplace/purchase` 和 `/pay-intents/create` 接口。
   - 支持多币种 (USDC 等) 支付，并正确展示当前用户的代币余额。
2. **双层佣金展示 (Commission)**：
   - 确保 `CommissionRulesScreen` 的配置能实时同步到后端的商品/技能设置中。
   - 技能详情页展示商品设定的推广佣金比例（如：推荐可得 10%）。
3. **分销绑定 (Referral Tracking)**：
   - 分享海报中的链接 (`https://clawlink.app/skill/:id?ref=:userId`) 必须在 App 内部或 Web 端打开时，正确解析 `ref` 参数。
   - 调用后端 `/referrals/bind` 接口，锁定推荐关系。

## 阶段三：Task Market (任务集市) 完善（⏳ 规划中）
1. **任务发布与展示**：移动端实现与 Web 端一致的任务大厅体验（对应 `TaskMarketScreen`）。
2. **开发者接单流程**：移动端支持 Developer 身份查看任务并点击接单 (`acceptOrder` API)。
3. **资金托管 (Budget Pools) 状态追踪**：在移动端订单详情展示当前 Milestone 的资金状态。

## 阶段四：UI/UX 细节打磨与性能优化（⏳ 规划中）
1. **暗黑模式/UI 一致性**：对齐 Web 端 Shadcn UI 的设计语言，规范移动端 `colors.ts`。
2. **动画与交互**：增加骨架屏 (Skeleton Loading)，替换目前的简单 ActivityIndicator，提升应用质感。
3. **缓存策略**：使用 React Query 的持久化缓存，提升断网或弱网下的 Marketplace 浏览体验。
4. **消息推送 (Push Notifications)**：集成 Expo Notifications，实现订单成交、佣金到账的实时 App 推送。

## 构建与发布规范
- 移动端提交到 GitHub 仓库 (`CutaGames/Agentrix-Clawlink`) 的 `main` 分支后，会自动触发 GitHub Actions 进行 APK/AAB 构建（当前 Build 51+）。
- 每次核心功能合并前，必须确保本地 `expo start` 无严重错误，并清理未使用的依赖和遗留文件。
