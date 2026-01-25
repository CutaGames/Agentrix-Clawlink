# EAS (Ethereum Attestation Service) 配置指南

## 概述

EAS 用于为 Agentrix 平台提供链上身份证明和审计锚定：
- **Agent 注册存证**: 证明 Agent 已在平台注册，具备特定风险等级
- **Skill 发布存证**: 证明 Skill 由特定作者发布
- **审计 Root 存证**: 每日 Merkle Root 链上锚定，确保审计不可篡改
- **交易存证**: 关键交易的链上证明

## 网络选择

### 推荐网络

| 环境 | 网络 | EAS 合约 | Schema Registry |
|------|------|----------|-----------------|
| 开发测试 | Ethereum Sepolia | `0xC2679fBD37d54388Ce493F1DB75320D236e1815e` | `0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0` |
| 生产 (低成本) | Base Mainnet | `0x4200000000000000000000000000000000000021` | `0x4200000000000000000000000000000000000020` |
| 生产 (高安全) | Ethereum Mainnet | `0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587` | `0xA7b39296258348C78294F95B872b282326A97BDF` |
| 生产 (备选) | Arbitrum One | `0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458` | `0xA310da9c5B885E7fb3fbA9D66E9Ba6Df512b78eB` |

### Gas 费用估算

| 网络 | 单次存证成本 | 适合场景 |
|------|-------------|----------|
| Ethereum Mainnet | ~$2-5 | 高价值存证、关键审计 |
| Base | ~$0.01-0.05 | 日常存证、高频操作 |
| Arbitrum | ~$0.05-0.2 | 平衡成本与安全 |
| Sepolia | 免费 | 开发测试 |

## Schema 注册

### 方法一：通过 EAS 官网注册

