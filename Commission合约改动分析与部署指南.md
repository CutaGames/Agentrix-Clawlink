# Commission合约改动分析与部署指南

**日期**: 2025-11-26  
**状态**: ⚠️ **需要重新部署**

---

## 📋 今天对Commission.sol的改动总结

### 新增内容（13项）

#### 1. 枚举和结构体（3项）
- ✅ `PaymentScenario` 枚举（QUICKPAY, WALLET, PROVIDER_FIAT, PROVIDER_CRYPTO）
- ✅ `SplitConfig` 结构体（存储订单分账配置）
- ✅ `authorizedProviders` mapping（Provider白名单）

#### 2. 存储变量（2项）
- ✅ `orderSplitConfigs` mapping（订单ID -> 分账配置）
- ✅ `authorizedProviders` mapping（Provider地址 -> 是否授权）

#### 3. 核心函数（7项）
- ✅ `_autoSplit()` - 统一分账内部函数（**核心新增**）
- ✅ `quickPaySplit()` - QuickPay场景分账
- ✅ `walletSplit()` - 钱包转账场景分账
- ✅ `providerFiatToCryptoSplit()` - Provider法币转数字货币分账
- ✅ `setSplitConfig()` - 设置订单分账配置
- ✅ `setAuthorizedProvider()` - 设置Provider白名单
- ✅ `setDisputeStatus()` - 设置争议状态
- ✅ `getSplitConfig()` - 查询分账配置

#### 4. 事件（4项）
- ✅ `PaymentReceived` - 支付接收事件
- ✅ `PaymentAutoSplit` - 自动分账事件
- ✅ `SplitConfigSet` - 分账配置设置事件
- ✅ `ProviderAuthorized` - Provider授权事件

### 保留的原有功能
- ✅ `distributeCommission()` - 原有分账函数（向后兼容）
- ✅ `syncOrder()` - 订单同步函数
- ✅ `recordCommission()` - 记录佣金函数
- ✅ `createSettlement()` - 创建结算函数
- ✅ 所有原有的mapping和状态变量

---

## ⚠️ 是否需要重新部署？

### **答案：需要重新部署** ✅

**原因**：
1. **新增了存储变量**：`orderSplitConfigs` 和 `authorizedProviders` mapping
2. **新增了核心函数**：`_autoSplit`, `quickPaySplit`, `walletSplit` 等
3. **合约接口变更**：新增了多个外部函数和事件
4. **向后兼容但需要新功能**：虽然保留了原有函数，但新功能（非托管支付流程）需要新函数

### 部署策略

#### 方案1：升级部署（推荐）✅
- 部署新的Commission合约
- 迁移必要的数据（如果有）
- 更新后端配置中的合约地址

#### 方案2：保持旧合约（不推荐）❌
- 如果只测试原有功能，可以暂时不部署
- **但无法使用新的非托管支付流程功能**

---

## 🚀 部署步骤

### 步骤1: 检查当前部署状态

```bash
cd contract
# 查看当前部署的合约地址
cat .env | grep COMMISSION_CONTRACT_ADDRESS
```

### 步骤2: 编译新合约

```bash
cd contract
npm run compile
```

### 步骤3: 部署Commission合约到BSC测试网

```bash
cd contract
npx hardhat run scripts/deploy-commission.ts --network bscTestnet
```

**如果没有部署脚本，可以创建**：

```typescript
// contract/scripts/deploy-commission.ts
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying Commission contract...");
  console.log("Deployer:", deployer.address);
  
  // 从环境变量获取配置
  const usdtAddress = process.env.BSC_TESTNET_USDT_ADDRESS || "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
  const treasuryAddress = process.env.PAYMIND_TREASURY_ADDRESS || deployer.address; // 临时使用部署者地址
  const rebatePoolAddress = process.env.SYSTEM_REBATE_POOL_ADDRESS || deployer.address; // 临时使用部署者地址
  
  // 部署Commission合约
  const Commission = await ethers.getContractFactory("Commission");
  const commission = await Commission.deploy();
  await commission.waitForDeployment();
  const commissionAddress = await commission.getAddress();
  
  console.log("✅ Commission deployed to:", commissionAddress);
  
  // 配置结算代币和金库
  console.log("Configuring settlement token...");
  await commission.configureSettlementToken(
    usdtAddress,
    treasuryAddress,
    rebatePoolAddress
  );
  console.log("✅ Settlement token configured");
  
  console.log("\n📋 Deployment Summary:");
  console.log("====================");
  console.log("Commission Address:", commissionAddress);
  console.log("USDT Address:", usdtAddress);
  console.log("Treasury Address:", treasuryAddress);
  console.log("Rebate Pool Address:", rebatePoolAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 步骤4: 更新后端配置

更新 `backend/.env`：

```env
# Commission合约地址（新部署的）
COMMISSION_CONTRACT_ADDRESS=0x...  # 从步骤3获取

