# Agentrix 空投与 AutoEarn 商业化部署指南

## 📋 概述

本指南旨在帮助开发人员和运维人员将 Agentrix 的空投发现与 AutoEarn 功能部署到生产环境。该系统支持多链交互、真实数据发现和自动化收益管理。

---

## 🛠️ 环境要求

### 1. 基础设施
- **Node.js**: v18.x 或更高版本
- **PostgreSQL**: v14.x 或更高版本
- **Redis**: 用于缓存和任务队列
- **WSL2 (Windows 用户)**: 建议在 Ubuntu 24.04 环境下运行

### 2. 外部 API 密钥
为了使系统正常工作，您需要获取以下 API 密钥：
- **DeBank Pro API**: 用于高精度的钱包资产和空投查询 ([申请地址](https://pro-openapi.debank.com/))
- **Alchemy/Infura**: 用于多链 RPC 访问
- **Etherscan/BscScan API**: 用于合约验证和 Gas 价格获取
- **Earndrop API (可选)**: 用于额外的空投数据源

---

## ⚙️ 环境变量配置

在 `backend/.env` 文件中添加以下配置：

```env
# --- 基础配置 ---
ENABLE_MCP=true
NODE_ENV=production

# --- 多链 RPC 配置 ---
RPC_ETHEREUM=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
RPC_BSC=https://bsc-dataseed.binance.org/
RPC_POLYGON=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
RPC_ARBITRUM=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
RPC_BASE=https://mainnet.base.org
RPC_SOLANA=https://api.mainnet-beta.solana.com

# --- 测试网 RPC (开发环境) ---
RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
RPC_BSC_TESTNET=https://data-seed-prebsc-1-s1.binance.org:8545/

# --- 数据源 API Keys ---
DEBANK_API_KEY=your_debank_pro_api_key
EARNDROP_API_KEY=your_earndrop_api_key

# --- 安全与钱包 ---
# MPC 钱包加密密钥 (32位随机字符串)
MPC_ENCRYPTION_KEY=your_secure_random_key_32_chars
# 自动领取使用的私钥 (仅用于测试或受控环境)
AUTO_CLAIM_PRIVATE_KEY=your_private_key

# --- 监控与告警 ---
SENTRY_DSN=your_sentry_dsn
DATADOG_API_KEY=your_datadog_key
```

---

## 🚀 部署步骤

### 1. 数据库迁移
确保数据库表结构已更新以支持空投和 AutoEarn 功能：
```bash
cd backend
npm run migration:run
```

### 2. 启动后端服务
```bash
cd backend
npm run build
npm run start:prod
```

### 3. 启动前端服务
```bash
cd frontend
npm run build
npm run start
```

### 4. 验证部署
访问以下端点确认服务状态：
- 健康检查: `GET /api/health`
- 空投发现测试: `POST /api/auto-earn/airdrops/discover` (需要带上 Auth Token)

---

## 🔒 安全最佳实践

1. **私钥管理**: 
   - 生产环境严禁在 `.env` 中存储明文私钥。
   - 建议集成 AWS KMS 或 GCP KMS 进行私钥管理。
2. **Gas 限制**:
   - 在 `OnchainClaimService` 中配置 `MAX_GAS_PRICE` 以防止在 Gas 飙升时进行高成本操作。
3. **风险评分**:
   - 始终检查空投项目的 `riskScore`。建议拦截评分低于 40 的项目。
4. **限流保护**:
   - 为 `/discover` 和 `/claim` 接口配置 Rate Limiting，防止 API 滥用。

---

## 📈 监控与维护

### 1. 日志监控
- 关注 `AirdropService` 的日志，特别是 `discoverAirdrops` 失败的情况。
- 监控 `OnchainClaimService` 的交易提交失败率。

### 2. 任务调度
- 系统会自动运行定时任务发现新空投。
- 检查 `AutoEarnService` 中的 `Cron` 任务是否正常运行。

---

## ❓ 常见问题 (FAQ)

**Q: 为什么发现不了空投？**
A: 请检查 DeBank API Key 是否有效，以及钱包地址是否在支持的链上有活动记录。

**Q: 领取交易一直处于 Pending 状态？**
A: 可能是设置的 Gas 价格过低。系统会自动尝试调高 Gas 重新提交，请检查 `OnchainClaimService` 的重试逻辑。

**Q: 如何添加新的区块链支持？**
A: 在 `backend/src/config/chains.config.ts` 中添加新链配置，并在 `OnchainClaimService` 中初始化对应的 Provider。

---

**版本**: 1.0.0  
**最后更新**: 2026-01-02
