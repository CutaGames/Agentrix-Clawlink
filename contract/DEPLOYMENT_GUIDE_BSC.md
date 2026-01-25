# Agentrix 合约部署指南 - BSC 测试网

本文档指导如何将 Agentrix 所有智能合约部署到 BSC 测试网。

## 📋 前置条件

1. ✅ **ERC8004SessionManager 已部署**（你已完成）
2. ✅ 配置了 `.env` 文件
3. ✅ 账户有足够的 BNB 作为 Gas 费

## 🔧 环境配置

在 `contract/.env` 文件中配置以下变量：

```env
# BSC 测试网配置
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
PRIVATE_KEY=your_private_key_here
BSCSCAN_API_KEY=your_bscscan_api_key_here

# 已部署的合约地址
ERC8004_CONTRACT_ADDRESS=0x...  # 你已部署的 ERC8004 地址

# Commission 配置（部署后需要）
SETTLEMENT_TOKEN_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd  # BSC 测试网 USDT
AGENTRIX_TREASURY_ADDRESS=0x...  # Agentrix 金库地址
SYSTEM_REBATE_POOL_ADDRESS=0x...  # 系统返利池地址（可选）
```

## 🚀 部署步骤

### 步骤 1: 编译合约

```bash
cd contract
npm run compile
```

### 步骤 2: 部署所有合约

```bash
npm run deploy:bsc-testnet
```

这个命令会按顺序部署：
1. **PaymentRouter** - 支付路由合约
2. **X402Adapter** - X402 协议适配器（依赖 PaymentRouter）
3. **AutoPay** - 自动支付合约
4. **Commission** - 分润结算合约

### 步骤 3: 配置 Commission 合约

部署完成后，需要配置 Commission 合约的结算代币和金库地址：

```bash
npm run configure:commission
```

或者手动调用合约方法：

```javascript
// 配置结算代币和金库
await commission.configureSettlementToken(
  "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd", // USDT 地址
  "0x..." // Agentrix 金库地址
);

// 配置系统返利池（可选）
await commission.setSystemRebatePool("0x...");
```

### 步骤 4: 验证合约（可选）

在 BSCScan 上验证合约源代码：

```bash
# 验证 PaymentRouter
npx hardhat verify --network bscTestnet <PAYMENT_ROUTER_ADDRESS>

# 验证 X402Adapter（需要传入构造函数参数）
npx hardhat verify --network bscTestnet <X402_ADAPTER_ADDRESS> <PAYMENT_ROUTER_ADDRESS>

# 验证 AutoPay
npx hardhat verify --network bscTestnet <AUTO_PAY_ADDRESS>

# 验证 Commission
npx hardhat verify --network bscTestnet <COMMISSION_ADDRESS>
```

## 📝 部署后的配置

### 1. 更新后端环境变量

在 `backend/.env` 中添加：

```env
# 合约地址
PAYMENT_ROUTER_ADDRESS=0x...
X402_ADAPTER_ADDRESS=0x...
AUTO_PAY_ADDRESS=0x...
COMMISSION_ADDRESS=0x...
ERC8004_CONTRACT_ADDRESS=0x...  # 你已部署的地址

# BSC 测试网配置
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
BSC_TESTNET_CHAIN_ID=97
```

### 2. 更新前端环境变量

在 `agentrixfrontend/.env.local` 中添加：

```env
NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS=0x...
NEXT_PUBLIC_X402_ADAPTER_ADDRESS=0x...
NEXT_PUBLIC_AUTO_PAY_ADDRESS=0x...
NEXT_PUBLIC_COMMISSION_ADDRESS=0x...
NEXT_PUBLIC_ERC8004_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_BSC_TESTNET_CHAIN_ID=97
NEXT_PUBLIC_BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
```

## 🔗 合约依赖关系

```
ERC8004SessionManager (已部署)
    ↓
PaymentRouter (独立)
    ↓
X402Adapter (依赖 PaymentRouter)
    ↓
AutoPay (独立)
    ↓
Commission (独立，但需要配置)
```

## ⚠️ 注意事项

1. **Gas 费用**: 确保部署账户有足够的 BNB（建议至少 0.1 BNB）
2. **网络延迟**: BSC 测试网可能有延迟，部署可能需要几分钟
3. **合约验证**: 建议在 BSCScan 上验证所有合约，方便后续调试
4. **私钥安全**: 永远不要将 `.env` 文件提交到 Git
5. **Commission 配置**: Commission 合约部署后必须配置 `settlementToken` 和 `agentrixTreasury` 才能正常工作

## 📊 部署检查清单

- [ ] 编译合约成功
- [ ] PaymentRouter 部署成功
- [ ] X402Adapter 部署成功并配置到 PaymentRouter
- [ ] AutoPay 部署成功
- [ ] Commission 部署成功
- [ ] Commission 配置了 settlementToken 和 agentrixTreasury
- [ ] 所有合约地址已更新到后端 `.env`
- [ ] 所有合约地址已更新到前端 `.env.local`
- [ ] 合约已在 BSCScan 上验证（可选）

## 🐛 故障排除

### 问题：部署失败，提示 "insufficient funds"

**解决方案**: 确保账户有足够的 BNB。可以通过 BSC 测试网水龙头获取：https://testnet.binance.org/faucet-smart

### 问题：X402Adapter 部署失败

**解决方案**: 确保 PaymentRouter 已成功部署，并且地址正确传入构造函数。

### 问题：Commission 配置失败

**解决方案**: 
- 确保 `SETTLEMENT_TOKEN_ADDRESS` 是有效的代币地址
- 确保 `AGENTRIX_TREASURY_ADDRESS` 是有效的地址
- 检查调用者是否有合约的 owner 权限

## 📞 支持

如有问题，请查看：
- 合约测试文件：`contract/test/`
- 合约源代码：`contract/contracts/`
- Hardhat 配置：`contract/hardhat.config.ts`

