# Agentrix 佣金体系说明文档

> 最后更新: 2026-02-14 (V5 审计更新)

---

## 一、整体架构

Agentrix 佣金体系分为 **三层**：

| 层级 | 合约 | 适用场景 | 是否必须 |
|------|------|----------|---------|
| **Layer 1: Commerce Skill 佣金** | `Commission.sol` (V5) | 所有 Skill/商品购买 | ✅ 强制 |
| **Layer 2: 商户自定义分润** | `CommissionV2.sol` (SplitPlan) | 商户自行设置分润方案 | ❌ 可选 |
| **Layer 3: 任务市场佣金** | ⚠️ **尚未实现** | 任务发布/接单/推荐 | ❌ 待开发 |

---

## 二、Layer 1: Commerce Skill 佣金 (Commission.sol V5)

### 2.1 费率结构

根据 **Skill 层级** 确定平台费和激励池比例：

| Skill 层级 | 平台费 | Agent 激励池 | 合计抽成 | 典型场景 |
|-----------|--------|-------------|---------|---------|
| **INFRA** (基础设施层) | 0.5% | 2.0% | 2.5% | API接口、数据源 |
| **RESOURCE** (资源层) | 0.5% | 2.5% | 3.0% | 存储、计算资源 |
| **LOGIC** (逻辑层) | 1.0% | 4.0% | 5.0% | AI模型、算法服务 |
| **COMPOSITE** (组合层/插件) | 3.0% | 7.0% | 10.0% | 完整应用、插件 |

### 2.2 Agent 激励池分配 (7:3 规则)

激励池按照角色分配：

```
激励池总额
├── 执行 Agent (Executor): 70%  — 实际执行任务/提供服务的 Agent
└── 推荐 Agent (Referrer):  30%  — 推荐用户购买的 Agent
```

**缺失角色时的处理：**
- 无 Executor → 其 70% 份额归入平台基金池 (Treasury)
- 无 Referrer → 其 30% 份额归入平台基金池
- Executor 无钱包 → 其份额归入系统返利池 (systemRebatePool)

### 2.3 推广者 (Promoter) 分成

推广者从**平台费**中获取 20% 分成：

```
平台费
├── Promoter (推广者): 20% of 平台费
└── 平台净收入:       80% of 平台费
```

### 2.4 后端费率 (V5 — financial-architecture.config.ts)

后端主支付流程使用 `CommissionCalculatorService` (V5)，从 `financial-architecture.config.ts` 读取费率。
`CommissionStrategyV4Service` 仅用于 `AttributionCommissionService` 归因追踪。

**✅ 确认: 后端使用 V5 逻辑，不是 V4。**
`payment.service.ts` 注入 `CommissionCalculatorService`，调用 `calculateAndRecordCommission()`。

| 资产类型 | 平台费 (baseRate) | Agent 激励池 (poolRate) | 通道费 | 合计 |
|---------|--------|------------|-------|------|
| PHYSICAL (实物) | 0.5% | 2.5% | 0% | 3.0% |
| SERVICE (服务) | 1.0% | 4.0% | 0% | 5.0% |
| VIRTUAL (虚拟) | 0.5% | 2.5% | 0% | 3.0% |
| NFT_RWA | 0.5% | 2.0% | 0% | 2.5% |
| DEV_TOOL (COMPOSITE) | 3.0% | 7.0% | 0% | 10.0% |
| SUBSCRIPTION | 0.5% | 2.5% | 0% | 3.0% |

### 2.4.1 用户自定义费率覆盖

`resolveRates()` 支持通过 `RateComputationContext` 覆盖默认费率：
- `poolRateOverride` — 覆盖激励池比例
- `baseRateOverride` — 覆盖平台费比例
- 动态模式: `virtual_band` (带上下限), `web2_upstream` (跟随上游), `web3_fee` (跟随swap费率)

**结论: 用户/商户可在 V5 强制费率之上自定义费率，但不能低于默认值。**

