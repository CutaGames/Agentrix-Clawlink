# Agentrix 生态分成机制详细设计 V4.0 (ARN 标准化版)
## 模块化、可插拔的去中心化分账协议标准

**版本**: 4.0  
**日期**: 2025年12月  
**状态**: Final Draft  

---

## 1. 设计愿景与核心理念

### 1.1 从 "平台功能" 到 "行业标准"
V4.0 的核心目标是将 Agentrix 的分账能力解耦，使其成为 **ARN (Agent Resource Network)** 的标准基础设施组件。任何电商平台、Marketplace 或聚合器都可以通过集成此协议，实现透明、自动化的多方分润。

### 1.2 核心原则
1.  **中立性 (Neutrality)**: 协议本身不预设商业模式，只提供分账能力。
2.  **原子性 (Atomicity)**: 支付与分账在同一笔交易中完成，杜绝"账不平"风险。
3.  **动态性 (Dynamic Allocation)**: 支持根据参与角色（是否有推荐人、是否有推广者）动态调整分账比例，剩余价值自动归还商户。
4.  **可插拔 (Pluggable)**: 费率模型、结算触发器均可自定义配置。

---

## 2. 费率体系与资金流向 (Rates & Flows)

### 2.1 资金构成公式

每一笔交易的总金额 ($Total$) 被严格划分为以下四个部分：

$$ Total = Cost_{channel} + Fee_{platform} + Pool_{incentive} + Net_{merchant} $$

| 组件 | 名称 | 定义 | 承担方 |
| :--- | :--- | :--- | :--- |
| **$Cost_{channel}$** | **通道成本** | 固定 **0.3%**。支付给 ARN/X402 协议的基础设施费用。 | 通常包含在平台费中，或由商户额外承担。 |
| **$Fee_{platform}$** | **平台服务费** | 平台收取的运营费用。 | 商户承担。 |
| **$Pool_{incentive}$** | **激励池** | 用于分配给所有 Agent 的总预算。 | 商户承担。 |
| **$Net_{merchant}$** | **商户实收** | 商户最终到手的资金。 | - |

### 2.2 标准费率配置表 (Standard Rate Card)

针对不同资产类型，V4.0 定义了标准的费率模型。**注意：以下费率均为基于 GMV 的百分比。**

| 资产类型 (Asset Type) | 激励池 ($Pool$) | 平台费 ($Fee_{plat}$) | 通道费 ($Cost_{chan}$) | 商户基础实收 |
| :--- | :--- | :--- | :--- | :--- |
| **实物商品 (Physical)** | **2.2%** | 0.5% | 0.3% | 97.0% |
| **生活服务 (Service)** | **3.7%** | 1.0% | 0.3% | 95.0% |
| **数字商品 (Virtual)** | **2.2%** | 0.5% | 0.3% | 97.0% |
| **NFT/FT** | **1.7%** | 0.5% | 0.3% | 97.5% |

> **说明**: 
> 1. **数字商品** 包含 API 调用等即时完成的服务。
> 2. **推广者佣金** 不再从激励池扣除，而是从 **平台费** 中支出（占平台费的 20%）。
> 3. **平台费** 是扣除通道费后的**净收入**。

---

## 3. 动态分账策略 (Dynamic Split Strategy)

V4.0 引入 **"剩余价值归属" (Residual Value Attribution)** 机制。激励池 ($Pool$) 根据实际参与的 Agent 角色动态分配。**未被分配的份额将自动进入平台基金池 (Platform Fund)，用于用户返利、商户激励和风险金。**

### 3.1 参与角色权重 (Role Weights)

#### A. 推广者 (Promoter) - 长期绑定
*   **来源**: 平台服务费 ($Fee_{platform}$)
*   **规则**: 拿走平台费的 **20%**。
*   **逻辑**: 如果没有推广者，这部分资金归平台所有。
*   *示例*: 平台费 0.5%，推广者拿 0.1%，平台留 0.4%。

#### B. 交易执行 Agent (Executor & Referrer) - 单次交易
*   **来源**: 激励池 ($Pool_{incentive}$)
*   **规则**: 固定比例 **7:3**。
    *   **执行者 (Executor)**: **70%** (提供前端/API调用的 Agent)。
    *   **推荐人 (Referrer)**: **30%** (带单/引流的 Agent)。
