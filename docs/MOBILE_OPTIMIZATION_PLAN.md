# 移动端优化方案 — 结合上线推广活动

> 日期: 2026-02-13 | 版本: v1.0

## 一、现状分析

### 架构概览
- **一套后端** (NestJS) + **一套账户体系** (钱包+社交媒体) + **一套佣金体系** (Commission.sol / CommissionV2.sol)
- **网页端**: 发布商品/Skill/任务 + 管理后台 + Marketplace 完整功能
- **移动端**: 侧重 **分佣推广裂变** + 浏览购买 + 任务集市
- 用户在网页端发布的内容，移动端和网页端同时展示（共享后端 API）

### 当前问题清单

| # | 问题 | 严重度 | 状态 |
|---|------|--------|------|
| 1 | **登录 — Telegram**: domain 已设置 `https://www.agentrix.top/`，但后端 `origin` 参数用的 `api.agentrix.top`，不匹配导致 Telegram OAuth 拒绝 | 🔴 P0 | 修复中 |
| 2 | **登录 — Twitter**: 原来网页端和移动端分开两个 CALLBACK_URL，但账号类型不支持多个。需统一为 `https://api.agentrix.top/api/auth/twitter/callback` | 🔴 P0 | 修复中 |
| 3 | **登录 — 钱包**: 当前需要用户手动输入钱包地址 + 手动签名 + 手动粘贴签名结果，UX 极差。应改为检测已安装钱包 → 自动唤起 → 自动获取地址+签名 | 🔴 P0 | 修复中 |
| 4 | **支付**: 点击购买只弹 Alert 确认框，`marketplaceApi.purchaseSkill()` 没有真正调起链上/法币支付 | 🔴 P0 | 修复中 |
| 5 | **任务集市**: 只有种子数据(硬编码)，没有真实任务可测试竞标流程 | 🟡 P1 | 待做 |
| 6 | **推广落地页**: 分享链接/二维码出去后，没有智能判断用户是否安装 App，缺少下载引导 | 🟡 P1 | 待做 |
| 7 | **上线活动入口**: 移动端首页没有活动 Banner、限时免费、佣金加倍等活动入口 | 🟡 P1 | 待做 |

---

## 二、修复方案

### 2.1 登录修复

#### Telegram 登录
**问题**: Telegram OAuth Widget 要求 `origin` 参数的域名必须与 BotFather 中设置的 domain 一致。
- BotFather domain: `https://www.agentrix.top/`
- 当前后端 origin: `https://api.agentrix.top/api/auth/mobile/telegram/callback` ❌

**修复**:
1. 后端 `mobileTelegramAuth` 的 `origin` 改为 `https://www.agentrix.top`
2. `return_to` 保持后端回调 URL（Telegram 会带 `tgAuthResult` 参数回调）
3. 前端网页端也需要确保 Telegram Login Widget 的 `data-auth-url` 指向正确域名

#### Twitter 登录
**问题**: passport-twitter (OAuth 1.0a) 的 `callbackURL` 必须与 Twitter Developer Portal 中配置的一致。原来分了网页端和移动端两个 URL，但 Twitter Free tier 只允许一个。

**修复**:
1. 统一 `TWITTER_CALLBACK_URL=https://api.agentrix.top/api/auth/twitter/callback`
2. `twitter.strategy.ts` 已经从 env 读取，只需确保 .env 正确
3. 移动端走 `/auth/mobile/twitter` (OAuth 2.0 PKCE)，不受 passport-twitter 影响
4. 在 `handleSocialAuthCallback` 中通过 `state` 参数区分 web/mobile，统一回调后分流

#### 钱包登录
**问题**: 当前 `WalletConnectScreen` 要求用户手动输入地址 → 手动去钱包签名 → 手动粘贴签名结果，流程繁琐。

**修复**:
1. 检测已安装钱包(MetaMask/TokenPocket/OKX) → 自动唤起钱包 App
2. 通过 Deep Link 传递签名请求（`metamask://sign?data=...`）
3. 钱包签名完成后通过 Deep Link 回调 `agentrix://wallet/callback?signature=...`
4. 未安装任何钱包 → 显示 WalletConnect QR 码（桌面钱包扫码）
5. 保留"手动输入地址"作为最后降级方案

### 2.2 支付修复

**问题**: `SkillDetailScreen.handleBuy` 调用 `marketplaceApi.purchaseSkill()`，但该 API 只是创建订单，没有真正发起支付。

**修复方案**:
1. `purchaseSkill` 返回 `orderId` + `paymentUrl` 或 `paymentParams`
2. 根据支付方式分流:
   - **链上支付**: 唤起钱包 App 签名转账交易
   - **法币支付**: 打开 Stripe Checkout 页面 (WebBrowser)
   - **X402 支付**: Agent 自动完成（无需人类干预）
   - **免费**: 直接确认
3. 支付完成后轮询订单状态，确认成功后显示结果

### 2.3 任务集市优化

**修复**:
1. 添加 Agentrix 官方悬赏任务（推广测试、内容创作、Bug 赏金）
2. 通过后端 API 创建真实任务，替代前端硬编码种子数据
3. 任务详情页添加"竞标"按钮，接入后端竞标 API

### 2.4 推广落地页

**修复**:
1. 创建 `/r/:code` 落地页（网页端 Next.js）
2. 智能检测:
   - 移动端 + 已安装 App → Deep Link 打开 App (`agentrix://skill/:id?ref=:code`)
   - 移动端 + 未安装 → 显示下载引导页 + "直接在网页查看"按钮
   - 桌面端 → 直接跳转网页版产品页
3. 落地页包含: 产品预览、价格、评分、下载按钮、"网页版查看"

### 2.5 上线活动配合

**首页活动 Banner**:
- 🎉 "Agentrix Commerce 正式上线" 横幅
- 🎁 "首批用户免费体验 Smart Checkout" 
- 💰 "推广赚佣金 — 10% 一级 + 3% 二级"
- ⏰ "限时: 前 50 名商户 0% 平台手续费"

---

## 三、实施优先级

### Phase 1 — 登录 + 支付 (本次实施)
1. ✅ 修复 Telegram 后端 origin
2. ✅ 统一 Twitter callback URL
3. ✅ 优化钱包登录 UX（自动唤起 + 自动签名流程）
4. ✅ 接通支付流程

### Phase 2 — 推广 + 活动 (本次实施)
5. ✅ 添加官方悬赏任务
6. ✅ 首页活动 Banner
7. ✅ 推广落地页智能跳转

### Phase 3 — 后续迭代
8. WalletConnect v2 完整集成
9. 推送通知（订单状态、佣金到账）
10. 移动端评价系统
