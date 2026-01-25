# BSC测试网快速部署与测试指南

**日期**: 2025-11-26  
**目标**: 部署更新的Commission合约，测试非托管支付流程

---

## 📋 改动总结

### 今天改动的合约

**数量**: **1个合约**

**合约**: `Commission.sol`

**改动类型**: 
- ✅ 新增功能（非托管支付流程）
- ✅ 向后兼容（保留所有原有功能）

### 主要新增功能

1. **统一分账函数** `_autoSplit()` - 核心分账逻辑
2. **QuickPay分账** `quickPaySplit()` - X402 Session支付
3. **钱包转账分账** `walletSplit()` - 钱包直接支付
4. **Provider分账** `providerFiatToCryptoSplit()` - 法币转数字货币
5. **分账配置管理** `setSplitConfig()`, `getSplitConfig()`
6. **Provider白名单** `setAuthorizedProvider()`

---

## ⚠️ 是否需要重新部署？

### **答案：需要重新部署** ✅

**原因**：
- 新增了核心分账功能（非托管支付流程必需）
- 新增了存储变量（`orderSplitConfigs`, `authorizedProviders`）
- 需要新功能支持用户和商户的完整测试流程

**如果不部署**：
- ❌ 无法使用QuickPay自动分账
- ❌ 无法使用钱包转账自动分账
- ❌ 无法测试非托管支付流程
- ✅ 但原有功能（`distributeCommission`）仍然可用

---

## 🚀 快速部署步骤

### 步骤1: 准备环境变量

在 `contract/.env` 文件中配置：

```env
# 部署钱包私钥
PRIVATE_KEY=your_private_key_here

# BSC测试网USDT地址（默认值）
BSC_TESTNET_USDT_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd

# Agentrix金库地址（可选，默认使用部署者地址）
AGENTRIX_TREASURY_ADDRESS=0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3

# 系统返利池地址（可选，默认使用部署者地址）
SYSTEM_REBATE_POOL_ADDRESS=0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3

# BSC测试网RPC（可选，有默认值）
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# BSCScan API Key（用于验证合约，可选）
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

### 步骤2: 编译合约

```bash
cd contract
npm run compile
```

### 步骤3: 部署Commission合约

```bash
cd contract
npx hardhat run scripts/deploy-commission-bsc.ts --network bscTestnet
```

**预期输出**：
```
🚀 Deploying Commission contract to BSC Testnet
================================================
Deployer address: 0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3
Account balance: 0.5 BNB
Network: bscTestnet Chain ID: 97

📋 Configuration:
  USDT Address: 0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
  Treasury Address: 0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3
  Rebate Pool Address: 0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3

📦 Step 1: Deploying Commission contract...
✅ Commission deployed to: 0x...

⚙️  Step 2: Configuring settlement token and treasury...
✅ Settlement token configured
   - Settlement Token: 0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
   - Agentrix Treasury: 0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3
   - System Rebate Pool: 0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3

🔍 Step 3: Verifying configuration...
✅ Configuration verified

================================================
📋 Deployment Summary
================================================
Commission Address: 0x...
USDT Address: 0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
Treasury Address: 0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3
Rebate Pool Address: 0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3
Network: BSC Testnet (Chain ID: 97)
```

### 步骤4: 更新后端配置

更新 `backend/.env` 文件：

```env
# Commission合约地址（新部署的）
COMMISSION_CONTRACT_ADDRESS=0x...  # 从步骤3获取

# USDT地址（BSC测试网）
USDC_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd

