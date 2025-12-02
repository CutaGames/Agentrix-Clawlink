# BSC测试网Commission合约部署记录

**部署日期**: 2025-11-26  
**部署状态**: ✅ **部署成功**

---

## 📋 部署信息

### 合约地址
- **Commission合约地址**: `0xa0C571F348Bc1C8E08F8fcFc8805254eF128B48D`
- **BSCScan链接**: https://testnet.bscscan.com/address/0xa0C571F348Bc1C8E08F8fcFc8805254eF128B48D

### 配置信息
- **USDT地址**: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`
- **PayMind金库地址**: `0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3`
- **系统返利池地址**: `0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3`
- **部署钱包地址**: `0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3`
- **网络**: BSC Testnet (Chain ID: 97)

### 部署验证
- ✅ 合约部署成功
- ✅ 结算代币配置成功
- ✅ 金库地址配置成功
- ✅ 返利池地址配置成功
- ✅ 配置验证通过

---

## 🔧 后端配置更新

### 更新 `backend/.env` 文件

添加或更新以下配置：

```env
# Commission合约地址（新部署的）
COMMISSION_CONTRACT_ADDRESS=0xa0C571F348Bc1C8E08F8fcFc8805254eF128B48D

# USDT地址（BSC测试网）
USDC_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd

# 其他配置（保持不变）
ERC8004_CONTRACT_ADDRESS=0x...  # 已部署的ERC8004地址
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
CHAIN_ID=97
RELAYER_PRIVATE_KEY=your_private_key_here
```

---

## ✅ 验证合约（可选但推荐）

### 在BSCScan验证合约源代码

```bash
cd contract
npx hardhat verify --network bscTestnet 0xa0C571F348Bc1C8E08F8fcFc8805254eF128B48D
```

**验证后可以**：
- 在BSCScan上查看和调用合约函数
- 查看合约源代码
- 查看所有交易和事件

---

## 🧪 测试新功能

### 1. 测试设置分账配置

```javascript
// 使用Hardhat Console或前端调用
const commission = await ethers.getContractAt("Commission", "0xa0C571F348Bc1C8E08F8fcFc8805254eF128B48D");

const orderId = ethers.id("test-order-1");
const splitConfig = {
  merchantMPCWallet: "0x...",  // 商户MPC钱包地址
  merchantAmount: ethers.parseUnits("100", 18),  // 100 USDT
  referrer: ethers.ZeroAddress,  // 无推荐人
  referralFee: 0,
  executor: "0x...",  // 执行Agent地址
  executionFee: ethers.parseUnits("10", 18),  // 10 USDT
  platformFee: ethers.parseUnits("15", 18),  // 15 USDT
  executorHasWallet: true,
  settlementTime: 0,  // 即时结算
  isDisputed: false,
  sessionId: ethers.id("test-session-1"),
};

await commission.setSplitConfig(orderId, splitConfig);
```

### 2. 测试查询分账配置

```javascript
const config = await commission.getSplitConfig(orderId);
console.log("Merchant Amount:", ethers.formatUnits(config.merchantAmount, 18));
console.log("Platform Fee:", ethers.formatUnits(config.platformFee, 18));
```

### 3. 测试QuickPay分账

```javascript
// 前提：用户已授权USDT给合约
// 前提：已设置分账配置

const orderId = ethers.id("test-order-1");
const totalAmount = ethers.parseUnits("125", 18);  // 100 + 10 + 15 = 125 USDT

await commission.quickPaySplit(orderId, totalAmount);
```

### 4. 测试钱包转账分账

```javascript
// 前提：用户已授权USDT给合约
// 前提：已设置分账配置

const orderId = ethers.id("test-order-2");
const totalAmount = ethers.parseUnits("125", 18);

