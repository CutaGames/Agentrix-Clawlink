# PayMind智能合约功能说明

**日期**: 2025-11-26  
**版本**: V2.2

---

## 📋 合约概览

PayMind系统包含以下智能合约：

| 合约名称 | 主要作用 | 状态 |
|---------|---------|------|
| **ERC8004SessionManager** | Session Key管理（QuickPay核心） | ✅ 已部署 |
| **PaymentRouter** | 支付路由与记录管理 | ✅ 已部署 |
| **X402Adapter** | X402协议批量支付适配 | ✅ 已部署 |
| **AutoPay** | 自动支付授权管理 | ✅ 已部署 |
| **Commission** | 分润结算与自动分账 | ✅ 已部署（今天更新） |

---

## 1. ERC8004SessionManager（Session Key管理合约）

### 核心作用
管理用户的Session Key，实现QuickPay免密支付功能。

### 主要功能
- ✅ **创建Session**: 用户授权创建Session Key，设置限额
- ✅ **执行支付**: 使用Session Key签名执行支付（无需用户每次确认）
- ✅ **批量支付**: 支持批量交易，节省Gas
- ✅ **限额管理**: 单次限额、每日限额、过期时间
- ✅ **Session撤销**: 用户可以随时撤销Session

### 业务价值
- **用户体验**: 免密支付，提升支付速度
- **安全性**: 链上验证，限额控制
- **Gas优化**: 批量处理，降低交易成本

### 与其他合约的关系
- 被 **X402Adapter** 使用（X402协议需要Session）
- 被 **PaymentRouter** 调用（路由到X402支付）
- 与 **Commission** 配合（支付后自动分账）

---

## 2. PaymentRouter（支付路由合约）

### 核心作用
统一管理多种支付方式的路由选择，记录所有支付交易。

### 主要功能

#### 2.1 多支付方式路由
支持四种支付方式：
- **STRIPE**: 传统支付网关（法币支付）
- **WALLET**: 钱包直接支付（ETH/ERC20）
- **X402**: X402协议批量支付（QuickPay）
- **MULTISIG**: 多签支付

#### 2.2 支付通道管理
```solidity
struct PaymentChannel {
    address channelAddress;  // 通道合约地址
    bool isActive;           // 是否激活
    uint256 priority;        // 优先级（数字越大优先级越高）
    uint256 minAmount;       // 最小金额
    uint256 maxAmount;       // 最大金额
}
```

#### 2.3 支付记录追踪
- 记录每笔支付的完整信息（支付ID、付款人、收款人、金额、方式等）
- 支持支付状态查询
- 事件日志记录（`PaymentRouted`, `PaymentCompleted`）

#### 2.4 余额管理
- 管理用户余额（用于某些支付方式）
- 支持余额提取（withdraw）

### 业务价值
- **统一接口**: 为不同支付方式提供统一的路由入口
- **灵活配置**: 可根据业务需求动态调整支付通道参数
- **可追溯性**: 所有支付记录上链，保证透明度和可审计性
- **智能路由**: 根据优先级、成本、速度等因素选择最优支付通道

### 与其他合约的关系
- **调用 X402Adapter**: 当选择X402支付方式时
- **通知 Commission**: 支付完成后触发分账
- **被后端调用**: 后端服务根据智能路由结果调用相应合约

---

## 3. X402Adapter（X402协议适配器）

### 核心作用
实现X402协议，支持批量支付和数据压缩，优化Gas成本。

### 主要功能

#### 3.1 X402会话管理
```solidity
struct X402Session {
    bytes32 sessionId;       // 会话ID
    bytes32 paymentId;       // 支付ID
    address payer;           // 付款人
    address recipient;       // 收款人
    uint256 amount;         // 金额
    bytes compressedData;    // 压缩的交易数据
    bool executed;           // 是否已执行
    uint256 createdAt;       // 创建时间
    uint256 expiresAt;       // 过期时间
}
```

#### 3.2 批量支付处理
- 支持批量签名验证
- 数据压缩以节省Gas（可节省约40%的Gas费用）
- 通过中继器（Relayer）执行，用户无需支付Gas

#### 3.3 与PaymentRouter集成
- 接收PaymentRouter的路由请求
- 执行支付后通知PaymentRouter完成