# 其他配置（保持不变）
ERC8004_CONTRACT_ADDRESS=0x...  # 已部署的ERC8004地址
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
CHAIN_ID=97
RELAYER_PRIVATE_KEY=your_private_key_here
```

### 步骤5: 验证合约（可选）

```bash
cd contract
npx hardhat verify --network bscTestnet <COMMISSION_ADDRESS>
```

---

## 🧪 测试流程

### 1. 商户端测试

#### 1.1 商户注册和登录
- 访问商户后台
- 注册/登录商户账号
- 完成KYC（如果需要）

#### 1.2 集成SDK
- 获取商户SDK
- 配置商户信息
- 设置回调地址

#### 1.3 上传商品
- 创建商品
- 设置价格（USDT）
- 配置分账规则（商户、推荐人、执行Agent、平台）

### 2. 用户端测试

#### 2.1 用户注册和登录
- 访问用户端
- 注册/登录用户账号
- 连接钱包（MetaMask）

#### 2.2 创建QuickPay Session（可选）
- 授权QuickPay
- 设置限额
- 创建Session

#### 2.3 购买商品

**场景1: QuickPay支付**
1. 选择商品
2. 选择QuickPay支付方式
3. 确认支付（使用Session Key签名）
4. 验证支付成功
5. 验证分账是否正确

**场景2: 钱包转账支付**
1. 选择商品
2. 选择钱包支付方式
3. 确认交易（MetaMask签名）
4. 验证支付成功
5. 验证分账是否正确

**场景3: Provider支付（法币转数字货币）**
1. 选择商品
2. 选择Provider支付方式
3. 完成KYC（在Provider界面）
4. 支付法币
5. Provider发送USDT到合约
6. 验证自动分账

### 3. 验证分账

#### 3.1 检查链上事件
```bash
# 在BSCScan查看合约事件
# https://testnet.bscscan.com/address/YOUR_COMMISSION_ADDRESS#events

# 应该看到：
# - PaymentReceived 事件
# - PaymentAutoSplit 事件
```

#### 3.2 检查余额
- 商户MPC钱包余额
- 推荐人钱包余额
- 执行Agent钱包余额
- 平台金库余额

#### 3.3 验证分账配置
```javascript
// 调用 getSplitConfig(orderId) 查看分账配置
const config = await commission.getSplitConfig(orderId);
console.log("Merchant Amount:", config.merchantAmount);
console.log("Platform Fee:", config.platformFee);
```

---

## 📊 测试检查清单

### 部署检查
- [ ] Commission合约部署成功
- [ ] 结算代币配置成功
- [ ] 金库地址配置成功
- [ ] 后端环境变量更新

### 功能测试
- [ ] 商户可以上传商品
- [ ] 用户可以浏览商品
- [ ] QuickPay支付流程正常
- [ ] 钱包转账支付流程正常
- [ ] Provider支付流程正常（如果已集成）
- [ ] 分账配置设置成功
- [ ] 自动分账执行成功
- [ ] 链上事件正确触发

### 验证测试
- [ ] 商户收到正确金额
- [ ] 推荐人收到正确佣金
- [ ] 执行Agent收到正确佣金
- [ ] 平台收到正确费用
- [ ] 分账金额总和等于支付金额

---

## 🔧 常见问题

### Q1: 部署失败，Gas不足
**A**: 确保部署钱包有足够的BNB（建议至少0.1 BNB）

### Q2: 配置失败，地址无效
**A**: 检查USDT地址是否正确，确保是BSC测试网的USDT地址

### Q3: 分账失败，订单配置不存在
**A**: 确保在支付前调用了 `setSplitConfig()` 设置订单分账配置

### Q4: Provider支付失败，未授权
**A**: 确保Provider地址已添加到白名单（调用 `setAuthorizedProvider()`）

---

## 📝 总结

### 改动统计
- **改动的合约**: 1个（Commission.sol）
- **新增函数**: 8个
- **新增事件**: 4个
- **新增存储变量**: 2个

### 部署要求
- ✅ **需要重新部署** Commission合约
- ✅ 需要配置结算代币（USDT）和金库地址
- ✅ 需要更新后端环境变量

### 测试要求
- ✅ 测试QuickPay支付流程
- ✅ 测试钱包转账支付流程
- ✅ 验证自动分账功能
- ✅ 验证分账金额正确性

---

**文档维护**: Agentrix 开发团队  
**最后更新**: 2025-11-26

