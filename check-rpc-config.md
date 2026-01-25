# RPC 和合约地址配置检查清单

## 问题诊断：Session not found on-chain

### 可能原因

1. **RPC 节点同步延迟**
   - 前端创建 Session 后，后端查询时 RPC 节点可能还未同步
   - 不同 RPC 节点的同步速度可能不同

2. **后端和前端使用不同的 RPC URL**
   - 后端：使用 `RPC_URL` 或 `BSC_TESTNET_RPC_URL` 环境变量
   - 前端：使用浏览器钱包连接的 RPC（MetaMask/OKX 等）

3. **合约地址配置不一致**
   - 后端：使用 `ERC8004_CONTRACT_ADDRESS` 环境变量
   - 前端：使用 `NEXT_PUBLIC_ERC8004_CONTRACT_ADDRESS` 或从 API 获取

### 检查步骤

#### 1. 检查后端配置（云端服务器）

```bash
# 在云端服务器上执行
cd /root/Agentrix/backend
cat .env | grep -E "RPC_URL|BSC_TESTNET_RPC_URL|ERC8004_CONTRACT_ADDRESS|CHAIN_ID"
```

#### 2. 检查前端配置（云端服务器）

```bash
# 在云端服务器上执行
cd /var/www/agentrix-website/frontend
cat .env.local | grep -E "NEXT_PUBLIC.*RPC|NEXT_PUBLIC.*ERC8004|NEXT_PUBLIC.*CONTRACT"
```

#### 3. 检查后端日志中的实际配置

```bash
# 查看后端启动日志，确认实际使用的 RPC 和合约地址
pm2 logs agentrix-backend --lines 100 --nostream | grep -i "rpc\|contract\|sessionmanager"
```

#### 4. 测试 RPC 连接

```bash
# 在云端服务器上测试后端使用的 RPC URL
curl -X POST https://bsc-testnet.nodereal.io/v1/1eefed273dc64160afd5e328e6c518d6 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### 解决方案

#### 方案 1：增加重试和延迟（推荐）

后端在验证链上 Session 时，如果第一次查询失败，可以：
- 等待几秒后重试
- 增加重试次数

#### 方案 2：确保 RPC URL 一致

确保后端和前端使用相同的 RPC URL：
- 后端：配置 `RPC_URL` 或 `BSC_TESTNET_RPC_URL`
- 前端：确保浏览器钱包连接到相同的网络

#### 方案 3：确保合约地址一致

确保后端和前端使用相同的合约地址：
- 后端：配置 `ERC8004_CONTRACT_ADDRESS`
- 前端：配置 `NEXT_PUBLIC_ERC8004_CONTRACT_ADDRESS` 或从后端 API 获取

### 临时解决方案

如果 RPC 同步延迟是主要问题，可以在后端 SessionService 中增加重试逻辑：

```typescript
// 在 session.service.ts 的 createSession 方法中
if (sessionId && this.sessionManagerContract) {
  // 增加重试逻辑
  let onChainSession = null;
  let retries = 3;
  let delay = 2000; // 2秒
  
  while (retries > 0 && !onChainSession) {
    try {
      onChainSession = await this.sessionManagerContract.getSession(sessionId);
      if (onChainSession && onChainSession.signer !== ZeroAddress) {
        break; // 找到有效的 Session
      }
    } catch (error) {
      this.logger.warn(`查询链上 Session 失败 (剩余重试: ${retries}): ${error.message}`);
    }
    
    if (retries > 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // 指数退避
    }
    retries--;
  }
  
  if (!onChainSession || onChainSession.signer === ZeroAddress) {
    throw new BadRequestException('Session not found on-chain');
  }
}
```