### 业务价值
- **Gas优化**: 批量处理和数据压缩，大幅降低Gas成本
- **用户体验**: 中继器代付Gas，用户无需准备Gas费
- **批量处理**: 支持一次处理多笔交易，提高效率

### 与其他合约的关系
- **依赖 ERC8004SessionManager**: 使用Session Key进行签名
- **被 PaymentRouter 调用**: 作为X402支付通道
- **与 Commission 配合**: 支付后触发自动分账

---

## 4. AutoPay（自动支付授权合约）

### 核心作用
管理用户对Agent的自动支付授权，允许Agent在授权范围内自动执行支付。

### 主要功能

#### 4.1 授权管理
```solidity
struct Grant {
    address user;            // 用户地址
    address agent;           // Agent地址
    uint256 singleLimit;     // 单次限额
    uint256 dailyLimit;      // 每日限额
    uint256 usedToday;       // 今日已用
    uint256 lastResetDate;   // 上次重置日期
    uint256 expiresAt;       // 过期时间
    bool isActive;           // 是否激活
}
```

#### 4.2 限额控制
- **单次限额**: 限制Agent单次支付的最大金额
- **每日限额**: 限制Agent每日支付的总金额
- **自动重置**: 每日限额自动重置

#### 4.3 自动支付执行
- Agent在授权范围内可以自动执行支付
- 自动检查限额和授权有效性
- 记录所有自动支付交易

### 业务价值
- **自动化**: Agent可以自动执行重复性支付，无需用户每次确认
- **安全性**: 严格的限额控制，防止滥用
- **灵活性**: 用户可以随时撤销授权

### 使用场景
- **订阅服务**: Agent自动续费订阅
- **定期支付**: Agent自动执行定期账单支付
- **批量操作**: Agent批量处理多个支付请求

### 与其他合约的关系
- **与 PaymentRouter 配合**: 自动支付通过PaymentRouter路由
- **与 Commission 配合**: 自动支付后触发分账

---

## 5. Commission（分润结算合约）

### 核心作用
管理Agent和商户的分润记录，实现自动分账功能（今天新增的核心功能）。

### 主要功能

#### 5.1 原有功能（向后兼容）
- **记录分润**: 记录Agent和商户的佣金
- **创建结算**: 创建结算记录
- **分发佣金**: 手动触发佣金分发（`distributeCommission`）
- **订单同步**: 同步订单信息（`syncOrder`）

#### 5.2 新增功能（非托管支付流程）⭐

**统一分账函数** `_autoSplit()`:
- 核心分账逻辑，自动分配资金到各参与方

**多场景分账**:
- `quickPaySplit()` - QuickPay场景（X402 Session支付）
- `walletSplit()` - 钱包直接转账场景
- `providerFiatToCryptoSplit()` - Provider法币转数字货币场景

**分账配置管理**:
- `setSplitConfig()` - 设置订单分账配置
- `getSplitConfig()` - 查询分账配置
- `setAuthorizedProvider()` - 设置Provider白名单
- `setDisputeStatus()` - 设置争议状态

**分账配置结构**:
```solidity
struct SplitConfig {
    address merchantMPCWallet;  // 商户 MPC 钱包地址
    uint256 merchantAmount;     // 商户金额
    address referrer;            // 推荐人地址
    uint256 referralFee;         // 推荐人佣金
    address executor;            // 执行Agent地址
    uint256 executionFee;        // 执行Agent佣金
    uint256 platformFee;         // 平台费用
    bool executorHasWallet;      // 执行Agent是否有钱包
    uint256 settlementTime;       // 结算时间（0表示即时结算）
    bool isDisputed;             // 是否有争议
    bytes32 sessionId;           // Session ID（三层ID之一）
}
```

### 业务价值
- **自动分账**: 支付后自动分配资金，无需手动操作
- **多角色支持**: 支持商户、推荐人、执行Agent、平台等多方分账
- **非托管**: 资金直接分配到各方钱包，不经过PayMind托管
- **合规性**: 链上透明，可审计

### 分账流程
```
用户支付 → Commission合约接收USDT
    ↓
自动分账 (_autoSplit)
    ├─→ 商户MPC钱包（merchantAmount）
    ├─→ 推荐人钱包（referralFee）
    ├─→ 执行Agent钱包（executionFee）
    └─→ 平台金库（platformFee）
```

