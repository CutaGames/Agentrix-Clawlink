# Off-ramp 分佣与非托管原则说明

## 📋 核心问题

**问题**：Off-ramp 分佣比例是否可以设为 0（考虑法规风险），并且可以自定义，这是否与非托管原则冲突？

**答案**：**不冲突**！分佣为 0 或自定义费率都不影响非托管性质。

---

## 🔍 非托管原则的核心

### 1. 资金流向

```
用户支付 → 智能合约 → 自动分账 → 商户MPC钱包
                ↓
          Agentrix Treasury（分佣，可为0）
```

**关键点**：
- ✅ 资金**始终在智能合约中**，Agentrix 从未"持有"资金
- ✅ 分账由**智能合约自动执行**，Agentrix 无法干预
- ✅ Agentrix 只是**技术服务商**，不涉及资金托管

### 2. 非托管证明

**技术保障**：
1. **MPC 钱包 2/3 签名**：Agentrix 只持有 1/3 私钥分片，无法单独动用资金
2. **智能合约自动分账**：分账规则在链上，Agentrix 无法修改或干预
3. **资金流向透明**：所有分账操作都在链上可查，完全透明

**法律保障**：
1. **TOS 明确声明**：Agentrix 仅为技术服务商，不托管资金
2. **责任分离**：资金处理责任在 Provider 和智能合约
3. **审计证明**：定期第三方审计，证明非托管架构

---

## 💰 Off-ramp 分佣的性质

### 1. 分佣是"服务费"，不是"托管资金"

**类比**：
- **Stripe**：收取 2.9% + $0.30 手续费（托管模式）
- **Agentrix**：收取 0.1% 服务费（非托管模式）

**区别**：
- Stripe：资金先进入 Stripe 账户，再分账给商户（托管）
- Agentrix：资金在智能合约中，自动分账给商户（非托管）

### 2. 分佣为 0 的合法性

**可以设为 0**：
- ✅ 技术上完全可行
- ✅ 不违反非托管原则
- ✅ 不违反任何法规

**原因**：
- 分佣为 0 只是"不收取服务费"
- 不影响资金流向和分账机制
- Agentrix 仍然只是技术服务商

---

## ⚖️ 法规风险分析

### 1. 可能的风险点

**风险 1**：可能被认定为"资金处理商"
- **缓解**：即使分佣为 0，Agentrix 也不处理资金，只是提供技术服务

**风险 2**：可能被认定为"支付处理商"
- **缓解**：实际支付处理由 Provider 完成，Agentrix 只提供路由和聚合

**风险 3**：可能被认定为"资金托管"
- **缓解**：
  - 资金在智能合约中，不在 Agentrix 账户
  - Agentrix 只持有 1/3 私钥，无法单独动用资金
  - 分账由智能合约自动执行，Agentrix 无法干预

### 2. 分佣为 0 的优势

**降低法规风险**：
- ✅ 完全不收取服务费，更符合"技术服务商"定位
- ✅ 避免被认定为"资金处理商"
- ✅ 降低监管关注度

**商业模式**：
- Agentrix 可以通过其他方式盈利（如平台费、广告费等）
- 或者暂时不盈利，专注于用户增长

---

## 🔧 技术实现

### 1. 可配置的分佣费率

**环境变量配置**：
```bash
# Agentrix Off-ramp 分佣费率（可配置，默认0.1%，可设为0）
AGENTRIX_OFF_RAMP_RATE=0.001  # 0.1%
# 或
AGENTRIX_OFF_RAMP_RATE=0      # 0%（不收取服务费）
```

**代码实现**：
```typescript
// OffRampCommissionService
private readonly AGENTRIX_OFF_RAMP_RATE: number;

constructor(private configService: ConfigService) {
  // 从环境变量读取费率，默认0.1%，可以设为0
  const customRate = this.configService.get<number>('AGENTRIX_OFF_RAMP_RATE');
  this.AGENTRIX_OFF_RAMP_RATE = customRate !== undefined ? customRate : 0.001;
  
  if (this.AGENTRIX_OFF_RAMP_RATE === 0) {
    this.logger.log('⚠️  Agentrix Off-ramp commission rate is set to 0% (no service fee)');
  }
}

calculateOffRampCommission(cryptoAmount: number, providerRate: number) {
  const agentrixFee = this.AGENTRIX_OFF_RAMP_RATE > 0 
    ? cryptoAmount * this.AGENTRIX_OFF_RAMP_RATE 
    : 0; // 支持设为0
  // ...
}
```

### 2. 智能合约分账

**Commission.sol**：
```solidity
struct SplitConfig {
    // ...
    uint256 offRampFee;  // Agentrix Off-ramp分佣（可为0）
    // ...
}

function _autoSplit(bytes32 orderId, uint256 totalAmount) internal {
    // ...
    // 分账到Agentrix Treasury（Off-ramp分佣，可为0）
    if (config.offRampFee > 0) {
        settlementToken.transfer(agentrixTreasury, config.offRampFee);
    }
    // ...
}
```

---

## 📊 分佣为 0 的示例

### 场景：商家将 100 USDT 转换为 CNY

**分佣为 0.1%**：
```
商家支付: 100 USDT
    ↓
Provider费用: 100 * 2% = 2 USDT
Agentrix分佣: 100 * 0.1% = 0.1 USDT
    ↓
商家收到: 100 - 2 - 0.1 = 97.9 USDT
```

**分佣为 0**：
```
商家支付: 100 USDT
    ↓
Provider费用: 100 * 2% = 2 USDT
Agentrix分佣: 0 USDT（不收取）
    ↓
商家收到: 100 - 2 - 0 = 98 USDT
```

**结论**：
- 分佣为 0 时，商家收到更多资金
- 但 Agentrix 不盈利（可以通过其他方式盈利）
- 仍然符合非托管原则

---

## ✅ 结论

1. **分佣为 0 不与非托管原则冲突**
   - 资金始终在智能合约中
   - 分账由智能合约自动执行
   - Agentrix 从未"持有"资金

2. **分佣可以自定义**
   - 通过环境变量 `AGENTRIX_OFF_RAMP_RATE` 配置
   - 可以设为 0（不收取服务费）
   - 可以设为任意值（如 0.05%、0.1%、0.15% 等）

3. **法规风险考虑**
   - 分佣为 0 可以降低法规风险
   - 更符合"技术服务商"定位
   - 避免被认定为"资金处理商"

4. **技术实现**
   - 代码已支持可配置的分佣费率
   - 智能合约支持分佣为 0
   - 完全向后兼容

---

## 📝 建议

1. **初期可以设为 0**：
   - 降低法规风险
   - 专注于用户增长
   - 建立非托管品牌形象

2. **后期可以调整**：
   - 根据业务需要调整费率
   - 可以通过 A/B 测试找到最优费率
   - 保持灵活性

3. **透明化**：
   - 在 UI 中明确显示分佣费率（包括 0%）
   - 在 TOS 中说明分佣机制
   - 定期审计和报告

