# Agentrix Commerce Skill 定价确认

> **确认人**: ARCHITECT-01 | **日期**: 2026-02-08
> **老板确认**: 2026-02-08

---

## 定价策略

| 功能 | 费率 | 代码配置 | 状态 |
|------|------|---------|------|
| 钱包支付 / 生成支付链接二维码 | **免费** | PaymentService（无平台费） | ✅ 正确 |
| 分佣 / 分账 / 预算池（合约处理） | **0.3%** | splitFeeBps: 30 / platformFeeBps: 30 | ✅ 正确 |
| OnRamp（法币→加密） | **Provider 费 + 0.1%** | onrampFeeBps: 10 | ✅ 正确 |
| OffRamp（加密→法币） | **Provider 费 + 0.1%** | offrampFeeBps: 10 | ✅ 正确 |
| 发布任务 / 商品 / Skill | **0.3%** | splitFeeBps: 30 | ✅ 正确 |
| 发布到 Agentrix 平台 | **平台分佣政策** | CommissionV2 合约 | ✅ 正确 |

## 代码验证

### split-plan.service.ts (第10-48行)
typescript
const DEFAULT_TEMPLATES = {
  physical:   { feeConfig: { onrampFeeBps: 10, offrampFeeBps: 10, splitFeeBps: 30, minSplitFee: 100000 } },
  service:    { feeConfig: { onrampFeeBps: 10, offrampFeeBps: 10, splitFeeBps: 30, minSplitFee: 100000 } },
  virtual:    { feeConfig: { onrampFeeBps: 10, offrampFeeBps: 10, splitFeeBps: 30, minSplitFee: 100000 } },
  nft:        { feeConfig: { onrampFeeBps: 10, offrampFeeBps: 10, splitFeeBps: 30, minSplitFee: 100000 } },
  skill:      { feeConfig: { onrampFeeBps: 10, offrampFeeBps: 10, splitFeeBps: 30, minSplitFee: 100000 } },
  agent_task: { feeConfig: { onrampFeeBps: 10, offrampFeeBps: 10, splitFeeBps: 30, minSplitFee: 100000 } },
};
// 10 bps = 0.1%, 30 bps = 0.3%, minSplitFee = 0.1 USDC


### BudgetPool.sol (第95行, 第208-216行)
solidity
uint16 public platformFeeBps; // 平台费率
// 构造函数: require(_platformFeeBps <= 500, "Fee too high"); // Max 5%
// 部署参数: platformFeeBps = 30 (0.3%)


### CommissionV2 (已部署)
- 地址: 0x1de9d3e3EFbF30f0846aBC07b684C7E675138827
- 网络: BSC Testnet (chainId: 97)
- 部署时间: 2026-02-01

## 导流策略

> 逐步把用户导入 Agentrix 平台

1. 外部 AI 调用 Commerce Skill → 结果中包含 Agentrix 平台链接
2. 免费功能（钱包支付）吸引用户 → 高级功能（分佣/预算池）需注册
3. 发布到 Agentrix 平台享受更多曝光 → 遵循平台分佣政策
4. 开发者发布 Skill → 通过 Agentrix 获得收益分成