### 与其他合约的关系
- **被 PaymentRouter 调用**: 支付完成后触发分账
- **被 X402Adapter 调用**: X402支付后触发分账
- **被 AutoPay 调用**: 自动支付后触发分账
- **与 ERC8004 配合**: 使用Session ID进行关联

---

## 🔄 合约协作流程

### 典型支付流程

```
用户发起支付
    ↓
后端智能路由选择支付方式
    ↓
PaymentRouter.routePayment()
    ↓
    ├─→ STRIPE → 传统支付网关
    ├─→ WALLET → 钱包直接支付 → Commission.walletSplit()
    ├─→ X402 → X402Adapter → ERC8004SessionManager → Commission.quickPaySplit()
    └─→ MULTISIG → 多签支付
    ↓
支付完成
    ↓
Commission._autoSplit() 自动分账
    ├─→ 商户MPC钱包
    ├─→ 推荐人钱包
    ├─→ 执行Agent钱包
    └─→ 平台金库
    ↓
分账完成，事件记录
```

### QuickPay支付流程（详细）

```
1. 用户创建ERC8004 Session
   ERC8004SessionManager.createSession()
   ↓
2. 用户发起支付（使用Session Key签名）
   ↓
3. Relayer验证签名（链下，毫秒级）
   ↓
4. 即时确认支付（商户可发货）
   ↓
5. Relayer异步上链
   X402Adapter.executePayment()
   ↓
6. 调用Commission.quickPaySplit()
   ↓
7. Commission._autoSplit() 自动分账
   ↓
8. 资金分配到各方钱包
```

---

## 📊 合约部署状态

### BSC测试网部署

| 合约 | 地址 | 状态 | 备注 |
|------|------|------|------|
| ERC8004SessionManager | 0x... | ✅ 已部署 | Session Key管理 |
| PaymentRouter | 0x... | ✅ 已部署 | 支付路由 |
| X402Adapter | 0x... | ✅ 已部署 | X402协议适配 |
| AutoPay | 0x... | ✅ 已部署 | 自动支付授权 |
| **Commission** | **0x...** | **⚠️ 需要更新** | **今天新增功能，需重新部署** |

---

## 🎯 各合约的核心价值

### ERC8004SessionManager
- **核心价值**: 实现QuickPay免密支付，提升用户体验
- **关键特性**: Session Key管理、限额控制、批量处理

### PaymentRouter
- **核心价值**: 统一支付接口，智能路由选择
- **关键特性**: 多支付方式支持、支付记录追踪、灵活配置

### X402Adapter
- **核心价值**: Gas优化，批量支付处理
- **关键特性**: 数据压缩、批量签名、中继器执行

### AutoPay
- **核心价值**: 自动化支付，提升效率
- **关键特性**: 授权管理、限额控制、自动执行

### Commission
- **核心价值**: 自动分账，非托管支付流程
- **关键特性**: 多场景支持、自动分配、链上透明

---

## 🔗 合约依赖关系

```
PaymentRouter (核心路由)
    ├─→ X402Adapter (X402支付)
    │   └─→ ERC8004SessionManager (Session管理)
    ├─→ AutoPay (自动支付)
    └─→ Commission (分账结算)
        └─→ 使用ERC8004的Session ID
```

---

## 📝 总结

### 合约职责划分

1. **ERC8004SessionManager**: Session Key管理，QuickPay基础
2. **PaymentRouter**: 支付路由和记录，统一入口
3. **X402Adapter**: X402协议实现，Gas优化
4. **AutoPay**: 自动支付授权，提升效率
5. **Commission**: 分账结算，非托管支付核心

### 协作关系

- **PaymentRouter** 作为核心路由，协调各支付方式
- **X402Adapter** 和 **ERC8004** 配合实现QuickPay
- **Commission** 负责所有支付场景的分账
- **AutoPay** 提供自动化支付能力

### 今天的主要更新

- ✅ **Commission合约新增自动分账功能**
- ✅ 支持QuickPay、钱包转账、Provider三种场景
- ✅ 实现非托管支付流程的核心功能

---

**文档维护**: PayMind 开发团队  
**最后更新**: 2025-11-26

