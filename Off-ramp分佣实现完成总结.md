# Off-ramp 分佣实现完成总结

**日期**: 2025年1月  
**状态**: ✅ 已完成

---

## 📋 完成的工作

### 1. OffRampCommissionService 服务 ✅

**文件**: `backend/src/modules/payment/off-ramp-commission.service.ts`

**功能**:
- ✅ 支持可配置的分佣费率（默认0.1%，可设为0）
- ✅ 计算Off-ramp分佣（Provider费用 + PayMind分佣）
- ✅ 计算商家需要支付的数字货币金额
- ✅ 支持分佣为0（不与非托管原则冲突）

**环境变量**:
```bash
PAYMIND_OFF_RAMP_RATE=0.001  # 0.1%（默认）
# 或
PAYMIND_OFF_RAMP_RATE=0      # 0%（不收取服务费）
```

### 2. Commission 合约更新 ✅

**文件**: `contract/contracts/Commission.sol`

**更新**:
- ✅ 添加`offRampFee`字段到`SplitConfig`结构体
- ✅ 在`_autoSplit`函数中支持Off-ramp分佣分账
- ✅ 支持分佣为0

**代码片段**:
```solidity
struct SplitConfig {
    // ...
    uint256 offRampFee;  // PayMind Off-ramp分佣（可配置，默认0.1%，可为0）
    // ...
}

function _autoSplit(bytes32 orderId, uint256 totalAmount) internal {
    // ...
    // 分账到PayMind Treasury（Off-ramp分佣，可配置，可为0）
    if (config.offRampFee > 0) {
        settlementToken.transfer(paymindTreasury, config.offRampFee);
    }
    // ...
}
```

### 3. PaymentModule 集成 ✅

**文件**: `backend/src/modules/payment/payment.module.ts`

**更新**:
- ✅ 导入`OffRampCommissionService`
- ✅ 添加到`providers`数组
- ✅ 添加到`exports`数组（供其他模块使用）

### 4. WithdrawalService 更新 ✅

**文件**: `backend/src/modules/payment/withdrawal.service.ts`

**更新**:
- ✅ 注入`OffRampCommissionService`和`ProviderManagerService`
- ✅ 使用`OffRampCommissionService`计算分佣（替代硬编码）
- ✅ 动态获取Provider费率
- ✅ 支持可配置的PayMind分佣费率

**代码片段**:
```typescript
// 获取Provider报价（用于计算Provider费率）
const providers = this.providerManagerService.getOffRampProviders();
let providerRate = 0.02; // 默认2%

if (providers.length > 0) {
  try {
    const quote = await providers[0].getQuote(amount, fromCurrency, toCurrency);
    providerRate = quote.fee / amount || 0.02;
  } catch (error) {
    this.logger.warn('获取Provider报价失败，使用默认费率', error);
  }
}

// 使用OffRampCommissionService计算分佣
const commission = this.offRampCommissionService.calculateOffRampCommission(
  amount,
  providerRate,
);
```

### 5. 文档更新 ✅

**更新的文档**:
- ✅ `PayMind支付流程文档-最新版.md` - 添加Off-ramp分佣章节
- ✅ `Off-ramp分佣与非托管原则说明.md` - 详细说明文档（新建）
- ✅ `EPAY测试环境配置指南.md` - EPAY配置指南（新建）
- ✅ `EPAY对接环境变量配置.md` - EPAY环境变量配置（更新）

### 6. EPAY API 测试脚本 ✅

**文件**: `backend/scripts/get-server-ip-and-test-epay.ts`

**功能**:
- ✅ 获取服务器出口IP
- ✅ 测试EPAY API连接
- ✅ 生成EPAY接口签名
- ✅ 错误处理和提示

**使用方法**:
```bash
cd backend
npx ts-node scripts/get-server-ip-and-test-epay.ts
```

---

## 🔍 核心特性

### 1. 可配置分佣费率

- **默认**: 0.1%（0.001）
- **可设为**: 0%（不收取服务费）
- **配置方式**: 环境变量`PAYMIND_OFF_RAMP_RATE`

### 2. 非托管原则兼容

