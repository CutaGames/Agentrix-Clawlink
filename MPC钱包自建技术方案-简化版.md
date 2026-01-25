# MPC 钱包自建技术方案 - 简化版

**版本**: V1.0  
**日期**: 2025年1月  
**目标**: 为商户提供简化版 MPC 钱包，实现非托管支付

---

## 📋 目录

1. [方案概述](#1-方案概述)
2. [技术架构](#2-技术架构)
3. [核心功能实现](#3-核心功能实现)
4. [安全考虑](#4-安全考虑)
5. [实施计划](#5-实施计划)

---

## 1. 方案概述

### 1.1 设计目标

**简化版 MPC 钱包特点**:
- ✅ 只支持商户使用（不需要用户钱包）
- ✅ 只支持 BSC 链（单链）
- ✅ 只支持 USDC（单一币种）
- ✅ 基础功能：创建、签名、恢复
- ✅ 2/3 签名机制

### 1.2 功能范围

**核心功能**:
1. 钱包创建（生成 3 个私钥分片）
2. 2/3 签名（支持不同场景）
3. 余额查询
4. 转账功能
5. 钱包恢复

**不包含功能**:
- ❌ 多链支持
- ❌ 多币种支持
- ❌ 复杂 DeFi 交互
- ❌ 批量交易优化

---

## 2. 技术架构

### 2.1 系统架构

```
┌─────────────────────────────────────────┐
│           商户 MPC 钱包系统                │
└─────────────────────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼───┐    ┌───▼───┐
│ 前端  │    │ 后端  │
│       │    │       │
│分片 A │    │分片 B │
└───┬───┘    └───┬───┘
    │            │
    └──────┬─────┘
           │
      ┌────▼────┐
      │ 分片 C  │
      │ (备份)  │
      └─────────┘
```

### 2.2 技术栈

**前端**:
- React/Next.js
- `ethers.js` - 以太坊钱包操作
- `crypto-js` - AES 加密
- `localStorage` - 分片 A 存储

**后端**:
- NestJS
- `ethers.js` - 钱包操作
- `shamir-secret-sharing` - 私钥分片
- PostgreSQL - 分片 B 存储

**智能合约**:
- Solidity
- OpenZeppelin - 安全库

---

## 3. 核心功能实现

### 3.1 私钥分片生成

#### 3.1.1 使用 Shamir Secret Sharing

```typescript
// 安装依赖
npm install shamir-secret-sharing
npm install @types/shamir-secret-sharing

// 后端服务
import { SecretSharing } from 'shamir-secret-sharing';
import { Wallet } from 'ethers';

@Injectable()
export class MPCWalletService {
  /**
   * 生成 MPC 钱包
   */
  async generateMPCWallet(merchantId: string): Promise<{
    walletAddress: string;
    shardA: string;  // 返回给前端
    shardB: string;  // 存储在数据库
    shardC: string;  // 返回给商户备份
  }> {
    // 1. 生成随机私钥
    const wallet = Wallet.createRandom();
    const privateKey = wallet.privateKey;
    
    // 2. 使用 Shamir Secret Sharing 分成 3 份，需要 2 份恢复
    const shards = SecretSharing.split(
      privateKey.substring(2), // 去掉 0x 前缀
      3,  // 总份数
      2   // 需要 2 份才能恢复
    );
    
    // 3. 加密存储分片 B
    const encryptedShardB = this.encryptShard(shards[1], merchantId);
    
    // 4. 保存到数据库
    await this.saveShardB(merchantId, encryptedShardB, wallet.address);
    
    return {
      walletAddress: wallet.address,
      shardA: this.encryptShard(shards[0], merchantId), // 加密后返回前端
      shardB: encryptedShardB, // 存储在数据库
      shardC: this.encryptShard(shards[2], merchantId), // 返回给商户备份
    };
  }
  
  /**
   * 加密分片（AES-256）
   */
  private encryptShard(shard: string, password: string): string {
    const CryptoJS = require('crypto-js');
    return CryptoJS.AES.encrypt(shard, password).toString();
  }
  
  /**
   * 解密分片
   */
  private decryptShard(encryptedShard: string, password: string): string {
    const CryptoJS = require('crypto-js');
    const bytes = CryptoJS.AES.decrypt(encryptedShard, password);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
```

#### 3.1.2 前端存储分片 A

```typescript
// 前端服务
class MPCWalletClient {
  /**
   * 保存分片 A 到本地
   */
  async saveShardA(encryptedShardA: string, password: string): Promise<void> {
    // 1. 使用用户密码再次加密
    const doubleEncrypted = this.encrypt(encryptedShardA, password);
    
    // 2. 存储到 localStorage
    localStorage.setItem('mpc_shard_a', doubleEncrypted);
    
    // 3. 生成助记词备份（可选）
    const mnemonic = this.generateMnemonic(encryptedShardA);
    // 提示用户保存助记词
  }
  
  /**
   * 从本地读取分片 A
   */
  async loadShardA(password: string): Promise<string | null> {
    const encrypted = localStorage.getItem('mpc_shard_a');
    if (!encrypted) return null;
    
    try {
      const decrypted = this.decrypt(encrypted, password);
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt shard A:', error);
      return null;
    }
  }
}
```

### 3.2 2/3 签名机制

#### 3.2.1 签名场景

**场景 1: 商户主动支付（需要分片 A + B）**

```typescript
// 商户在前端签名，Agentrix 在后端签名
async signWithShardAAndB(
  merchantId: string,
  to: string,
  amount: bigint,
  merchantPassword: string
): Promise<string> {
  // 1. 前端：商户使用分片 A 签名
  const shardA = await this.loadShardA(merchantPassword);
  const partialSigA = await this.signWithShard(shardA, to, amount);
  
  // 2. 后端：Agentrix 使用分片 B 签名（需要商户授权）
  const shardB = await this.getShardB(merchantId);
  const partialSigB = await this.signWithShard(shardB, to, amount);
  
  // 3. 组合签名
  return this.combineSignatures(partialSigA, partialSigB);
}
```

**场景 2: 自动分账（需要分片 B + C）**

```typescript
// Agentrix 自动分账到商户钱包
async signWithShardBAndC(
  merchantId: string,
  to: string,
  amount: bigint
): Promise<string> {
  // 1. 获取分片 B
  const shardB = await this.getShardB(merchantId);
  
  // 2. 获取分片 C（需要商户预先授权自动分账）
  const shardC = await this.getAutoAuthorizedShardC(merchantId);
  
  // 3. 签名
  const partialSigB = await this.signWithShard(shardB, to, amount);
  const partialSigC = await this.signWithShard(shardC, to, amount);
  
  // 4. 组合签名
  return this.combineSignatures(partialSigB, partialSigC);
}
```

**场景 3: 商户提现（需要分片 A + C）**

```typescript
// 商户提现，不需要 Agentrix
async signWithShardAAndC(
  merchantId: string,
  to: string,
  amount: bigint,
  merchantPassword: string,
  shardC: string  // 商户提供备份分片
): Promise<string> {
  // 1. 前端：商户使用分片 A 签名
  const shardA = await this.loadShardA(merchantPassword);
  const partialSigA = await this.signWithShard(shardA, to, amount);
  
  // 2. 前端：商户使用分片 C 签名
  const partialSigC = await this.signWithShard(shardC, to, amount);
  
  // 3. 组合签名
  return this.combineSignatures(partialSigA, partialSigC);
}
```

#### 3.2.2 签名组合算法

```typescript
// 使用 ECDSA 签名组合
import { Signature } from 'ethers';

class MPCSignatureService {
  /**
   * 组合两个部分签名
   */
  combineSignatures(
    partialSigA: string,
    partialSigB: string
  ): string {
    // 方法 1: 使用 Schnorr 签名（如果支持）
    // 方法 2: 使用 ECDSA 签名组合（需要自定义实现）
    // 方法 3: 恢复私钥后签名（不推荐，安全风险）
    
    // 简化方案：使用阈值签名库
    // 推荐使用: tss-lib (Threshold Signature Scheme)
    const tss = require('tss-lib');
    return tss.combineSignatures(partialSigA, partialSigB);
  }
  
  /**
   * 使用分片签名（部分签名）
   */
  async signWithShard(
    shard: string,
    to: string,
    amount: bigint
  ): Promise<string> {
    // 1. 构建消息哈希
    const messageHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256'],
        [to, amount]
      )
    );
    
    // 2. 使用分片签名（部分签名）
    // 注意：这里需要实现阈值签名算法
    // 可以使用 tss-lib 或类似库
    const tss = require('tss-lib');
    return tss.partialSign(shard, messageHash);
  }
}
```

**重要**: 阈值签名（Threshold Signature）是 MPC 的核心，需要专门的库实现。

### 3.3 钱包恢复

#### 3.3.1 使用分片 A + C 恢复

```typescript
// 商户可以随时使用分片 A + C 恢复钱包
async recoverWallet(
  shardA: string,
  shardC: string,
  password: string
): Promise<string> {
  // 1. 解密分片
  const decryptedShardA = this.decryptShard(shardA, password);
  const decryptedShardC = this.decryptShard(shardC, password);
  
  // 2. 使用 Shamir Secret Sharing 恢复私钥
  const privateKey = SecretSharing.combine([
    decryptedShardA,
    decryptedShardC
  ]);
  
  // 3. 验证钱包地址
  const wallet = new ethers.Wallet('0x' + privateKey);
  
  return wallet.address;
}
```

### 3.4 余额查询

```typescript
// 查询 USDC 余额
async getBalance(walletAddress: string): Promise<string> {
  const usdcContract = new Contract(
    USDC_ADDRESS,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
  
  const balance = await usdcContract.balanceOf(walletAddress);
  return formatUnits(balance, 6); // USDC 6 位小数
}
```

### 3.5 转账功能

```typescript
// 使用 MPC 钱包转账
async transfer(
  merchantId: string,
  to: string,
  amount: bigint,
  merchantPassword: string
): Promise<string> {
  // 1. 获取钱包地址
  const walletAddress = await this.getWalletAddress(merchantId);
  
  // 2. 构建交易
  const usdcContract = new Contract(
    USDC_ADDRESS,
    ['function transfer(address,uint256)'],
    provider
  );
  
  const txData = usdcContract.interface.encodeFunctionData('transfer', [to, amount]);
  
  // 3. MPC 签名（场景 1: 商户主动支付）
  const signature = await this.signWithShardAAndB(
    merchantId,
    to,
    amount,
    merchantPassword
  );
  
  // 4. 发送交易
  const tx = await provider.sendTransaction({
    from: walletAddress,
    to: USDC_ADDRESS,
    data: txData,
    // 使用签名发送
  });
  
  return tx.hash;
}
```

---

## 4. 安全考虑

### 4.1 分片存储安全

#### 分片 A（前端）
- ✅ 使用用户密码加密
- ✅ 存储在 localStorage（浏览器本地）
- ✅ 提供助记词备份
- ⚠️ 风险：如果设备丢失，需要助记词恢复

#### 分片 B（后端）
- ✅ 使用 AES-256 加密
- ✅ 存储在数据库（加密字段）
- ✅ 访问需要商户授权（2FA）
- ✅ 定期备份到冷存储

#### 分片 C（备份）
- ✅ 商户自行保管（推荐）
- ✅ 或存储在硬件钱包
- ✅ 或冷存储备份

### 4.2 签名安全

#### 阈值签名实现

**推荐库**:
1. **tss-lib** (Threshold Signature Scheme)
   - 支持 ECDSA 阈值签名
   - 成熟稳定
   - 文档完善

2. **fireblocks-sdk** (如果后续迁移)
   - 企业级 MPC
   - 但需要付费

**实现要点**:
- 使用标准的阈值签名算法
- 不要尝试自己实现签名组合（安全风险高）
- 使用经过审计的库

### 4.3 访问控制

```typescript
// 分片 B 访问控制
@Injectable()
export class MPCWalletService {
  /**
   * 获取分片 B（需要商户授权）
   */
  async getShardB(
    merchantId: string,
    authorizationToken: string
  ): Promise<string> {
    // 1. 验证授权令牌
    const isValid = await this.verifyAuthorization(merchantId, authorizationToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid authorization');
    }
    
    // 2. 记录访问日志
    await this.logAccess(merchantId, 'shard_b_access');
    
    // 3. 返回加密的分片 B
    return await this.getEncryptedShardB(merchantId);
  }
  
  /**
   * 自动分账授权（商户预先授权）
   */
  async authorizeAutoSplit(
    merchantId: string,
    maxAmount: bigint,
    duration: number
  ): Promise<string> {
    // 商户授权 Agentrix 在限额内自动使用分片 B + C 签名
    // 生成授权令牌
    const authToken = this.generateAuthToken(merchantId, maxAmount, duration);
    
    // 保存授权记录
    await this.saveAuthorization(merchantId, authToken, maxAmount, duration);
    
    return authToken;
  }
}
```

---

## 5. 实施计划

### 5.1 技术选型

#### 阈值签名库

**推荐**: `tss-lib` 或 `@fireblocks/tss-lib`

```bash
npm install tss-lib
# 或
npm install @fireblocks/tss-lib
```

**备选**: 如果找不到合适的库，可以考虑：
- 使用 `@noble/secp256k1` + 自定义阈值签名
- 或使用 `@safe-global/safe-core-sdk`（但这是多签，不是 MPC）

#### 加密库

```bash
npm install crypto-js
npm install @types/crypto-js
```

#### 钱包库

```bash
npm install ethers
```

### 5.2 开发步骤

#### 阶段 1: 核心功能（2-3周）

1. **私钥分片生成**
   - 实现 Shamir Secret Sharing
   - 实现分片加密存储
   - 测试分片恢复

2. **基础签名**
   - 集成阈值签名库
   - 实现 2/3 签名机制
   - 测试签名组合

3. **钱包创建**
   - 前端钱包创建界面
   - 后端钱包创建 API
   - 分片存储和分发

#### 阶段 2: 完整功能（2-3周）

4. **转账功能**
   - 实现 MPC 签名转账
   - 集成 USDC 合约
   - 测试转账流程

5. **余额查询**
   - 实现余额查询 API
   - 前端余额显示
   - 交易历史查询

6. **钱包管理**
   - 钱包管理界面
   - 分片备份和恢复
   - 授权管理

#### 阶段 3: 集成和测试（1-2周）

7. **智能合约集成**
   - 集成自动分账合约
   - 测试分账到 MPC 钱包

8. **安全测试**
   - 安全审计
   - 渗透测试
   - 性能测试

**总计**: 5-8 周

### 5.3 代码结构

```
backend/src/modules/mpc-wallet/
├── mpc-wallet.module.ts
├── mpc-wallet.service.ts          # 核心服务
├── mpc-signature.service.ts       # 签名服务
├── mpc-shard.service.ts          # 分片管理
├── dto/
│   ├── create-wallet.dto.ts
│   ├── sign-transaction.dto.ts
│   └── recover-wallet.dto.ts
├── entities/
│   └── mpc-wallet.entity.ts      # 数据库实体
└── controllers/
    └── mpc-wallet.controller.ts

agentrixfrontend/components/mpc-wallet/
├── MPCWalletManager.tsx           # 钱包管理界面
├── MPCWalletCreate.tsx           # 创建钱包
├── MPCWalletRecover.tsx          # 恢复钱包
└── MPCWalletTransfer.tsx         # 转账界面
```

---

## 6. 简化版 vs 完整版对比

### 6.1 功能对比

| 功能 | 简化版 | 完整版 (Fireblocks) |
|------|--------|-------------------|
| **钱包创建** | ✅ 支持 | ✅ 支持 |
| **2/3 签名** | ✅ 支持 | ✅ 支持 |
| **余额查询** | ✅ 支持 | ✅ 支持 |
| **转账** | ✅ 支持 | ✅ 支持 |
| **多链支持** | ❌ 仅 BSC | ✅ 支持 |
| **多币种** | ❌ 仅 USDC | ✅ 支持 |
| **批量交易** | ❌ 不支持 | ✅ 支持 |
| **DeFi 交互** | ❌ 不支持 | ✅ 支持 |
| **安全审计** | ⚠️ 需要自己做 | ✅ 已有认证 |

### 6.2 成本对比

| 项目 | 简化版 | Fireblocks |
|------|--------|-----------|
| **开发成本** | 5-8 周 | 2-3 周集成 |
| **维护成本** | 持续维护 | 服务商维护 |
| **使用成本** | 一次性开发 | 按交易量收费 |
| **安全成本** | 需要审计 | 已有认证 |

### 6.3 推荐方案

**如果交易量 < 1000 笔/天**: 推荐自建简化版  
**如果交易量 > 1000 笔/天**: 推荐使用 Fireblocks

---

## 7. 关键技术难点

### 7.1 阈值签名实现

**难点**: ECDSA 阈值签名算法复杂

**解决方案**:
1. 使用成熟的库（如 `tss-lib`）
2. 如果找不到合适的库，考虑使用多签钱包（2/3 多签）作为替代
3. 多签钱包更容易实现，但需要 3 个独立地址

### 7.2 多签钱包替代方案

如果阈值签名实现困难，可以使用 **2/3 多签钱包**：

```solidity
// 使用 Gnosis Safe 或自建多签合约
contract MerchantMultiSig {
    address public merchant;      // 商户地址
    address public agentrix;       // Agentrix 地址
    address public backup;        // 备份地址
    
    function executeTransaction(
        address to,
        uint256 amount,
        bytes memory data
    ) external {
        // 需要 2/3 签名
        require(hasApproval(merchant) || hasApproval(agentrix) || hasApproval(backup), "Need 2 approvals");
        // 执行交易
    }
}
```

**优势**:
- ✅ 更容易实现
- ✅ 使用标准多签合约
- ✅ 安全可靠

**劣势**:
- ⚠️ 需要 3 个独立地址（不是分片）
- ⚠️ 不是真正的 MPC（但功能类似）

---

## 8. 总结

### 8.1 自建 MPC 钱包可行性

✅ **可行，推荐自建简化版**

**理由**:
1. 功能需求简单（只给商户用）
2. 技术可行（使用成熟库）
3. 成本可控（5-8 周开发）
4. 合规可控（完全自主）

### 8.2 实施建议

1. **技术选型**: 使用 `tss-lib` 或考虑多签钱包替代
2. **分阶段实施**: 先实现核心功能，再完善
3. **安全优先**: 使用经过审计的库，不要自己实现签名算法
4. **测试充分**: 充分测试各种场景，特别是恢复流程

### 8.3 风险提示

⚠️ **阈值签名实现是最大难点**

如果找不到合适的阈值签名库，建议：
- 使用多签钱包作为替代方案
- 或考虑使用 Fireblocks SDK（付费但可靠）

---

**文档维护**: Agentrix 开发团队  
**最后更新**: 2025年1月