*   **剩余处理**: 如果某个角色缺失（例如没有推荐人），其对应的份额 **不归还商户**，也不给另一个 Agent，而是打入 **平台基金池 (Platform Fund)**。

### 3.2 动态分配算法 (The Algorithm)

```typescript
function calculateSplits(totalAmount, rates, roles) {
    // 1. 基础费用
    const channelFee = totalAmount * 0.003; // 0.3%
    const platformFeeTotal = totalAmount * rates.platformRate;
    const incentivePool = totalAmount * rates.poolRate;
    
    // 2. 平台费分配 (Promoter logic)
    let promoterShare = 0n;
    let platformNet = platformFeeTotal;
    
    if (roles.promoter) {
        promoterShare = platformFeeTotal * 20 / 100; // 20% of Platform Fee
        platformNet -= promoterShare;
    }

    // 3. 激励池分配 (Agent logic)
    let executorShare = 0n;
    let referrerShare = 0n;
    let platformFund = 0n; // 剩余进入基金池

    // Executor (70%)
    const executorBudget = incentivePool * 70 / 100;
    if (roles.executor) {
        executorShare = executorBudget;
    } else {
        platformFund += executorBudget;
    }

    // Referrer (30%)
    const referrerBudget = incentivePool * 30 / 100;
    if (roles.referrer) {
        referrerShare = referrerBudget;
    } else {
        platformFund += referrerBudget;
    }
    
    return {
        merchant: totalAmount - channelFee - platformFeeTotal - incentivePool,
        channel: channelFee,
        platform: platformNet,
        promoter: promoterShare,
        executor: executorShare,
        referrer: referrerShare,
        platformFund: platformFund
    };
}
```

---

## 4. 场景演练与资金分配示例 (Scenarios)

假设用户购买一件 **$100 的实物商品**。
*   **激励池**: $2.20 (2.2%)
*   **平台费**: $0.50 (0.5%)
*   **通道费**: $0.30 (0.3%)
*   **商户基础实收**: $97.00

### 场景 A: 全链路协作 (Full Chain)
*参与者*: 推广者(Alice), 推荐人(Bob), 执行者(Charlie)

1.  **平台侧分配 ($0.50)**:
    *   **推广者 (Alice)**: $0.50 * 20% = **$0.10**。
    *   **平台实收**: $0.50 - $0.10 = **$0.40**。
2.  **激励池分配 ($2.20)**:
    *   **执行者 (Charlie)**: $2.20 * 70% = **$1.54**。
    *   **推荐人 (Bob)**: $2.20 * 30% = **$0.66**。
    *   **平台基金**: $0。
3.  **商户实收**: **$97.00**。

### 场景 B: 无推荐人 (No Referrer)
*参与者*: 推广者(Alice), 执行者(Charlie)

1.  **平台侧分配**: 同上 (Alice $0.10, Platform $0.40)。
2.  **激励池分配 ($2.20)**:
    *   **执行者 (Charlie)**: $1.54 (70%)。
    *   **推荐人**: 无。
    *   **平台基金**: $0.66 (30% 归入基金池)。
3.  **商户实收**: **$97.00**。

### 场景 C: 直连交易 (Direct)
*参与者*: 无任何 Agent

1.  **平台侧分配**: 无推广者。平台独享 $0.50。
2.  **激励池分配**: 无 Agent。
    *   **平台基金**: $2.20 (100% 归入基金池)。
3.  **商户实收**: **$97.00**。

---

## 5. 追踪与归因机制 (Tracking & Attribution)

为了准确识别上述角色，系统采用多层级归因逻辑：

### 5.1 推广者 (Promoter) - 链上/库内绑定
*   **定义**: 谁把商户引入了 Agentrix 平台？
*   **识别方式**: 
    *   商户注册时填写的邀请码。
    *   在 `merchant_profiles` 表或合约映射 `merchantPromoters[merchantAddr]` 中永久存储。
    *   **不可篡改**: 一旦绑定，除非商户申请解绑，否则永久有效。

### 5.2 推荐人 (Referrer) - 链接追踪
*   **定义**: 谁把用户带到了商品页面？
*   **识别方式**: 
    *   URL 参数: `?ref=AGENT_ID` 或 `?referrer=WALLET_ADDRESS`。
    *   前端 SDK (`SmartCheckout`) 会自动解析此参数，并在发起支付时写入 `SplitConfig`。
    *   **有效期**: 建议采用 "点击后 24 小时内有效" 或 "本次会话有效" 的归因窗口。

