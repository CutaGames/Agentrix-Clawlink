# QuickPay配置诊断指南

## 问题

即使所有环境变量都已配置，QuickPay仍然使用Mock模式。

---

## 诊断步骤

### 步骤1：运行诊断脚本

```bash
cd backend
npx ts-node scripts/check-relayer-config.ts
```

这个脚本会检查：
- 环境变量是否已设置
- 格式是否正确（地址长度、hex字符等）
- 是否有隐藏的空格或特殊字符

### 步骤2：检查后端启动日志

重启后端服务，查看启动日志：

```bash
cd backend
npm run start:dev
```

**查找以下日志**：

✅ **成功初始化**：
```
Initializing Relayer with RPC: https://...
Relayer wallet initialized: 0x...
ERC8004_CONTRACT_ADDRESS from config: 0x...
✅ Relayer initialized successfully with contract: 0x...
   Relayer wallet: 0x...
   RPC URL: https://...
```

❌ **使用Mock模式**：
```
ERC8004_CONTRACT_ADDRESS from config: NOT SET
⚠️ ERC8004_CONTRACT_ADDRESS not set, relayer will use mock mode
```

或

```
Invalid ERC8004_CONTRACT_ADDRESS format: ...
⚠️ Invalid contract address format, relayer will use mock mode
```

### 步骤3：检查.env文件位置和格式

确保 `.env` 文件在 `backend/` 目录下：

```bash
cd backend
ls -la .env
```

检查 `.env` 文件格式：

```bash
# ✅ 正确格式（无引号，无多余空格）
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
ERC8004_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
RELAYER_PRIVATE_KEY=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890

# ❌ 错误格式（有引号）
RPC_URL="https://data-seed-prebsc-1-s1.binance.org:8545"
ERC8004_CONTRACT_ADDRESS="0x1234567890123456789012345678901234567890"

# ❌ 错误格式（有空格）
ERC8004_CONTRACT_ADDRESS = 0x1234567890123456789012345678901234567890
RELAYER_PRIVATE_KEY = 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890

# ❌ 错误格式（值有前导/尾随空格）
ERC8004_CONTRACT_ADDRESS= 0x1234567890123456789012345678901234567890 
```

### 步骤4：验证合约地址

在BSC测试网浏览器验证合约是否存在：

```
https://testnet.bscscan.com/address/你的合约地址
```

如果显示 "Contract" 标签，说明合约已部署。

### 步骤5：验证Relayer钱包

检查Relayer钱包是否有BNB：

```
https://testnet.bscscan.com/address/你的Relayer钱包地址
```

确保有足够的BNB支付Gas（建议至少0.1 BNB）。

---

## 常见问题

### Q1: 环境变量已设置但系统仍读取不到

**可能原因**：
1. `.env` 文件不在 `backend/` 目录
2. 后端服务没有重启
3. 环境变量有隐藏字符（空格、引号等）

**解决方案**：
```bash
# 1. 确认.env文件位置
cd backend
pwd
ls -la .env

# 2. 检查环境变量（去除所有空格和引号）
cat .env | grep -E "RPC_URL|ERC8004|RELAYER" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'

# 3. 重启后端服务
npm run start:dev
```

### Q2: 合约地址格式错误

**错误示例**：
```
ERC8004_CONTRACT_ADDRESS=0x123  # 有空格
ERC8004_CONTRACT_ADDRESS="0x123..."  # 有引号
ERC8004_CONTRACT_ADDRESS=0x123...  # 长度不对（应该是42字符）
```

**正确格式**：
```
ERC8004_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
# 必须是：0x + 40个hex字符 = 42字符
```

### Q3: 私钥格式错误

**错误示例**：
```
RELAYER_PRIVATE_KEY=0xabc  # 长度不对
RELAYER_PRIVATE_KEY="0x..."  # 有引号
RELAYER_PRIVATE_KEY=0x...  # 有非hex字符
```

**正确格式**：
```
RELAYER_PRIVATE_KEY=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
# 必须是：0x + 64个hex字符 = 66字符
```

### Q4: 合约初始化失败

**可能原因**：
1. 合约地址不存在
2. RPC URL无法访问
3. 网络连接问题

**解决方案**：
```bash
# 测试RPC连接
curl -X POST https://data-seed-prebsc-1-s1.binance.org:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# 如果返回block number，说明RPC正常
```

---

## 修复后的验证

配置修复后，重启后端服务，应该看到：

```
✅ Relayer initialized successfully with contract: 0x...
   Relayer wallet: 0x...
   RPC URL: https://...
```

然后进行一次QuickPay支付，应该看到：

```
QuickPay executed immediately: paymentId=XXX, txHash=0x...
```

而不是：

```
Mock mode: Payment XXX processed immediately
```

---

## 快速检查清单

- [ ] `.env` 文件在 `backend/` 目录下
- [ ] `RPC_URL` 已设置且格式正确
- [ ] `ERC8004_CONTRACT_ADDRESS` 已设置，42字符，无引号无空格
- [ ] `RELAYER_PRIVATE_KEY` 已设置，66字符，无引号无空格
- [ ] 合约地址在BSC测试网上存在
- [ ] Relayer钱包有足够的BNB
- [ ] 后端服务已重启
- [ ] 启动日志显示"Relayer initialized successfully"

---

**如果所有检查都通过但仍使用Mock模式，请查看后端启动日志的具体错误信息！**

