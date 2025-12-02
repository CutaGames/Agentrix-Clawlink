# PayMind Web3 资产交易与接入机制
## Web3 原生商品导入与交易能力

**版本**: 3.0  
**日期**: 2025年1月  
**定位**: Web3 资产交易基础设施

---

## 📋 目录

1. [Web3 可交易资产类型](#1-web3-可交易资产类型)
2. [可接入的项目方类型](#2-可接入的项目方类型)
3. [Web3 商品导入机制](#3-web3-商品导入机制)
4. [接入流程与 API](#4-接入流程与-api)
5. [技术实现](#5-技术实现)
6. [收益分成机制](#6-收益分成机制)

---

## 1. Web3 可交易资产类型

### 1.1 Token 类资产

#### 1.1.1 同质化代币（Fungible Tokens）

**支持标准**：
- **ERC-20**（Ethereum、BSC、Polygon）
- **SPL Token**（Solana）
- **其他标准**：BEP-20、TRC-20

**资产类型**：
- ✅ **稳定币**：USDC、USDT、DAI
- ✅ **治理代币**：UNI、AAVE、COMP
- ✅ **实用代币**：项目代币、游戏代币
- ✅ **支付代币**：ETH、SOL、BNB

**交易场景**：
- Agent 自动购买代币
- 代币支付商品
- 代币兑换服务
- 订阅代币支付

#### 1.1.2 包装资产（Wrapped Assets）

**支持类型**：
- **WETH**（Wrapped ETH）
- **WBTC**（Wrapped BTC）
- **Wrapped SOL**
- **其他包装资产**

**交易场景**：
- 跨链资产交易
- 流动性提供
- DeFi 协议交互

### 1.2 NFT 类资产

#### 1.2.1 标准 NFT

**支持标准**：
- **ERC-721**（Ethereum、BSC、Polygon）
- **ERC-1155**（多版本 NFT）
- **SPL Token（NFT）**（Solana）
- **其他标准**：BEP-721、TRC-721

**资产类型**：
- ✅ **数字艺术品**：图片、视频、音频 NFT
- ✅ **收藏品**：PFP、卡牌、纪念品
- ✅ **游戏资产**：游戏道具、角色、装备
- ✅ **虚拟土地**：元宇宙土地、虚拟房产
- ✅ **音乐 NFT**：专辑、单曲、版权
- ✅ **视频 NFT**：短视频、长视频、直播

#### 1.2.2 动态 NFT（Dynamic NFT）

**支持类型**：
- **可升级 NFT**：属性可变化的 NFT
- **可组合 NFT**：可合并、拆分的 NFT
- **游戏 NFT**：属性随游戏进度变化的 NFT

#### 1.2.3 版税 NFT

**支持类型**：
- **创作者版税**：每次转售自动分配版税
- **多受益人版税**：多个地址分享版税

### 1.3 链上服务类资产

#### 1.3.1 订阅服务（Subscription Services）

**支持类型**：
- **链上订阅**：基于智能合约的订阅服务
- **代币订阅**：使用代币支付的订阅
- **NFT 订阅**：持有 NFT 享受订阅服务

**应用场景**：
- AI 服务订阅
- 内容订阅
- 软件订阅
- 会员订阅

#### 1.3.2 链上服务凭证（Service Tokens）

**支持类型**：
- **服务代币**：代表特定服务的代币
- **访问凭证**：访问特定服务的凭证
- **使用权 NFT**：使用特定服务的 NFT

### 1.4 RWA（现实世界资产）

#### 1.4.1 代币化资产（Tokenized Assets）

**支持类型**：
- **房地产代币**：房地产所有权代币化
- **商品代币**：黄金、石油等商品代币化
- **股票代币**：股票代币化
- **债券代币**：债券代币化

**交易场景**：
- Agent 自动投资
- 资产配置
- 收益分配

#### 1.4.2 链上凭证（On-chain Certificates）

**支持类型**：
- **学历证书**：链上学历认证
- **职业证书**：链上职业资格认证
- **身份凭证**：链上身份认证
- **所有权凭证**：资产所有权证明

### 1.5 DeFi 资产

#### 1.5.1 流动性代币（LP Tokens）

**支持类型**：
- **Uniswap LP Token**
- **PancakeSwap LP Token**
- **Raydium LP Token**
- **其他 DEX LP Token**

**交易场景**：
- Agent 自动提供流动性
- 流动性挖矿
- 收益分配

#### 1.5.2 收益代币（Yield Tokens）

**支持类型**：
- **Staking 收益代币**
- **Lending 收益代币**
- **Yield Farming 收益代币**

### 1.6 链上游戏资产

#### 1.6.1 游戏道具（Game Items）

**支持类型**：
- **武器 NFT**
- **角色 NFT**
- **装备 NFT**
- **皮肤 NFT**

#### 1.6.2 游戏代币（Game Tokens）

**支持类型**：
- **游戏内货币**
- **游戏治理代币**
- **游戏实用代币**

---

## 2. 可接入的项目方类型

### 2.1 NFT 交易平台

#### 2.1.1 通用 NFT 市场

**典型项目**：
- **OpenSea**（Ethereum、Polygon）
- **Magic Eden**（Solana）
- **Blur**（Ethereum）
- **LooksRare**（Ethereum）
- **X2Y2**（Ethereum）

**接入价值**：
- 批量导入平台内所有 NFT
- 提供 NFT 交易能力
- 链上资产自动同步
- 带来 NFT 交易流量

**收益分成**：
- NFT 交易分成：0.3% - 0.5%
- 平台接入奖励：$5,000 - $20,000
- GMV 里程碑奖励

#### 2.1.2 垂直 NFT 市场

**典型项目**：
- **Foundation**（艺术品）
- **SuperRare**（艺术品）
- **Zora**（创作者）
- **Sound.xyz**（音乐 NFT）

**接入价值**：
- 垂直领域的 NFT 商品
- 专业化的交易体验
- 创作者生态

### 2.2 DEX（去中心化交易所）

#### 2.2.1 通用 DEX

**典型项目**：
- **Uniswap**（Ethereum、Polygon、Base）
- **PancakeSwap**（BSC）
- **Raydium**（Solana）
- **Orca**（Solana）
- **Curve**（多链）

**接入价值**：
- 批量导入交易对（Token 对）
- 提供流动性交易能力
- 链上资产自动同步
- 带来 DeFi 交易流量

**收益分成**：
- 交易分成：0.2% - 0.4%
- 平台接入奖励：$5,000 - $20,000
- 流动性提供奖励

#### 2.2.2 专业 DEX

**典型项目**：
- **1inch**（聚合器）
- **Matcha**（聚合器）
- **Jupiter**（Solana 聚合器）

**接入价值**：
- 最优价格路由
- 多 DEX 聚合
- 降低交易成本

### 2.3 链上游戏项目

#### 2.3.1 GameFi 项目

**典型项目**：
- **Axie Infinity**
- **The Sandbox**
- **Decentraland**
- **Illuvium**

**接入价值**：
- 游戏资产交易
- 游戏内商品购买
- 游戏代币支付

**收益分成**：
- 游戏资产交易分成：0.3% - 0.5%
- 游戏内购买分成：0.2% - 0.4%

#### 2.3.2 Web3 游戏平台

**典型项目**：
- **Immutable X**
- **Polygon Gaming**
- **Solana Gaming**

**接入价值**：
- 平台内所有游戏资产
- 统一的游戏资产交易
- 跨游戏资产交易

### 2.4 链上服务项目

#### 2.4.1 订阅服务项目

**典型项目**：
- **Superfluid**（流支付）
- **Sablier**（流支付）
- **其他订阅协议**

**接入价值**：
- 链上订阅服务
- 自动续费
- 流支付能力

#### 2.4.2 内容平台

**典型项目**：
- **Mirror**（内容发布）
- **Lens Protocol**（社交）
- **Farcaster**（社交）

**接入价值**：
- 内容 NFT 交易
- 内容订阅
- 创作者收益

### 2.5 RWA 项目

#### 2.5.1 代币化资产项目

**典型项目**：
- **Centrifuge**（RWA 代币化）
- **Ondo Finance**（RWA）
- **其他 RWA 协议**

**接入价值**：
- RWA 资产交易
- 资产配置
- 收益分配

### 2.6 链上市场项目

#### 2.6.1 专业市场

**典型项目**：
- **Fractional**（NFT 碎片化）
- **PartyBid**（集体购买）
- **其他专业市场**

**接入价值**：
- 专业化的交易能力
- 创新的交易模式
- 细分市场覆盖

---

## 3. Web3 商品导入机制

### 3.1 商品数据模型

#### 3.1.1 Web3 商品基础信息

```typescript
interface Web3Product {
  // 基础信息
  id: string                    // PayMind 商品 ID
  name: string                  // 商品名称
  description?: string           // 商品描述
  image?: string                // 商品图片
  
  // Web3 资产信息
  assetType: 'token' | 'nft' | 'service' | 'rwa' | 'defi' | 'game'
  chain: 'ethereum' | 'solana' | 'bsc' | 'polygon' | 'base'
  contractAddress: string        // 合约地址
  tokenId?: string              // Token ID（NFT 需要）
  tokenStandard: 'ERC-20' | 'ERC-721' | 'ERC-1155' | 'SPL' | 'SPL-NFT'
  
  // 价格信息
  price: number                 // 价格（USDC）
  currency: string              // 计价货币（USDC/USDT）
  priceSource: 'onchain' | 'api' | 'manual'  // 价格来源
  
  // 库存信息
  supply?: number               // 总供应量（Token）
  available?: number            // 可用数量（NFT）
  isListed: boolean             // 是否在售
  
  // 元数据
  metadata?: {
    attributes?: Array<{         // NFT 属性
      trait_type: string
      value: string | number
    }>
    collection?: string          // NFT 集合
    creator?: string            // 创作者地址
    royalty?: number            // 版税比例
    [key: string]: any
  }
  
  // 项目方信息
  projectId: string             // 项目方 ID
  projectName: string           // 项目方名称
  projectType: 'nft_marketplace' | 'dex' | 'game' | 'service' | 'rwa'
  
  // 同步信息
  lastSyncedAt: Date           // 最后同步时间
  syncStatus: 'active' | 'paused' | 'error'
  
  // 时间戳
  createdAt: Date
  updatedAt: Date
}
```

#### 3.1.2 不同资产类型的特殊字段

**Token 资产**：
```typescript
interface TokenProduct extends Web3Product {
  assetType: 'token'
  decimals: number              // 代币精度
  symbol: string                // 代币符号
  totalSupply: number           // 总供应量
  marketCap?: number            // 市值
  liquidity?: number            // 流动性
}
```

**NFT 资产**：
```typescript
interface NFTProduct extends Web3Product {
  assetType: 'nft'
  tokenId: string               // Token ID（必需）
  collection: string            // 集合名称
  creator: string              // 创作者地址
  owner: string                // 当前所有者
  royalty: number               // 版税比例（0-100）
  attributes: Array<{           // 属性
    trait_type: string
    value: string | number
  }>
  rarity?: number               // 稀有度分数
  floorPrice?: number           // 地板价
}
```

**服务资产**：
```typescript
interface ServiceProduct extends Web3Product {
  assetType: 'service'
  serviceType: 'subscription' | 'access' | 'utility'
  duration?: number             // 服务时长（天）
  autoRenew?: boolean           // 自动续费
  contractAddress: string       // 服务合约地址
}
```

### 3.2 导入方式

#### 3.2.1 API 批量导入

**适用场景**：项目方有完整的 API 接口

**导入流程**：
```
1. 项目方申请接入
   ↓
2. 获取 API 密钥
   ↓
3. 配置同步规则
   ├─ 同步频率（实时/定时）
   ├─ 同步范围（全部/部分）
   └─ 数据映射规则
   ↓
4. 首次批量导入
   ├─ 调用项目方 API
   ├─ 数据转换和验证
   └─ 批量创建商品
   ↓
5. 定时同步更新
   ├─ 价格更新
   ├─ 库存更新
   └─ 状态更新
```

**API 接口设计**：
```typescript
// 项目方提供的 API 接口（需要实现）
interface ProjectAPI {
  // 获取商品列表
  getProducts(params: {
    offset?: number
    limit?: number
    filters?: any
  }): Promise<ProjectProduct[]>
  
  // 获取商品详情
  getProduct(productId: string): Promise<ProjectProduct>
  
  // 获取价格信息
  getPrice(productId: string): Promise<number>
  
  // 获取库存信息
  getInventory(productId: string): Promise<number>
}
```

#### 3.2.2 链上数据同步

**适用场景**：项目方没有 API，但资产在链上

**同步流程**：
```
1. 项目方提供合约地址和标准
   ↓
2. 配置链上监听
   ├─ 监听 Mint 事件（新 NFT）
   ├─ 监听 Transfer 事件（转移）
   ├─ 监听 List 事件（上架）
   └─ 监听 PriceUpdate 事件（价格更新）
   ↓
3. 自动同步链上数据
   ├─ 解析事件数据
   ├─ 获取元数据（IPFS/Arweave）
   └─ 创建/更新商品
   ↓
4. 定时价格同步
   ├─ 从 DEX 获取价格（Token）
   ├─ 从市场获取价格（NFT）
   └─ 更新商品价格
```

**链上事件监听**：
```typescript
// ERC-721 NFT Mint 事件
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)

// ERC-1155 NFT Transfer 事件
event TransferSingle(
  address indexed operator,
  address indexed from,
  address indexed to,
  uint256 id,
  uint256 value
)

// 价格更新事件（如果项目方有）
event PriceUpdate(uint256 indexed tokenId, uint256 newPrice)
```

#### 3.2.3 手动导入

**适用场景**：小批量商品、特殊商品

**导入方式**：
- Web 界面手动添加
- CSV 批量导入
- JSON 文件导入

### 3.3 数据同步机制

#### 3.3.1 实时同步

**适用场景**：价格敏感、库存变化快的商品

**同步方式**：
- WebSocket 实时推送
- 事件监听（链上/API）
- 轮询（高频，< 1分钟）

#### 3.3.2 定时同步

**适用场景**：价格稳定、库存变化慢的商品

**同步频率**：
- **高频**：每 5 分钟
- **中频**：每小时
- **低频**：每天

#### 3.3.3 触发同步

**适用场景**：按需同步

**触发方式**：
- API 调用触发
- 用户查询触发
- 订单创建触发

---

## 4. 接入流程与 API

### 4.1 项目方接入流程

#### Step 1: 申请接入

```
1. 项目方填写接入申请表
   ├─ 项目基本信息
   ├─ 项目类型
   ├─ 资产类型
   └─ 预期 GMV
   ↓
2. PayMind 审核
   ├─ 项目资质审核
   ├─ 技术能力评估
   └─ 合规性检查
   ↓
3. 审核通过，创建项目账户
   ├─ 生成 API 密钥
   ├─ 创建项目 Dashboard
   └─ 分配技术支持
```

#### Step 2: 技术对接

```
1. 选择接入方式
   ├─ API 接入
   ├─ 链上同步
   └─ 混合方式
   ↓
2. 配置同步规则
   ├─ 同步频率
   ├─ 同步范围
   └─ 数据映射
   ↓
3. 测试环境对接
   ├─ 沙箱环境测试
   ├─ 数据验证
   └─ 性能测试
   ↓
4. 生产环境上线
   ├─ 灰度发布
   ├─ 监控告警
   └─ 问题修复
```

#### Step 3: 商品导入

```
1. 首次批量导入
   ├─ 调用导入 API
   ├─ 数据验证和转换
   └─ 批量创建商品
   ↓
2. 同步状态确认
   ├─ 检查同步状态
   ├─ 验证商品数据
   └─ 确认 Marketplace 显示
   ↓
3. 持续同步
   ├─ 价格同步
   ├─ 库存同步
   └─ 状态同步
```

### 4.2 PayMind API 设计

#### 4.2.1 项目方管理 API

```typescript
// 创建项目方账户
POST /api/v1/projects
Request: {
  name: string
  type: 'nft_marketplace' | 'dex' | 'game' | 'service' | 'rwa'
  description: string
  website: string
  contactEmail: string
}
Response: {
  projectId: string
  apiKey: string
  apiSecret: string
}

// 获取项目方信息
GET /api/v1/projects/:id
Response: {
  projectId: string
  name: string
  type: string
  status: 'active' | 'pending' | 'suspended'
  stats: {
    totalProducts: number
    totalGMV: number
    monthlyGMV: number
  }
}

// 更新项目方配置
PATCH /api/v1/projects/:id
Request: {
  syncConfig?: {
    frequency: 'realtime' | '5min' | 'hourly' | 'daily'
    autoSync: boolean
  }
  syncRules?: {
    includeCollections?: string[]
    excludeCollections?: string[]
    minPrice?: number
    maxPrice?: number
  }
}
```

#### 4.2.2 商品导入 API

```typescript
// 批量导入商品（API 方式）
POST /api/v1/projects/:id/products/batch-import
Request: {
  source: 'api' | 'onchain' | 'manual'
  products: Array<{
    // 项目方商品 ID
    externalId: string
    // 商品信息
    name: string
    description?: string
    image?: string
    // Web3 资产信息
    assetType: 'token' | 'nft' | 'service' | 'rwa' | 'defi' | 'game'
    chain: 'ethereum' | 'solana' | 'bsc' | 'polygon' | 'base'
    contractAddress: string
    tokenId?: string
    tokenStandard: string
    // 价格信息
    price: number
    currency: string
    // 元数据
    metadata?: any
  }>
}
Response: {
  imported: number
  failed: number
  products: Array<{
    externalId: string
    productId: string
    status: 'success' | 'failed'
    error?: string
  }>
}

// 单个商品导入
POST /api/v1/projects/:id/products
Request: {
  externalId: string
  name: string
  // ... 其他字段同批量导入
}
Response: {
  productId: string
  status: 'created' | 'updated'
}

// 更新商品
PATCH /api/v1/projects/:id/products/:productId
Request: {
  price?: number
  available?: number
  isListed?: boolean
  metadata?: any
}
```

#### 4.2.3 链上同步 API

```typescript
// 配置链上同步
POST /api/v1/projects/:id/sync/onchain
Request: {
  chain: 'ethereum' | 'solana' | 'bsc' | 'polygon' | 'base'
  contractAddress: string
  tokenStandard: 'ERC-721' | 'ERC-1155' | 'SPL-NFT'
  startBlock?: number  // 起始区块（可选）
  syncEvents: Array<{
    event: 'Transfer' | 'Mint' | 'List' | 'PriceUpdate'
    handler: string  // 事件处理函数
  }>
}
Response: {
  syncId: string
  status: 'active' | 'pending'
}

// 触发同步
POST /api/v1/projects/:id/sync/trigger
Request: {
  type: 'full' | 'incremental' | 'price' | 'inventory'
  filters?: any
}
Response: {
  syncJobId: string
  status: 'queued' | 'processing' | 'completed'
}

// 查询同步状态
GET /api/v1/projects/:id/sync/status
Response: {
  lastSyncAt: Date
  nextSyncAt: Date
  syncStatus: 'active' | 'paused' | 'error'
  stats: {
    totalProducts: number
    syncedProducts: number
    failedProducts: number
  }
}
```

#### 4.2.4 商品查询 API

```typescript
// 查询项目方商品
GET /api/v1/projects/:id/products
Query: {
  offset?: number
  limit?: number
  assetType?: string
  chain?: string
  minPrice?: number
  maxPrice?: number
  search?: string
}
Response: {
  products: Array<Web3Product>
  total: number
  offset: number
  limit: number
}

// 查询商品详情
GET /api/v1/projects/:id/products/:productId
Response: Web3Product

// 查询商品价格历史
GET /api/v1/projects/:id/products/:productId/price-history
Query: {
  startDate?: string
  endDate?: string
  interval?: '1h' | '1d' | '1w'
}
Response: {
  prices: Array<{
    timestamp: Date
    price: number
    currency: string
  }>
}
```

### 4.3 项目方 SDK

#### 4.3.1 JavaScript/TypeScript SDK

```typescript
import { PayMindProject } from '@paymind/project-sdk'

const project = new PayMindProject({
  projectId: 'your-project-id',
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret'
})

// 批量导入商品
const result = await project.products.batchImport({
  source: 'api',
  products: [
    {
      externalId: 'nft-001',
      name: 'Cool NFT #1',
      assetType: 'nft',
      chain: 'ethereum',
      contractAddress: '0x...',
      tokenId: '1',
      tokenStandard: 'ERC-721',
      price: 100,
      currency: 'USDC',
      metadata: {
        collection: 'Cool Collection',
        attributes: [
          { trait_type: 'Color', value: 'Blue' },
          { trait_type: 'Rarity', value: 'Rare' }
        ]
      }
    }
  ]
})

// 更新商品价格
await project.products.update('product-id', {
  price: 150,
  isListed: true
})

// 配置链上同步
await project.sync.configureOnchain({
  chain: 'ethereum',
  contractAddress: '0x...',
  tokenStandard: 'ERC-721',
  syncEvents: [
    { event: 'Transfer', handler: 'handleTransfer' }
  ]
})
```

---

## 5. 技术实现

### 5.1 链上数据获取

#### 5.1.1 事件监听

```typescript
// 监听 ERC-721 Transfer 事件
const contract = new ethers.Contract(
  contractAddress,
  ERC721_ABI,
  provider
)

contract.on('Transfer', async (from, to, tokenId, event) => {
  // 处理 NFT 转移事件
  if (from === ZERO_ADDRESS) {
    // Mint 事件
    await handleNFTMint(to, tokenId, event)
  } else {
    // Transfer 事件
    await handleNFTTransfer(from, to, tokenId, event)
  }
})
```

#### 5.1.2 元数据获取

```typescript
// 获取 NFT 元数据
async function getNFTMetadata(
  contractAddress: string,
  tokenId: string
): Promise<NFTMetadata> {
  // 1. 从合约获取 tokenURI
  const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider)
  const tokenURI = await contract.tokenURI(tokenId)
  
  // 2. 解析 tokenURI（IPFS/HTTP）
  const metadata = await fetchMetadata(tokenURI)
  
  // 3. 获取图片和其他资源
  const image = await fetchImage(metadata.image)
  
  return {
    name: metadata.name,
    description: metadata.description,
    image: image,
    attributes: metadata.attributes
  }
}
```

#### 5.1.3 价格获取

```typescript
// 获取 Token 价格（从 DEX）
async function getTokenPrice(
  tokenAddress: string,
  chain: string
): Promise<number> {
  // 从 Uniswap/PancakeSwap 等 DEX 获取价格
  const price = await dexAPI.getPrice(tokenAddress, 'USDC')
  return price
}

// 获取 NFT 价格（从市场）
async function getNFTPrice(
  contractAddress: string,
  tokenId: string,
  marketplace: string
): Promise<number> {
  // 从 OpenSea/Magic Eden 等市场获取价格
  const listing = await marketplaceAPI.getListing(contractAddress, tokenId)
  return listing.price
}
```

### 5.2 数据同步服务

#### 5.2.1 同步服务架构

```typescript
// 同步服务
class ProductSyncService {
  // 定时同步任务
  @Cron('*/5 * * * *')  // 每 5 分钟
  async syncPrices() {
    const products = await this.getProductsToSync()
    for (const product of products) {
      await this.syncProductPrice(product)
    }
  }
  
  // 同步商品价格
  async syncProductPrice(product: Web3Product) {
    let price: number
    
    if (product.assetType === 'token') {
      // Token 价格从 DEX 获取
      price = await this.getTokenPrice(product.contractAddress, product.chain)
    } else if (product.assetType === 'nft') {
      // NFT 价格从市场获取
      price = await this.getNFTPrice(
        product.contractAddress,
        product.tokenId,
        product.projectId
      )
    }
    
    // 更新商品价格
    await this.updateProductPrice(product.id, price)
  }
  
  // 同步商品库存
  async syncProductInventory(product: Web3Product) {
    if (product.assetType === 'nft') {
      // NFT 库存从链上获取
      const owner = await this.getNFTOwner(
        product.contractAddress,
        product.tokenId
      )
      const isListed = await this.checkIfListed(
        product.contractAddress,
        product.tokenId
      )
      
      await this.updateProductInventory(product.id, {
        owner,
        isListed
      })
    }
  }
}
```

### 5.3 商品管理服务

#### 5.3.1 商品创建服务

```typescript
// 商品创建服务
class ProductService {
  // 创建 Web3 商品
  async createWeb3Product(data: CreateWeb3ProductDto): Promise<Web3Product> {
    // 1. 验证数据
    await this.validateProductData(data)
    
    // 2. 获取链上数据（如果需要）
    if (data.source === 'onchain') {
      const onchainData = await this.fetchOnchainData(
        data.contractAddress,
        data.tokenId
      )
      data = { ...data, ...onchainData }
    }
    
    // 3. 获取元数据
    if (data.assetType === 'nft' && data.tokenId) {
      const metadata = await this.getNFTMetadata(
        data.contractAddress,
        data.tokenId
      )
      data.metadata = metadata
    }
    
    // 4. 创建商品
    const product = await this.productRepository.create(data)
    
    // 5. 同步到 Marketplace
    await this.marketplaceService.addProduct(product)
    
    return product
  }
  
  // 批量创建商品
  async batchCreateProducts(
    products: CreateWeb3ProductDto[]
  ): Promise<BatchCreateResult> {
    const results: BatchCreateResult = {
      success: [],
      failed: []
    }
    
    for (const productData of products) {
      try {
        const product = await this.createWeb3Product(productData)
        results.success.push({
          externalId: productData.externalId,
          productId: product.id
        })
      } catch (error) {
        results.failed.push({
          externalId: productData.externalId,
          error: error.message
        })
      }
    }
    
    return results
  }
}
```

---

## 6. 收益分成机制

### 6.1 项目方收益

#### 6.1.1 NFT 交易平台收益

**收益来源**：
- **NFT 交易分成**：每笔 NFT 交易的 0.3% - 0.5%
- **平台接入奖励**：一次性 $5,000 - $20,000
- **链上交易手续费分成**：Gas 费节省的 20%
- **GMV 里程碑奖励**：
  - $500K/月：$2,500
  - $5M/月：$25,000
  - $50M/月：$250,000

**收益计算示例**：
```
OpenSea 平台月 GMV：$5,000,000
平台分成比例：0.4%
平台月收益 = $5,000,000 × 0.4% = $20,000
链上交易手续费节省分成：$1,000
GMV 里程碑奖励：$25,000
总收益：$46,000/月
```

#### 6.1.2 DEX 收益

**收益来源**：
- **交易分成**：每笔交易的 0.2% - 0.4%
- **平台接入奖励**：一次性 $5,000 - $20,000
- **流动性提供奖励**：流动性提供者奖励的 10%
- **GMV 里程碑奖励**

**收益计算示例**：
```
Uniswap 平台月 GMV：$20,000,000
平台分成比例：0.3%
平台月收益 = $20,000,000 × 0.3% = $60,000
流动性提供奖励：$10,000
总收益：$70,000/月
```

#### 6.1.3 链上游戏项目收益

**收益来源**：
- **游戏资产交易分成**：0.3% - 0.5%
- **游戏内购买分成**：0.2% - 0.4%
- **平台接入奖励**：一次性 $2,000 - $10,000

### 6.2 收益分配流程

```
交易完成
   ↓
自动计算收益
   ├─ PayMind平台费：0.5% - 1%
   ├─ Agent佣金：2% - 3%
   ├─ Provider费用：3%
   ├─ 项目方分成：0.2% - 0.5%
   └─ 其他分成（如有）
   ↓
收益记录到账户
   ├─ 实时到账（项目方、Agent）
   └─ T+1 结算（其他）
   ↓
收益查询和提现
   ├─ 实时查询收益
   └─ 申请提现（T+1 到账）
```

---

## 7. 接入示例

### 7.1 NFT 交易平台接入示例

#### 示例：Magic Eden（Solana NFT 市场）

```typescript
// 1. 申请接入
const project = await paymind.projects.create({
  name: 'Magic Eden',
  type: 'nft_marketplace',
  description: 'Solana NFT Marketplace',
  website: 'https://magiceden.io',
  contactEmail: 'partnerships@magiceden.io'
})

// 2. 配置链上同步
await paymind.projects(project.id).sync.configureOnchain({
  chain: 'solana',
  contractAddress: '...',  // Magic Eden 合约地址
  tokenStandard: 'SPL-NFT',
  syncEvents: [
    { event: 'Transfer', handler: 'handleSolanaTransfer' }
  ]
})

// 3. 批量导入 NFT
const nfts = await magicEdenAPI.getListings({
  collection: 'cool-collection',
  limit: 1000
})

await paymind.projects(project.id).products.batchImport({
  source: 'api',
  products: nfts.map(nft => ({
    externalId: nft.id,
    name: nft.name,
    assetType: 'nft',
    chain: 'solana',
    contractAddress: nft.mint,
    tokenId: nft.tokenId,
    tokenStandard: 'SPL-NFT',
    price: nft.price,
    currency: 'SOL',
    metadata: {
      collection: nft.collection,
      attributes: nft.attributes
    }
  }))
})
```

### 7.2 DEX 接入示例

#### 示例：Uniswap（Ethereum DEX）

```typescript
// 1. 申请接入
const project = await paymind.projects.create({
  name: 'Uniswap',
  type: 'dex',
  description: 'Ethereum DEX',
  website: 'https://uniswap.org',
  contactEmail: 'partnerships@uniswap.org'
})

// 2. 配置链上同步（监听交易对）
await paymind.projects(project.id).sync.configureOnchain({
  chain: 'ethereum',
  contractAddress: '0x...',  // Uniswap Factory 地址
  tokenStandard: 'ERC-20',
  syncEvents: [
    { event: 'PairCreated', handler: 'handlePairCreated' }
  ]
})

// 3. 批量导入交易对
const pairs = await uniswapAPI.getPairs({
  limit: 10000
})

await paymind.projects(project.id).products.batchImport({
  source: 'api',
  products: pairs.map(pair => ({
    externalId: pair.id,
    name: `${pair.token0.symbol}/${pair.token1.symbol}`,
    assetType: 'token',
    chain: 'ethereum',
    contractAddress: pair.id,
    tokenStandard: 'ERC-20',
    price: pair.price,
    currency: 'USDC',
    metadata: {
      token0: pair.token0,
      token1: pair.token1,
      liquidity: pair.liquidity
    }
  }))
})
```

---

## 8. 总结

### 8.1 Web3 资产类型

- ✅ **Token**：ERC-20、SPL Token
- ✅ **NFT**：ERC-721、ERC-1155、SPL-NFT
- ✅ **服务**：订阅服务、访问凭证
- ✅ **RWA**：代币化资产、链上凭证
- ✅ **DeFi**：LP Token、收益代币
- ✅ **游戏**：游戏道具、游戏代币

### 8.2 可接入项目方

- ✅ **NFT 交易平台**：OpenSea、Magic Eden、Blur 等
- ✅ **DEX**：Uniswap、PancakeSwap、Raydium 等
- ✅ **链上游戏**：Axie Infinity、The Sandbox 等
- ✅ **链上服务**：Superfluid、Mirror 等
- ✅ **RWA 项目**：Centrifuge、Ondo Finance 等

### 8.3 接入方式

- ✅ **API 批量导入**：项目方提供 API 接口
- ✅ **链上数据同步**：监听链上事件，自动同步
- ✅ **手动导入**：Web 界面、CSV、JSON

### 8.4 收益分成

- ✅ **NFT 交易平台**：0.3% - 0.5%
- ✅ **DEX**：0.2% - 0.4%
- ✅ **链上游戏**：0.3% - 0.5%
- ✅ **平台接入奖励**：$2,000 - $20,000
- ✅ **GMV 里程碑奖励**：根据 GMV 额外奖励

---

**文档版本**：V3.0  
**最后更新**：2025年1月  
**下次评审**：2025年4月

---

*本文档详细说明了 PayMind Web3 资产交易与接入机制，聚焦 Web3 原生能力。*

