# PayMind 支付流程文档 - 最新版

**版本**: V7.0  
**日期**: 2025年1月  
**网络**: BSC Testnet

---

## 📋 目录

1. [支付流程总览](#1-支付流程总览)
2. [前端支付流程](#2-前端支付流程)
3. [后端支付处理](#3-后端支付处理)
4. [三种支付方式详解](#4-三种支付方式详解)
5. [Pre-Flight Check 机制](#5-pre-flight-check-机制)
6. [佣金计算流程](#6-佣金计算流程)
7. [错误处理与降级](#7-错误处理与降级)

---

## 1. 支付流程总览

### 1.1 完整支付链路

```
用户点击支付
    ↓
创建订单 (Order)
    ↓
打开 SmartCheckout 组件
    ↓
初始化支付 (加载用户信息、Session、Pre-Flight Check)
    ↓
智能路由决策 (QuickPay / Wallet / Provider)
    ↓
执行支付 (根据路由类型)
    ↓
后端处理支付 (processPayment)
    ↓
计算佣金 (CommissionCalculator)
    ↓
更新订单状态
    ↓
跳转成功页面 (/pay/success)
```

### 1.2 关键组件

| 组件 | 职责 | 位置 |
|------|------|------|
| **SmartCheckout** | 前端支付组件，负责UI展示和用户交互 | `paymindfrontend/components/payment/SmartCheckout.tsx` |
| **PaymentService** | 后端支付服务，处理所有支付逻辑 | `backend/src/modules/payment/payment.service.ts` |
| **PreflightCheckService** | 预检查服务，推荐最优支付方式 | `backend/src/modules/payment/preflight-check.service.ts` |
| **CommissionCalculatorService** | 佣金计算服务 | `backend/src/modules/commission/commission-calculator.service.ts` |

---

## 2. 前端支付流程

### 2.1 支付入口 (`/pay/checkout`)

**文件**: `paymindfrontend/pages/pay/checkout.tsx`

**流程**:
1. 用户从商品页面点击"立即支付"
2. 创建订单 (`orderApi.createOrder`)
3. 显示 `SmartCheckout` 组件（模态框）

### 2.2 SmartCheckout 初始化

**文件**: `paymindfrontend/components/payment/SmartCheckout.tsx`

**初始化步骤** (`useEffect`):

```typescript
1. 加载用户信息 (userApi.getProfile)
   - 检查 KYC 状态
   - 获取用户角色

2. 加载活跃 Session (loadActiveSession)
   - 如果钱包已连接，查询是否有 QuickPay Session
   - 检查 Session 是否有效

3. 执行 Pre-Flight Check (paymentApi.preflightCheck)
   - 检查钱包余额
   - 检查 Session 状态
   - 获取推荐路由

4. 智能路由决策
   - 优先 QuickPay (如果有 Session 且符合条件)
   - 其次 Wallet (如果钱包已连接且有余额)
   - 最后 Provider (法币支付，需要 KYC)
```

### 2.3 路由决策逻辑

```typescript
if (quickPayAvailable && hasActiveSession) {
  routeType = 'quickpay'  // ⚡ QuickPay 免密支付
} else if (quickPayAvailable && hasWallet && !hasSession) {
  routeType = 'wallet'    // 临时使用钱包，但显示 QuickPay 引导
  showQuickPayGuide = true
} else if (hasWallet && hasBalance) {
  routeType = 'wallet'    // 💼 钱包支付
} else {
  routeType = 'provider'  // 💳 法币支付 (Stripe)
}
```

### 2.4 支付执行 (`handlePay`)

根据 `routeType` 执行不同的支付流程：

#### 2.4.1 QuickPay 支付 (`handleQuickPay`)

```typescript
1. 验证 Session 存在
2. 使用 Session Key 签名支付消息
   - 消息哈希 = keccak256(sessionId, to, amount, orderId, chainId)
   - 使用 SessionKeyManager.signWithSessionKey 签名
3. 调用 paymentApi.process
   - paymentMethod: 'x402'
   - metadata: { sessionId, signature, nonce, to }
4. 如果失败，尝试 relayerQuickPay API
5. 成功后跳转 /pay/success
```

#### 2.4.2 钱包支付 (`handleWalletPay`)

```typescript
1. 检查钱包连接状态
2. 请求钱包确认交易 (eth_sendTransaction)
3. 调用 paymentApi.process
   - paymentMethod: 'wallet'
   - metadata: { orderId, to, txParams }
4. 成功后跳转 /pay/success
```

#### 2.4.3 Provider 支付 (`handleProviderPay`)

```typescript
1. 检查 KYC 状态
   - 如果未完成 KYC，显示 KYC 引导弹窗
   - 引导用户前往 /app/merchant/kyc
2. 调用 paymentApi.process
   - paymentMethod: 'stripe' (银行卡支付)
   - metadata: { provider, providerType }
3. 成功后跳转 /pay/success
```

### 2.5 引导机制

#### QuickPay 引导
- **触发条件**: 符合 QuickPay 条件但未创建 Session
- **显示时机**: 
  - 初始化时检测到符合条件但无 Session
  - 用户点击"立即创建"按钮
- **引导内容**: 介绍 QuickPay 优势，引导创建 Session

#### KYC 引导
- **触发条件**: 用户选择法币支付但未完成 KYC
- **显示时机**: 用户点击银行卡支付选项时
- **引导内容**: 说明 KYC 要求，引导前往 KYC 页面

---

## 3. 后端支付处理

### 3.1 支付入口 (`POST /api/payments/process`)

**文件**: `backend/src/modules/payment/payment.controller.ts`

**DTO**: `ProcessPaymentDto`
```typescript
{
  amount: number
  currency: string
  paymentMethod: 'x402' | 'wallet' | 'stripe'
  merchantId: string
  description: string
  metadata: {
    orderId?: string
    sessionId?: string
    signature?: string
    provider?: string
    ...
  }
}
```

### 3.2 支付处理流程 (`processPayment`)

**文件**: `backend/src/modules/payment/payment.service.ts`

#### 阶段 1: 支付请求与验证

```typescript
1. 获取用户信息 (KYC 状态、国家信息)
2. 构建路由上下文 (RoutingContext)
3. 处理支付方式映射
   - apple_pay/google_pay → stripe
   - crypto → 智能路由选择
```

#### 阶段 2: 智能路由选择

```typescript
如果没有指定 paymentMethod:
  1. 优先检查 X402 授权
     - 检查是否有活跃的 X402 授权
     - 验证单笔限额和每日限额
  2. 检查 QuickPay Grant
     - 查找有效的授权
     - 根据授权类型选择支付方式
  3. 使用智能路由选择
     - SmartRouter.selectBestChannel()
     - 考虑费用、速度、KYC 要求
```

#### 阶段 3: 价格与税费计算

```typescript
如果提供了 productId 和 countryCode:
  1. 获取产品价格 (PricingService)
  2. 计算税费 (TaxService)
  3. 计算通道费用 (根据支付方式)
  4. 佣金计算基础 = 商户税前价格
```

#### 阶段 4: 风险评估

```typescript
1. 调用 RiskAssessmentService.assessRisk()
2. 如果 decision === 'reject'，拒绝交易
3. 如果 decision === 'review'，记录高风险交易
```

#### 阶段 5: 创建支付记录（三层ID体系）

```typescript
1. 创建三层ID
   - User ID: 用户唯一标识（userId）
   - Agent ID: 代理ID（可选，如果有Agent参与）
   - Session ID: 本次支付会话ID（uuidv4()）
   
2. 创建 Payment 实体
   - status: PROCESSING
   - paymentMethod: 确定的支付方式
   - amount, currency, description
   - metadata: { userId, agentId, sessionId, ... }
   
3. 保存到数据库
```

**三层ID说明**:
- **User ID**: 用户的唯一身份标识（PayMind ID、钱包地址、邮箱等）
- **Agent ID**: AI代理的唯一身份标识（参考ERC8004协议，可选）
- **Session ID**: 单次支付会话的唯一标识，用于追责和审计

#### 阶段 6: 执行支付

根据 `paymentMethod` 执行不同的支付逻辑：

**X402 (QuickPay)**:
```typescript
1. 验证 Session 签名
2. 调用 X402Service.executePayment()
3. 更新支付状态为 COMPLETED
```

**Wallet**:
```typescript
1. 等待链上交易确认
2. 通过 webhook 或轮询更新状态
3. 更新支付状态为 COMPLETED
```

**Stripe**:
```typescript
1. 创建 Stripe PaymentIntent
2. 处理支付结果
3. 更新支付状态为 COMPLETED
```

#### 阶段 7: 佣金计算

```typescript
if (payment.status === COMPLETED || PROCESSING):
  1. 调用 CommissionCalculator.calculateAndRecordCommission()
  2. 计算各角色佣金:
     - Merchant (商家)
     - Execution Agent (执行代理)
     - Recommendation Agent (推荐代理)
     - Referral Agent (推广代理)
     - User (用户返佣)
     - Developer (开发者)
     - PayMind Platform (平台)
  3. 记录佣金到数据库
  4. 如果是推广支付，记录推广分成
```

#### 阶段 8: 托管处理 (可选)

```typescript
if (isEscrow):
  1. 创建 Escrow 托管
  2. 根据订单类型自动处理结算:
     - NFT/虚拟资产: 即时结算
     - 服务: 等待服务开始
     - 实体商品: 等待确认收货 (7天自动确认)
```

### 3.3 返回结果

```typescript
{
  id: string              // 支付 ID
  status: string          // COMPLETED | PROCESSING | FAILED
  transactionHash?: string // 链上交易哈希
  amount: number
  currency: string
  paymentMethod: string
  commission?: {
    merchant: number
    agents: number[]
    platform: number
    ...
  }
}
```

---

## 4. 三种支付方式详解

### 4.1 QuickPay (X402) - 免密支付

**特点**:
- ⚡ 零 Gas 费用
- 🚀 即时到账 (< 1 秒)
- 🔒 无需钱包确认
- 💰 有单笔和每日限额

**流程**:
```
1. 用户创建 Session (授权免密额度)
2. 支付时使用 Session Key 签名
3. Relayer 代为执行链上交易
4. 从用户授权额度中扣除
```

**适用场景**:
- 小额高频支付
- 用户已创建 Session
- 支付金额在 Session 限额内

### 4.1.1 ERC8004 合约与 X402 协议的关系

**重要概念区分**:

1. **ERC8004**: Session Key 管理标准（智能合约标准）
   - 负责管理 Session Key 授权
   - 链上 Session 管理
   - 限额控制和签名验证

2. **X402**: 支付协议（批量支付和Gas优化协议）
   - 批量支付处理
   - 数据压缩以节省Gas
   - 通过Relayer执行

3. **关系**: 
   - X402 协议可以使用 ERC8004 的 Session 机制
   - ERC8004 提供 Session Key 管理，X402 提供批量支付优化
   - 两者结合实现 QuickPay 免密支付

**ERC8004 合约** (`ERC8004SessionManager.sol`) 是 QuickPay 的核心智能合约，负责：

#### 合约位置
- **合约文件**: `contract/contracts/ERC8004SessionManager.sol`
- **部署脚本**: `contract/scripts/deploy-erc8004.ts`
- **环境变量**: `ERC8004_CONTRACT_ADDRESS` (后端配置)

#### 核心功能

**1. Session 管理**
```solidity
struct Session {
    address signer;           // Session Key 地址
    address owner;            // 主钱包地址
    uint256 singleLimit;      // 单笔限额（USDC，6 decimals）
    uint256 dailyLimit;       // 每日限额（USDC，6 decimals）
    uint256 usedToday;        // 今日已用（USDC，6 decimals）
    uint256 expiry;           // 过期时间戳
    uint256 lastResetDate;    // 上次重置日期
    bool isActive;           // 是否激活
}
```

**2. 创建 Session** (`createSession`)
- 用户通过主钱包创建 Session
- 设置单笔限额和每日限额
- 生成 Session Key (signer)
- 记录到链上 `sessions` mapping

**3. 执行支付** (`executeWithSession`)
- 只能由 Relayer 调用 (`onlyRelayer`)
- 验证 Session 签名
- 检查单笔和每日限额
- 自动重置每日限额（跨天时）
- 从用户钱包转账 USDC 到收款地址
- 更新已用额度

**4. 批量执行** (`executeBatchWithSession`)
- 批量处理多个支付，节省 Gas
- 最多 50 笔/批次

**5. 撤销 Session** (`revokeSession`)
- 用户可随时撤销 Session
- 设置 `isActive = false`

#### 后端使用位置

**1. PreflightCheckService** (`backend/src/modules/payment/preflight-check.service.ts`)
```typescript
// 查询用户 Session 列表
const sessions = await this.sessionManagerContract.getUserSessions(walletAddress);

// 查询 Session 详情
const session = await this.sessionManagerContract.getSession(sessionId);
```
- **作用**: Pre-Flight Check 时查询 Session 状态，判断 QuickPay 是否可用
- **时机**: 支付前 200ms 内完成检查

**2. RelayerService** (`backend/src/modules/relayer/relayer.service.ts`)
```typescript
// 执行支付（链上）
await this.sessionManagerContract.executeWithSession(
  sessionId,
  to,
  amount,
  paymentId,
  signature
);
```
- **作用**: Relayer 代为执行链上支付
- **时机**: 链下验证通过后，异步上链执行
- **流程**: 链下验证签名 → 即时确认 → 加入队列 → 批量上链

**3. SessionService** (`backend/src/modules/session/session.service.ts`)
```typescript
// 创建 Session（链上）
const tx = await this.sessionManagerContract.createSession(
  signer,
  singleLimit,
  dailyLimit,
  expiry
);
```
- **作用**: 用户创建 QuickPay Session 时，调用合约创建链上 Session
- **时机**: 用户在前端创建 Session 时

#### 工作流程

```
用户创建 Session
    ↓
前端调用 SessionService.createSession()
    ↓
后端调用 ERC8004.createSession() (链上)
    ↓
Session 记录到链上
    ↓
用户支付时使用 Session Key 签名
    ↓
RelayerService 链下验证签名
    ↓
即时确认支付（用户无需等待）
    ↓
加入队列，异步调用 ERC8004.executeWithSession()
    ↓
链上执行转账，从用户钱包扣除 USDC
```

#### 安全机制

1. **签名验证**: 使用 EIP-191 标准，验证 Session Key 签名
2. **限额检查**: 单笔和每日限额双重保护
3. **防重放**: 使用 nonce 和 paymentId 防止重放攻击
4. **权限控制**: 只有 Relayer 可以执行支付
5. **重入保护**: 使用 `ReentrancyGuard` 防止重入攻击

#### 配置要求

**环境变量**:
```env
ERC8004_CONTRACT_ADDRESS=0x...  # 合约地址
USDC_ADDRESS=0x...              # USDC 代币地址
RELAYER_PRIVATE_KEY=0x...        # Relayer 私钥
RELAYER_ADDRESS=0x...           # Relayer 地址（需在合约中设置）
RPC_URL=https://...              # RPC 节点地址
```

**部署步骤**:
```bash
# 1. 部署合约
npx hardhat run scripts/deploy-erc8004.ts --network bscTestnet

# 2. 设置 Relayer 地址
# 合约部署后，调用 setRelayer(relayerAddress)

# 3. 更新环境变量
# 将合约地址写入 .env 文件
```

### 4.2 Wallet - 钱包支付

**特点**:
- 💼 需要钱包确认
- ⛽ 需要支付 Gas 费用 (~$0.50)
- ⏱️ 等待链上确认 (30-60 秒)
- 💰 直接从钱包余额扣除

**流程**:
```
1. 用户连接钱包
2. 请求钱包确认交易
3. 用户签名交易
4. 交易上链
5. 等待确认后更新支付状态
```

**适用场景**:
- 大额支付
- 用户未创建 Session
- 用户希望直接使用钱包余额

### 4.3 Provider (Stripe) - 法币支付

**特点**:
- 💳 支持银行卡 (Visa/MasterCard)
- 🌍 全球可用
- 📋 需要 KYC 认证
- 💸 手续费 ~2.9%
- ⏱️ 处理时间 2-5 分钟

**流程**:
```
1. 检查用户 KYC 状态
2. 如果未完成，引导完成 KYC
3. 创建 Stripe PaymentIntent
4. 处理支付结果
5. 更新支付状态
```

**适用场景**:
- 法币支付需求
- 用户已完成 KYC
- 不支持加密货币的用户

---

## 5. Pre-Flight Check 机制

### 5.1 作用

在支付前快速评估（< 200ms）并推荐最优支付方式。

### 5.2 检查项

**文件**: `backend/src/modules/payment/preflight-check.service.ts`

```typescript
1. 获取用户钱包地址
2. 并行查询:
   - 钱包余额 (USDC)
   - 用户 Session 列表
   - 用户信息 (KYC 状态)
3. 检查 QuickPay 可用性:
   - Session 是否存在且活跃
   - 单笔限额是否足够
   - 每日剩余限额是否足够
   - 钱包余额是否充足 (如果不是 mock)
4. 路由决策:
   - QuickPay 可用 → 推荐 quickpay
   - 钱包余额充足 → 推荐 wallet
   - 其他情况 → 推荐 crypto-rail (Provider)
```

### 5.3 返回结果

```typescript
{
  recommendedRoute: 'quickpay' | 'wallet' | 'crypto-rail' | 'local-rail'
  quickPayAvailable: boolean
  sessionLimit?: {
    singleLimit: string
    dailyLimit: string
    dailyRemaining: string
  }
  walletBalance?: string
  walletBalanceIsMock?: boolean  // 标记是否为 mock 值
  requiresKYC?: boolean
  estimatedTime?: string
  fees?: {
    gasFee?: string
    providerFee?: string
    total?: string
  }
}
```

### 5.4 Mock 模式

如果合约未初始化（开发环境），返回 `walletBalanceIsMock: true`，前端会显示警告。

---

## 6. 佣金计算流程

### 6.1 触发时机

支付状态为 `COMPLETED` 或 `PROCESSING` 时触发。

### 6.2 计算基础

```typescript
commissionBase = 商户税前价格 (productPrice.amount)
// 不包含税费和通道费用
```

### 6.3 佣金分配

根据订单类型 (`orderType`) 和金额，使用不同的佣金配置：

**订单类型**:
- `nft`: NFT/数字资产
- `virtual`: 虚拟商品
- `service`: 服务
- `product`: 普通商品
- `physical`: 实体商品

**佣金角色**:
1. **Merchant** (商家): 扣除佣金后的剩余部分
2. **Execution Agent** (执行代理): 根据配置的佣金率
3. **Recommendation Agent** (推荐代理): 根据配置的佣金率
4. **Referral Agent** (推广代理): 根据配置的佣金率
5. **User** (用户返佣): 根据配置的返佣率
6. **Developer** (开发者): 根据配置的佣金率
7. **PayMind Platform** (平台): 平台服务费

### 6.4 佣金记录

```typescript
CommissionCalculator.calculateAndRecordCommission(
  paymentId,
  payment,
  commissionBase,
  sessionId
)
```

所有佣金记录保存到 `Commission` 表，关联到对应的支付记录。

---

## 7. 错误处理与降级

### 7.1 前端错误处理

**常见错误**:
- 钱包未连接 → 提示连接钱包
- Session 不存在 → 引导创建 Session
- KYC 未完成 → 显示 KYC 引导
- 余额不足 → 提示充值或使用其他方式
- 支付失败 → 显示错误信息，允许重试

**降级策略**:
```typescript
1. QuickPay 失败 → 尝试 Wallet 支付
2. Wallet 支付失败 → 提示使用 Provider 支付
3. Pre-Flight Check 失败 → 使用默认路由 (Provider)
```

### 7.2 后端错误处理

**常见错误**:
- 支付方式不支持 → 返回 400 Bad Request
- 余额不足 → 返回 400 Bad Request
- Session 无效 → 返回 400 Bad Request
- KYC 未完成 → 返回 403 Forbidden
- 风险评估失败 → 返回 400 Bad Request

**降级策略**:
```typescript
1. X402 支付失败 → 尝试 Wallet 支付
2. 智能路由失败 → 使用默认路由 (Stripe)
3. 合约调用失败 → 记录错误，允许重试
```

### 7.3 网络错误处理

- **MetaMask 连接失败**: 全局错误捕获，显示友好提示
- **API 请求失败**: 重试机制，显示错误信息
- **链上交易失败**: 记录交易哈希，允许用户查看

---

## 8. 商家法币挂单 - 用户数字货币支付场景

### 8.1 场景描述

**商家挂单**：法币价格（如 100 CNY）  
**用户支付**：使用数字货币（如 USDT/USDC）  
**核心问题**：如何在不托管资金的前提下，实现货币转换和分账？

### 8.2 汇率转换与显示

#### 8.2.1 汇率获取

**后端API**: `GET /api/payments/exchange-rate?from=CNY&to=USDT`

**实现位置**: `backend/src/modules/payment/exchange-rate.service.ts`

```typescript
// 获取实时汇率
const rate = await exchangeRateService.getExchangeRate('CNY', 'USDT');
// 返回: 0.142 (1 CNY = 0.142 USDT)

// 计算用户需要支付的数字货币金额
const cryptoAmount = fiatAmount * rate;  // 100 CNY * 0.142 = 14.2 USDT
```

**汇率数据源**:
1. CoinGecko API (优先)
2. Binance API (备选)
3. 模拟汇率 (fallback，开发环境)

**汇率缓存**: 1分钟TTL，避免频繁请求

#### 8.2.2 汇率锁定机制

**问题**: 汇率实时变动，从查询到支付完成可能有延迟，导致金额不匹配

**解决方案**: 汇率锁定（有效期5-10分钟）

**流程**:
```
1. 用户打开支付页面
   ↓
2. 前端调用 GET /api/payments/exchange-rate?from=CNY&to=USDT
   ↓
3. 后端返回实时汇率 + 锁定ID (lockId)
   ↓
4. 前端显示: "100 CNY ≈ 14.2 USDT (汇率: 1 CNY = 0.142 USDT)"
   ↓
5. 用户确认支付，使用锁定汇率
   ↓
6. 后端验证锁定汇率是否有效（未过期）
   ↓
7. 如果有效，使用锁定汇率；如果过期，重新获取汇率
```

**API设计**:
```typescript
// 锁定汇率
POST /api/payments/exchange-rate/lock
{
  from: 'CNY',
  to: 'USDT',
  amount: 100,
  expiresIn: 600  // 10分钟
}

// 返回
{
  lockId: 'lock_xxx',
  rate: 0.142,
  cryptoAmount: 14.2,
  expiresAt: 1234567890
}
```

#### 8.2.3 前端显示逻辑

**文件**: `paymindfrontend/components/payment/SmartCheckout.tsx`

**显示规则**:
1. **商家挂法币，用户选择数字货币支付**:
   ```typescript
   // 显示原价和转换后的价格
   <div>
     <div>原价: ¥100.00 CNY</div>
     <div>≈ 14.2 USDT (汇率: 1 CNY = 0.142 USDT)</div>
     <div className="text-xs text-slate-500">
       汇率实时更新，支付时使用锁定汇率
     </div>
   </div>
   ```

2. **商家挂数字货币，用户选择法币支付**:
   ```typescript
   // 显示原价和转换后的价格
   <div>
     <div>原价: 14.2 USDT</div>
     <div>≈ ¥100.00 CNY (汇率: 1 USDT = 7.04 CNY)</div>
   </div>
   ```

3. **商家和用户使用相同货币**:
   ```typescript
   // 直接显示价格，无需转换
   <div>价格: ¥100.00 CNY</div>
   ```

**实现步骤**:
```typescript
// 1. 初始化时获取汇率
useEffect(() => {
  const currency = order.currency || 'USDC';
  const isFiatCurrency = ['CNY', 'USD', 'EUR', 'GBP', 'JPY'].includes(currency.toUpperCase());
  
  if (isFiatCurrency && routeType === 'wallet' || routeType === 'quickpay') {
    // 商家挂法币，用户选择数字货币支付
    fetchExchangeRate(currency, 'USDT').then(rate => {
      setExchangeRate(rate);
      setCryptoAmount(order.amount * rate);
    });
  }
}, [order.currency, routeType]);

// 2. 锁定汇率（用户点击支付时）
const handlePay = async () => {
  if (exchangeRate) {
    const lockResult = await paymentApi.lockExchangeRate({
      from: order.currency,
      to: 'USDT',
      amount: order.amount,
      expiresIn: 600,  // 10分钟
    });
    
    // 使用锁定汇率支付
    await paymentApi.process({
      ...order,
      amount: lockResult.cryptoAmount,  // 使用转换后的金额
      currency: 'USDT',
      metadata: {
        ...order.metadata,
        exchangeRateLockId: lockResult.lockId,
        originalAmount: order.amount,
        originalCurrency: order.currency,
      },
    });
  }
};
```

### 8.3 支付流程

#### 8.3.1 商家挂法币，用户用数字货币支付

**流程**:
```
1. 商家挂单: 100 CNY
   ↓
2. 用户打开支付页面
   ↓
3. 前端获取汇率: 1 CNY = 0.142 USDT
   ↓
4. 显示: "¥100.00 CNY ≈ 14.2 USDT"
   ↓
5. 用户选择 QuickPay 或 Wallet 支付
   ↓
6. 锁定汇率 (有效期10分钟)
   ↓
7. 用户支付 14.2 USDT 到智能合约
   ↓
8. 智能合约自动分账:
   - 商家收到 14.2 USDT
   - 佣金分账 (Agent、PayMind、Referral等)
   ↓
9. 商家收到 USDT (可选: 自动Off-ramp兑换成CNY)
```

**智能合约处理**:
```solidity
// Commission.sol - walletSplit()
function walletSplit(
    bytes32 orderId,
    SplitConfig memory config
) external {
    // 接收用户支付的 USDT
    IERC20(settlementToken).transferFrom(msg.sender, address(this), totalAmount);
    
    // 自动分账（商家收到 USDT）
    _autoSplit(orderId, config);
    
    emit PaymentAutoSplit(orderId, config.merchantMPCWallet, merchantAmount, settlementToken);
}
```

#### 8.3.2 商家收款处理

**方案A: 商家自行兑换（当前实现）**
- 商家收到 USDT 后，自行通过 Off-ramp Provider 兑换成 CNY
- 完全非托管，PayMind 不接触资金

**方案B: 自动Off-ramp服务（推荐，P1阶段）**
- 商家在后台配置"自动Off-ramp"
- PayMind 监听 `PaymentAutoSplit` 事件
- 自动调用 Off-ramp Provider API，将 USDT 换成 CNY 打到商家银行账户
- 需要商家授权 PayMind 代为操作

**商家配置** (P1阶段):
```typescript
{
  autoOffRampEnabled: true,
  preferredFiatCurrency: 'CNY',
  bankAccount: 'xxx',
  minOffRampAmount: 10,  // 最小兑换金额（USDT）
}
```

### 8.4 汇率API端点

**新增API**:
```typescript
// 获取实时汇率
GET /api/payments/exchange-rate?from=CNY&to=USDT
Response: {
  rate: 0.142,
  timestamp: 1234567890,
  source: 'coingecko'
}

// 锁定汇率
POST /api/payments/exchange-rate/lock
Body: {
  from: 'CNY',
  to: 'USDT',
  amount: 100,
  expiresIn: 600
}
Response: {
  lockId: 'lock_xxx',
  rate: 0.142,
  cryptoAmount: 14.2,
  expiresAt: 1234567890
}

// 验证锁定汇率
GET /api/payments/exchange-rate/lock/:lockId
Response: {
  valid: true,
  rate: 0.142,
  expiresAt: 1234567890
}
```

### 8.5 前端实现要点

**1. 汇率显示组件**:
```typescript
// 显示原价和转换后的价格
{isFiatCurrency && (routeType === 'wallet' || routeType === 'quickpay') && exchangeRate && (
  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
    <div className="text-sm text-slate-600">
      原价: {formatCurrency(order.amount, order.currency)}
    </div>
    <div className="text-lg font-bold text-slate-900">
      ≈ {formatCurrency(cryptoAmount, 'USDT')}
    </div>
    <div className="text-xs text-slate-500">
      汇率: 1 {order.currency} = {exchangeRate.rate} USDT
      {exchangeRateLockId && ' (已锁定)'}
    </div>
  </div>
)}
```

**2. 支付时使用锁定汇率**:
```typescript
const handleWalletPay = async () => {
  // 如果有汇率锁定，使用锁定汇率
  let paymentAmount = order.amount;
  let paymentCurrency = order.currency;
  
  if (exchangeRateLockId) {
    const lockInfo = await paymentApi.getExchangeRateLock(exchangeRateLockId);
    if (lockInfo.valid) {
      paymentAmount = lockInfo.cryptoAmount;
      paymentCurrency = 'USDT';
    } else {
      // 锁定已过期，重新获取汇率
      const newLock = await paymentApi.lockExchangeRate({...});
      paymentAmount = newLock.cryptoAmount;
      paymentCurrency = 'USDT';
      setExchangeRateLockId(newLock.lockId);
    }
  }
  
  // 使用转换后的金额支付
  await usdtContract.transfer(to, ethers.parseUnits(paymentAmount.toString(), 6));
};
```

### 8.6 汇率波动风险控制方案

#### 8.6.1 风险场景分析

**问题**：资金在智能合约中可能锁定一段时间（托管交易），期间汇率波动导致商家收到的数字货币价值与原始法币价格不匹配。

**风险场景**：
1. **On-ramp场景**（用户法币支付，商家收到数字货币）:
   - 用户支付：100 CNY → Provider → 14.2 USDT（锁定汇率 0.142）
   - 资金托管：7天（实体商品确认收货）
   - 结算时：汇率可能变成 0.15（USDT贬值）
   - 商家收到：14.2 USDT，但只值 94.67 CNY（损失 5.33 CNY）

2. **Off-ramp场景**（用户数字货币支付，商家收到法币）:
   - 用户支付：14.2 USDT（按汇率 0.142 = 100 CNY）
   - 资金托管：7天
   - 自动Off-ramp时：汇率可能变成 0.15
   - 商家收到：14.2 USDT → 94.67 CNY（损失 5.33 CNY）

#### 8.6.2 综合解决方案（技术+商业）

**方案A：商家接受汇率波动风险（推荐，P0）**

**实施步骤**：
1. **商家入驻协议**：
   - 明确告知汇率波动风险
   - 要求商家确认同意接受风险
   - 在MPC钱包开通流程中再次确认

2. **风险提示**：
   - 支付界面显示："汇率可能在托管期间波动，最终结算金额可能略有差异"
   - 商家后台显示："托管期间汇率波动风险由商家承担"

3. **技术实现**：
   ```typescript
   // 商家配置
   interface MerchantConfig {
     acceptExchangeRateRisk: boolean;  // 是否接受汇率波动风险
     preferredSettlementCurrency: 'fiat' | 'crypto';  // 偏好结算货币
   }
   ```

**优点**：
- ✅ 简单直接，无需复杂技术实现
- ✅ 符合行业惯例（类似Stripe等支付网关）
- ✅ 商家自主选择是否接受风险

**缺点**：
- ⚠️ 商家可能因汇率波动产生损失
- ⚠️ 需要商家充分理解风险

---

**方案B：结算时按实时汇率调整（技术方案，P1）**

**实施步骤**：
1. **支付时记录锁定汇率**：
   ```typescript
   // 支付记录
   {
     originalAmount: 100,  // 原始法币金额
     originalCurrency: 'CNY',
     lockedRate: 0.142,   // 锁定汇率
     cryptoAmount: 14.2,  // 支付的数字货币金额
     cryptoCurrency: 'USDT',
     settlementTime: 1234567890,  // 结算时间戳
   }
   ```

2. **结算时重新计算**：
   ```typescript
   // 结算时
   const currentRate = await exchangeRateService.getExchangeRate('CNY', 'USDT');
   const expectedFiatAmount = cryptoAmount / currentRate;  // 14.2 / 0.15 = 94.67 CNY
   
   // 如果汇率波动超过阈值（如5%），提示商家
   const rateChange = Math.abs((currentRate - lockedRate) / lockedRate);
   if (rateChange > 0.05) {
     // 通知商家汇率波动较大
     await notifyMerchant(merchantId, {
       originalAmount: 100,
       expectedAmount: expectedFiatAmount,
       rateChange: rateChange * 100,
     });
   }
   ```

3. **商家选择**：
   - 接受当前汇率结算
   - 或等待汇率恢复（延长托管期，需用户同意）

**优点**：
- ✅ 商家可以了解汇率波动情况
- ✅ 可以选择是否接受结算

**缺点**：
- ⚠️ 实现复杂，需要商家确认机制
- ⚠️ 可能延长结算周期

---

**方案C：使用稳定币作为中间结算货币（推荐，P1）**

**实施步骤**：
1. **统一使用USDT/USDC作为结算货币**：
   - 所有支付统一转换为USDT/USDC
   - 商家收到USDT/USDC（稳定币，波动小）
   - 商家自行决定何时兑换为法币

2. **智能合约分账**：
   ```solidity
   // Commission.sol 始终使用USDT/USDC分账
   function walletSplit(...) {
     // 接收USDT
     // 分账给商家USDT
     // 商家自行决定何时Off-ramp
   }
   ```

3. **自动Off-ramp（可选）**：
   - 商家配置自动Off-ramp
   - PayMind在结算时按实时汇率兑换
   - 商家承担汇率波动风险

**优点**：
- ✅ 稳定币波动小（USDT/USDC通常波动<1%）
- ✅ 商家可以择时兑换，降低风险
- ✅ 技术实现简单

**缺点**：
- ⚠️ 商家仍需要自行兑换或接受自动Off-ramp的汇率

---

**方案D：汇率保护机制（高级方案，P2）**

**实施步骤**：
1. **汇率保护阈值**：
   - 设置汇率波动阈值（如±5%）
   - 如果波动超过阈值，触发保护机制

2. **保护机制**：
   - **选项1**：按锁定汇率结算，PayMind承担差额（需要资金池）
   - **选项2**：延长托管期，等待汇率恢复
   - **选项3**：商家选择接受当前汇率或等待

3. **资金池（可选）**：
   - PayMind维护一个小型汇率保护资金池
   - 用于补偿小额汇率波动（如<100 CNY）
   - 超过阈值的波动由商家承担

**优点**：
- ✅ 降低商家汇率风险
- ✅ 提升商家体验

**缺点**：
- ⚠️ 需要资金池，增加运营成本
- ⚠️ 实现复杂

---

#### 8.6.3 推荐实施策略

**阶段1（P0 - 当前）**：
- ✅ 商家入驻时明确告知汇率波动风险
- ✅ 要求商家确认同意接受风险
- ✅ 支付界面显示风险提示
- ✅ 使用稳定币（USDT/USDC）作为结算货币

**阶段2（P1 - 推荐）**：
- 📝 实现结算时汇率重新计算和通知
- 📝 商家可以选择接受或等待
- 📝 自动Off-ramp服务（商家可选）

**阶段3（P2 - 优化）**：
- 📝 汇率保护机制（小额保护资金池）
- 📝 汇率波动预警系统

---

### 8.7 Off-ramp聚合服务分佣机制

#### 8.7.1 行业实践

**参考案例**：
1. **MoonPay**：
   - 作为聚合服务商，收取0.5%-1%的服务费
   - 同时从Provider获得返佣

2. **Transak**：
   - 收取0.5%-1.5%的服务费
   - 提供比价和最优汇率

3. **Ramp Network**：
   - 收取0.5%-1%的服务费
   - 透明显示所有费用

**行业标准**：
- 聚合服务商通常收取 **0.5%-1.5%** 的服务费
- PayMind建议收取 **0.05%-0.1%**（更低的费率，提升竞争力）

#### 8.7.2 PayMind分佣设计

**分佣结构**：
```
用户支付: 14.2 USDT
    ↓
Provider费用: 14.2 * 2.9% = 0.41 USDT (Provider收取)
    ↓
PayMind分佣: 14.2 * 0.1% = 0.014 USDT (PayMind收取)
    ↓
商家收到: 14.2 - 0.41 - 0.014 = 13.776 USDT
    ↓
兑换成CNY: 13.776 / 0.15 = 91.84 CNY
```

**分佣规则**：
1. **On-ramp场景**（用户法币支付）：
   - Provider收取：2.9%-3.5%（法币转数字货币）
   - PayMind分佣：0.05%-0.1%（可选，从Provider返佣中获取）

2. **Off-ramp场景**（商家数字货币转法币）：
   - Provider收取：1%-2%（数字货币转法币）
   - PayMind分佣：**可配置，默认0.1%，可设为0**（从商家支付金额中扣除）
   - ⚠️ **重要**：分佣为0不与非托管原则冲突，因为：
     - 资金始终在智能合约中，PayMind从未"持有"资金
     - 分账由智能合约自动执行，PayMind无法干预
     - PayMind只是技术服务商，不涉及资金托管
     - 分佣是"服务费"，不是"托管资金"

**技术实现**：
```typescript
// Off-ramp分佣计算
interface OffRampCommission {
  providerFee: number;      // Provider费用（1%-2%）
  paymindFee: number;       // PayMind分佣（0.05%-0.1%）
  merchantAmount: number;   // 商家实际收到金额
}

function calculateOffRampCommission(
  cryptoAmount: number,
  providerRate: number,    // Provider费率（如0.02 = 2%）
  paymindRate: number,      // PayMind费率（可配置，默认0.001 = 0.1%，可设为0）
): OffRampCommission {
  const providerFee = cryptoAmount * providerRate;
  const paymindFee = paymindRate > 0 ? cryptoAmount * paymindRate : 0; // 支持设为0
  const merchantAmount = cryptoAmount - providerFee - paymindFee;
  
  return {
    providerFee,
    paymindFee,
    merchantAmount,
  };
}
```

**智能合约分账**：
```solidity
// Commission.sol - 支持Off-ramp分佣
function offRampSplit(
    bytes32 orderId,
    SplitConfig memory config,
    uint256 paymindOffRampFee  // PayMind Off-ramp分佣
) external {
    // 从总金额中扣除PayMind Off-ramp分佣
    uint256 totalAmount = settlementToken.balanceOf(address(this));
    uint256 merchantAmount = config.merchantAmount - paymindOffRampFee;
    
    // 分账给PayMind Treasury（Off-ramp分佣）
    if (paymindOffRampFee > 0) {
        settlementToken.transfer(paymindTreasury, paymindOffRampFee);
    }
    
    // 分账给商家（扣除分佣后的金额）
    config.merchantAmount = merchantAmount;
    _autoSplit(orderId, totalAmount - paymindOffRampFee);
}
```

#### 8.7.3 费用透明度

**前端显示**：
```typescript
// 商家Off-ramp界面
<div>
  <div>数字货币金额: 14.2 USDT</div>
  <div>Provider费用: 0.41 USDT (2.9%)</div>
  <div>PayMind服务费: 0.014 USDT (0.1%)</div>
  <div className="font-bold">实际到账: 13.776 USDT</div>
  <div className="text-xs text-slate-500">
    兑换成CNY: ≈ 91.84 CNY (汇率: 1 USDT = 6.67 CNY)
  </div>
</div>
```

**商家后台显示**：
- 清晰的费用明细
- 历史Off-ramp记录
- 费用统计报表

#### 8.7.4 合规性

**✅ 符合行业惯例**：
- 聚合服务商收取服务费是行业标准做法
- 费率透明，用户和商家都清楚费用结构

**✅ 非托管设计**：
- PayMind不托管资金
- 分佣从交易金额中扣除，不涉及资金托管
- 资金流向：用户 → 智能合约 → 商家（扣除费用） → Provider → 商家银行

---

### 8.8 合规性分析

**✅ 符合非托管设计**:
1. **资金流向**:
   - 用户 → 智能合约（USDT）
   - 智能合约 → 商家（USDT，扣除分佣）
   - 商家 → Provider（USDT，可选）
   - Provider → 商家银行（CNY，可选）

2. **PayMind角色**:
   - 技术服务商（TSP）
   - 不托管资金
   - 提供汇率查询、锁定、聚合服务
   - 收取合理的服务费（0.05%-0.1%）

3. **汇率风险**:
   - 商家在入驻时明确同意接受汇率波动风险
   - 使用稳定币（USDT/USDC）降低波动
   - 可选：结算时按实时汇率调整

4. **费用透明度**:
   - 所有费用清晰显示
   - 商家和用户都了解费用结构
   - 符合行业最佳实践

---

## 9. 测试环境说明

### 8.1 网络配置

- **网络**: BSC Testnet
- **Chain ID**: 0x61 (97)
- **测试代币**: MockUSDT (6 位小数)
- **Gas 代币**: tBNB

### 8.2 测试账户

- **部署地址**: `0x2bee8ae78e4e41cf7facc4a4387a8f299dd2b8f3`
- **测试 USDT**: 可通过 `contract/scripts/mint-usdt.ts` 铸造

### 8.3 注意事项

1. 所有支付均在 BSC Testnet 上执行
2. 使用测试 USDT (6 位小数) 和足够的 BNB Gas
3. Mock 余额会显示警告，不影响功能测试
4. KYC 状态影响法币支付可用性

---

## 9. 汇率波动风险控制与Off-ramp分佣

### 9.1 汇率波动风险控制

详见 [8.6 汇率波动风险控制方案](#86-汇率波动风险控制方案)

**核心策略**：
1. **商家接受风险**（P0）：商家入驻时明确同意接受汇率波动风险
2. **稳定币结算**（P0）：统一使用USDT/USDC作为结算货币
3. **结算时调整**（P1）：结算时按实时汇率重新计算，商家可选择
4. **汇率保护**（P2）：小额保护资金池，降低商家风险

### 9.2 Off-ramp聚合服务分佣

详见 [8.7 Off-ramp聚合服务分佣机制](#87-off-ramp聚合服务分佣机制)

**分佣标准**：
- **PayMind分佣**：0.05%-0.1%（低于行业标准0.5%-1.5%）
- **Provider费用**：1%-2%（Off-ramp）或 2.9%-3.5%（On-ramp）
- **费用透明度**：所有费用清晰显示给商家和用户

**技术实现**：
- 智能合约支持Off-ramp分佣扣除
- 前端显示完整费用明细
- 商家后台提供费用统计

---

## 10. API 端点汇总

### 前端调用

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/payment/preflight` | GET | Pre-Flight Check |
| `/api/payments/process` | POST | 处理支付 |
| `/api/sessions/active` | GET | 获取活跃 Session |
| `/api/users/profile` | GET | 获取用户信息 |
| `/api/orders` | POST | 创建订单 |

### 后端内部

| 服务 | 方法 | 说明 |
|------|------|------|
| `PaymentService.processPayment` | - | 处理支付主流程 |
| `PreflightCheckService.check` | - | Pre-Flight Check |
| `CommissionCalculator.calculateAndRecordCommission` | - | 计算佣金 |
| `X402Service.executePayment` | - | 执行 X402 支付 |
| `RiskAssessmentService.assessRisk` | - | 风险评估 |

---

## 10. 流程图

### 10.1 完整支付流程图

```
┌─────────────────┐
│  用户点击支付    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   创建订单       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ SmartCheckout   │
│   初始化         │
└────────┬────────┘
         │
         ├─→ 加载用户信息
         ├─→ 加载 Session
         └─→ Pre-Flight Check
         │
         ▼
┌─────────────────┐
│   路由决策       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │         │
    ▼         ▼         ▼
┌──────┐ ┌──────┐ ┌──────┐
│Quick │ │Wallet│ │Prov. │
│ Pay  │ │ Pay  │ │ Pay  │
└──┬───┘ └──┬───┘ └──┬───┘
   │        │        │
   └────────┴────────┘
         │
         ▼
┌─────────────────┐
│ 后端处理支付     │
└────────┬────────┘
         │
         ├─→ 智能路由选择
         ├─→ 价格税费计算
         ├─→ 风险评估
         ├─→ 执行支付
         ├─→ 计算佣金
         └─→ 更新状态
         │
         ▼
┌─────────────────┐
│   支付成功       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /pay/success     │
└─────────────────┘
```

---

## 11. 更新日志

### V7.0 (2025-01)
- ✅ 优化 QuickPay 引导逻辑
- ✅ 修复 KYC 弹窗触发时机
- ✅ 改进钱包余额显示（Mock 模式）
- ✅ 统一输入框样式（修复白色文字问题）
- ✅ 添加支付成功页面
- ✅ 改进错误处理和降级策略
- ✅ 优化 MetaMask 连接体验

---

## 12. EPAY Provider 测试环境配置

### 12.1 测试账号信息

**测试环境链接**: https://29597375fx.epaydev.xyz/epayweb

**测试账号**:
- **登录账号**: `test2020@epay.com`
- **登录密码**: `Epay@2025123`
- **收付款Key**: `2d00b386231806ec7e18e2d96dc043aa`（用作API_KEY和SECRET_KEY）
- **支付密码**: `230032`

### 12.2 IP白名单配置（重要）

**⚠️ 测试环境必须添加服务器出口IP到白名单后才能请求API**

**配置步骤**:
1. 登录EPAY测试环境：https://29597375fx.epaydev.xyz/epayweb
2. 使用测试账号登录：`test2020@epay.com` / `Epay@2025123`
3. 进入"开发者配置" → "IP白名单"
4. 获取服务器出口IP：`curl ifconfig.me`
5. 添加IP到白名单并保存

**详细配置指南**: 参考 `EPAY测试环境配置指南.md`

### 12.3 环境变量配置

```bash
# EPAY 商户ID（测试账号）
EPAY_MERCHANT_ID=test2020@epay.com

# EPAY API密钥（测试账号的收付款key）
EPAY_API_KEY=2d00b386231806ec7e18e2d96dc043aa

# EPAY 密钥（用于签名，与API_KEY相同）
EPAY_SECRET_KEY=2d00b386231806ec7e18e2d96dc043aa

# EPAY 测试环境URL
EPAY_TEST_URL=https://29597375fx.epaydev.xyz/epayweb

# EPAY 支付密码（测试账号）
EPAY_PAYMENT_PASSWORD=230032
```

---

## 13. Off-ramp 分佣实现总结

### 13.1 已完成的工作

1. **OffRampCommissionService** (`backend/src/modules/payment/off-ramp-commission.service.ts`)
   - ✅ 支持可配置的分佣费率（默认0.1%，可设为0）
   - ✅ 计算Off-ramp分佣（Provider费用 + PayMind分佣）
   - ✅ 计算商家需要支付的数字货币金额
   - ✅ 支持分佣为0（不与非托管原则冲突）

2. **Commission合约更新** (`contract/contracts/Commission.sol`)
   - ✅ 添加`offRampFee`字段到`SplitConfig`结构体
   - ✅ 在`_autoSplit`函数中支持Off-ramp分佣分账
   - ✅ 支持分佣为0

3. **PaymentModule集成**
   - ✅ 将`OffRampCommissionService`添加到providers和exports
   - ✅ 在`WithdrawalService`中使用Off-ramp分佣计算

4. **文档更新**
   - ✅ 更新主支付流程文档
   - ✅ 创建详细说明文档：`Off-ramp分佣与非托管原则说明.md`

### 13.2 环境变量配置

```bash
# PayMind Off-ramp 分佣费率（可配置，默认0.1%，可设为0）
PAYMIND_OFF_RAMP_RATE=0.001  # 0.1%（默认）
# 或
PAYMIND_OFF_RAMP_RATE=0      # 0%（不收取服务费，降低法规风险）
```

### 13.3 使用示例

```typescript
// 在WithdrawalService中使用
const commission = this.offRampCommissionService.calculateOffRampCommission(
  cryptoAmount,  // 商家要转换的数字货币金额
  providerRate,  // Provider费率（如0.02 = 2%）
);

// 结果：
// {
//   providerFee: number,      // Provider费用
//   paymindFee: number,       // PayMind分佣（可配置，可为0）
//   merchantAmount: number,   // 商家实际收到金额
//   totalDeduction: number,    // 总扣除金额
// }
```

### 13.4 重要说明

- ✅ **分佣为0不与非托管原则冲突**：资金始终在智能合约中，PayMind从未"持有"资金
- ✅ **可配置费率**：通过环境变量`PAYMIND_OFF_RAMP_RATE`灵活配置
- ✅ **法规风险考虑**：可以设为0以降低法规风险，更符合"技术服务商"定位

---

## 14. 相关文档

- [PayMind 统一支付流程与时序图](./PayMind统一支付流程与时序图-最终版-V1.0.md)
- [PayMind 佣金分配机制](./PayMind%20佣金分配机制%20-%20简化版%20V1.0.md)
- [EPAY测试环境配置指南](./EPAY测试环境配置指南.md)
- [EPAY对接环境变量配置](./EPAY对接环境变量配置.md)
- [EPAY Provider评估与对接方案](./EPAY%20Provider评估与对接方案.md)
- [SmartCheckout 组件源码](./paymindfrontend/components/payment/SmartCheckout.tsx)
- [PaymentService 源码](./backend/src/modules/payment/payment.service.ts)

---

**文档维护**: PayMind 开发团队  
**最后更新**: 2025年1月

