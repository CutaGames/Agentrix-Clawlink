# ERC8004 与三层ID在分账架构中的作用

**版本**: V1.0  
**日期**: 2025年1月  
**目标**: 说明 ERC8004 和三层ID系统在智能合约分账架构中的核心作用

---

## 📋 目录

1. [概述](#1-概述)
2. [ERC8004 在分账架构中的作用](#2-erc8004-在分账架构中的作用)
3. [三层ID系统在分账架构中的作用](#3-三层id系统在分账架构中的作用)
4. [两者结合的工作流程](#4-两者结合的工作流程)
5. [在分账合约中的实现](#5-在分账合约中的实现)
6. [总结](#6-总结)

---

## 1. 概述

### 1.1 核心组件

| 组件 | 作用 | 位置 |
|------|------|------|
| **ERC8004** | Session Key 管理，支持 QuickPay 免密支付 | `ERC8004SessionManager.sol` |
| **三层ID** | 身份追踪和审计，关联支付和分账记录 | 支付流程、分账合约 |
| **分账合约** | 自动分账到各角色（商户、Agent、平台） | `Commission.sol` |

### 1.2 关系图

```
用户支付
    ↓
ERC8004 Session (链上授权)
    ↓
三层ID关联 (User ID + Agent ID + Session ID)
    ↓
分账合约 (Commission.sol)
    ↓
自动分账到各角色
```

---

## 2. ERC8004 在分账架构中的作用

### 2.1 ERC8004 核心功能

**ERC8004SessionManager.sol** 提供：

1. **Session Key 管理**
   - 创建 Session（`createSession`）
   - 撤销 Session（`revokeSession`）
   - 查询 Session 状态（`getSession`）

2. **限额控制**
   - 单笔限额（`singleLimit`）
   - 每日限额（`dailyLimit`）
   - 自动重置每日限额

3. **签名验证**
   - 验证 Session Key 签名
   - 防止重放攻击

4. **支付执行**
   - 使用 Session 执行支付（`executeWithSession`）
   - 批量支付（`executeBatchWithSession`）

### 2.2 在分账架构中的作用

#### 作用 1: 提供 QuickPay 支付能力

**场景**: QuickPay (X402) 支付

```solidity
// ERC8004 合约
contract ERC8004SessionManager {
    function executeWithSession(
        bytes32 sessionId,      // ERC8004 Session ID
        address to,             // 收款地址（分账合约地址）
        uint256 amount,         // 支付金额
        bytes32 paymentId,      // 支付ID（用于关联）
        bytes calldata signature // Session Key 签名
    ) external {
        // 1. 验证 Session 和签名
        // 2. 检查限额
        // 3. 从用户钱包转账 USDC 到收款地址（分账合约）
        IERC20(usdcToken).safeTransferFrom(session.owner, to, amount);
    }
}
```

**作用**:
- ✅ 用户无需每次支付都签名（使用 Session Key）
- ✅ 支持限额控制（单笔、每日）
- ✅ 链上可验证（Session 状态在链上）

#### 作用 2: 与分账合约集成

**流程**:
```
1. 用户创建 ERC8004 Session
   ↓
2. 用户使用 Session Key 签名支付
   ↓
3. Relayer 验证签名（链下，即时确认）
   ↓
4. Relayer 调用 ERC8004.executeWithSession()
   ↓
5. ERC8004 转账 USDC 到分账合约地址
   ↓
6. 分账合约自动分账
```

**关键点**:
- ERC8004 的 `to` 参数指向分账合约地址
- ERC8004 的 `paymentId` 用于关联支付和分账记录
- ERC8004 的 `sessionId` 是 ERC8004 Session ID（不是支付 Session ID）

### 2.3 ERC8004 Session ID vs 支付 Session ID

**两个不同的 Session ID**:

| Session ID 类型 | 作用 | 生成位置 | 存储位置 |
|----------------|------|---------|---------|
| **ERC8004 Session ID** | ERC8004 Session 的唯一标识 | ERC8004 合约 `createSession()` | 链上（ERC8004 合约） |
| **支付 Session ID** | 单次支付会话的唯一标识（三层ID之一） | 后端 `uuidv4()` | 数据库、分账合约 |

**关系**:
- 一个 ERC8004 Session 可以用于多次支付
- 每次支付都有独立的支付 Session ID
- 支付 Session ID 用于关联支付和分账记录

---

## 3. 三层ID系统在分账架构中的作用

### 3.1 三层ID定义

#### User ID（用户ID）
- **作用**: 用户唯一标识
- **用途**: 追踪用户的所有支付和分账记录
- **示例**: `"pm-1763463490911-91zf91wu2"` 或 `"0x2bee8ae78e4e41cf7facc4a4387a8f299dd2b8f3"`

#### Agent ID（代理ID）
- **作用**: Agent 唯一标识（可选）
- **用途**: 追踪 Agent 的执行记录和佣金
- **示例**: `"x402_system"` 或 `"agent-erc8004-0x1234..."`

#### Session ID（会话ID）
- **作用**: 单次支付会话的唯一标识
- **用途**: 关联支付、分账、结算记录，用于追责和审计
- **示例**: `"550e8400-e29b-41d4-a716-446655440000"`

### 3.2 在分账架构中的作用

#### 作用 1: 关联支付和分账记录

**分账合约中的 Session ID**:

```solidity
// Commission.sol
struct CommissionRecord {
    bytes32 recordId;
    address payee;
    PayeeType payeeType;
    AgentType agentType;
    uint256 amount;
    address currency;
    uint256 commissionBase;
    uint256 channelFee;
    bytes32 sessionId;  // ← 支付 Session ID（三层ID之一）
    uint256 timestamp;
    bool settled;
}

function recordCommission(
    address payee,
    PayeeType payeeType,
    AgentType agentType,
    uint256 amount,
    address currency,
    uint256 commissionBase,
    uint256 channelFee,
    bytes32 sessionId  // ← 传递支付 Session ID
) external onlyOwner {
    // 记录分账，关联 Session ID
    commissions[recordId] = CommissionRecord({
        // ...
        sessionId: sessionId,  // ← 存储支付 Session ID
        // ...
    });
}
```

**作用**:
- ✅ 通过 Session ID 可以追踪单次支付的完整分账记录
- ✅ 用于审计和追责
- ✅ 关联支付、分账、结算记录

#### 作用 2: 支持多角色分账

**分账记录关联三层ID**:

```typescript
// 后端分账计算
await commissionCalculator.calculateAndRecordCommission(
    paymentId,
    payment,
    commissionBase,
    sessionId,  // ← 传递支付 Session ID
);

// 分账记录包含三层ID
interface Commission {
    paymentId: string;
    userId: string;        // ← User ID
    agentId?: string;     // ← Agent ID（可选）
    sessionId: string;    // ← Session ID
    // ...
}
```

**作用**:
- ✅ 通过 User ID 追踪用户的所有分账记录
- ✅ 通过 Agent ID 追踪 Agent 的佣金记录
- ✅ 通过 Session ID 追踪单次支付的完整流程

#### 作用 3: 追责和审计

**查询场景**:

```typescript
// 1. 查询用户的所有分账记录
const userCommissions = await commissionRepository.find({
    where: { userId: "pm-xxx" }
});

// 2. 查询 Agent 的佣金记录
const agentCommissions = await commissionRepository.find({
    where: { agentId: "agent-xxx" }
});

// 3. 查询单次支付的完整分账记录
const sessionCommissions = await commissionRepository.find({
    where: { sessionId: "550e8400-xxx" }
});
```

**作用**:
- ✅ 问题追踪：通过 Session ID 快速定位问题
- ✅ 审计：通过三层ID关联所有相关记录
- ✅ 追责：明确每个角色的责任

---

## 4. 两者结合的工作流程

### 4.1 QuickPay 支付完整流程

```
阶段 1: 用户创建 ERC8004 Session
    ↓
用户调用 ERC8004.createSession()
    ↓
生成 ERC8004 Session ID（链上）
    ↓
阶段 2: 用户发起支付
    ↓
后端创建支付记录
    ↓
生成支付 Session ID（三层ID之一，后端生成）
    ↓
阶段 3: 用户使用 Session Key 签名
    ↓
Relayer 验证签名（链下，即时确认）
    ↓
阶段 4: Relayer 调用 ERC8004.executeWithSession()
    ↓
ERC8004 转账 USDC 到分账合约
    ↓
传递 paymentId（关联支付记录）
    ↓
阶段 5: 分账合约自动分账
    ↓
调用 Commission.setSplitConfig() 设置分账配置
    ↓
传递支付 Session ID（三层ID之一）
    ↓
调用 Commission.quickPaySplit() 或 _autoSplit()
    ↓
自动分账到各角色
    ↓
记录分账事件（包含支付 Session ID）
    ↓
阶段 6: 后端记录分账
    ↓
调用 Commission.recordCommission()
    ↓
传递支付 Session ID（三层ID之一）
    ↓
链上记录分账（关联支付 Session ID）
```

### 4.2 关键关联点

#### 关联点 1: ERC8004 Session ID → 支付 Session ID

```typescript
// 支付记录
interface Payment {
    id: string;
    userId: string;                    // User ID
    agentId?: string;                 // Agent ID
    metadata: {
        sessionId: string;            // 支付 Session ID（三层ID之一）
        erc8004SessionId?: string;    // ERC8004 Session ID（可选，用于 QuickPay）
        // ...
    };
}
```

#### 关联点 2: 支付 Session ID → 分账记录

```solidity
// 分账记录
struct CommissionRecord {
    bytes32 recordId;
    // ...
    bytes32 sessionId;  // ← 支付 Session ID（三层ID之一）
    // ...
}
```

#### 关联点 3: 分账合约中的 Session ID

```solidity
// 分账配置
struct SplitConfig {
    address merchantMPCWallet;
    uint256 merchantAmount;
    // ...
    // 注意：分账配置中不直接存储 Session ID
    // Session ID 在 recordCommission() 时传递
}

// 分账函数
function quickPaySplit(
    bytes32 orderId,
    uint256 amount,
    bytes memory signature
) external {
    // 1. 验证签名
    // 2. 转账 USDC 到合约
    // 3. 自动分账
    _autoSplit(orderId, amount);
    
    // 注意：Session ID 在 recordCommission() 时记录
}
```

---

## 5. 在分账合约中的实现

### 5.1 当前实现

#### Commission.sol 中的 Session ID

```solidity
// 分账记录结构
struct CommissionRecord {
    bytes32 recordId;
    address payee;
    PayeeType payeeType;
    AgentType agentType;
    uint256 amount;
    address currency;
    uint256 commissionBase;
    uint256 channelFee;
    bytes32 sessionId;  // ← 支付 Session ID（三层ID之一）
    uint256 timestamp;
    bool settled;
}

// 记录分账函数
function recordCommission(
    address payee,
    PayeeType payeeType,
    AgentType agentType,
    uint256 amount,
    address currency,
    uint256 commissionBase,
    uint256 channelFee,
    bytes32 sessionId  // ← 传递支付 Session ID
) external onlyOwner {
    // 创建分账记录，关联 Session ID
    commissions[recordId] = CommissionRecord({
        // ...
        sessionId: sessionId,  // ← 存储支付 Session ID
        // ...
    });
    
    emit CommissionRecorded(
        recordId,
        payee,
        payeeType,
        agentType,
        amount,
        currency,
        commissionBase,
        channelFee,
        sessionId  // ← 事件中包含 Session ID
    );
}
```

### 5.2 改进建议（多场景支持）

#### 建议 1: 在分账配置中关联 Session ID

```solidity
// 分账配置
struct SplitConfig {
    address merchantMPCWallet;
    uint256 merchantAmount;
    address referrer;
    uint256 referralFee;
    address executor;
    uint256 executionFee;
    uint256 platformFee;
    bool executorHasWallet;
    uint256 settlementTime;
    bool isDisputed;
    bytes32 sessionId;  // ← 添加支付 Session ID（三层ID之一）
}

// 设置分账配置
function setSplitConfig(
    bytes32 orderId,
    SplitConfig memory config
) external onlyOwner {
    orderSplitConfigs[orderId] = config;
    emit SplitConfigSet(orderId, config);
}
```

#### 建议 2: 在分账事件中记录 Session ID

```solidity
// 分账事件
event PaymentAutoSplit(
    bytes32 indexed orderId,
    bytes32 indexed sessionId,  // ← 添加支付 Session ID
    address indexed merchantWallet,
    uint256 totalAmount,
    uint256 merchantAmount,
    uint256 platformFee,
    uint256 executionFee,
    uint256 referralFee
);

// 自动分账函数
function _autoSplit(bytes32 orderId, uint256 totalAmount) internal {
    SplitConfig storage config = orderSplitConfigs[orderId];
    // ... 分账逻辑 ...
    
    emit PaymentAutoSplit(
        orderId,
        config.sessionId,  // ← 记录支付 Session ID
        config.merchantMPCWallet,
        totalAmount,
        config.merchantAmount,
        config.platformFee,
        config.executionFee,
        config.referralFee
    );
}
```

---

## 6. 总结

### 6.1 ERC8004 的作用

**在分账架构中**:
1. ✅ **提供 QuickPay 支付能力**: 支持免密支付，提升用户体验
2. ✅ **限额控制**: 单笔和每日限额，降低风险
3. ✅ **链上可验证**: Session 状态在链上，可审计
4. ✅ **与分账合约集成**: 转账 USDC 到分账合约，触发自动分账

**关键点**:
- ERC8004 Session ID 是 ERC8004 Session 的唯一标识（链上）
- 支付 Session ID 是单次支付会话的唯一标识（三层ID之一）
- 两者是不同的概念，但可以关联

### 6.2 三层ID系统的作用

**在分账架构中**:
1. ✅ **关联支付和分账记录**: 通过 Session ID 追踪单次支付的完整分账记录
2. ✅ **支持多角色分账**: 通过 User ID 和 Agent ID 追踪各角色的分账记录
3. ✅ **追责和审计**: 通过三层ID关联所有相关记录，便于问题追踪

**关键点**:
- User ID: 用户唯一标识，追踪用户的所有记录
- Agent ID: Agent 唯一标识（可选），追踪 Agent 的佣金记录
- Session ID: 支付会话唯一标识，关联单次支付的完整流程

### 6.3 两者结合的价值

**完整追踪链**:
```
ERC8004 Session ID (链上)
    ↓
支付 Session ID (三层ID之一)
    ↓
分账记录 (关联支付 Session ID)
    ↓
结算记录 (关联支付 Session ID)
```

**优势**:
- ✅ **可追溯**: 从 ERC8004 Session 到分账记录，完整追踪
- ✅ **可审计**: 所有记录关联三层ID，便于审计
- ✅ **可追责**: 明确每个角色的责任和记录

### 6.4 实施建议

**当前状态**:
- ✅ ERC8004 合约已实现
- ✅ 三层ID系统已实现
- ✅ 分账合约支持 Session ID

**改进建议**:
1. 在分账配置中添加 Session ID 字段
2. 在分账事件中记录 Session ID
3. 完善 ERC8004 与分账合约的集成

---

**文档维护**: Agentrix 开发团队  
**最后更新**: 2025年1月

