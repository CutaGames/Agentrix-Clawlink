# BSC测试网部署配置

**钱包地址**: `0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3`  
**用途**: 部署钱包 + Relayer钱包（统一使用）  
**代币**: USDT (替代USDC)

---

## 📋 配置信息

### 钱包信息
- **部署钱包地址**: `0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3`
- **Relayer钱包地址**: `0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3` (同一地址)

### 代币信息
- **USDT地址** (BSC测试网): `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`
- **代币符号**: USDT
- **小数位数**: 18

### 网络信息
- **网络名称**: BSC Testnet (Chapel)
- **Chain ID**: 97
- **RPC URL**: `https://data-seed-prebsc-1-s1.binance.org:8545`
- **区块浏览器**: https://testnet.bscscan.com

---

## ⚙️ 环境变量配置

### 1. 合约部署配置 (`contract/.env`)

```env
# 部署钱包私钥
PRIVATE_KEY=your_private_key_here

# Relayer地址（使用同一地址）
RELAYER_ADDRESS=0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3

# BSC测试网USDT地址
BSC_TESTNET_USDT_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd

# BSC测试网RPC（可选，有默认值）
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
```

### 2. 后端服务配置 (`backend/.env`)

```env
# ===== V7.0 统一支付配置 =====

# Relayer配置（使用同一钱包）
RELAYER_PRIVATE_KEY=your_private_key_here
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# 合约地址（部署后填入）
ERC8004_CONTRACT_ADDRESS=0x...

# USDT代币地址（替代USDC）
USDC_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd

# 链ID
CHAIN_ID=97
```

---

## 🚀 部署步骤

### 步骤1: 检查钱包余额

访问 BSCScan 测试网查看钱包余额：
https://testnet.bscscan.com/address/0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3

**需要**:
- 至少 0.1 BNB（用于支付Gas费）

**如果没有BNB**:
- 从BSC测试网水龙头获取: https://testnet.binance.org/faucet-smart

### 步骤2: 配置环境变量

```bash
cd contract
# 创建 .env 文件（如果不存在）
cp .env.example .env

# 编辑 .env 文件，填入：
# PRIVATE_KEY=你的私钥
# RELAYER_ADDRESS=0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3
```

### 步骤3: 部署合约

```bash
cd contract
npx hardhat run scripts/deploy-erc8004.ts --network bscTestnet
```

**预期输出**:
```
Deploying ERC8004SessionManager with account: 0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3
Account balance: X.XXX BNB
Network: bscTestnet Chain ID: 97
USDC Address: 0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
ℹ️  BSC Testnet: Using USDT address as payment token.
✅ ERC8004SessionManager deployed to: 0x...
Setting Relayer address to: 0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3
✅ Relayer set to: 0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3
ℹ️  Using deployer address as Relayer (OK for testing).

📋 Deployment Summary:
====================
Contract Address: 0x...
USDC Address: 0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
Relayer Address: 0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3
Network: bscTestnet
Chain ID: 97
```

### 步骤4: 记录部署信息

从部署输出中记录：
- ✅ **合约地址** (ERC8004_CONTRACT_ADDRESS)
- ✅ **USDT地址** (USDC_ADDRESS) - 已确认: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`
- ✅ **Relayer地址** - 已确认: `0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3`

### 步骤5: 配置后端环境变量

更新 `backend/.env` 文件：

```env
# 填入部署得到的合约地址
ERC8004_CONTRACT_ADDRESS=0x...  # 从步骤3获取

# 其他配置
USDC_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
RELAYER_PRIVATE_KEY=your_private_key_here
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
CHAIN_ID=97
```

### 步骤6: 验证部署

1. **在BSCScan查看合约**:
   https://testnet.bscscan.com/address/YOUR_CONTRACT_ADDRESS

2. **启动后端验证**:
   ```bash
   cd backend
   npm run start:dev
   ```
   
   查看日志确认：
   ```
   [Nest] INFO  PayMindRelayerService Relayer initialized with contract: 0x...
   [Nest] INFO  PreflightCheckService Pre-flight check service initialized
   ```

---

## ✅ 部署检查清单

- [ ] 钱包有足够的BNB测试币（至少0.1 BNB）
- [ ] `contract/.env` 已配置（PRIVATE_KEY, RELAYER_ADDRESS）
- [ ] 合约已部署到BSC测试网
- [ ] 合约地址已记录
- [ ] Relayer地址已设置到合约
- [ ] `backend/.env` 已配置（ERC8004_CONTRACT_ADDRESS, USDC_ADDRESS等）
- [ ] 后端服务启动成功
- [ ] Relayer服务初始化成功

---

## 🔍 验证合约

### 在BSCScan上验证

1. 访问合约地址: https://testnet.bscscan.com/address/YOUR_CONTRACT_ADDRESS
2. 点击 "Contract" 标签
3. 点击 "Verify and Publish"
4. 选择 "Solidity (Single file)" 或 "Solidity (Standard JSON Input)"
5. 填入合约信息并验证

### 使用Hardhat Console验证

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

// 查看Relayer地址（应该是你的钱包地址）
await contract.relayer();

// 查看USDT地址
await contract.usdcToken();
```

---

## 📝 注意事项

1. **使用USDT替代USDC**:
   - 合约代码中使用的是 `usdcToken` 变量名，但实际指向USDT地址
   - 功能完全兼容（都是ERC20代币）
   - 后端配置中 `USDC_ADDRESS` 实际是USDT地址

2. **同一钱包用于部署和Relayer**:
   - ✅ 测试环境完全OK
   - ⚠️ 生产环境建议分开使用
   - 确保钱包有足够的BNB支付Gas费

3. **USDT地址确认**:
   - BSC测试网USDT: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`
   - 可以在BSCScan上查看: https://testnet.bscscan.com/address/0x337610d27c682E347C9cD60BD4b3b107C9d34dDd

---

**最后更新**: 2025-01-24  
**钱包地址**: 0x2bee8AE78e4E41cf7facc4A4387A8F299dd2b8f3

