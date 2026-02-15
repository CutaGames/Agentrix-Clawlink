# Agentrix 移动端体验优化方案

**文档版本**: v2.0  
**日期**: 2026-02-12  
**状态**: 方案确认中  

---

## 目录

1. [App 图标](#1-app-图标)
2. [账号系统方案](#2-账号系统方案)
3. [Web/Mobile 统一账号架构](#3-webmobile-统一账号架构)
4. [支付打通方案](#4-支付打通方案)
5. [佣金机制分析与方案（Agent + Human 双层）](#5-佣金机制分析与方案)
6. [结算周期优化方案](#6-结算周期优化方案)

---

## 1. App 图标

**状态**: ✅ 已完成

已从 `Agentrix Logo/` 文件夹替换：
- `icon.png` ← `agentrix_app_icon_1024.png` (1024×1024, iOS + Android 主图标)
- `adaptive-icon.png` ← `agentrix_logo_square_transparent.png` (Android Adaptive Icon)
- `favicon.png` ← `favicon_32.png` (Web favicon)

---

## 2. 账号系统方案

### 2.1 后端现状（已实现）

经过完整代码审查，后端 `auth` 模块已经非常完善：

| 登录方式 | 后端端点 | 状态 |
|----------|----------|------|
| **邮箱密码** | `POST /auth/register` + `POST /auth/login` | ✅ 已实现 |
| **钱包登录** (MetaMask/WalletConnect/Phantom/OKX) | `POST /auth/wallet/login` | ✅ 已实现（含 EVM 签名验证） |
| **Google OAuth** | `GET /auth/google` → callback | ✅ 已实现（Passport Strategy） |
| **Apple OAuth** | `GET /auth/apple` → callback | ✅ 已实现（Passport Strategy） |
| **Twitter/X OAuth** | `GET /auth/twitter` → callback | ✅ 已实现（Passport Strategy） |
| **钱包绑定** | `POST /auth/wallet/bind` | ✅ 已实现 |
| **社交账号绑定** | `POST /auth/social/bind` | ✅ 已实现 |
| **MPC 钱包标记** | OAuth callback 中 `needMPCWallet=true` | ✅ 已标记（需前端处理） |

**关键发现**:
- 后端 `auth.controller.ts` 的 OAuth callback 已经检测用户是否有钱包，如果没有会在 redirect URL 中带上 `needMPCWallet=true`
- `SocialAccountService` 支持 Google/Apple/X/Telegram/Discord 五种社交账号
- `WalletConnection` 实体支持 EVM 和 Solana 两条链
- 每个用户注册时自动创建默认资金账户（`ensureUserDefaultAccount`）

### 2.2 移动端现状（未实现）

`LoginScreen.tsx` 目前只是一个 "Coming Soon" 占位页面，没有任何登录逻辑。

### 2.3 移动端登录方案

```
┌─────────────────────────────────────────┐
│           Agentrix 登录页面              │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     🔗 连接钱包登录              │    │  ← WalletConnect / MetaMask
│  └─────────────────────────────────┘    │
│                                         │
│  ─────────── 或 ───────────             │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │Google│ │Apple │ │微信  │ │ X    │  │  ← 社交登录
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     📧 邮箱登录                  │    │  ← 传统登录
│  └─────────────────────────────────┘    │
│                                         │
│  社交登录自动创建 MPC 钱包 🔐           │
└─────────────────────────────────────────┘
```

#### 登录流程

**流程 A: 钱包登录（Web3 用户）**
```
用户点击 "连接钱包"
  → WalletConnect Modal 弹出
  → 用户选择钱包 App 扫码/授权
  → 获取 walletAddress
  → 前端生成签名消息 "Sign in to Agentrix: {nonce}"
  → 用户签名
  → POST /auth/wallet/login { walletAddress, walletType, chain, message, signature }
  → 后端验证签名 → 返回 JWT
  → 存储 token → 进入主页
```

**流程 B: 社交登录（Web2 用户）**
```
用户点击 "Google/Apple/微信/X"
  → 打开 WebView 或 System Browser
  → GET /auth/google (或 apple/twitter)
  → OAuth 授权流程
  → 回调到 /auth/callback?token=xxx&needMPCWallet=true
  → App 拦截 deep link
  → 如果 needMPCWallet=true:
      → 自动调用 MPC 钱包创建服务
      → POST /auth/wallet/bind { walletAddress: mpcAddress, ... }
  → 存储 token → 进入主页
```

**流程 C: 邮箱登录**
```
用户输入邮箱 + 密码
  → POST /auth/login { email, password }
  → 返回 JWT
  → 检查是否有钱包绑定
  → 如果没有 → 提示绑定钱包或自动创建 MPC 钱包
  → 存储 token → 进入主页
```

### 2.4 MPC 钱包自动创建方案（基于自建系统）

**方案**: 基于已有的自建 MPC 钱包系统继续完善，不使用第三方服务。

#### 已有实现（后端）

| 模块 | 文件 | 状态 |
|------|------|------|
| **MPC 钱包服务** | `backend/src/modules/mpc-wallet/mpc-wallet.service.ts` | ✅ 已实现 |
| **MPC 签名服务** | `backend/src/modules/mpc-wallet/mpc-signature.service.ts` | ✅ 已实现 |
| **MPC 钱包控制器** | `backend/src/modules/mpc-wallet/mpc-wallet.controller.ts` | ✅ 已实现 |
| **社交登录创建钱包** | `POST /mpc-wallet/create-for-social` | ✅ 已实现 |
| **检查钱包状态** | `GET /mpc-wallet/check` | ✅ 已实现 |
| **钱包恢复** | `POST /mpc-wallet/recover` | ✅ 已实现 |

#### 已有实现（Web 前端）

| 组件 | 文件 | 说明 |
|------|------|------|
| **SocialMPCWallet** | `frontend/components/wallet/SocialMPCWallet.tsx` | 社交登录自动生成 MPC 钱包组件 + Hook |
| **MPCWalletSetup** | `frontend/components/auth/MPCWalletSetup.tsx` | 一键创建 + 恢复码备份 UI |
| **MPCWalletCard** | `frontend/components/wallet/MPCWalletCard.tsx` | 钱包卡片展示 |

#### 技术架构（2/3 Shamir Secret Sharing）

```
┌─────────────────────────────────────────┐
│           MPC 钱包 2/3 分片              │
│                                         │
│  分片 A (用户设备)  — expo-secure-store  │
│  分片 B (后端数据库) — AES-256-GCM 加密  │
│  分片 C (用户备份)  — 恢复码下载         │
│                                         │
│  签名场景:                               │
│  · 主动支付: A + B (用户 + 平台)         │
│  · 自动分账: B + C (平台 + 预授权)       │
│  · 用户提现: A + C (用户自主, 无需平台)   │
└─────────────────────────────────────────┘
```

#### Mobile 端需要新增

1. **分片 A 存储**: Web 端用 IndexedDB，Mobile 端改用 `expo-secure-store`（iOS Keychain / Android Keystore）
2. **社交登录后自动创建**: 调用 `POST /mpc-wallet/create-for-social`
3. **恢复码备份 UI**: 移植 `MPCWalletSetup.tsx` 到 React Native

```typescript
// Mobile 端社交登录后自动创建 MPC 钱包
const createMPCWalletForSocialUser = async (socialProviderId: string) => {
  // 1. 检查是否已有钱包
  const { hasWallet } = await apiFetch('/mpc-wallet/check');
  if (hasWallet) return;

  // 2. 创建 MPC 钱包
  const result = await apiFetch('/mpc-wallet/create-for-social', {
    method: 'POST',
    body: JSON.stringify({ socialProviderId, chain: 'BSC' }),
  });

  // 3. 存储分片 A 到 Secure Store
  await SecureStore.setItemAsync('mpc_shard_a', result.encryptedShardA);

  // 4. 绑定钱包到用户账户
  await apiFetch('/auth/wallet/bind', {
    method: 'POST',
    body: JSON.stringify({
      walletAddress: result.walletAddress,
      walletType: 'mpc',
      chain: 'evm',
    }),
  });

  // 5. 提示用户备份恢复码 (encryptedShardC)
  showRecoveryCodeBackupModal(result.encryptedShardC);
};
```

#### 待完善项

| 项目 | 说明 | 优先级 |
|------|------|--------|
| `splitSecret` 使用真正的 Shamir 库 | 当前是简化 XOR 实现，应替换为 `shamir-secret-sharing` | P1 |
| 多链支持 | 当前仅 BSC，需扩展到 EVM 主网 + Solana | P2 |
| 阈值签名 (TSS) | 当前是恢复私钥后签名，应升级为真正的 TSS | P2 |
| Mobile 分片 A 安全存储 | 使用 `expo-secure-store` 替代 localStorage | P0 |

### 2.5 海外移动端登录方式

微信登录暂不支持。海外移动端推荐的登录方式：

| 登录方式 | 优先级 | 说明 | 后端状态 |
|----------|--------|------|----------|
| **Google** | P0 | 全球最大用户基数，Android 原生支持 | ✅ 已实现 |
| **Twitter/X** | P0 | Web3/Crypto 社区核心平台 | ✅ 已实现 |
| **Telegram** | P0 | Web3 社区活跃，TON 生态 | 后端有 SocialAccount 支持，需加 Strategy |
| **Discord** | P0 | 开发者/游戏社区 | 后端有 SocialAccount 支持，需加 Strategy |
| **WalletConnect** | P0 | Web3 钱包连接标准 | ✅ 已实现 |
| **Apple** | P2 | iOS App Store 审核可能需要，暂不支持 | ✅ 后端已实现，Mobile 暂缓 |
| **TikTok** | P3 | 直播带货场景，需 TikTok 开放平台申请 | 未实现 |
| **WhatsApp** | P3 | Meta 系，海外通讯主流，但 OAuth 支持有限 | 未实现 |
| **LINE** | P3 | 日本/东南亚市场 | 未实现 |

**Phase 1 支持**: Google + Twitter/X + Telegram + Discord + WalletConnect  
**Phase 2 按需**: Apple（iOS 审核需要时补充）  
**Phase 3 按需**: TikTok（如有直播带货需求）、WhatsApp/LINE（按目标市场）

---

## 3. Web/Mobile 统一账号架构

### 3.1 现有架构

```
┌─────────────────────────────────────────────────┐
│                  后端 (NestJS)                    │
│                                                   │
│  ┌──────────┐  ┌───────────────┐  ┌───────────┐ │
│  │ User     │  │ WalletConn    │  │ SocialAcct│ │
│  │ (核心)   │──│ (多链钱包)    │  │ (社交绑定)│ │
│  │ id       │  │ walletAddress │  │ googleId  │ │
│  │ agentrixId│  │ chain: evm   │  │ appleId   │ │
│  │ email    │  │ walletType    │  │ twitterId │ │
│  │ googleId │  │ isDefault     │  │ type      │ │
│  │ appleId  │  └───────────────┘  └───────────┘ │
│  │ twitterId│                                     │
│  │ roles[]  │  ┌───────────────┐                 │
│  │ kycLevel │  │ Account       │                 │
│  └──────────┘  │ (资金账户)    │                 │
│                │ balance       │                 │
│                │ currency      │                 │
│                └───────────────┘                 │
└─────────────────────────────────────────────────┘
         ▲                    ▲
         │ JWT Token          │ JWT Token
    ┌────┴────┐          ┌────┴────┐
    │ Web 前端 │          │ Mobile  │
    │ Next.js  │          │ Expo RN │
    └─────────┘          └─────────┘
```

### 3.2 统一账号原则

**核心**: Web 和 Mobile 共用同一个后端、同一个 User 表、同一个 JWT 认证体系。

- **同一个用户**在 Web 端用 Google 登录，在 Mobile 端也用 Google 登录 → 同一个 `User.id`
- **同一个用户**在 Web 端连接 MetaMask，在 Mobile 端连接 WalletConnect → 同一个 `User.id`（通过钱包地址匹配）
- **Agent 账号**也绑定在同一个 `User.id` 下，Web 端创建的 Agent 在 Mobile 端可见

### 3.3 Mobile 端需要实现的 Auth Store

```typescript
// mobile-app/src/stores/authStore.ts
interface AuthState {
  token: string | null;
  user: {
    id: string;
    agentrixId: string;
    email?: string;
    walletAddress?: string;
    roles: string[];
  } | null;
  isLoggedIn: boolean;
  
  // Actions
  login: (token: string, user: any) => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
}
```

Token 存储使用 `expo-secure-store`（iOS Keychain / Android Keystore）。

---

## 4. 支付打通方案

### 4.1 后端支付系统现状

后端支付系统**非常完善**，已实现：

| 模块 | 说明 | 状态 |
|------|------|------|
| **SmartRouter** | 智能路由选择最优支付通道 | ✅ |
| **Stripe** | 法币支付（信用卡/Apple Pay/Google Pay） | ✅ |
| **X402** | 链上 QuickPay（Session Key 免签） | ✅ |
| **Wallet** | 直接钱包转账 | ✅ |
| **Transak** | 法币↔加密货币 On/Off Ramp | ✅ |
| **Escrow** | 托管交易（实物商品/服务） | ✅ |
| **Commission** | 自动分佣计算 | ✅ |
| **RiskAssessment** | 风控评估 | ✅ |
| **ExchangeRate** | 汇率服务 | ✅ |

**关键端点**:
```
POST /payments/process          — 处理支付（智能路由）
POST /payments/create-intent    — 创建 Stripe 支付意图
GET  /payments/routing          — 获取支付路由建议
POST /payments/:id/update-status — 更新支付状态
```

### 4.2 Mobile 端当前问题

Mobile 端的"购买"按钮目前只是 mock：
- `SkillDetailScreen.tsx` 的 `handleBuy` 只弹出 Alert
- 没有调用后端支付 API
- 没有创建订单
- 评论提交后没有刷新列表

### 4.3 Mobile 端支付打通方案

```
用户点击 "购买"
  │
  ├─ 1. 检查登录状态
  │     └─ 未登录 → 跳转 LoginScreen
  │
  ├─ 2. 创建订单
  │     POST /orders { productId, quantity, ... }
  │     └─ 返回 orderId + amount + currency
  │
  ├─ 3. 获取支付路由
  │     GET /payments/routing?amount=X&currency=USDC
  │     └─ 返回推荐支付方式列表
  │
  ├─ 4. 用户选择支付方式
  │     ┌─ 钱包支付 (USDC/USDT)
  │     │   → WalletConnect 签名
  │     │   → POST /payments/process { method: 'wallet', txHash }
  │     │
  │     ├─ QuickPay (X402)
  │     │   → Session Key 签名（免确认）
  │     │   → POST /payments/process { method: 'x402', sessionId, signature }
  │     │
  │     ├─ Apple Pay / Google Pay
  │     │   → Stripe Payment Sheet
  │     │   → POST /payments/process { method: 'stripe', paymentIntentId }
  │     │
  │     └─ 法币购买加密货币
  │         → Transak Widget
  │         → Webhook 回调更新状态
  │
  └─ 5. 支付结果
        → 成功 → 显示订单详情 + 推广赚佣入口
        → 失败 → 显示错误 + 重试
```

### 4.4 评论打通

```typescript
// 提交评论后刷新列表
const handleSubmitReview = async (rating: number, comment: string) => {
  const review = await apiFetch(`/skills/${skillId}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  });
  // 刷新评论列表
  setReviews(prev => [review, ...prev]);
  setReviewCount(prev => prev + 1);
};
```

### 4.5 实现优先级

| 优先级 | 功能 | 预估工时 |
|--------|------|----------|
| P0 | 登录系统（社交+钱包） | 3-5 天 |
| P0 | 钱包支付（WalletConnect） | 2-3 天 |
| P1 | Apple Pay / Google Pay（Stripe） | 2 天 |
| P1 | 评论真实提交+刷新 | 0.5 天 |
| P1 | 点赞/收藏真实提交 | 0.5 天 |
| P2 | QuickPay (X402 Session Key) | 3 天 |
| P2 | MPC 钱包自动创建 | 2-3 天 |
| P3 | Transak 法币入金 | 2 天 |

---

## 5. 佣金机制方案（Agent 强制 + Human 商家可选）

### 5.1 当前 Agent 佣金机制现状（V5.0）— 保持不变

Agent 佣金是平台默认强制收取的，利用 Agentrix Agent 网络帮助商家推广的费用。

#### 资金流向（Agent 层，强制）

```
用户支付 100 USDC
  │
  ├─ 平台费 (baseRate): 0.5%~3% → Agentrix Treasury
  │     └─ 其中 20% → Promoter Agent
  │
  ├─ Agent 激励池 (poolRate): 2%~7%
  │     ├─ 70% → Execution Agent（执行 Agent）
  │     └─ 30% → Recommendation Agent（推荐 Agent）
  │     └─ 缺席方份额 → System Rebate Pool
  │
  ├─ 通道费 (channelFee): 0~0.3% → X402 通道
  │
  └─ 商户净收入: 剩余部分 → Merchant
```

#### 按资产类型的 Agent 费率（不变）

| 资产类型 | 平台费 | 激励池 | 总费率 |
|----------|--------|--------|--------|
| 实物商品 | 0.5% | 2.5% | 3.0% |
| 服务类 | 1.0% | 4.0% | 5.0% |
| 虚拟资产 | 0.5% | 2.5% | 3.0% |
| NFT/RWA | 0.5% | 2.0% | 2.5% |
| 开发者工具 | 3.0% | 7.0% | 10.0% |
| 订阅服务 | 0.5% | 2.5% | 3.0% |

#### 智能合约（已部署）

| 合约 | 文件 | 功能 |
|------|------|------|
| **Commission** | `contract/contracts/Commission.sol` | V5 分润结算，支持 QuickPay/Wallet/Provider 多场景，Agent 7:3 分佣 |
| **CommissionV2** | `contract/contracts/CommissionV2.sol` | SplitPlan 分润方案管理，支持自定义角色和比例 |
| **ArnFeeSplitter** | `arn-protocol/contracts/ArnFeeSplitter.sol` | X402 协议费 0.3% + 转发给 Commission |
| **ArnSessionManager** | `arn-protocol/contracts/ArnSessionManager.sol` | Session Key 管理，Approve-and-Call |
| **AutoPay** | `contract/contracts/AutoPay.sol` | 自动支付 |
| **BudgetPool** | `contract/contracts/BudgetPool.sol` | 预算池管理 |

### 5.2 新增 Human 佣金层（商家可选）

**核心设计**: Agent 佣金是平台强制的基础费用；Human 佣金是商家**额外自愿设置**的推广激励，商家自定义比例和层级。

#### 双层佣金架构

```
用户通过 Human 推广链接购买 100 USDC 商品
  │
  │ ┌─── 第一层: Agent 佣金 (平台强制, 从商品价格中扣) ───┐
  │ │                                                      │
  │ ├─ 平台费 0.5%~3%  → Agentrix Treasury                │
  │ ├─ Agent 激励池 2%~7% → Executor 70% / Referrer 30%   │
  │ ├─ 通道费 0~0.3%   → X402 通道                        │
  │ │                                                      │
  │ │ 商户净收入 = 100 - Agent费用 ≈ 95~97 USDC           │
  │ └──────────────────────────────────────────────────────┘
  │
  │ ┌─── 第二层: Human 佣金 (商家可选, 从商户净收入中让利) ──┐
  │ │                                                        │
  │ │ 商家设置: humanCommissionRate = 10% (示例)             │
  │ │ Human 佣金池 = 商户净收入 × 10% ≈ 9.5 USDC           │
  │ │                                                        │
  │ │ 分配 (商家自定义层级和比例):                            │
  │ │   ├─ 一级推广者: 70% of 9.5 = 6.65 USDC              │
  │ │   ├─ 二级推广者: 20% of 9.5 = 1.90 USDC              │
  │ │   └─ 平台留存:   10% of 9.5 = 0.95 USDC              │
  │ │                                                        │
  │ │ 商家最终收入 = 95 - 9.5 = 85.5 USDC                  │
  │ └────────────────────────────────────────────────────────┘
```

#### 商家 Human 佣金配置

商家在后台自主设置，平台根据商品类型给出建议值：

| 商品类型 | 建议 Human 佣金率 | 建议层级 | 说明 |
|----------|-------------------|----------|------|
| 实物商品 | 5%~15% | 1~2 层 | 利润空间有限，建议低佣金 |
| 服务类 | 10%~30% | 1~2 层 | 边际成本低，可设较高佣金 |
| 虚拟资产/数字商品 | 10%~50% | 1~2 层 | 零边际成本，可大方让利 |
| 开发者工具/插件 | 15%~40% | 1~2 层 | 开发者社区裂变效果好 |
| 订阅服务 | 首月 50%~100% | 1 层 | 参考 SaaS 联盟营销，首月高佣金获客 |

#### 商家配置数据结构

```typescript
// 新增: MerchantHumanCommissionConfig
interface MerchantHumanCommissionConfig {
  merchantId: string;
  enabled: boolean;                    // 是否开启 Human 佣金
  commissionRate: number;              // 佣金比例 (0~1, 如 0.1 = 10%)
  maxLevels: number;                   // 最大层级 (1 或 2)
  levelDistribution: {                 // 各层级分配
    level1: number;                    // 一级推广者比例 (如 0.7 = 70%)
    level2: number;                    // 二级推广者比例 (如 0.2 = 20%)
    platform: number;                  // 平台留存比例 (如 0.1 = 10%)
  };
  // 可选: 按商品单独设置
  productOverrides?: {
    productId: string;
    commissionRate: number;
    maxLevels: number;
  }[];
}
```

### 5.3 场景矩阵

| 场景 | Agent 佣金 | Human 佣金 | 说明 |
|------|-----------|-----------|------|
| 用户直接购买 | ✅ 扣取 | ❌ 无 | 无推广链接 |
| Agent 推荐，用户购买 | ✅ 扣取 (Agent 拿推荐佣金) | ❌ 无 | Agent 网络推广 |
| Human 分享链接，用户购买 | ✅ 扣取 | ✅ 从商户让利中分 | 商家需开启 Human 佣金 |
| Human 分享 + Agent 执行购买 | ✅ 扣取 (Agent 拿执行佣金) | ✅ 从商户让利中分 | 两层佣金独立计算 |
| 商家未开启 Human 佣金 | ✅ 扣取 | ❌ 无 | Human 推广链接无效 |

**关键**: Agent 佣金和 Human 佣金**完全独立**，互不影响。Agent 佣金从商品价格中扣（平台强制），Human 佣金从商户净收入中让利（商家自愿）。

### 5.4 智能合约方案

利用已有的 `CommissionV2.sol` 的 **SplitPlan** 机制来实现 Human 佣金分账。

`CommissionV2` 已经支持：
- 自定义分润方案 (`createSplitPlan`)，可设置任意数量的 recipient + share + role
- 分润执行 (`executeSplit`)，支持多种支付类型
- 待领取余额 (`pendingBalances`) + 批量领取 (`claimAll`)

**Human 佣金的链上流程**:

```
1. 商家开启 Human 佣金时:
   → 后端调用 CommissionV2.createSplitPlan()
   → 创建包含 merchant / level1 / level2 / platform 角色的 SplitPlan

2. 用户通过推广链接购买时:
   → 后端先执行 Agent 佣金分账 (Commission.sol)
   → 计算商户净收入
   → 从商户净收入中扣除 Human 佣金池
   → 调用 CommissionV2.executeSplit() 执行 Human 佣金分账

3. 推广者领取佣金:
   → 调用 CommissionV2.claimAll() 领取所有待领取余额
```

**无需新增合约**，复用 `CommissionV2.sol` 的 SplitPlan 即可。

### 5.5 后端改造要点

| 改造项 | 说明 |
|--------|------|
| 新增 `MerchantHumanCommission` 实体 | 存储商家的 Human 佣金配置 |
| 新增 `HumanReferralChain` 实体 | 记录推广关系链（谁推荐了谁，最多 2 级） |
| 修改 `CommissionCalculatorService` | 在 Agent 佣金计算后，追加 Human 佣金计算 |
| 新增商家配置 API | `POST /merchant/human-commission/config` |
| 修改推广链接 | `ReferralLink` 增加 `parentReferrerId` 字段 |
| 新增平台建议接口 | `GET /merchant/human-commission/suggestion?productType=xxx` |

---

## 6. 结算周期优化方案

### 6.1 当前结算机制

当前后端 `financial-architecture.config.ts` 已按资产类型定义了结算规则：

| 资产类型 | 触发条件 | 锁定期 | 说明 |
|----------|----------|--------|------|
| 实物商品 | 用户确认收货 / 物流签收 | T+7 天 | 发货 30 天无更新自动确认 |
| 服务类 | 服务标记完成 / 客户确认 | T+3 天 | 开工 7 天未完成需人工介入 |
| 虚拟资产 | 链上确认 / 卡密发放 | T+1 天 | |
| NFT/RWA | NFT 转移成功 | T+1 天 | |
| 开发者工具 | 支付成功即履约 | 即时 | |
| 订阅服务 | 订阅/续费成功 | T+3 天 | |

### 6.2 优化方案

#### 原则
1. **Agent 和 Human 佣金使用相同的结算周期**（统一规则，减少复杂度）
2. **尽量走智能合约自动结算**（减少人工干预，提高信任度）
3. **实物有锁定期，数字即时或短锁定**

#### 优化后的结算矩阵

| 资产类型 | 触发条件 | 佣金锁定期 | 结算方式 | 链上合约 |
|----------|----------|-----------|----------|----------|
| **实物商品** | 物流签收 / 用户确认 | T+7 天 | Commission.sol `distributeCommission` (检查 `settlementTime`) | ✅ |
| **服务类** | 服务完成确认 / AuditProof 验证 | T+3 天 | Commission.sol + AuditProof (需 proof 才释放) | ✅ |
| **虚拟资产/数字商品** | 链上确认 ≥ 12 blocks / 卡密发放 | T+1 天 | Commission.sol 自动分账 | ✅ |
| **NFT/RWA** | NFT Transfer 成功 (Tx Success) | T+1 天 | Commission.sol 自动分账 | ✅ |
| **开发者工具/插件** | 支付成功 | **即时** | Commission.sol 即时分账 | ✅ |
| **订阅服务** | 订阅/续费成功 | T+3 天 | Commission.sol 定期结算 | ✅ |
| **聚合 Web2 电商** | 上游平台标记已结算 | 跟随上游 (Net30/60) | 后端 Cron 检查上游状态 → 触发链上结算 | ✅ |
| **聚合 Web3 DEX** | Swap 手续费确认 | 即时 / T+1 | Commission.sol 自动分账 | ✅ |

#### 链上自动结算流程

```
支付完成
  │
  ├─ 后端计算 Agent 佣金 + Human 佣金
  │
  ├─ 后端调用 Commission.sol.setSplitConfig()
  │   → 设置分账配置 (merchant, referrer, executor, platformFee, settlementTime)
  │
  ├─ 资金锁定在 Commission 合约中
  │
  ├─ 等待触发条件:
  │   ├─ 实物: 物流 API webhook → 后端更新 Order 状态 → 开始 T+7 倒计时
  │   ├─ 服务: AuditProof 验证通过 → 开始 T+3 倒计时
  │   ├─ 数字: 链上确认 → 开始 T+1 倒计时
  │   └─ 工具: 即时
  │
  ├─ 锁定期到期:
  │   → 后端 Cron (CommissionSchedulerService) 扫描到期佣金
  │   → 调用 Commission.sol.distributeCommission(orderId)
  │   → 合约自动分账到各方钱包
  │
  └─ 或: 各方主动领取
      → 调用 CommissionV2.claimAll()
      → 领取所有待领取余额
```

#### Human 佣金的链上结算

Human 佣金使用 `CommissionV2.sol` 的 SplitPlan：

```
Human 佣金结算:
  │
  ├─ 后端为商家创建 SplitPlan (一次性)
  │   → CommissionV2.createSplitPlan(
  │       name: "Merchant_xxx_Human_Commission",
  │       recipients: [level1Wallet, level2Wallet, platformTreasury],
  │       shares: [7000, 2000, 1000],  // 70%, 20%, 10%
  │       roles: ["level1_promoter", "level2_promoter", "platform"]
  │     )
  │
  ├─ 每笔订单结算时:
  │   → 后端计算 Human 佣金金额
  │   → 调用 CommissionV2.executeSplit(planId, sessionId, amount, paymentType)
  │   → 合约自动分配到各方 pendingBalances
  │
  └─ 推广者领取:
      → 调用 CommissionV2.claimAll()
      → 或后端定期批量触发结算 (Cron)
```

### 6.3 争议处理

| 情况 | 处理 |
|------|------|
| 用户申请退款（锁定期内） | 冻结佣金，退款完成后取消佣金 |
| 用户申请退款（锁定期后） | 佣金已结算，从商户余额中扣回 |
| 订单争议 | `Commission.sol.setOrderDispute(orderId, true)` 冻结资金 |
| 超时未确认 | 自动确认（实物 30 天，服务 7 天） |

---

## 7. 总结与下一步

### 已确认的决策

| # | 决策 | 结论 |
|---|------|------|
| 1 | MPC 钱包方案 | ✅ 自建（基于现有系统完善） |
| 2 | 微信登录 | ❌ 暂不支持，Phase 1 支持 Google/Apple/X/WalletConnect |
| 3 | 佣金架构 | ✅ Agent 强制 + Human 商家可选，双层独立 |
| 4 | Human 佣金基数 | 商户净收入 × 商家自定义比例 |
| 5 | Human 分佣层级 | 商家自定义（建议 1~2 层） |
| 6 | 结算周期 | 按资产类型差异化，尽量走链上合约自动结算 |
| 7 | App 图标 | ✅ 已替换 |

### 实施路线图

```
Phase 1 (1-2 周): 账号系统 + 图标
  ├─ ✅ App 图标替换
  ├─ LoginScreen 实现（Google/X/Telegram/Discord/WalletConnect）
  ├─ AuthStore + Token 持久化 (expo-secure-store)
  ├─ 社交登录后自动创建 MPC 钱包 (调用现有后端 API)
  └─ Web/Mobile 统一登录验证

Phase 2 (1-2 周): 支付打通
  ├─ 购买流程对接后端 Order + Payment API
  ├─ WalletConnect 钱包支付
  ├─ Apple Pay / Google Pay (Stripe)
  └─ 评论/点赞/收藏真实提交

Phase 3 (2-3 周): Human 佣金机制
  ├─ 后端: MerchantHumanCommission 配置模块
  ├─ 后端: HumanReferralChain 推广关系链
  ├─ 后端: CommissionCalculator 增加 Human 佣金计算
  ├─ 链上: 复用 CommissionV2 SplitPlan 执行 Human 分账
  └─ Mobile: 推广佣金展示 + 商家配置入口

Phase 4 (1 周): MPC 钱包完善
  ├─ 替换 splitSecret 为真正的 Shamir 库
  ├─ Mobile 端分片 A 安全存储 (expo-secure-store)
  ├─ 恢复码备份 UI
  └─ 钱包管理页面
```

---

**文档状态**: 方案确认中  
**下一步**: 如无异议，开始实施 Phase 1（LoginScreen + AuthStore + MPC 钱包集成）。
