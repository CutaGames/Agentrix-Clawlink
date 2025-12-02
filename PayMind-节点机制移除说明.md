# PayMind 节点机制移除说明

## 📋 变更说明

根据产品需求，**移除了联盟节点机制**，统一使用**推广Agent机制**。

### 变更原因
1. 节点机制没有具体的应用场景
2. 实际的分佣机制中只有推广的分佣，没有节点的分佣
3. 推广Agent机制已经能够满足所有需求

## ✅ 已完成的修改

### 1. 代码修改

#### `paymindfrontend/pages/marketplace.tsx`
- ❌ 移除：`联盟节点共建`
- ✅ 改为：`推广Agent共建`

#### `paymindfrontend/pages/pay/commission-demo.tsx`
- ❌ 移除：`推广节点、推荐节点、执行团队协作`
- ✅ 改为：`推广Agent、推荐Agent、执行Agent协作`

- ❌ 移除：`推广 Agent / 节点`
- ✅ 改为：`推广 Agent`

- ❌ 移除：`联盟节点奖励`
- ✅ 改为：`推广Agent奖励`

- ❌ 移除：`平台与联盟`（包含联盟奖励）
- ✅ 改为：`平台与推广`（包含推广奖励）

- ❌ 移除：`allianceReward` 变量和计算逻辑
- ✅ 改为：`promotionReward`（推广Agent的0.5%永久分成）

- ❌ 移除：`useAllianceBonus` 状态
- ✅ 改为：`usePromotionReward` 状态

### 2. 分佣机制说明

#### 当前分佣机制（已更新）
1. **执行Agent**：负责支付执行，获得交易分成（2-3%）
2. **推荐Agent**：负责商品推荐，获得推荐分成（商品佣金率 × 30%）
3. **推广Agent**：负责商户推广，获得**0.5%永久分成**（基于商户所有交易）
4. **PayMind平台**：平台手续费（0.5-1%）

#### 已移除
- ❌ 联盟节点网络分成（0.1-0.3%）
- ❌ 节点等级机制
- ❌ 网络分成计算

## 📊 分佣计算逻辑

### 推广Agent收益计算
```typescript
// 推广Agent获得0.5%永久分成（基于交易金额，不是佣金）
const promotionReward = usePromotionReward ? amountUSD * 0.005 : 0

// 商户最终收入 = 交易金额 - 佣金总额 - 推广奖励
const merchantNet = amountUSD - commissionTotal - promotionReward
```

### Agent分润池计算
```typescript
// Agent分润池 = 佣金总额 - PayMind平台费用
const agentPool = commissionTotal - paymindReserve

// Agent分润分配：
// - 推荐Agent：agentPool × 30-40%
// - 执行Agent：agentPool × 40-45%
// - 推广Agent：agentPool × 15-30%（在Agent分润池中）
// - 推广奖励：交易金额 × 0.5%（独立计算，永久分成）
```

## 🎯 推广Agent机制

### 核心特点
1. **永久分成**：推广商户获得0.5%永久分成
2. **基于交易金额**：不是基于佣金，而是基于商户所有交易金额
3. **独立计算**：推广奖励独立于Agent分润池
4. **持续收益**：只要商户在平台，推广Agent就能持续获得收益

### 推广奖励类型
1. **一次性奖励**：商户入驻奖励（小型$150 / 中型$700 / 大型$1,500）
2. **永久分成**：商户所有交易的0.5%

## 📝 相关页面

### 已更新的页面
- ✅ `/pay/commission-demo` - 佣金分配演示页面
- ✅ `/marketplace` - 市场页面
- ✅ `/alliance/demo` - 联盟演示页面（已经是推广Agent机制）

### 保持不变
- `/alliance/demo` - 已经是推广Agent机制，无需修改
- `/features/alliance` - 已经是推广Agent机制，无需修改

## ✨ 总结

所有节点机制相关的内容已移除，统一使用**推广Agent机制**。分佣机制更加清晰简单：
- **执行Agent**：交易分成
- **推荐Agent**：推荐分成
- **推广Agent**：0.5%永久分成
- **PayMind**：平台手续费

构建已通过，所有修改已完成。

