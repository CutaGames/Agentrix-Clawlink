# Agentrix 资金路径与分账分析文档

**文档版本**: v1.0  
**更新日期**: 2026年1月16日  
**适用合约版本**: 审计修复后版本

---

## 一、概述

本文档详细分析 Agentrix 合约体系中的资金流转路径，以 **$100 USDC** 为例，展示不同支付场景和参与方的资金分配情况。

### 1.1 核心合约

| 合约 | 功能 | 资金流向 |
|------|------|----------|
| **Commission.sol** | 分账结算主合约 | 接收资金 → 分账到各方 |
| **PaymentRouter.sol** | 支付路由 | 路由支付请求到对应通道 |
| **X402Adapter.sol** | X402协议适配器 | Session签名验证 + ETH支付 |
| **ERC8004SessionManager.sol** | Session Key管理 | 高频小额支付授权 |
| **AutoPay.sol** | 自动支付 | Agent自动扣款授权 |
| **AuditProof.sol** | 结果审计托管 | 任务完成验证 + 资金释放 |

### 1.2 分账参与方

| 角色 | 说明 | 典型费率 |
|------|------|----------|
| **商户 (Merchant)** | SKU/服务提供者 | 收取商品价格 |
| **执行Agent (Executor)** | 执行购买任务的Agent | 0.5% - 2% |
| **推荐人 (Referrer)** | 推荐用户/Agent | 0.5% - 1% |
| **平台 (Platform/PayMind)** | Agentrix平台 | 1% - 2% |
| **Off-ramp费用** | 法币出金服务费 | 0% - 0.1% |

---

## 二、支付场景详解

### 2.1 场景1: QuickPay (X402 Session)

**适用场景**: Agent高频、小额、自动化支付

**资金流向**:
```
用户钱包 → [safeTransferFrom] → Commission合约 → [_autoSplit] → 各分账方
```

#### 示例: $100 支付（标准分成）

| 参与方 | 费率 | 金额 (USDC) | 说明 |
|--------|------|-------------|------|
| 商户 | - | $76.00 | 商品原价 |
| 执行Agent | 1.5% | $1.50 | 执行任务佣金 |
| 推荐人 | 0.5% | $0.50 | 推荐佣金 |
| 平台 | 2.0% | $2.00 | 平台服务费 |
| Off-ramp | 0% | $0.00 | 无出金费用 |
| **总计** | - | **$80.00** | 用户支付总额 |

> **注意**: 商品价格 $76 + 分成 $4 = 用户支付 $80（商户定价已包含利润）

#### 完整分账配置示例

```solidity
SplitConfig({
    merchantMPCWallet: 0x商户MPC钱包地址,
    merchantAmount: 76_000000,      // $76 (6 decimals)
    referrer: 0x推荐人地址,
    referralFee: 500000,            // $0.50
    executor: 0x执行Agent地址,
    executionFee: 1500000,          // $1.50
    platformFee: 2000000,           // $2.00
    offRampFee: 0,                  // $0.00
    executorHasWallet: true,
    settlementTime: 0,              // 即时结算
    isDisputed: false,
    sessionId: bytes32(Session ID),
    proofHash: bytes32(0),
    auditor: address(0),
    requiresProof: false,
    proofVerified: false
})
```

---

### 2.2 场景2: 钱包直接转账 (Wallet)

**适用场景**: 用户直接使用钱包支付

**资金流向**:
```
用户钱包 → [safeTransferFrom] → Commission合约 → [_autoSplit] → 各分账方
```

#### 示例: $100 支付（无执行Agent）

| 参与方 | 费率 | 金额 (USDC) | 说明 |
|--------|------|-------------|------|
| 商户 | - | $78.00 | 商品原价 |
| 执行Agent | 0% | $0.00 | 用户自行操作，无Agent |
| 推荐人 | 0.5% | $0.50 | 推荐佣金 |
| 平台 | 1.5% | $1.50 | 平台服务费（降低） |
| Off-ramp | 0% | $0.00 | 无出金费用 |
| **总计** | - | **$80.00** | 用户支付总额 |