### 2.5 扫描商品额外费率 (V5.0 新增)

通过平台扫描导入的外部商品，**用户额外承担**费用（商户收到原始金额不变）：

| 商品来源 | 用户额外费率 |
|---------|------------|
| SCANNED_UCP (平台扫描 UCP) | 1.0% |
| SCANNED_X402 (平台扫描 X402) | 1.0% |
| SCANNED_FT (扫描 FT 资产) | 0.3% |
| SCANNED_NFT (扫描 NFT 资产) | 0.3% |

推荐 Agent 可获得扫描费用的 20%。

### 2.6 资金流向图

```
用户支付 $100 (以 SERVICE 类型为例, 平台费1%, 激励池4%)
│
├── 商户净收入: $95.00  (100 - 1% - 4%)
├── 平台费:     $1.00   (1%)
│   ├── Promoter:  $0.20  (平台费的20%)
│   └── 平台净收:  $0.80  (平台费的80%)
└── 激励池:     $4.00   (4%)
    ├── Executor:  $2.80  (激励池的70%)
    └── Referrer:  $1.20  (激励池的30%)

注: X402 通道费已取消 (0%), 不再从任何方扣除。
```

---

## 三、Layer 2: 商户自定义分润 (CommissionV2.sol SplitPlan)

### 3.1 核心概念

商户可创建自定义 **SplitPlan** (分润方案)，定义参与者和分成比例。

### 3.2 SplitPlan 结构

```solidity
SplitPlan {
    planId:    bytes32      // 方案ID
    owner:     address      // 创建者(商户)
    name:      string       // 方案名称
    rules:     SplitRule[]  // 分成规则
    feeConfig: FeeConfig    // 费率配置
    active:    bool         // 是否激活
}

SplitRule {
    recipient: address  // 接收者地址
    shareBps:  uint16   // 分成比例 (basis points, 10000=100%)
    role:      string   // 角色: "platform", "merchant", "agent", "referrer"
}
```

**关键约束：** 所有 rules 的 shareBps 总和必须等于 10000 (100%)。

### 3.3 费率配置 (FeeConfig)

| 费率项 | 默认值 | 最大值 | 说明 |
|--------|-------|--------|------|
| splitFeeBps | 30 (0.3%) | 100 (1%) | 基础分润手续费 |
| onrampFeeBps | 10 (0.1%) | 100 (1%) | 法币→Crypto 额外费率 |
| offrampFeeBps | 10 (0.1%) | 100 (1%) | Crypto→法币 额外费率 |
| minSplitFee | 0.1 USDC | - | 最低分润手续费 |

### 3.4 支付类型与费率

| 支付类型 | 平台费 |
|---------|--------|
| CRYPTO_DIRECT (纯链上) | 0% (免费) |
| ONRAMP (买币) | splitFee + onrampFee = 0.4% |
| OFFRAMP (提现) | splitFee + offrampFee = 0.4% |
| MIXED (混合) | splitFee + onramp + offramp = 0.5% |

### 3.5 执行流程

```
1. 商户创建 SplitPlan (定义分成规则)
2. Relayer 调用 executeSplit(planId, sessionId, amount, paymentType)
3. 合约计算平台费 → 扣除后按规则分配
4. 各参与方通过 claimAll() 提取分润
```

---

## 四、X402 支付通道费 ⚡

### 4.1 X402 是什么

X402 是 Agentrix 的快速支付协议，基于 ERC-8004 Session Key：
- 用户创建 Session → 设置单笔/每日限额 → Agent 通过 Session Key 签名即可完成支付
- Relayer 链下验证签名 → 即时确认 → 异步上链

### 4.2 费率 (2026-02-14 更新)

| 项目 | 费率 | 说明 |
|------|------|------|
| X402 通道费 | **0% (已取消)** | 合约 `x402ChannelFeeRate = 0`, 后端默认 `'0'` |
| Gas 费估算 | ~0.06% | `payment.service.ts` 中 `calculateChannelFee` |