# USDT地址（BSC测试网）
USDC_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd

# 其他配置保持不变
ERC8004_CONTRACT_ADDRESS=0x...  # 已部署的ERC8004地址
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
CHAIN_ID=97
```

### 步骤5: 验证部署

```bash
# 在BSCScan测试网查看合约
# https://testnet.bscscan.com/address/YOUR_COMMISSION_ADDRESS

# 验证合约函数
npx hardhat verify --network bscTestnet <COMMISSION_ADDRESS>
```

---

## 📊 合约改动对比

### 新增函数列表

| 函数名 | 类型 | 说明 |
|--------|------|------|
| `_autoSplit` | internal | 统一分账内部函数 |
| `quickPaySplit` | external | QuickPay场景分账 |
| `walletSplit` | external | 钱包转账场景分账 |
| `providerFiatToCryptoSplit` | external | Provider法币转数字货币分账 |
| `setSplitConfig` | external (onlyOwner) | 设置订单分账配置 |
| `setAuthorizedProvider` | external (onlyOwner) | 设置Provider白名单 |
| `setDisputeStatus` | external (onlyOwner) | 设置争议状态 |
| `getSplitConfig` | external (view) | 查询分账配置 |

### 新增事件列表

| 事件名 | 参数 |
|--------|------|
| `PaymentReceived` | orderId, scenario, payer, amount |
| `PaymentAutoSplit` | orderId, sessionId, merchantWallet, totalAmount, merchantAmount, platformFee, executionFee, referralFee |
| `SplitConfigSet` | orderId, config |
| `ProviderAuthorized` | provider, authorized |

---

## 🔄 迁移注意事项

### 如果旧合约已有数据

1. **订单数据**：旧合约中的订单数据不会自动迁移，需要：
   - 在新合约中重新调用 `syncOrder()` 同步订单
   - 或使用 `setSplitConfig()` 设置新订单的分账配置

2. **佣金记录**：旧合约中的佣金记录不会自动迁移，但：
   - 新订单会使用新的分账流程
   - 旧订单可以继续使用 `distributeCommission()` 函数

### 向后兼容性

✅ **完全向后兼容**：
- 所有原有函数都保留
- 原有调用方式仍然有效
- 新功能是增量添加，不影响旧功能

---

## ✅ 部署检查清单

- [ ] 编译新合约成功
- [ ] 部署Commission合约到BSC测试网
- [ ] 配置结算代币（USDT）和金库地址
- [ ] 更新后端 `.env` 中的 `COMMISSION_CONTRACT_ADDRESS`
- [ ] 在BSCScan验证合约部署
- [ ] 测试新函数（`quickPaySplit`, `walletSplit`）
- [ ] 验证原有函数仍然可用（`distributeCommission`）

---

## 🎯 测试建议

### 1. 基础功能测试
```bash
# 测试设置分账配置
# 测试QuickPay分账
# 测试钱包转账分账
```

### 2. 集成测试
- 商户上传商品
- 用户购买商品（使用QuickPay）
- 用户购买商品（使用钱包转账）
- 验证分账是否正确

### 3. 端到端测试
- 完整支付流程
- 分账验证
- 事件监听

---

## 📝 总结

**今天改动的合约数量**: **1个** (Commission.sol)

**是否需要重新部署**: **✅ 需要**

**原因**: 
- 新增了核心分账功能（`_autoSplit`, `quickPaySplit`, `walletSplit`）
- 新增了存储变量（`orderSplitConfigs`, `authorizedProviders`）
- 需要新功能支持非托管支付流程

**部署优先级**: **高** - 新功能依赖新合约

---

**文档维护**: PayMind 开发团队  
**最后更新**: 2025-11-26

