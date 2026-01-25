# 🚀 Agentrix 空投 & AutoEarn 快速开始指南

> 5 分钟内启动商业化级别的空投发现和自动收益系统

---

## 📦 前置要求

- Node.js 18+
- PostgreSQL 14+
- 至少一个 RPC 节点（Alchemy 或 Infura）

---

## ⚡ 快速启动

### 1. 环境配置 (2分钟)

在 `backend/.env` 中添加：

```bash
# 最小配置（测试网）
SEPOLIA_RPC_URL=https://rpc.sepolia.org
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
NODE_ENV=development

# 推荐配置（生产网）
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
BSC_RPC_URL=https://bsc-dataseed1.binance.org
POLYGON_RPC_URL=https://polygon-rpc.com
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
BASE_RPC_URL=https://mainnet.base.org
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# 可选：数据源 API
DEBANK_API_KEY=your_key  # 推荐，$299/月
# Earndrop 免费，无需配置
```

### 2. 安装依赖 (1分钟)

```bash
cd backend
npm install ethers@6
```

### 3. 数据库迁移 (1分钟)

```bash
npm run migration:run
```

确认 `airdrops` 表已创建。

### 4. 启动服务 (30秒)

```bash
# 开发环境
npm run start:dev

# 生产环境
npm run build
npm run start:prod
```

---

## 🧪 测试 API

### 发现空投

```bash
curl -X POST http://localhost:3001/api/auto-earn/airdrops/discover \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**响应示例**:
```json
[
  {
    "id": "uuid",
    "projectName": "Arbitrum ARB Airdrop",
    "chain": "arbitrum",
    "estimatedAmount": 1250,
    "currency": "USD",
    "status": "monitoring"
  }
]
```

### 检查资格

```bash
curl -X POST http://localhost:3001/api/auto-earn/airdrops/{id}/check-eligibility \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应示例**:
```json
{
  "eligible": true,
  "missingRequirements": [],
  "gasEstimate": {
    "estimatedCost": "0.003",
    "estimatedCostUSD": 7.5
  }
}
```

### 领取空投

```bash
curl -X POST http://localhost:3001/api/auto-earn/airdrops/{id}/claim \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应示例 (MPC钱包)**:
```json
{
  "success": true,
  "transactionHash": "0x...",
  "mode": "executed"
}
```

**响应示例 (需要签名)**:
```json
{
  "success": true,
  "mode": "needsSignature",
  "transactionData": {
    "to": "0x...",
    "data": "0x...",
    "gasLimit": "150000",
    "chainId": 42161
  }
}
```

---

## 🎯 前端集成

### 安装 API 客户端

```bash
cd frontend
# API 客户端已存在于 lib/api/auto-earn.api.ts
```

### 使用示例

```typescript
import { autoEarnApi } from '@/lib/api/auto-earn.api';

// 1. 发现空投
const airdrops = await autoEarnApi.discoverAirdrops();

// 2. 检查资格
const result = await autoEarnApi.checkEligibility(airdrop.id);

// 3. 领取
if (result.eligible) {
  const claim = await autoEarnApi.claimAirdrop(airdrop.id);
  
  if (claim.mode === 'needsSignature') {
    // 前端调用钱包签名
    const wallet = await ethers.BrowserProvider(window.ethereum);
    const signer = await wallet.getSigner();
    const tx = await signer.sendTransaction(claim.transactionData);
    
    // 提交签名交易
    await autoEarnApi.submitClaimTransaction(airdrop.id, tx);
  }
}
```

---

## 🔥 功能特性

### ✅ 已实现
- [x] 多链支持（6个主网 + 3个测试网）
- [x] 真实空投发现（DeBank、Earndrop、链上数据）
- [x] Merkle proof 验证
- [x] Gas 费用估算
- [x] MPC 钱包自动领取
- [x] 用户钱包签名模式
- [x] 批量领取
- [x] 风险评分

### 🚧 进行中
- [ ] Solana 领取逻辑
- [ ] 前端增强组件
- [ ] AutoEarn 策略引擎

---

## 📊 支持的链

| 链 | 主网 | 测试网 | 空投覆盖率 |
|----|------|--------|-----------|
| Ethereum | ✅ | ✅ Sepolia | 40% |
| BSC | ✅ | ✅ | 25% |
| Polygon | ✅ | ❌ | 15% |
| Arbitrum | ✅ | ❌ | 10% |
| Base | ✅ | ❌ | 5% |
| Solana | 🚧 | ✅ Devnet | 5% |

---

## 🛡️ 安全建议

### 开发环境
- ✅ 使用测试网
- ✅ 启用演示数据
- ✅ 降低 gas limit

### 生产环境
- ⚠️ 启用 KMS 管理私钥
- ⚠️ 配置风险阈值
- ⚠️ 启用交易模拟
- ⚠️ 设置 gas 上限

---

## 🐛 常见问题

### Q: 为什么没有发现空投？
**A**: 检查以下几点：
1. 用户是否绑定了钱包？
2. RPC 节点是否正常？
3. 数据源 API Key 是否配置？
4. 查看日志中的详细错误

### Q: Gas 费用过高怎么办？
**A**: 系统会自动估算，建议：
1. 在 gas 价格低时领取
2. 使用批量领取降低成本
3. 设置最大 gas 阈值

### Q: 如何验证空投真实性？
**A**: 查看 `riskScore` 字段：
- 0-30: 安全（链上验证/知名项目）
- 31-70: 中等（需谨慎）
- 71-100: 高风险（不建议领取）

### Q: MPC 钱包如何配置？
**A**: 参考 [商业化部署指南](./COMMERCIAL_DEPLOYMENT_GUIDE.md) 的 "MPC 钱包集成" 章节。

---

## 📈 监控

### 关键指标

```bash
# 查看空投发现成功率
SELECT COUNT(*) FROM airdrops WHERE status != 'failed';

# 查看平均领取时间
SELECT AVG(EXTRACT(EPOCH FROM (claimed_at - created_at))) FROM airdrops WHERE status = 'claimed';

# 查看失败原因分布
SELECT metadata->>'failureReason', COUNT(*) FROM airdrops WHERE status = 'failed' GROUP BY 1;
```

---

## 🎓 学习资源

### 技术文档
- [多链配置详解](../backend/src/config/chains.config.ts)
- [空投数据提供者](../backend/src/modules/auto-earn/providers/airdrop-provider.service.ts)
- [链上领取服务](../backend/src/modules/auto-earn/providers/onchain-claim.service.ts)

### 商业文档
- [商业化部署指南](./COMMERCIAL_DEPLOYMENT_GUIDE.md)
- [完整实施计划](./IMPLEMENTATION_PLAN.md)
- [优化总结](./OPTIMIZATION_SUMMARY.md)

---

## 💬 获取帮助

- 📧 Email: support@agentrix.com
- 💬 Discord: [Agentrix Community](https://discord.gg/agentrix)
- 📖 Docs: https://docs.agentrix.com
- 🐛 Issues: https://github.com/agentrix/issues

---

## 🎉 下一步

1. ✅ 完成快速启动
2. 🔄 测试完整流程
3. 🎨 前端集成
4. 🚀 灰度发布
5. 📊 监控指标
6. 💰 商业化运营

---

**祝你使用愉快！** 🎊

如有问题，随时查看[完整文档](./README.md)或联系技术支持。