### 5.3 执行者 (Executor) - 终端归属
*   **定义**: 交易是在哪个前端/应用内完成的？
*   **识别方式**: 
    *   集成 SDK 的开发者 ID (`clientId` 或 `appId`)。
    *   如果是去中心化前端，则是托管该前端的钱包地址。
    *   由调用 `payWithConfig` 的调用方填入。

---

## 6. 结算触发机制 (Settlement Triggers)

为了保障资金安全，V4.0 引入状态机控制资金释放。

### 5.1 状态机定义

*   **PENDING**: 支付完成，资金在合约中锁定。
*   **ACTIVE**: 触发条件满足（如发货），进入倒计时。
*   **RELEASED**: 资金已释放进入各方钱包。
*   **DISPUTED**: 交易争议，资金冻结。
*   **REFUNDED**: 资金退回用户。

### 5.2 触发器配置表

| 业务类型 | 触发动作 (Trigger Action) | 锁定时间 (Lockup) | 自动兜底 (Fallback) |
| :--- | :--- | :--- | :--- |
| **实物电商** | `LOGISTICS_CONFIRM` (物流签收) | **T+7 天** | 发货后 30 天自动释放 |
| **生活服务** | `SERVICE_COMPLETE` (服务完成) | **T+3 天** | - |
| **虚拟商品** | `INSTANT` (即时) | **0 秒** | - |
| **保证金** | `CONTRACT_END` (合约结束) | **T+0** | - |

---

## 6. 技术架构与接口定义

### 6.1 后端计算接口 (TypeScript)

```typescript
interface SplitStrategy {
  // 输入参数
  orderAmount: bigint;
  productType: 'physical' | 'service' | 'virtual';
  participants: {
    promoter?: string; // Wallet Address
    referrer?: string;
    executor?: string;
  };

  // 输出结果
  calculate(): {
    allocations: {
      merchant: bigint;
      platform: bigint;
      channel: bigint; // ARN 0.3%
      agents: { wallet: string; amount: bigint; role: string }[];
    };
    metadata: {
      triggerType: string;
      lockPeriod: number;
    };
  };
}
```

### 6.2 智能合约数据结构 (Solidity)

```solidity
struct SplitConfig {
    // 资金接收方
    address merchant;
    address platform;
    address channel; // ARN Treasury
    
    // 动态分账列表
    Payee[] payees;
    
    // 结算控制
    bytes32 triggerType;  // keccak256("LOGISTICS")
    uint256 lockPeriod;   // seconds
    uint256 autoReleaseTime; // timestamp (0 = no auto release)
}

struct Payee {
    address wallet;
    uint256 amount;
    bool isLocked; // true = 需等待触发, false = 即时到账(如推广费)
}
```

### 6.3 数据库变更 (SQL)

```sql
-- 佣金结算表
CREATE TABLE commission_settlements (
    id UUID PRIMARY KEY,
    order_id VARCHAR NOT NULL,
    
    -- 资金明细
    total_amount DECIMAL(20, 6),
    merchant_amount DECIMAL(20, 6),
    platform_fee DECIMAL(20, 6),
    channel_fee DECIMAL(20, 6), -- ARN 0.3%
    
    -- 状态控制
    status VARCHAR(20), -- 'LOCKED', 'RELEASED', 'DISPUTED'
    trigger_type VARCHAR(20),
    unlock_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agent 分账明细表
CREATE TABLE commission_allocations (
    id UUID PRIMARY KEY,
    settlement_id UUID REFERENCES commission_settlements(id),
    agent_wallet VARCHAR(42),
    role VARCHAR(20), -- 'PROMOTER', 'REFERRER', 'EXECUTOR'
    amount DECIMAL(20, 6),
    status VARCHAR(20)
);
```

---

## 7. 实施步骤

1.  **数据库迁移**: 创建上述新表，迁移旧数据。
2.  **后端重构**: 实现 `CommissionStrategyV4` 类，替换旧的 `CommissionCalculator`。
3.  **合约升级**: 部署支持 `Payee[]` 动态数组的新版 `ArnFeeSplitter` 合约。
4.  **前端更新**: 在支付详情页展示详细的费用构成（含 ARN 通道费）。
