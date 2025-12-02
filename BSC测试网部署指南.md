# BSC测试网部署指南 - ERC8004SessionManager

**目标**: 在BSC测试网上部署ERC-8004合约，配置环境变量，验证V7.0统一支付流程

---

## 📋 前置准备

### 1. 钱包准备

你需要准备：
- **部署钱包地址**：用于部署合约（需要BNB测试币支付Gas）
- **Relayer钱包地址**：用于Relayer服务代付Gas（需要BNB测试币）

**获取测试BNB**：
- BSC测试网水龙头：https://testnet.binance.org/faucet-smart
- 或使用其他BSC测试网水龙头

### 2. 环境变量准备

在 `contract/` 目录下创建 `.env` 文件：

```env
# 部署钱包私钥（不要提交到Git）
PRIVATE_KEY=your_deployer_private_key_here

# BSC测试网RPC（可选，有默认值）
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# BSC测试网USDC地址（可选，有默认测试代币地址）
BSC_TESTNET_USDC_ADDRESS=0x64544969ed7EBf5f083679233325356EbE738930

# Relayer地址（部署后设置）
RELAYER_ADDRESS=your_relayer_wallet_address_here

# BSCScan API Key（用于验证合约，可选）
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

---

## 🚀 部署步骤

### 步骤1: 检查依赖

```bash
cd contract
npm install
```

### 步骤2: 检查钱包余额

部署前确保部署钱包有足够的BNB测试币（建议至少0.1 BNB）：

```bash
# 在BSCScan测试网查看余额
# https://testnet.bscscan.com/address/YOUR_DEPLOYER_ADDRESS
```

### 步骤3: 部署合约

```bash
cd contract
npx hardhat run scripts/deploy-erc8004.ts --network bscTestnet
```

**预期输出**：
```
Deploying ERC8004SessionManager with account: 0x...
Account balance: 0.5 BNB
Network: bscTestnet Chain ID: 97
USDC Address: 0x64544969ed7EBf5f083679233325356EbE738930
✅ ERC8004SessionManager deployed to: 0x...
Setting Relayer address to: 0x...
✅ Relayer set to: 0x...

📋 Deployment Summary:
====================
Contract Address: 0x...
USDC Address: 0x64544969ed7EBf5f083679233325356EbE738930
Relayer Address: 0x...
Network: bscTestnet
Chain ID: 97
```

### 步骤4: 记录部署信息

部署成功后，记录以下信息：

- ✅ **合约地址** (ERC8004_CONTRACT_ADDRESS)
- ✅ **USDC地址** (USDC_ADDRESS)
- ✅ **Relayer地址** (RELAYER_ADDRESS)
- ✅ **网络**: BSC Testnet (Chain ID: 97)

---

## ⚙️ 配置后端环境变量

在 `backend/.env` 文件中添加以下配置：

```env
# ===== V7.0 统一支付配置 =====

# Relayer配置
RELAYER_PRIVATE_KEY=your_relayer_wallet_private_key_here
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
# 或使用其他BSC测试网RPC:
# RPC_URL=https://bsc-testnet.public.blastapi.io
# RPC_URL=https://bsc-testnet-rpc.publicnode.com

# 合约地址（从部署步骤4获取）
ERC8004_CONTRACT_ADDRESS=0x...  # 替换为实际部署的合约地址

# USDC代币地址（BSC测试网）
USDC_ADDRESS=0x64544969ed7EBf5f083679233325356EbE738930

# 链ID
CHAIN_ID=97
```

### 生成Relayer私钥（如果还没有）

如果你还没有Relayer钱包，可以：

1. **使用MetaMask生成新钱包**
   - 创建新账户
   - 导出私钥
   - 确保该钱包有BNB测试币（用于支付Gas）

2. **或使用脚本生成**（仅用于测试）

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ✅ 验证部署

### 1. 在BSCScan测试网查看合约

访问：https://testnet.bscscan.com/address/YOUR_CONTRACT_ADDRESS

**验证点**：
- [ ] 合约已部署
- [ ] 可以查看合约代码
- [ ] Relayer地址已设置（调用 `relayer()` 函数查看）

### 2. 验证合约功能

可以使用Hardhat Console测试：

```bash
cd contract
npx hardhat console --network bscTestnet
```

```javascript
// 在console中执行
const contract = await ethers.getContractAt(
  'ERC8004SessionManager',
  'YOUR_CONTRACT_ADDRESS'
);

// 查看Relayer地址
await contract.relayer();

// 查看USDC地址
await contract.usdcToken();
```

### 3. 测试后端连接

启动后端服务：

```bash
cd backend
npm run start:dev
```

**验证点**：
- [ ] 后端启动成功
- [ ] 查看日志中是否有：
  ```
  [Nest] INFO  PayMindRelayerService Relayer initialized with contract: 0x...
  [Nest] INFO  PreflightCheckService Pre-flight check service initialized
  ```

**如果失败**：
- 检查环境变量是否正确
- 检查RPC URL是否可访问
- 检查Relayer私钥格式（应该是 `0x...` 格式）

---

## 🔧 常见问题

### 问题1: 部署失败 - Insufficient funds

**原因**: 部署钱包BNB余额不足

**解决**:
1. 从BSC测试网水龙头获取测试BNB
2. 确保钱包有至少0.1 BNB

### 问题2: 部署失败 - Nonce too high

**原因**: 钱包nonce不同步

**解决**:
```bash
# 重置nonce（在MetaMask中）
# 或等待一段时间后重试
```

### 问题3: USDC地址不存在

**原因**: BSC测试网上可能没有官方USDC

**解决**:
1. 使用提供的测试代币地址
2. 或部署一个测试ERC20代币作为USDC
3. 更新 `USDC_ADDRESS` 环境变量

### 问题4: Relayer初始化失败

**原因**: Relayer钱包没有BNB或私钥错误

**解决**:
1. 确保Relayer钱包有BNB测试币
2. 检查私钥格式（应该是64字符的hex字符串，带或不带 `0x` 前缀）
3. 检查RPC URL是否可访问

---

## 📝 部署后检查清单

完成部署后，确认以下项目：

### 合约部署
- [ ] 合约已部署到BSC测试网
- [ ] 合约地址已记录
- [ ] Relayer地址已设置到合约
- [ ] 在BSCScan上可以查看合约

### 环境变量
- [ ] `ERC8004_CONTRACT_ADDRESS` 已配置
- [ ] `USDC_ADDRESS` 已配置
- [ ] `RELAYER_PRIVATE_KEY` 已配置
- [ ] `RPC_URL` 已配置（BSC测试网）

### 后端服务
- [ ] 后端启动成功
- [ ] Relayer服务初始化成功
- [ ] PreflightCheck服务初始化成功
- [ ] 无错误日志

### 钱包准备
- [ ] 部署钱包有BNB测试币
- [ ] Relayer钱包有BNB测试币（至少0.1 BNB）
- [ ] 测试用户钱包有BNB测试币（用于测试支付）

---

## 🎯 下一步

部署完成后，按照 `验证V7.0统一支付流程.md` 文档进行完整流程验证：

1. **测试Pre-Flight Check API**
2. **测试Session创建**
3. **测试QuickPay支付**
4. **验证完整支付流程**

---

## 🔐 安全提醒

⚠️ **重要**：
- 私钥**永远不要**提交到Git仓库
- 测试网私钥也要妥善保管
- 生产环境使用硬件钱包或密钥管理服务
- 定期轮换Relayer私钥

---

**最后更新**: 2025-01-24  
**维护者**: PayMind 开发团队