**已修复的代码 (本次审计):**
- `commission-calculator.service.ts`: `X402_CHANNEL_FEE_RATE` 默认值 `'0.003'` → `'0'`
- `commission-strategy-v4.service.ts`: `X402_CHANNEL_FEE_RATE` `0.003` → `0`; 所有 RATES `channel` `0.003` → `0`
- `financial-architecture.config.ts`: `X402_CHANNEL_FEE_RATE_DEFAULT = 0` (已正确)
- `Commission.sol`: `x402ChannelFeeRate = 0` (已正确)

### 4.3 谁承担费用？

**X402 通道费已取消 (0%)，无人承担。** 仅存的费用是链上 Gas 费，由 Relayer 钱包支付。

| 费用项 | 承担方 | 说明 |
|--------|--------|------|
| X402 通道费 | 无 (已取消) | 0% |
| 链上 Gas 费 | **平台 (Relayer EOA)** | Relayer 钱包支付 BNB gas |
| payment.service 通道费 (0.06%) | 记录用途 | 用于成本核算，不实际从商户/用户扣除 |

### 4.3.1 X402 上链批处理策略

`relayer.service.ts` 中 `PayMindRelayerService` 实现两种上链模式：

**a) 即时模式 (默认):**
- 每笔 QuickPay 立即调用 `executeSinglePaymentOnChain()` 单独上链
- 签名验证通过后即标记 `COMPLETED`，不等待上链确认

**b) 批量重试模式:**
- 即时执行失败的支付加入 `paymentQueue`
- 每 **30秒** 执行一次批处理
- 每批最多 **10笔**，超过5分钟的优先处理
- 调用合约 `executeBatchWithSession()` 批量上链
- 重试3次失败后标记 `FAILED`

```
QuickPay 流程:
1. 链下签名验证 (毫秒级)
2. Session 限额检查
3. 标记 payment = COMPLETED (即时确认)
4. 尝试即时上链 → 成功则返回 txHash
5. 失败 → 加入队列 → 30s 后批量重试 (最多3次)
```

### 4.4 QuickPay 流程完成度

| 组件 | 状态 | 说明 |
|------|------|------|
| `ERC8004SessionManager.sol` | ✅ 已部署 (BSC Testnet) | Session 管理合约 |
| `X402Adapter.sol` | ✅ 已部署 | EIP-712 签名验证 |
| `Commission.sol` quickPaySplit | ✅ 已实现 | QuickPay 分账 |
| 后端 `relayer.service.ts` | ✅ 已实现 | 签名验证 + 即时确认 + 链上执行 |
| 后端 `x402.service.ts` | ⚠️ 部分实现 | Session 创建有 Mock 回退 |
| 后端 `payment.service.ts` | ✅ 已实现 | 支付流程 + 通道费计算 |
| 前端 QuickPayScreen | ✅ 已实现 | 支付UI + Session 签名 |
| X402 Relayer 外部服务 | ⚠️ Mock 模式 | 真实 Relayer 服务未配置 |

**当前 QuickPay 支付走 X402 协议吗？**
- 是的，QuickPay 设计为走 X402 协议（ERC-8004 Session + Relayer 签名验证）
- 但 `x402.service.ts` 中的 Relayer URL 是 Mock 的 (`x402-relayer.example.com`)
- 实际支付通过后端 `relayer.service.ts` 直接调用合约执行，不经过外部 X402 Relayer

---

## 五、⚠️ 任务市场佣金 (Layer 3 — 待实现)

### 5.1 现状

**任务市场 (`merchant-task` 模块) 当前没有任何佣金体系。**

已确认：
- `PostTaskScreen.tsx` — 无佣金设置字段
- `merchant-task.controller.ts` — 无佣金相关逻辑
- `task-marketplace.service.ts` — 无佣金计算
- 无 Commission 合约集成

### 5.2 可复用合约 (无需重新部署)

