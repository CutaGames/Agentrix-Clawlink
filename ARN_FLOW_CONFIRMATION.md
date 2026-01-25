# ARN Protocol & Commission Flow Confirmation

## 1. 核心业务逻辑确认

### 1.1 双轨资金流向 (Dual Path Flow)

系统支持两种支付路径，根据支付方式区分是否收取 0.3% 平台费。

#### 路径 A: X402 协议支付 (QuickPay)
- **适用场景**: 聚合平台支付、Session Key 自动支付。
- **费用**: **强制收取 0.3%** 给 `ArnTreasury`。
- **流向**:
  1. 用户 -> `ArnSessionManager`
  2. -> `ArnFeeSplitter` (**扣除 0.3%**)
  3. -> `Commission.sol` (分发剩余 99.7%)

#### 路径 B: 非 X402 支付 (Direct/Fiat)
- **适用场景**: 用户钱包直接签名、法币通道 (Fiat-to-Crypto)、普通转账。
- **费用**: **不收取 0.3%** 平台费。
- **流向**:
  1. 用户/Provider -> `Commission.sol` (调用 `walletSplit` 或 `providerFiatToCryptoSplit`)
  2. -> `Commission.sol` (分发 100% 资金)

### 1.2 详细分账规则

#### A. 平台侧 (`ArnTreasury`) - 仅路径 A 触发
- **来源**: X402 交易额的 0.3%
- **分配**:
  - 40% -> Watcher
  - 30% -> Operator
  - 20% -> Public Goods
  - 10% -> Security Reserve

#### B. 商户/渠道侧 (`Commission.sol`) - 路径 A 和 B 均触发
- **来源**: 
  - 路径 A: 交易额的 99.7%
  - 路径 B: 交易额的 100%
- **分配逻辑**:
  - **商户 (Merchant)**: 基础收入
  - **渠道/Agent**: 额外激励 (由商户设置)
  - **平台 (Platform)**: 额外平台费 (可选，与 0.3% 独立)
  - **Off-ramp**: 出金费用 (可选)

## 2. 合约交互流程

### 场景 1: X402 支付 (Backend + Contract)
1. **后端**: 
   - 调用 `Commission.setSplitConfig` (基于 99.7% 金额或 100% 金额? **需确认**)。
     - *修正*: `SplitConfig` 应基于实际入账金额。如果是 X402，入账是 99.7%。如果是直付，入账是 100%。
   - 生成指向 `ArnFeeSplitter.quickPaySplit` 的 calldata。
2. **链上**: `ArnFeeSplitter` 扣费后调用 `Commission.quickPaySplit`。

### 场景 2: 钱包直付 (Frontend + Contract)
1. **后端**: 调用 `Commission.setSplitConfig` (基于 100% 金额)。
2. **前端**: 用户直接调用 `Commission.walletSplit(orderId, amount)`。
3. **链上**: 全额进入 `Commission` 并分发。

## 3. 待确认点与风险 (Critical)

### 3.1 缺失的后端逻辑 (Critical Gap)
- **现状**: 目前后端代码 (`payment.service.ts`) **没有** 调用 `Commission.setSplitConfig` 的逻辑。
- **后果**: `Commission` 无法分账。
- **解决方案**: 在后端补充 `setSplitConfig` 调用。

### 3.2 金额一致性 (已确认)
- **策略**: **平台承担 (Option B)**
- **逻辑**: X402 渠道产生的 0.3% 费用，从 **PayMind 平台基础费率** 中扣除。
- **计算示例 (实物商品)**:
  - 总佣金: 3.0% (商户到手 97%)
  - 正常分账: Agent 2.5% + PayMind 0.5%
  - **X402 分账**: 
    - 扣除 0.3% 给 `ArnTreasury`
    - 剩余 99.7% 进入 Commission
    - Commission 分发: Agent 2.5% + **PayMind 0.2%** (0.5 - 0.3) + 商户 97%
    - 总计: 0.3 + 2.5 + 0.2 + 97 = 100%
- **可行性**: 
  - 实物 (0.5% > 0.3%) -> OK
  - 虚拟/服务 (1.0% > 0.3%) -> OK
  - NFT (1.0% > 0.3%) -> OK

## 4. 部署参数

   - `Commission` 的 `SplitConfig` 中各项金额之和必须等于 (或小于) 这个入账金额。
   - **确认**: 后端计算 `SplitConfig` 时，是否已经扣除了 0.3% 的平台费？(即 `merchant + agent + referrer = total * 0.997`)

## 4. 部署参数

- **Network**: BSC Testnet
- **Commission Contract**: `0xa0C571F348Bc1C8E08F8fcFc8805254eF128B48D`
- **USDC (Testnet)**: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`

请确认以上流程和逻辑是否符合您的预期。确认无误后，我将执行部署。