await commission.walletSplit(orderId, totalAmount);
```

---

## 📊 合约功能清单

### 新增功能（今天）

| 函数名 | 类型 | 说明 | 测试状态 |
|--------|------|------|---------|
| `_autoSplit` | internal | 统一分账内部函数 | ⏳ 待测试 |
| `quickPaySplit` | external | QuickPay场景分账 | ⏳ 待测试 |
| `walletSplit` | external | 钱包转账场景分账 | ⏳ 待测试 |
| `providerFiatToCryptoSplit` | external | Provider法币转数字货币分账 | ⏳ 待测试 |
| `setSplitConfig` | external (onlyOwner) | 设置订单分账配置 | ⏳ 待测试 |
| `setAuthorizedProvider` | external (onlyOwner) | 设置Provider白名单 | ⏳ 待测试 |
| `setDisputeStatus` | external (onlyOwner) | 设置争议状态 | ⏳ 待测试 |
| `getSplitConfig` | external (view) | 查询分账配置 | ⏳ 待测试 |

### 原有功能（向后兼容）

| 函数名 | 类型 | 说明 | 测试状态 |
|--------|------|------|---------|
| `distributeCommission` | external | 分发佣金（原有方式） | ✅ 可用 |
| `syncOrder` | external | 同步订单 | ✅ 可用 |
| `recordCommission` | external | 记录佣金 | ✅ 可用 |
| `createSettlement` | external | 创建结算 | ✅ 可用 |

---

## 🔍 事件监听

### 监听分账事件

```javascript
// PaymentReceived 事件
commission.on("PaymentReceived", (orderId, scenario, from, amount, event) => {
  console.log("Payment Received:", {
    orderId,
    scenario,  // 0=QUICKPAY, 1=WALLET, 2=PROVIDER_FIAT
    from,
    amount: ethers.formatUnits(amount, 18),
  });
});

// PaymentAutoSplit 事件
commission.on("PaymentAutoSplit", (
  orderId,
  sessionId,
  merchantWallet,
  totalAmount,
  merchantAmount,
  platformFee,
  executionFee,
  referralFee,
  event
) => {
  console.log("Payment Auto Split:", {
    orderId,
    merchantAmount: ethers.formatUnits(merchantAmount, 18),
    platformFee: ethers.formatUnits(platformFee, 18),
    executionFee: ethers.formatUnits(executionFee, 18),
    referralFee: ethers.formatUnits(referralFee, 18),
  });
});
```

---

## 🚀 下一步操作

### 1. 更新后端配置 ✅
- [x] 更新 `backend/.env` 中的 `COMMISSION_CONTRACT_ADDRESS`
- [x] 确认 `USDC_ADDRESS` 配置正确

### 2. 验证合约（可选）⏳
- [ ] 在BSCScan验证合约源代码
- [ ] 确认合约函数可正常调用

### 3. 测试新功能 ⏳
- [ ] 测试 `setSplitConfig()` 设置分账配置
- [ ] 测试 `getSplitConfig()` 查询分账配置
- [ ] 测试 `quickPaySplit()` QuickPay分账
- [ ] 测试 `walletSplit()` 钱包转账分账
- [ ] 验证分账金额正确性

### 4. 集成测试 ⏳
- [ ] 商户上传商品
- [ ] 用户购买商品（QuickPay）
- [ ] 用户购买商品（钱包转账）
- [ ] 验证自动分账功能
- [ ] 验证链上事件

### 5. 端到端测试 ⏳
- [ ] 完整支付流程测试
- [ ] 分账验证
- [ ] 余额检查
- [ ] 事件监听

---

## 📝 部署检查清单

- [x] 合约编译成功
- [x] 合约部署成功
- [x] 结算代币配置成功
- [x] 金库地址配置成功
- [x] 返利池地址配置成功
- [x] 配置验证通过
- [ ] 后端环境变量更新
- [ ] 合约源代码验证（BSCScan）
- [ ] 新功能测试
- [ ] 集成测试

---

## 🔗 相关链接

- **BSCScan合约地址**: https://testnet.bscscan.com/address/0xa0C571F348Bc1C8E08F8fcFc8805254eF128B48D
- **BSC测试网水龙头**: https://testnet.binance.org/faucet-smart
- **部署脚本**: `contract/scripts/deploy-commission-bsc.ts`

---

## 📊 部署统计

- **Gas消耗**: 待查看（在BSCScan查看部署交易）
- **部署时间**: 2025-11-26
- **网络**: BSC Testnet (Chain ID: 97)
- **合约版本**: V2.2（包含非托管支付流程功能）

---

**文档维护**: PayMind 开发团队  
**最后更新**: 2025-11-26