**✅ 无需部署新合约即可支持任务佣金：**

| 合约 | 平台费方式 | 可调? | 适合场景 |
|------|-----------|-------|----------|
| `BudgetPool.sol` | `platformFeeBps` | ✅ `setPlatformFee()` (max 5%) | 多Agent协作里程碑任务 |
| `CommissionV2.sol` | SplitPlan `feeConfig` | ✅ 每方案独立配置 | 简单任务分润 |
| `Commission.sol` V5 | `layerPlatformFees` | ✅ `setLayerRates()` (max 5%) | Skill层级佣金 |

### 5.3 任务佣金 3% → 5% 是否需要改合约？

**❌ 不需要。** 三种方式均可在链上动态调整：

1. **`BudgetPool.setPlatformFee(500)`** → 5%，当前上限 `require(_feeBps <= 500)`
2. **`Commission.setLayerRates(layer, 500, poolRate)`** → platformFee 5%，上限同 500
3. **`CommissionV2` SplitPlan** → 每个方案创建时指定独立 `feeConfig`

> 如需超过 5% 需升级合约 `require` 上限。

### 5.4 建议实现方案

#### A. 简单任务 → 复用 `CommissionV2.sol` SplitPlan

```
任务发布时后端自动创建 SplitPlan:
├── 接单者: 92-97% (shareBps: 9200-9700)
├── 推荐人: 0-5%   (shareBps: 0-500)
└── 平台: 3-5%     (由 feeConfig.splitFeeBps 收取)
```

#### B. 多Agent里程碑任务 → 复用 `BudgetPool.sol`

```
任务发布时创建 BudgetPool:
├── platformFeeBps: 300-500 (3-5%)
├── 里程碑划分 + 参与者 + 分配比例
└── 质量门控 → 审批 → 自动释放资金
```

#### C. 推荐裂变机制

```
用户A → 分享任务链接 → 用户B 接单并完成
                         │
                         ├── 用户A 获得推荐奖励 (任务预算的 X%)
                         ├── 如果用户B 也推荐用户C 接单其他任务
                         │   └── 用户B 获得推荐奖励
                         └── 平台获得服务费
```

#### D. 实现步骤

1. **合约层**: 无需新合约，调用 `BudgetPool` 或 `CommissionV2`
2. **后端**:
   - `publishTask` DTO 增加 `commissionRate`（推荐奖励比例）
   - 任务完成后调用合约 `executeSplit()` 或 `releaseMilestone()` 分账
   - 增加推荐链接生成 API
3. **前端**:
   - `PostTaskScreen` 增加佣金设置 UI
   - `TaskDetailScreen` 增加分享/推荐按钮
   - 增加"我的推荐奖励"页面

---

## 六、合约部署状态

### 6.1 当前部署 (BSC Testnet, ChainId: 97)

| 合约 | 地址 | 版本 |
|------|------|------|
| Commission | `0x5E80...43f0` | V5.0 |
| CommissionV2 | `0xF6c6...4862` | Latest |
| ERC8004SessionManager | `0xf94E...94B7` | V5.0 |
| X402Adapter | `0x3Fd3...27e2` | V5.0 |
| AutoPay | `0xEb9b...3058` | V5.0 |
| AuditProof | `0xBE39...d99A` | Latest |
| PaymentRouter | `0xA72e...156a` | V5.0 |
| AUSDC (Mock) | `0xc234...9386` | Mock |

### 6.2 正式网部署计划

需要部署到：
1. **BSC Mainnet** (ChainId: 56)
2. **Base Mainnet** (ChainId: 8453)

`hardhat.config.ts` 已配置 `bsc` 和 `base` 网络，但需要：