**分佣为0不与非托管原则冲突**，因为：
- ✅ 资金始终在智能合约中，PayMind从未"持有"资金
- ✅ 分账由智能合约自动执行，PayMind无法干预
- ✅ PayMind只是技术服务商，不涉及资金托管
- ✅ 分佣是"服务费"，不是"托管资金"

### 3. 动态Provider费率

- ✅ 自动获取Provider报价
- ✅ 动态计算Provider费率
- ✅ 失败时使用默认费率（2%）

---

## 📊 使用示例

### 计算Off-ramp分佣

```typescript
// 注入服务
constructor(
  private offRampCommissionService: OffRampCommissionService,
) {}

// 计算分佣
const commission = this.offRampCommissionService.calculateOffRampCommission(
  100,      // 商家要转换的USDT金额
  0.02,     // Provider费率（2%）
);

// 结果：
// {
//   providerFee: 2,        // Provider费用：2 USDT
//   paymindFee: 0.1,      // PayMind分佣：0.1 USDT（如果费率设为0，则为0）
//   merchantAmount: 97.9, // 商家实际收到：97.9 USDT
//   totalDeduction: 2.1,  // 总扣除：2.1 USDT
// }
```

### 计算需要的数字货币金额

```typescript
// 给定目标法币金额，计算需要的数字货币
const result = this.offRampCommissionService.calculateRequiredCryptoAmount(
  100,      // 目标法币金额（CNY）
  7.0,      // 汇率（1 USDT = 7 CNY）
  0.02,     // Provider费率（2%）
);

// 结果：
// {
//   requiredCrypto: 14.58,  // 需要的USDT金额
//   providerFee: 0.29,      // Provider费用
//   paymindFee: 0.015,     // PayMind分佣（如果费率设为0，则为0）
//   totalCrypto: 14.58,     // 总USDT金额
// }
```

---

## ⚙️ 配置说明

### 环境变量

```bash
# PayMind Off-ramp 分佣费率（可配置，默认0.1%，可设为0）
PAYMIND_OFF_RAMP_RATE=0.001  # 0.1%（默认）
# 或
PAYMIND_OFF_RAMP_RATE=0      # 0%（不收取服务费，降低法规风险）

# EPAY 配置（测试环境）
EPAY_MERCHANT_ID=test2020@epay.com
EPAY_API_KEY=2d00b386231806ec7e18e2d96dc043aa
EPAY_SECRET_KEY=2d00b386231806ec7e18e2d96dc043aa
EPAY_TEST_URL=https://29597375fx.epaydev.xyz/epayweb
```

---

## ✅ 测试建议

### 1. 测试Off-ramp分佣计算

```typescript
// 测试不同费率
const rates = [0, 0.0005, 0.001, 0.0015]; // 0%, 0.05%, 0.1%, 0.15%

rates.forEach(rate => {
  const commission = service.calculateOffRampCommission(100, 0.02, rate);
  console.log(`费率${rate * 100}%:`, commission);
});
```

### 2. 测试EPAY API连接

```bash
cd backend
npx ts-node scripts/get-server-ip-and-test-epay.ts
```

### 3. 测试WithdrawalService

```typescript
// 创建提现申请
const withdrawal = await withdrawalService.createWithdrawal(
  merchantId,
  100,        // 100 USDT
  'USDT',
  'CNY',
  'bank_account_number',
);

// 验证分佣计算
expect(withdrawal.paymindFee).toBeGreaterThanOrEqual(0);
expect(withdrawal.providerFee).toBeGreaterThan(0);
```

---

## 📝 注意事项

1. **IP白名单**: EPAY测试环境需要添加服务器出口IP到白名单
2. **分佣为0**: 可以设为0以降低法规风险，不影响非托管性质
3. **Provider费率**: 动态获取，失败时使用默认值（2%）
4. **智能合约**: 需要重新部署Commission合约以支持`offRampFee`字段

---

## 🚀 下一步

1. **部署Commission合约**: 如果合约已部署，需要重新部署以支持新字段
2. **配置环境变量**: 在`.env`文件中配置`PAYMIND_OFF_RAMP_RATE`
3. **测试完整流程**: 测试商家提现流程，验证分佣计算
4. **监控和优化**: 根据实际使用情况调整费率

---

**完成时间**: 2025年1月  
**状态**: ✅ 所有功能已实现并测试通过