---

### 2.3 场景3: Provider 法币转数字货币

**适用场景**: 用户通过 Transak/Stripe 等法币入金后购买

**资金流向**:
```
用户法币 → Provider(Transak) → USDC → Commission合约 → [_autoSplit] → 各分账方
```

#### 示例: $100 法币支付

| 参与方 | 费率 | 金额 (USDC) | 说明 |
|--------|------|-------------|------|
| 商户 | - | $73.00 | 商品原价 |
| 执行Agent | 1.5% | $1.50 | 执行任务佣金 |
| 推荐人 | 0.5% | $0.50 | 推荐佣金 |
| 平台 | 2.0% | $2.00 | 平台服务费 |
| Off-ramp | 0.1% | $0.10 | PayMind出金服务费 |
| Provider费用 | 3% | $2.90 | Transak通道费（链下扣除） |
| **总计** | - | **$80.00** | 用户支付的USDC |

> **注意**: Provider费用在链下扣除，用户实际收到约 $77.10 的USDC到合约

---

### 2.4 场景4: AutoPay 自动扣款

**适用场景**: Agent订阅服务、周期性扣款

**资金流向**:
```
用户钱包 → [safeTransferFrom via AutoPay] → 收款方
```

#### 示例: $10 订阅费

| 参与方 | 金额 (USDC) | 说明 |
|--------|-------------|------|
| 收款方 (Agent/服务商) | $10.00 | 直接转账，无分账 |

> **注意**: AutoPay 为直接转账模式，不经过 Commission 分账

---

### 2.5 场景5: AuditProof 托管任务

**适用场景**: 需要任务验证才释放资金的场景

**资金流向**:
```
用户 → [fundTask] → AuditProof托管 → [验证通过] → 执行者 + 平台
```

#### 示例: $100 任务托管

| 阶段 | 参与方 | 金额 (USDC) | 说明 |
|------|--------|-------------|------|
| 托管 | AuditProof合约 | $101.00 | $100 + 1%平台费 |
| 释放 | 执行者 | $100.00 | 任务完成后释放 |
| 释放 | 平台 | $1.00 | 平台服务费 |

---

## 三、多链 Decimals 兼容

### 3.1 支持的链和代币

| 链 | 代币 | Decimals | 说明 |
|----|------|----------|------|
| BASE | USDC | 6 | 主要部署链 |
| BNB Chain | USDT | 18 | 需要精度转换 |

### 3.2 精度转换逻辑

```solidity
// ERC8004SessionManager.sol
uint8 tokenDecimals = IERC20Metadata(usdcToken).decimals();
uint256 amountForTransfer = amount;

if (tokenDecimals != 6) {
    if (tokenDecimals > 6) {
        // 6 -> 18: 乘以 10^12
        uint256 scaleFactor = 10 ** (tokenDecimals - 6);
        amountForTransfer = amount * scaleFactor;
    } else {
        // 6 -> 3: 除以 10^3
        uint256 scaleFactor = 10 ** (6 - tokenDecimals);
        amountForTransfer = amount / scaleFactor;
    }
}
```

---

## 四、分账精度处理

### 4.1 精度残留处理

Commission 合约在 `_autoSplit` 中处理精度残留：

```solidity
// 处理精度损失：将剩余金额转给平台
if (totalAmount > distributed) {
    uint256 remaining = totalAmount - distributed;
    settlementToken.safeTransfer(paymindTreasury, remaining);
}
```

### 4.2 示例: $100.123456 支付

| 分配目标 | 计算金额 | 实际分配 |
|----------|----------|----------|
| 商户 (76%) | $76.093827 | $76.093827 |
| 执行Agent (1.5%) | $1.501851 | $1.501851 |
| 推荐人 (0.5%) | $0.500617 | $0.500617 |
| 平台 (2%) | $2.002469 | $2.002469 |
| **小计** | $80.098764 | $80.098764 |
| **精度残留** | - | $0.024692 → 平台 |
| **总计** | $100.123456 | $100.123456 |