- [ ] 配置 `PRIVATE_KEY` (部署者私钥)
- [ ] 配置 `BSC_RPC_URL` 和 `BASE_RPC_URL`
- [ ] 配置 `BSCSCAN_API_KEY` 和 `BASESCAN_API_KEY` (合约验证)
- [ ] 准备 USDC 地址:
  - BSC: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`
  - Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- [ ] 准备 Treasury 钱包地址
- [ ] 准备 Relayer 钱包地址 + 充值 Gas
- [ ] 运行安全审计 (参考 `SECURITY_AUDIT_REPORT.md`)
- [ ] 修改部署脚本，使用真实 USDC 地址替代 Mock Token

### 6.3 部署顺序

```
1. 部署 Commission.sol (USDC地址, Treasury地址)
   → initializeV5Rates()
   → setRelayer(relayer地址)
   
2. 部署 CommissionV2.sol (USDC地址, Treasury地址)
   → setRelayer(relayer地址)

3. 部署 ERC8004SessionManager.sol (USDC地址)
   → setRelayer(relayer地址)

4. 部署 PaymentRouter.sol
5. 部署 X402Adapter.sol (PaymentRouter地址)
   → setRelayer(relayer地址)

6. 部署 AutoPay.sol
7. 部署 AuditProof.sol

8. 更新后端 .env:
   - COMMISSION_CONTRACT_ADDRESS
   - ERC8004_CONTRACT_ADDRESS
   - CHAIN_ID (56 for BSC, 8453 for Base)
   - RPC_URL
```

---

## 七、全合约费率一览

| 合约 | 费率项 | 当前值 | 可调? | 调用方法 |
|------|--------|-------|-------|----------|
| `Commission.sol` | layerPlatformFees[INFRA] | 0.5% | ✅ | `setLayerRates()` |
| `Commission.sol` | layerPlatformFees[RESOURCE] | 0.5% | ✅ | `setLayerRates()` |
| `Commission.sol` | layerPlatformFees[LOGIC] | 1.0% | ✅ | `setLayerRates()` |
| `Commission.sol` | layerPlatformFees[COMPOSITE] | 3.0% | ✅ | `setLayerRates()` |
| `Commission.sol` | layerPoolRates[INFRA→COMPOSITE] | 2-7% | ✅ | `setLayerRates()` |
| `Commission.sol` | x402ChannelFeeRate | **0%** | ✅ | `setX402ChannelFeeRate()` |
| `CommissionV2.sol` | splitFeeBps | 0.3% | ✅ | `updateDefaultFeeConfig()` |
| `CommissionV2.sol` | onrampFeeBps | 0.1% | ✅ | `updateDefaultFeeConfig()` |
| `CommissionV2.sol` | offrampFeeBps | 0.1% | ✅ | `updateDefaultFeeConfig()` |
| `CommissionV2.sol` | minSplitFee | 0.1 USDC | ✅ | `updateDefaultFeeConfig()` |
| `BudgetPool.sol` | platformFeeBps | 可配 (max 5%) | ✅ | `setPlatformFee()` |
| `AutoPay.sol` | 无自有费率 | 0% | - | 委托 Commission.sol |
| `PaymentRouter.sol` | channelFee | 记录用途 | - | 仅记录不收取 |

---

## 八、总结

| 维度 | 状态 | 备注 |
|------|------|------|
| Skill 佣金 (Layer 1) | ✅ 完整 | 合约+后端+前端已实现，后端使用 V5 逻辑 |
| 商户分润 (Layer 2) | ✅ 合约完整 | 后端集成完整，前端需要商户端UI |
| 任务佣金 (Layer 3) | ❌ 未实现 | 可复用 BudgetPool/CommissionV2，无需新合约 |
| X402/QuickPay | ⚠️ 基本完成 | 通道费已取消(0%), Relayer Mock模式 |
| X402 批处理 | ✅ 已实现 | 即时上链 + 30s批量重试，最多10笔/批 |
| 3%→5% 费率调整 | ✅ 无需改合约 | `setPlatformFee()`/`setLayerRates()` 动态调整 |
| 正式网部署 | ❌ 待部署 | BSC + Base 链配置已就绪 |
