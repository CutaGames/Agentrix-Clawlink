# PayMind 直接发行功能设计
## 让项目方和创作者直接发行代币和 NFT

**版本**: 3.0  
**日期**: 2025年1月

---

## 📋 目录

1. [功能概述](#1-功能概述)
2. [代币发行功能](#2-代币发行功能)
3. [NFT 发行功能](#3-nft-发行功能)
4. [Launchpad 功能](#4-launchpad-功能)
5. [直接交易功能](#5-直接交易功能)
6. [技术实现](#6-技术实现)
7. [收益分成](#7-收益分成)

---

## 1. 功能概述

### 1.1 核心价值

**让项目方和创作者直接发行和交易，无需通过传统平台**

#### 给项目方：
- ✅ 一键发行代币，无需通过 Launchpad
- ✅ 直接交易代币，无需经过 DEX
- ✅ 获得更高收益（无需支付平台手续费）
- ✅ 完全控制权（价格、上架、收益）

#### 给创作者：
- ✅ 一键发行 NFT，无需通过 NFT 平台
- ✅ 直接交易 NFT，无需经过 NFT 市场
- ✅ 获得更高收益（版税 100% 归创作者）
- ✅ 完全控制权（价格、上架、版税）

### 1.2 功能模块

1. **代币发行模块**
   - 代币创建和部署
   - 代币经济学配置
   - 预售功能

2. **NFT 发行模块**
   - NFT 集合创建
   - 批量 Mint
   - 版税设置

3. **Launchpad 模块**
   - 代币预售
   - NFT 预售
   - 白名单管理

4. **直接交易模块**
   - 代币直接销售
   - NFT 直接销售
   - 智能合约集成

---

## 2. 代币发行功能

### 2.1 代币发行流程

```
1. 项目方登录 Dashboard
   ↓
2. 选择"发行代币"
   ↓
3. 填写代币信息
   ├─ 代币名称：My Token
   ├─ 代币符号：MTK
   ├─ 总供应量：1,000,000
   ├─ 精度：18
   └─ 链选择：Ethereum
   ↓
4. 设置代币经济学
   ├─ 团队：20%
   ├─ 投资者：30%
   ├─ 公开销售：40%
   └─ 储备：10%
   ↓
5. 设置锁仓机制（可选）
   ├─ 团队锁仓：12个月，线性释放
   ├─ 投资者锁仓：6个月，线性释放
   └─ 储备锁仓：24个月，线性释放
   ↓
6. 设置预售（可选）
   ├─ 预售价格：$0.1
   ├─ 预售数量：400,000
   ├─ 开始时间：2025-02-01
   ├─ 结束时间：2025-02-28
   └─ 白名单：可选
   ↓
7. 提交发行请求
   ↓
8. 自动部署智能合约
   ├─ 生成合约代码
   ├─ 部署到链上
   ├─ 验证合约
   └─ 记录合约地址
   ↓
9. 自动创建商品 SKU
   ├─ 同步到 PayMind 数据库
   ├─ 上架到 Marketplace
   └─ Agent 可以立即推荐
   ↓
10. 开始销售
    ├─ 预售（如设置）
    └─ 公开销售
```

### 2.2 代币发行 API

```typescript
// 创建代币发行请求
POST /api/v1/tokens/launch
Request: {
  // 基础信息
  name: string              // 代币名称
  symbol: string            // 代币符号
  totalSupply: string       // 总供应量
  decimals: number          // 精度（通常 18）
  chain: 'ethereum' | 'solana' | 'bsc' | 'polygon' | 'base'
  
  // 代币经济学
  distribution?: {
    team: number            // 团队比例（%）
    investors: number       // 投资者比例（%）
    public: number          // 公开销售比例（%）
    reserve: number         // 储备比例（%）
  }
  
  // 锁仓机制
  lockup?: {
    team?: {
      amount: number        // 锁仓数量
      releaseSchedule: Array<{
        date: string        // 释放日期
        amount: number      // 释放数量
      }>
    }
    investors?: {
      amount: number
      releaseSchedule: Array<{
        date: string
        amount: number
      }>
    }
  }
  
  // 预售设置
  presale?: {
    price: number           // 预售价格（USDC）
    amount: number          // 预售数量
    startDate: string       // 开始时间
    endDate: string         // 结束时间
    whitelist?: string[]    // 白名单地址
    minPurchase?: number    // 最小购买量
    maxPurchase?: number    // 最大购买量
  }
  
  // 公开销售设置
  publicSale?: {
    price: number           // 公开销售价格（USDC）
    startDate: string       // 开始时间
  }
}
Response: {
  tokenId: string            // PayMind 代币 ID
  contractAddress: string    // 合约地址
  transactionHash: string    // 部署交易哈希
  productId: string          // 商品 ID（自动创建）
  status: 'deploying' | 'deployed' | 'failed'
  presaleContractAddress?: string  // 预售合约地址（如有）
}

// 查询代币发行状态
GET /api/v1/tokens/:id/status
Response: {
  status: 'deploying' | 'deployed' | 'failed'
  contractAddress?: string
  transactionHash?: string
  deployedAt?: Date
  error?: string
  stats?: {
    totalSupply: string
    sold: string
    remaining: string
    totalRaised: string
  }
}

// 更新代币价格
PATCH /api/v1/tokens/:id/price
Request: {
  price: number
}
Response: {
  success: boolean
  newPrice: number
}
```

### 2.3 智能合约模板

#### ERC-20 代币合约

```solidity
// Token.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PayMindToken is ERC20, Ownable {
  uint256 public constant TOTAL_SUPPLY = 1000000 * 10**18;
  
  // 分配地址
  address public teamWallet;
  address public investorsWallet;
  address public reserveWallet;
  
  // 锁仓合约
  address public lockupContract;
  
  constructor(
    string memory name,
    string memory symbol,
    address _teamWallet,
    address _investorsWallet,
    address _reserveWallet
  ) ERC20(name, symbol) {
    teamWallet = _teamWallet;
    investorsWallet = _investorsWallet;
    reserveWallet = _reserveWallet;
    
    // 初始分配（未锁仓部分）
    _mint(msg.sender, TOTAL_SUPPLY * 40 / 100);  // 公开销售
  }
  
  // 锁仓释放
  function releaseLockedTokens() external {
    require(msg.sender == lockupContract, "Only lockup contract");
    // 锁仓释放逻辑
  }
}
```

#### 代币销售合约

```solidity
// TokenSale.sol
contract TokenSale {
  IERC20 public token;
  IERC20 public paymentToken;  // USDC
  address public seller;       // 项目方地址
  uint256 public price;         // 代币价格（USDC per token）
  uint256 public totalSupply;   // 总供应量
  uint256 public sold;           // 已售数量
  bool public isActive;         // 是否激活
  
  mapping(address => bool) public whitelist;  // 白名单
  mapping(address => uint256) public purchased;  // 已购买数量
  
  event TokensPurchased(address buyer, uint256 amount, uint256 payment);
  
  function buy(uint256 tokenAmount) external {
    require(isActive, "Sale not active");
    require(sold + tokenAmount <= totalSupply, "Insufficient supply");
    
    // 检查白名单（如有）
    if (hasWhitelist) {
      require(whitelist[msg.sender], "Not whitelisted");
    }
    
    uint256 payment = tokenAmount * price / 10**18;
    paymentToken.transferFrom(msg.sender, seller, payment);
    token.transfer(msg.sender, tokenAmount);
    
    sold += tokenAmount;
    purchased[msg.sender] += tokenAmount;
    
    emit TokensPurchased(msg.sender, tokenAmount, payment);
  }
  
  function setPrice(uint256 newPrice) external {
    require(msg.sender == seller, "Only seller");
    price = newPrice;
  }
  
  function setActive(bool active) external {
    require(msg.sender == seller, "Only seller");
    isActive = active;
  }
}
```

---

## 3. NFT 发行功能

### 3.1 NFT 发行流程

```
1. 创作者登录 Dashboard
   ↓
2. 选择"发行 NFT"
   ↓
3. 创建 NFT 集合
   ├─ 集合名称：My Art Collection
   ├─ 描述：A collection of digital art
   ├─ 链选择：Ethereum
   ├─ 标准：ERC-721
   └─ 版税：10%
   ↓
4. 上传 NFT 内容
   ├─ 图片/视频/音频文件
   ├─ 元数据（名称、描述、属性）
   └─ 上传到 IPFS/Arweave
   ↓
5. 批量生成 NFT
   ├─ 批量 Mint
   ├─ 自动分配 Token ID
   └─ 生成元数据 URI
   ↓
6. 设置价格（可选）
   ├─ 初始价格
   └─ 自动上架
   ↓
7. 自动创建商品 SKU
   ├─ 同步到 PayMind 数据库
   ├─ 上架到 Marketplace
   └─ Agent 可以立即推荐
```

### 3.2 NFT 发行 API

```typescript
// 创建 NFT 集合
POST /api/v1/nfts/collections
Request: {
  name: string              // 集合名称
  description?: string      // 描述
  chain: 'ethereum' | 'solana' | 'bsc' | 'polygon' | 'base'
  standard: 'ERC-721' | 'ERC-1155' | 'SPL-NFT'
  royalty: number          // 版税比例（0-100）
  royaltyRecipients?: Array<{  // 多受益人版税
    address: string
    percentage: number
  }>
  image?: string            // 集合封面图
}
Response: {
  collectionId: string
  contractAddress: string
  transactionHash: string
  status: 'deploying' | 'deployed' | 'failed'
}

// 批量 Mint NFT
POST /api/v1/nfts/collections/:id/mint
Request: {
  items: Array<{
    name: string
    description?: string
    image: string | File    // 图片 URL 或文件
    attributes?: Array<{
      trait_type: string
      value: string | number
    }>
    price?: number          // 初始价格（USDC）
    currency?: string       // 计价货币
  }>
  uploadTo: 'ipfs' | 'arweave'  // 元数据存储位置
  autoList?: boolean        // 是否自动上架
}
Response: {
  minted: number
  failed: number
  nfts: Array<{
    tokenId: string
    productId: string      // 自动创建的商品 ID
    metadataURI: string
    status: 'minting' | 'minted' | 'failed'
    transactionHash?: string
  }>
}

// 查询 Mint 状态
GET /api/v1/nfts/collections/:id/mint-status
Response: {
  total: number
  minted: number
  failed: number
  nfts: Array<{
    tokenId: string
    status: 'minting' | 'minted' | 'failed'
    transactionHash?: string
    metadataURI?: string
  }>
}

// 更新 NFT 价格
PATCH /api/v1/nfts/:id/price
Request: {
  price: number
  currency?: string
}
Response: {
  success: boolean
  newPrice: number
}
```

### 3.3 智能合约模板

#### ERC-721 NFT 合约

```solidity
// NFTCollection.sol
contract NFTCollection is ERC721, Ownable {
  uint256 public totalSupply;
  uint256 public maxSupply;
  uint256 public price;
  bool public isMintingActive;
  
  // 版税
  uint256 public royaltyPercentage;  // 基点（如 1000 = 10%）
  address public royaltyRecipient;
  
  // 元数据
  mapping(uint256 => string) public tokenURI;
  
  constructor(
    string memory name,
    string memory symbol,
    uint256 _maxSupply,
    uint256 _royaltyPercentage,
    address _royaltyRecipient
  ) ERC721(name, symbol) {
    maxSupply = _maxSupply;
    royaltyPercentage = _royaltyPercentage;
    royaltyRecipient = _royaltyRecipient;
  }
  
  function mint(
    address to,
    string memory uri
  ) external payable {
    require(isMintingActive, "Minting not active");
    require(totalSupply < maxSupply, "Max supply reached");
    require(msg.value >= price, "Insufficient payment");
    
    uint256 tokenId = totalSupply + 1;
    _safeMint(to, tokenId);
    tokenURI[tokenId] = uri;
    totalSupply++;
  }
  
  function setPrice(uint256 newPrice) external onlyOwner {
    price = newPrice;
  }
  
  function setMintingActive(bool active) external onlyOwner {
    isMintingActive = active;
  }
}
```

---

## 4. Launchpad 功能

### 4.1 代币预售功能

```typescript
// 创建代币预售
POST /api/v1/tokens/:id/presale
Request: {
  price: number           // 预售价格（USDC）
  amount: number          // 预售数量
  startDate: string       // 开始时间
  endDate: string         // 结束时间
  whitelist?: string[]    // 白名单地址
  minPurchase?: number    // 最小购买量
  maxPurchase?: number    // 最大购买量
  vesting?: {             // 锁仓释放（可选）
    cliff: number         // 锁仓期（天）
    duration: number      // 释放期（天）
    releaseType: 'linear' | 'cliff'  // 释放类型
  }
}
Response: {
  presaleId: string
  contractAddress: string
  status: 'created' | 'active' | 'ended'
}

// 购买预售代币
POST /api/v1/tokens/:id/presale/buy
Request: {
  amount: number          // 购买数量
  paymentMethod: 'usdc' | 'usdt' | 'eth'
}
Response: {
  transactionHash: string
  purchased: number
  payment: number
}

// 查询预售状态
GET /api/v1/tokens/:id/presale/status
Response: {
  status: 'upcoming' | 'active' | 'ended'
  totalRaised: number
  totalSold: number
  remaining: number
  participants: number
  startDate: Date
  endDate: Date
}
```

### 4.2 NFT 预售功能

```typescript
// 创建 NFT 预售
POST /api/v1/nfts/collections/:id/presale
Request: {
  price: number           // 预售价格（USDC）
  amount: number          // 预售数量
  startDate: string       // 开始时间
  endDate: string         // 结束时间
  whitelist?: string[]    // 白名单地址
  maxPerWallet?: number   // 每个钱包最大购买数
}
Response: {
  presaleId: string
  contractAddress: string
  status: 'created' | 'active' | 'ended'
}

// 购买预售 NFT
POST /api/v1/nfts/collections/:id/presale/buy
Request: {
  quantity: number        // 购买数量
  paymentMethod: 'usdc' | 'usdt' | 'eth'
}
Response: {
  transactionHash: string
  purchased: number
  nftIds: string[]       // 购买的 NFT Token ID
  payment: number
}
```

---

## 5. 直接交易功能

### 5.1 代币直接交易

#### 交易流程

```
用户通过 Agent 搜索代币
   ↓
Agent 推荐项目方直接发行的代币
   ↓
显示代币信息
   ├─ 代币名称、符号
   ├─ 当前价格
   ├─ 可用数量
   └─ 项目方信息
   ↓
用户点击购买
   ↓
Agent 自动执行交易
   ├─ 调用代币销售合约
   ├─ 用户支付 USDC/USDT
   └─ 自动接收代币
   ↓
交易完成
   ├─ 代币转移到用户钱包
   ├─ 资金转移到项目方
   └─ 记录交易
```

#### API 设计

```typescript
// 购买代币
POST /api/v1/tokens/:id/buy
Request: {
  amount: number          // 购买数量
  paymentMethod: 'usdc' | 'usdt' | 'wallet'
  walletAddress?: string  // 钱包地址（如使用钱包支付）
}
Response: {
  transactionHash: string
  purchased: number
  payment: number
  tokenReceived: number
}

// 查询代币销售信息
GET /api/v1/tokens/:id/sale
Response: {
  price: number
  available: number
  sold: number
  totalSupply: number
  isActive: boolean
  seller: string          // 项目方地址
}
```

### 5.2 NFT 直接交易

#### 交易流程

```
用户通过 Agent 搜索 NFT
   ↓
Agent 推荐创作者直接发行的 NFT
   ↓
显示 NFT 信息
   ├─ NFT 名称、描述
   ├─ 图片/视频
   ├─ 属性
   ├─ 当前价格
   └─ 创作者信息
   ↓
用户点击购买
   ↓
Agent 自动执行交易
   ├─ 调用 NFT 销售合约
   ├─ 用户支付 USDC/USDT
   ├─ NFT 转移到用户钱包
   └─ 版税自动分配给创作者
   ↓
交易完成
   ├─ NFT 转移到用户钱包
   ├─ 资金分配给卖家和创作者
   └─ 记录交易
```

#### API 设计

```typescript
// 购买 NFT
POST /api/v1/nfts/:id/buy
Request: {
  paymentMethod: 'usdc' | 'usdt' | 'wallet'
  walletAddress?: string
}
Response: {
  transactionHash: string
  nftId: string
  payment: number
  royalty: number         // 版税金额
  sellerAmount: number    // 卖家获得金额
}

// 上架 NFT
POST /api/v1/nfts/:id/list
Request: {
  price: number
  currency?: string
}
Response: {
  success: boolean
  listedPrice: number
}

// 下架 NFT
POST /api/v1/nfts/:id/delist
Response: {
  success: boolean
}

// 查询 NFT 销售信息
GET /api/v1/nfts/:id/sale
Response: {
  price: number
  isListed: boolean
  owner: string
  creator: string
  royalty: number
  salesHistory?: Array<{
    buyer: string
    price: number
    timestamp: Date
  }>
}
```

---

## 6. 技术实现

### 6.1 智能合约部署服务

```typescript
// 合约部署服务
class ContractDeploymentService {
  // 部署代币合约
  async deployTokenContract(config: TokenConfig): Promise<DeploymentResult> {
    // 1. 生成合约代码
    const contractCode = this.generateTokenContract(config)
    
    // 2. 编译合约
    const compiled = await this.compileContract(contractCode)
    
    // 3. 部署到链上
    const deployment = await this.deployToChain(
      compiled.bytecode,
      config.chain
    )
    
    // 4. 验证合约
    await this.verifyContract(
      deployment.address,
      compiled.sourceCode,
      config.chain
    )
    
    return {
      contractAddress: deployment.address,
      transactionHash: deployment.txHash,
      status: 'deployed'
    }
  }
  
  // 部署 NFT 合约
  async deployNFTContract(config: NFTConfig): Promise<DeploymentResult> {
    // 类似流程
  }
  
  // 部署销售合约
  async deploySaleContract(config: SaleConfig): Promise<DeploymentResult> {
    // 类似流程
  }
}
```

### 6.2 元数据存储服务

```typescript
// 元数据存储服务
class MetadataStorageService {
  // 上传到 IPFS
  async uploadToIPFS(data: any): Promise<string> {
    const ipfs = await this.getIPFSClient()
    const result = await ipfs.add(JSON.stringify(data))
    return `ipfs://${result.path}`
  }
  
  // 上传到 Arweave
  async uploadToArweave(data: any): Promise<string> {
    const arweave = await this.getArweaveClient()
    const transaction = await arweave.createTransaction({
      data: JSON.stringify(data)
    })
    await arweave.transactions.sign(transaction)
    await arweave.transactions.post(transaction)
    return `ar://${transaction.id}`
  }
  
  // 上传 NFT 文件
  async uploadNFTFile(file: File, storage: 'ipfs' | 'arweave'): Promise<string> {
    if (storage === 'ipfs') {
      return await this.uploadToIPFS(file)
    } else {
      return await this.uploadToArweave(file)
    }
  }
}
```

### 6.3 商品自动创建服务

```typescript
// 商品自动创建服务
class ProductAutoCreateService {
  // 代币发行后自动创建商品
  async createTokenProduct(token: Token): Promise<Product> {
    const product = await this.productRepository.create({
      name: token.name,
      description: `Token: ${token.symbol}`,
      price: token.presale?.price || token.publicSale?.price || 0,
      currency: 'USDC',
      category: 'token',
      merchantId: token.projectId,
      stock: token.totalSupply - token.sold,
      status: 'active',
      metadata: {
        assetType: 'token',
        chain: token.chain,
        contractAddress: token.contractAddress,
        tokenStandard: 'ERC-20',
        symbol: token.symbol,
        decimals: token.decimals,
        totalSupply: token.totalSupply,
        sold: token.sold
      }
    })
    
    // 同步到 Marketplace
    await this.marketplaceService.addProduct(product)
    
    return product
  }
  
  // NFT Mint 后自动创建商品
  async createNFTProduct(nft: NFT): Promise<Product> {
    const product = await this.productRepository.create({
      name: nft.name,
      description: nft.description,
      price: nft.price || 0,
      currency: nft.currency || 'USDC',
      category: 'nft',
      merchantId: nft.creatorId,
      stock: 1,
      status: 'active',
      metadata: {
        assetType: 'nft',
        chain: nft.chain,
        contractAddress: nft.contractAddress,
        tokenId: nft.tokenId,
        tokenStandard: nft.standard,
        collection: nft.collectionName,
        creator: nft.creator,
        royalty: nft.royalty,
        attributes: nft.attributes,
        image: nft.image,
        metadataURI: nft.metadataURI
      }
    })
    
    // 同步到 Marketplace
    await this.marketplaceService.addProduct(product)
    
    return product
  }
}
```

---

## 7. 收益分成

### 7.1 项目方收益

#### 代币发行收益

**收益来源**：
- **代币销售收入**：100%（无需支付平台手续费）
- **PayMind 平台费**：0.5% - 1%（仅交易时）

**收益计算**：
```
代币销售：$1,000,000
平台手续费（传统）：$25,000 - $50,000（2.5% - 5%）
PayMind 平台费：$5,000 - $10,000（0.5% - 1%）
节省成本：$15,000 - $45,000
```

#### NFT 发行收益

**收益来源**：
- **NFT 销售收入**：100%（无需支付平台手续费）
- **版税收入**：100%（无需平台抽成）
- **PayMind 平台费**：0.5% - 1%（仅交易时）

**收益计算**：
```
NFT 销售：$100,000
平台手续费（传统）：$2,500 - $5,000（2.5% - 5%）
版税平台抽成（传统）：50%（假设版税 10%，平台抽 5%）
PayMind 平台费：$500 - $1,000（0.5% - 1%）
版税收入：100%（$10,000）
节省成本：$2,000 - $4,000 + $5,000（版税）= $7,000 - $9,000
```

### 7.2 PayMind 收益

#### 发行服务费

- **代币发行**：$100 - $1,000（一次性）
- **NFT 集合创建**：$50 - $500（一次性）
- **NFT Mint**：$0.01 - $0.1 per NFT

#### 交易手续费

- **代币交易**：0.5% - 1%
- **NFT 交易**：0.5% - 1%

---

## 8. 总结

### 8.1 核心能力

- ✅ **项目方直接发行代币**：一键发行，自动部署
- ✅ **创作者直接发行 NFT**：批量 Mint，自动上架
- ✅ **直接交易**：点对点交易，无需中间平台
- ✅ **Launchpad 功能**：预售、白名单、自动分发

### 8.2 竞争优势

- **低成本**：发行成本降低 90%
- **高收益**：无需支付平台手续费
- **高速度**：发行时间从周级降到即时
- **强控制**：完全控制价格、上架、收益

### 8.3 最终形态

**一个去中介化的 Web3 交易生态**

- 项目方直接发行代币
- 创作者直接发行 NFT
- Agent 智能推荐和交易
- 用户直接与项目方/创作者交易
- 所有人按贡献获得收益

**这是 Web3 交易的未来：去中介化 + AI 驱动**

---

**文档版本**：V3.0  
**最后更新**：2025年1月

---

*本文档详细说明了 PayMind 的直接发行功能设计，让项目方和创作者可以直接发行和交易。*

