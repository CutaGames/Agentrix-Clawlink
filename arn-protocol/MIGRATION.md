# ARN Protocol - 独立仓库迁移指南

本文档描述如何将 ARN Protocol 迁移到独立的 GitHub 仓库。

## 1. 创建新仓库

```bash
# 在 GitHub 上创建新仓库: x402-alliance/arn-protocol

# 克隆当前项目
git clone https://github.com/CutaGames/Agentrix.git temp-arn
cd temp-arn

# 使用 git filter-repo 提取 arn-protocol 目录
pip install git-filter-repo
git filter-repo --path arn-protocol --path-rename arn-protocol/:

# 设置新远程
git remote add origin https://github.com/x402-alliance/arn-protocol.git
git push -u origin main
```

## 2. 仓库结构

```
arn-protocol/
├── contracts/              # Solidity 合约
│   ├── ArnSessionManager.sol
│   ├── ArnFeeSplitter.sol
│   ├── ArnTreasury.sol
│   ├── ReceiptRegistry.sol
│   ├── EpochManager.sol
│   ├── MerkleDistributor.sol
│   └── AttestationRegistry.sol
├── services/               # 后端服务
│   ├── epoch-service.ts
│   ├── merkle-generator.ts
│   └── event-indexer.ts
├── test/                   # 测试
├── scripts/                # 部署脚本
├── typechain-types/        # 生成的类型
├── data/                   # 运行时数据 (gitignore)
├── hardhat.config.ts
├── package.json
├── tsconfig.json
├── README.md
└── MIGRATION.md
```

## 3. 依赖关系

### 与 Agentrix 的关系

ARN Protocol 作为独立的协议层，与 Agentrix 的关系：

```
┌─────────────────────────────────────────────────────┐
│                   Agentrix (应用层)                  │
│  • PayMind Agent                                    │
│  • Merchant Dashboard                               │
│  • User Wallet                                      │
└─────────────────────────────────────────────────────┘
                          │
                          │ 使用
                          ▼
┌─────────────────────────────────────────────────────┐
│                 ARN Protocol (协议层)                │
│  • x402 支付协议                                     │
│  • 激励分发系统                                      │
│  • 质量保证机制                                      │
└─────────────────────────────────────────────────────┘
                          │
                          │ 基于
                          ▼
┌─────────────────────────────────────────────────────┐
│                BSC / Ethereum (区块链层)             │
└─────────────────────────────────────────────────────┘
```

### NPM 包发布

迁移后可发布为 NPM 包：

```json
{
  "name": "@x402-alliance/protocol",
  "version": "0.2.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "contracts",
    "typechain-types"
  ]
}
```

## 4. 环境配置

### 必需的环境变量

```env
# 网络配置
BSC_TESTNET_RPC_URL=https://bsc-testnet.nodereal.io/v1/xxx
CHAIN_ID=97

# 部署账户
PRIVATE_KEY=0x...

# 代币地址
BSC_TESTNET_USDC_ADDRESS=0x337610d27c682E347C9cD60BD4b3b107C9d34dDd

# ARN 合约地址 (部署后填写)
ARN_TREASURY_ADDRESS=
ARN_FEE_SPLITTER_ADDRESS=
ARN_SESSION_MANAGER_ADDRESS=
ARN_RECEIPT_REGISTRY_ADDRESS=
ARN_EPOCH_MANAGER_ADDRESS=
ARN_MERKLE_DISTRIBUTOR_ADDRESS=
ARN_ATTESTATION_REGISTRY_ADDRESS=

# 外部合约
COMMISSION_CONTRACT_ADDRESS=0x4d10DA389E0ADe7E7a7E3232531048aEaCa4021C
```

## 5. CI/CD 配置

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run compile
      - run: npm test
```

## 6. 发布流程

1. **版本更新**: 更新 `package.json` 版本号
2. **测试**: 运行 `npm test` 确保所有测试通过
3. **构建**: 运行 `npm run compile`
4. **标签**: `git tag v0.2.0`
5. **发布**: `npm publish --access public`

## 7. 文档站点

考虑使用 Docusaurus 或 VitePress 创建文档站点：

```bash
npx create-docusaurus@latest docs classic
```

## 8. 安全考虑

- [ ] 审计合约代码
- [ ] 多签管理 Admin 权限
- [ ] Timelock 保护关键操作
- [ ] 监控异常交易