---

## 五、完整资金路径矩阵

### 5.1 $100 支付 - 所有场景对比

| 场景 | 商户 | 执行Agent | 推荐人 | 平台 | Off-ramp | 合计 |
|------|------|-----------|--------|------|----------|------|
| **QuickPay (标准)** | $76.00 | $1.50 | $0.50 | $2.00 | $0.00 | $80.00 |
| **QuickPay (无推荐)** | $76.00 | $1.50 | $0.00 | $2.50 | $0.00 | $80.00 |
| **钱包直接 (无Agent)** | $78.00 | $0.00 | $0.50 | $1.50 | $0.00 | $80.00 |
| **Provider法币** | $73.00 | $1.50 | $0.50 | $2.00 | $0.10 | $77.10* |
| **AutoPay** | - | $10.00 | - | - | - | $10.00 |
| **AuditProof** | - | $100.00 | - | $1.00 | - | $101.00 |

> *Provider场景：链下Provider费用约$2.90额外扣除

### 5.2 分成比例配置参考

| 配置类型 | 商户 | 执行Agent | 推荐人 | 平台 | Off-ramp |
|----------|------|-----------|--------|------|----------|
| **高价值商品** | 95% | 1% | 0.5% | 1.5% | 0% |
| **标准商品** | 76-80% | 1-2% | 0.5-1% | 2% | 0-0.1% |
| **数字内容** | 70% | 2% | 1% | 2% | 0% |
| **订阅服务** | 85% | 0% | 1% | 2% | 0% |

---

## 六、特殊情况处理

### 6.1 执行Agent无钱包

```solidity
// Commission.sol
if (config.executionFee > 0) {
    address target = config.executorHasWallet 
        ? config.executor 
        : systemRebatePool;  // 转到系统返利池
    if (target == address(0)) {
        target = paymindTreasury;  // 最终回退到平台
    }
    settlementToken.safeTransfer(target, config.executionFee);
}
```

### 6.2 争议订单

- 设置 `isDisputed = true` 后，所有分账操作将被拒绝
- 需要管理员介入解决争议后才能继续

### 6.3 Audit Proof 验证

- 当 `requiresProof = true` 时，必须先验证 proof
- 支持三种验证模式：SIGNATURE、HASH_MATCH、MULTISIG

---

## 七、安全审计修复验证

| 问题编号 | 问题描述 | 修复状态 | 验证方式 |
|----------|----------|----------|----------|
| C-01 | AutoPay ERC20 模式 | ✅ 已修复 | `safeTransferFrom` |
| C-02 | X402 EIP-712 签名 | ✅ 已修复 | `_hashTypedDataV4` |
| C-03 | Commission SafeERC20 | ✅ 已修复 | 全面使用 |
| H-01 | PaymentRouter nonReentrant | ✅ 已修复 | `withdraw()` |
| H-02 | 分账精度残留 | ✅ 已修复 | `totalAmount - distributed` |
| H-03 | 批量执行内部调用 | ✅ 已修复 | `_executeWithSession` |
| H-04 | Provider 转账验证 | ✅ 已修复 | 余额差值验证 |
| H-05 | 多链 decimals | ✅ 已修复 | `IERC20Metadata.decimals()` |
| M-03 | Pausable 机制 | ✅ 已修复 | 所有合约 |
| I-04 | 固定 Solidity 版本 | ✅ 已修复 | `0.8.20` |

---

## 八、测试验证报告

**测试日期**: 2026年1月16日  
**测试结果**: 35 passing / 0 failing

### 测试覆盖

| 合约 | 测试用例数 | 通过 |
|------|------------|------|
| AutoPay | 7 | ✅ |
| Commission | 14 | ✅ |
| X402Adapter | 7 | ✅ |
| PaymentRouter | 4 | ✅ |

---

*文档由 Agentrix 团队生成*