1. 访问 [EAS Schema Registry](https://sepolia.easscan.org/schemas)（测试网）或 [主网](https://easscan.org/schemas)
2. 连接钱包
3. 点击 "Create Schema"
4. 输入 Schema 定义

### 方法二：使用脚本自动注册

创建并运行以下脚本：

```bash
cd backend
npx ts-node scripts/register-eas-schemas.ts
```

脚本内容 (`backend/scripts/register-eas-schemas.ts`):

```typescript
import { ethers } from 'ethers';
import { SchemaRegistry } from '@ethereum-attestation-service/eas-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

const SCHEMAS = [
  {
    name: 'AgentRegistration',
    schema: 'string agentId,string name,string riskTier,string ownerId,uint64 registeredAt',
    resolver: ethers.ZeroAddress,
    revocable: true,
  },
  {
    name: 'SkillPublication',
    schema: 'string skillId,string name,string authorId,string version,string category,string pricingType',
    resolver: ethers.ZeroAddress,
    revocable: true,
  },
  {
    name: 'AuditRoot',
    schema: 'bytes32 merkleRoot,string date,uint64 proofCount,string platform',
    resolver: ethers.ZeroAddress,
    revocable: false,  // 审计记录不可撤销
  },
  {
    name: 'TransactionAttestation',
    schema: 'string txId,string paymentId,address payer,address recipient,uint256 amount,string currency,uint64 timestamp',
    resolver: ethers.ZeroAddress,
    revocable: false,
  },
];

async function registerSchemas() {
  const provider = new ethers.JsonRpcProvider(process.env.EAS_RPC_URL || process.env.RPC_URL);
  const signer = new ethers.Wallet(process.env.EAS_SIGNER_PRIVATE_KEY!, provider);
  
  const schemaRegistry = new SchemaRegistry(process.env.EAS_SCHEMA_REGISTRY_ADDRESS!);
  schemaRegistry.connect(signer);

  console.log('开始注册 EAS Schemas...\n');

  for (const schemaConfig of SCHEMAS) {
    try {
      const tx = await schemaRegistry.register({
        schema: schemaConfig.schema,
        resolverAddress: schemaConfig.resolver,
        revocable: schemaConfig.revocable,
      });

      const schemaUID = await tx.wait();
      console.log(`✅ ${schemaConfig.name} 注册成功`);
      console.log(`   Schema: ${schemaConfig.schema}`);
      console.log(`   UID: ${schemaUID}\n`);
    } catch (error: any) {
      console.log(`❌ ${schemaConfig.name} 注册失败: ${error.message}\n`);
    }
  }

  console.log('\n请将以上 Schema UIDs 添加到 .env 文件中');
}

registerSchemas().catch(console.error);
```

### 预定义 Schema 定义

#### 1. AgentRegistration (Agent 注册)

```
string agentId,string name,string riskTier,string ownerId,uint64 registeredAt
```

字段说明：
- `agentId`: Agent 唯一标识符
- `name`: Agent 名称
- `riskTier`: 风险等级 (low/medium/high)
- `ownerId`: 所有者用户 ID
- `registeredAt`: 注册时间戳

#### 2. SkillPublication (Skill 发布)

```
string skillId,string name,string authorId,string version,string category,string pricingType
```

字段说明：
- `skillId`: Skill 唯一标识符
- `name`: Skill 名称
- `authorId`: 作者 ID
- `version`: 版本号
- `category`: 分类
- `pricingType`: 定价模式 (free/paid/subscription)

#### 3. AuditRoot (审计 Root)

```
bytes32 merkleRoot,string date,uint64 proofCount,string platform
```

字段说明：
- `merkleRoot`: 当日所有审计证明的 Merkle Root
- `date`: 日期 (YYYY-MM-DD)
- `proofCount`: 包含的证明数量
- `platform`: 平台标识 (agentrix)

#### 4. TransactionAttestation (交易存证)

```
string txId,string paymentId,address payer,address recipient,uint256 amount,string currency,uint64 timestamp
```

字段说明：
- `txId`: 交易 ID
- `paymentId`: PayIntent ID
- `payer`: 付款方地址
- `recipient`: 收款方地址
- `amount`: 金额 (最小单位)
- `currency`: 货币符号
- `timestamp`: 交易时间戳

## 环境配置

### .env 配置示例

```env
# ===== EAS 配置 =====

# 网络选择 (sepolia/base/ethereum/arbitrum)
EAS_NETWORK=sepolia

# EAS 合约地址
EAS_CONTRACT_ADDRESS=0xC2679fBD37d54388Ce493F1DB75320D236e1815e
EAS_SCHEMA_REGISTRY_ADDRESS=0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0

# EAS RPC URL
EAS_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

# EAS Signer 私钥 (需要 Gas 费)
EAS_SIGNER_PRIVATE_KEY=your_private_key_here

# Schema UIDs (注册后填入)
EAS_SCHEMA_AGENT_REGISTRATION=0x...
EAS_SCHEMA_SKILL_PUBLICATION=0x...
EAS_SCHEMA_AUDIT_ROOT=0x...
EAS_SCHEMA_TRANSACTION=0x...
```

### 多网络配置

如果需要在不同网络发布存证，可使用环境变量前缀：

```env
# Sepolia (测试)
EAS_SEPOLIA_CONTRACT_ADDRESS=0xC2679fBD37d54388Ce493F1DB75320D236e1815e
EAS_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

# Base (生产)
EAS_BASE_CONTRACT_ADDRESS=0x4200000000000000000000000000000000000021
EAS_BASE_RPC_URL=https://mainnet.base.org
```

## 服务集成

### EasService 更新

更新 `backend/src/modules/agent/eas.service.ts` 以使用环境变量中的 Schema UIDs：

```typescript
// 从环境变量读取 Schema UIDs
private readonly SCHEMAS = {
  AGENT_REGISTRATION: this.configService.get<string>('EAS_SCHEMA_AGENT_REGISTRATION'),
  SKILL_PUBLICATION: this.configService.get<string>('EAS_SCHEMA_SKILL_PUBLICATION'),
  AUDIT_ROOT: this.configService.get<string>('EAS_SCHEMA_AUDIT_ROOT'),
  TRANSACTION: this.configService.get<string>('EAS_SCHEMA_TRANSACTION'),
};
```

### 定时任务：每日审计锚定

在 `backend/src/modules/audit/audit-anchor.service.ts` 中配置每日 Merkle Root 锚定：

```typescript
@Cron('0 0 * * *') // 每天 UTC 00:00
async anchorDailyAuditRoot() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  
  const merkleRoot = await this.auditService.computeDailyMerkleRoot(dateStr);
  const proofCount = await this.auditService.getDailyProofCount(dateStr);
  
  await this.easService.attestAuditRoot(merkleRoot, dateStr, proofCount);
}
```

## 验证存证

### 通过 EAS Scan 查看

- Sepolia: https://sepolia.easscan.org/
- Mainnet: https://easscan.org/
- Base: https://base.easscan.org/

### 通过 API 验证

```typescript
// 验证存证
const attestation = await eas.getAttestation(attestationUID);
console.log('Attester:', attestation.attester);
console.log('Schema:', attestation.schema);
console.log('Data:', attestation.data);
console.log('Revoked:', attestation.revoked);
```

## 故障排除

### 常见问题

#### 1. "insufficient funds for gas"
- 确保 EAS_SIGNER_PRIVATE_KEY 对应的钱包有足够 ETH/原生代币
- Sepolia 测试网可从水龙头获取测试 ETH

#### 2. "Schema not found"
- 确认 Schema 已成功注册
- 检查 Schema UID 是否正确配置

#### 3. "reverted"
- 检查 Schema 定义是否匹配
- 确认编码数据格式正确

### 获取测试 ETH

- Sepolia: https://sepoliafaucet.com/
- Base Goerli: https://faucet.quicknode.com/base

## 安全建议

1. **私钥管理**: 使用环境变量或密钥管理服务，永不提交到代码仓库
2. **Gas 限制**: 设置合理的 Gas 上限防止意外高额费用
3. **权限分离**: EAS Signer 钱包只用于存证，不存放大额资金
4. **审计日志**: 所有存证操作记录到数据库，方便追踪
5. **失败重试**: 实现存证失败后的队列重试机制

## 参考链接

- [EAS 官方文档](https://docs.attest.sh/)
- [EAS SDK GitHub](https://github.com/ethereum-attestation-service/eas-sdk)
- [Schema 浏览器](https://easscan.org/schemas)
