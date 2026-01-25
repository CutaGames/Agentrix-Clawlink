# ARN Protocol 开发进展报告

> 更新日期: 2025-12-14

## 1. 项目概述

**ARN (Alliance Rewards Network)** 是 x402 支付协议的激励层，负责：
- 收取和分配协议费用 (0.3%)
- 管理 Epoch 周期奖励分发
- 通过 Bond/Challenge 机制保证服务质量

### 与 Agentrix 的关系

```
Agentrix (应用层)
    └── 使用 ARN Protocol 进行支付和激励
    
ARN Protocol (协议层)
    └── 基于 ERC-8004 Session Keys
    └── 部署在 BSC (Testnet/Mainnet)
```

## 2. 已完成工作

### 2.1 智能合约 (100% 完成)

| 合约 | 地址 (BSC Testnet) | 功能 | 状态 |
|------|-------------------|------|------|
| **ArnTreasury** | `0x3FDfB8408cdd91B5692E68F07B8937fD5F62fC01` | 协议费金库 (40/30/20/10 分配) | ✅ 已部署 |
| **ArnFeeSplitter** | `0x371E206CA565f5713b8Cd1f8922A2eb8FB0F98F7` | 核心分账 (扣除 0.3% 协议费) | ✅ 已部署 |
| **ArnSessionManager** | `0x85F03Ca00307f4F7C218CF88aC15Ae7FdD6b0F95` | Session Key 支付管理 | ✅ 已部署 |
| **ReceiptRegistry** | `0x1BBEeb73AC8bbDC9D5063B6E53470D3234B7240c` | 链上收据注册 | ✅ 已部署 |
| **EpochManager** | `0xAe969539b6c840798658dd2e141e6a5F898C9f00` | 7天周期管理 | ✅ 已部署 |
| **MerkleDistributor** | `0xC72d761b6dE93F33Dcba2fA150316F6E1F63f6E2` | Merkle 树奖励分发 | ✅ 已部署 |
| **AttestationRegistry** | `0x6BfDDeBbF72E32f4d9fd87452da3fFDe58341267` | 质量证明 + Bond/Challenge | ✅ 已部署 |

### 2.2 后端服务 (80% 完成)

| 服务 | 文件 | 功能 | 状态 |
|------|------|------|------|
| **EpochService** | `services/epoch-service.ts` | Epoch 结算和奖励计算 | ✅ 完成 |
| **MerkleGenerator** | `services/merkle-generator.ts` | Merkle 树生成和证明 | ✅ 完成 |
| **EventIndexer** | `services/event-indexer.ts` | 链上事件索引 | ✅ 完成 |
| **API 服务** | - | REST API 接口 | ⏳ 待开发 |
| **定时任务** | - | 自动 Epoch 结算 | ⏳ 待开发 |

### 2.3 测试覆盖

```
ARN Protocol Tests
  ✅ ArnFeeSplitter - 0.3% 分账
  ✅ ArnTreasury - 资金接收和分配比例
  ✅ ReceiptRegistry - 收据记录和 Epoch 统计
  ✅ EpochManager - 周期管理和推进
  ✅ MerkleDistributor - Merkle Root 设置
  ✅ AttestationRegistry - 证明提交和验证

15 passing ✅
```

## 3. 架构设计

### 3.1 资金流向

```
┌────────────────┐
│   用户支付      │
└───────┬────────┘
        │
        ▼
┌────────────────┐     0.3%      ┌────────────────┐
│ ArnFeeSplitter │ ────────────► │  ArnTreasury   │
└───────┬────────┘               └───────┬────────┘
        │ 99.7%                          │
        ▼                                ▼
┌────────────────┐               ┌────────────────┐
│   Commission   │               │  40/30/20/10   │
│   (商户分账)    │               │    分配        │
└────────────────┘               └────────────────┘
```

### 3.2 Epoch 奖励流程

```
Week 1-7: 收集交易数据
    │
    ▼
Day 7: Epoch 结束
    │
    ▼
Epoch Service: 聚合数据
    │
    ▼
Merkle Generator: 生成 Merkle 树
    │
    ▼
On-chain: 
  1. EpochManager.finalizeEpoch()
  2. MerkleDistributor.setMerkleRoot()
    │
    ▼
Users: MerkleDistributor.claim()
```

### 3.3 质量激励 (Bond/Challenge)

```
Agent 提交证明 ──► 7天挑战期 ──► 无挑战 ──► 验证通过 ──► 提取 Bond
                        │
                        ▼
                    被挑战 ──► 仲裁 ──► 挑战成功 ──► 50% 给挑战者
                                   │
                                   └──► 挑战失败 ──► 验证通过
```

## 4. 费用结构

### 4.1 协议费 (0.3%)

每笔 x402 支付扣除 0.3%，分配如下：

| 角色 | 比例 | 用途 |
|------|------|------|
| Watcher | 40% | 链上监控和预警 |
| Operator | 30% | 节点运营和维护 |
| Public Goods | 20% | 生态公共物品建设 |
| Security Reserve | 10% | 安全储备金 |

### 4.2 质量激励参数

| 参数 | 值 | 说明 |
|------|------|------|
| 最小 Bond | 10 USDT | 提交证明的最小质押 |
| 挑战期 | 7 天 | 可以挑战的时间窗口 |
| Slash 比例 | 50% | 挑战成功时的惩罚比例 |

## 5. 下一步计划

### Phase 1: 完善后端 (1-2 周)

- [ ] 实现 REST API 接口
- [ ] 部署定时任务服务
- [ ] 添加监控和告警
- [ ] 完善错误处理

### Phase 2: 前端集成 (1-2 周)

- [ ] 奖励仪表盘页面
- [ ] 领取界面
- [ ] Agent 证明提交 UI
- [ ] 挑战/仲裁界面

### Phase 3: 独立仓库 (1 周)

- [ ] 迁移到独立 GitHub 仓库
- [ ] 发布 NPM 包
- [ ] 创建文档站点
- [ ] 开源社区建设

### Phase 4: 主网部署 (待定)

- [ ] 安全审计
- [ ] 多签配置
- [ ] 主网部署
- [ ] 监控系统

## 6. 相关文件

### 合约目录

```
arn-protocol/contracts/
├── ArnSessionManager.sol      # Session Key 管理
├── ArnFeeSplitter.sol         # 核心分账
├── ArnTreasury.sol            # 金库
├── ReceiptRegistry.sol        # 收据注册
├── EpochManager.sol           # Epoch 管理
├── MerkleDistributor.sol      # Merkle 分发
└── AttestationRegistry.sol    # 质量证明
```

### 服务目录

```
arn-protocol/services/
├── epoch-service.ts           # Epoch 结算
├── merkle-generator.ts        # Merkle 生成
└── event-indexer.ts           # 事件索引
```

### 文档

- `arn-protocol/README.md` - 项目说明
- `arn-protocol/MIGRATION.md` - 独立仓库迁移指南
- `ARN_FLOW_CONFIRMATION.md` - 资金流向确认

## 7. 技术栈

- **智能合约**: Solidity 0.8.20, OpenZeppelin 5.0
- **开发框架**: Hardhat, TypeScript
- **测试**: Mocha, Chai, Hardhat Network
- **Merkle 树**: @openzeppelin/merkle-tree
- **区块链**: BSC Testnet (Chain ID: 97)

## 8. 联系方式

- **仓库**: [Agentrix/arn-protocol](https://github.com/CutaGames/Agentrix/tree/feat/smartcheckout-layout/arn-protocol)
- **未来独立仓库**: x402-alliance/arn-protocol (待创建)
