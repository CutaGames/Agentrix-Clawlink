# PayMind 技术开发文档 V3.0
## Web3 直接发行与交易平台

**版本**: 3.0  
**日期**: 2025年1月  
**基于**: 商业计划书 V3.0 + PRD V3.0

---

## 📋 目录

1. [项目概述](#1-项目概述)
2. [当前已实现功能](#2-当前已实现功能)
3. [新增功能需求](#3-新增功能需求)
4. [前端开发内容](#4-前端开发内容)
5. [后端开发内容](#5-后端开发内容)
6. [智能合约开发内容](#6-智能合约开发内容)
7. [开发计划](#7-开发计划)
8. [交付物清单](#8-交付物清单)

---

## 1. 项目概述

### 1.1 项目定位

**PayMind = Agent 级交易能力的基础设施层 + Web3 原生发行与交易平台**

### 1.2 核心新增功能

1. **Web3 直接发行功能**（通过 PayMind Agent 实现）
   - 代币发行（ERC-20、SPL Token）
   - NFT 发行（ERC-721、ERC-1155、SPL-NFT）
   - Launchpad 功能（预售、白名单）

2. **直接交易功能**（通过 PayMind Agent 实现）
   - 代币直接交易（点对点，无需经过 DEX）
   - NFT 直接交易（点对点，无需经过 NFT 市场）

3. **智能合约部署服务**
   - 自动部署代币合约
   - 自动部署 NFT 合约
   - 自动部署销售合约

4. **元数据存储服务**
   - IPFS 集成
   - Arweave 集成

### 1.3 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    PayMind Agent (前端)                   │
│  - 对话式交互界面                                        │
│  - 文件上传支持                                          │
│  - 意图识别和引导                                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend API (NestJS)                  │
│  - 代币发行服务                                          │
│  - NFT 发行服务                                          │
│  - Launchpad 服务                                        │
│  - 智能合约部署服务                                      │
│  - 元数据存储服务                                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│               Blockchain (Ethereum/Solana/BSC)           │
│  - 代币合约 (ERC-20 / SPL Token)                        │
│  - NFT 合约 (ERC-721 / ERC-1155 / SPL-NFT)             │
│  - 销售合约 (TokenSale / NFTSale)                        │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 当前已实现功能

### 2.1 前端（Frontend）

#### ✅ 已完成
- **Agent 聊天界面** (`AgentChat.tsx`, `AgentChatV3.tsx`)
- **Marketplace 商品展示** (`MarketplaceView.tsx`)
- **购物车** (`ShoppingCart.tsx`)
- **统一支付模态框** (`UserFriendlyPaymentModalV2.tsx`)
- **代码生成器** (`CodeGenerator.tsx`)
- **结构化消息卡片** (`StructuredMessageCard.tsx`)
- **Agent 工作流历史** (`AgentWorkflowHistory.tsx`)
- **Agent 侧边栏** (`AgentSidebar.tsx`)
- **Agent 顶部导航** (`AgentTopNav.tsx`)

#### ⚠️ 部分实现
- **沙箱测试** (`Sandbox.tsx`) - 模拟实现

### 2.2 后端（Backend）

#### ✅ 已完成
- **支付服务** (`PaymentService`, `SmartRouterService`)
- **托管交易** (`EscrowService`)
- **结算服务** (`CommissionCalculatorService`, `CommissionService`)
- **Agent 服务** (`AgentService`, `AgentController`)
- **商品服务** (`ProductService`)
- **推荐服务** (`RecommendationService`)
- **提现服务** (`WithdrawalService`)

#### ⚠️ 部分实现
- **Provider API 集成** - 框架完成，API 调用模拟
- **智能合约交互** - 全部模拟

### 2.3 智能合约（Smart Contracts）

#### ⚠️ 未实现
- **代币合约** - 存在但未部署
- **NFT 合约** - 不存在
- **销售合约** - 不存在
- **合约部署服务** - 不存在

---

## 3. 新增功能需求

### 3.1 Web3 直接发行功能

#### 3.1.1 代币发行功能

**功能描述**：
- 通过 Agent 对话收集代币信息
- 自动部署 ERC-20 / SPL Token 合约
- 自动创建商品 SKU
- 自动上架到 Marketplace

**优先级**：P0（核心功能）

#### 3.1.2 NFT 发行功能

**功能描述**：
- 通过 Agent 对话收集 NFT 信息
- 支持文件上传（图片/视频/音频）
- 自动部署 ERC-721 / ERC-1155 / SPL-NFT 合约
- 批量 Mint NFT
- 自动上传元数据到 IPFS/Arweave
- 自动创建商品 SKU
- 自动上架到 Marketplace

**优先级**：P0（核心功能）

#### 3.1.3 Launchpad 功能

**功能描述**：
- 代币预售
- NFT 预售
- 白名单管理
- 自动分发

**优先级**：P1（重要功能）

### 3.2 直接交易功能

#### 3.2.1 代币直接交易

**功能描述**：
- 通过 Agent 显示代币信息
- 支持直接购买代币
- 调用智能合约执行交易
- 自动完成支付和资产转移

**优先级**：P0（核心功能）

#### 3.2.2 NFT 直接交易

**功能描述**：
- 通过 Agent 显示 NFT 信息
- 支持直接购买 NFT
- 调用智能合约执行交易
- 自动分配版税给创作者

**优先级**：P0（核心功能）

### 3.3 基础设施功能

#### 3.3.1 智能合约部署服务

**功能描述**：
- 自动生成合约代码
- 自动编译合约
- 自动部署到链上
- 自动验证合约

**优先级**：P0（核心功能）

#### 3.3.2 元数据存储服务

**功能描述**：
- IPFS 集成
- Arweave 集成
- 自动上传 NFT 文件和元数据

**优先级**：P0（核心功能）

### 3.4 Marketplace 资产扩张路线图（新增）

为达成“无商户入驻也能快速丰富 Marketplace”的目标，技术侧按照三阶段落地：

1. **Stage 1：极速聚合（0-1 周）**
   - **数据接入**：编写统一的 `AssetIngestorService`，对接 token-list、DEX Aggregator（Jupiter/Raydium、Uniswap/1inch、OpenOcean/LI.FI）、NFT 平台（Magic Eden、OpenSea、Tensor）、RWA 协议（USYC/ONDO/MANTRA/Maple/Credix）、Launchpad（Pump.fun、Raydium、TON Presale）。
   - **适配层**：实现 `AssetNormalizer`，将 token/交易对/NFT/RWA/Launchpad 转换为统一的 `MarketplaceAsset` 模型，写入 `marketplace_assets` 表。
   - **下单接口**：封装 `SwapService`、`DexOrderService`、`NFTTradingService`、`RWAService`、`LaunchpadService`，供 Agent/前端调用。
   - **验收**：24 小时内导入 ≥ 5000 条资产，支持基础下单。

2. **Stage 2：半自动商户入驻（1-2 周）**
   - **开放入口**：新增 `merchant-assets` API + 控制台表单，允许项目方上传 Logo、简介、交易入口、返佣（3-10%）。
   - **Referral SDK**：提供 JS/TS SDK，项目方可将 PayMind Link 嵌入白皮书/推文，带上 referralId。
   - **Agent 自助上架**：允许 Agent 调用 `agentAssets.submit()` 接口提交资产，审核通过后自动上架，并绑定“上架者分成”。
   - **开发者共建**：提供 `assetProvider` SDK 模块，第三方可编写爬虫/集成，提交资产并获得上架奖励。

3. **Stage 3：AI 自动扩张（1-2 月）**
   - **AI 扫描器**：训练/部署 `AssetScanner`（基于链上/社交数据）自动发现热门资产。
   - **风险与描述生成**：使用 LLM + 规则生成资产简介、风险等级、策略建议。
   - **自动决策**：`AssetGovernor` 根据指标决定上/下架及排序，输出日报。

**依赖**：新增 `marketplace_assets`、`asset_sources`、`asset_referrals` 表及相应服务。

---

## 4. 前端开发内容

### 4.1 Agent 意图识别增强

#### 4.1.1 修改文件

**文件**：`paymindfrontend/components/agent/AgentChatEnhanced.tsx`

**修改内容**：
- 添加代币发行意图识别
- 添加 NFT 发行意图识别
- 添加 Launchpad 意图识别
- 添加直接交易意图识别

**代码示例**：
```typescript
// 意图识别扩展
const intents = {
  // 现有意图
  'search_products': ['搜索', '找', '买'],
  'add_to_cart': ['加入购物车', '添加到购物车'],
  
  // 新增意图
  'launch_token': ['发行代币', '创建代币', 'launch token', '发行token'],
  'launch_nft': ['发行NFT', '创建NFT', 'mint nft', '发行nft'],
  'set_presale': ['设置预售', 'presale', '预售'],
  'buy_token': ['购买代币', 'buy token', '买代币'],
  'buy_nft': ['购买NFT', 'buy nft', '买nft'],
}

// 处理新增意图
async function processMessage(message: string) {
  const intent = extractIntent(message)
  
  if (intent === 'launch_token') {
    // 引导用户输入代币信息
    return await handleTokenLaunch(message)
  }
  
  if (intent === 'launch_nft') {
    // 引导用户输入NFT信息
    return await handleNFTLaunch(message)
  }
  
  // ... 其他意图处理
}
```

**工作量**：2 天

### 4.2 文件上传支持

#### 4.2.1 新增文件

**文件**：`paymindfrontend/components/agent/FileUpload.tsx`

**功能**：
- 支持图片上传
- 支持视频上传
- 支持音频上传
- 显示上传进度
- 预览上传的文件

**代码示例**：
```typescript
interface FileUploadProps {
  onUpload: (file: File) => Promise<string>  // 返回文件URL
  accept?: string  // 文件类型
  maxSize?: number  // 最大文件大小（MB）
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  accept = 'image/*,video/*,audio/*',
  maxSize = 100
}) => {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // 检查文件大小
    if (file.size > maxSize * 1024 * 1024) {
      alert(`文件大小不能超过 ${maxSize}MB`)
      return
    }
    
    // 预览
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    
    // 上传
    setUploading(true)
    try {
      const url = await onUpload(file)
      // 上传成功
    } catch (error) {
      // 上传失败
    } finally {
      setUploading(false)
    }
  }
  
  return (
    <div>
      <input type="file" onChange={handleFileChange} accept={accept} />
      {preview && <img src={preview} alt="Preview" />}
      {uploading && <ProgressBar value={progress} />}
    </div>
  )
}
```

**工作量**：3 天

### 4.3 Agent 对话引导增强

#### 4.3.1 修改文件

**文件**：`paymindfrontend/components/agent/AgentChatEnhanced.tsx`

**修改内容**：
- 添加代币发行引导流程
- 添加 NFT 发行引导流程
- 添加 Launchpad 引导流程
- 添加直接交易引导流程

**代码示例**：
```typescript
// 代币发行引导
async function handleTokenLaunch(message: string) {
  const session = getCurrentSession()
  const state = session.state || {}
  
  // 收集代币信息
  if (!state.tokenName) {
    return "好的，我来帮您发行代币。请告诉我代币名称："
  }
  
  if (!state.tokenSymbol) {
    const name = extractTokenName(message)
    state.tokenName = name
    return "好的，代币名称是 " + name + "。请告诉我代币符号（例如：MTK）："
  }
  
  if (!state.totalSupply) {
    const symbol = extractTokenSymbol(message)
    state.symbol = symbol
    return "好的，代币符号是 " + symbol + "。请告诉我总供应量："
  }
  
  // ... 继续收集其他信息
  
  // 信息收集完成，调用后端API
  if (state.readyToLaunch) {
    const result = await tokenApi.launch({
      name: state.tokenName,
      symbol: state.tokenSymbol,
      totalSupply: state.totalSupply,
      chain: state.chain || 'ethereum',
      // ... 其他参数
    })
    
    return `代币创建成功！\n- 合约地址：${result.contractAddress}\n- 交易哈希：${result.transactionHash}\n已自动上架到 Marketplace，Agent 可以立即推荐和交易。`
  }
}
```

**工作量**：5 天

### 4.4 结构化消息卡片扩展

#### 4.4.1 修改文件

**文件**：`paymindfrontend/components/agent/StructuredMessageCard.tsx`

**修改内容**：
- 添加代币信息卡片
- 添加 NFT 信息卡片
- 添加预售信息卡片
- 添加交易确认卡片

**代码示例**：
```typescript
// 代币信息卡片
export const TokenCard: React.FC<{ token: Token }> = ({ token }) => {
  return (
    <div className="token-card">
      <h3>{token.name} ({token.symbol})</h3>
      <p>合约地址：{token.contractAddress}</p>
      <p>总供应量：{token.totalSupply}</p>
      <p>当前价格：{token.price} USDC</p>
      <p>可用数量：{token.available}</p>
      <button onClick={() => handleBuyToken(token)}>购买代币</button>
    </div>
  )
}

// NFT 信息卡片
export const NFTCard: React.FC<{ nft: NFT }> = ({ nft }) => {
  return (
    <div className="nft-card">
      <img src={nft.image} alt={nft.name} />
      <h3>{nft.name}</h3>
      <p>集合：{nft.collectionName}</p>
      <p>创作者：{nft.creator}</p>
      <p>版税：{nft.royalty}%</p>
      <p>价格：{nft.price} USDC</p>
      <button onClick={() => handleBuyNFT(nft)}>购买NFT</button>
    </div>
  )
}
```

**工作量**：3 天

### 4.5 API 客户端扩展

#### 4.5.1 新增文件

**文件**：`paymindfrontend/lib/api/token.api.ts`

**功能**：
- 代币发行 API
- 代币状态查询 API
- 代币购买 API

**代码示例**：
```typescript
import { apiClient } from './client'

export interface TokenLaunchRequest {
  name: string
  symbol: string
  totalSupply: string
  decimals: number
  chain: 'ethereum' | 'solana' | 'bsc' | 'polygon' | 'base'
  distribution?: {
    team: number
    investors: number
    public: number
    reserve: number
  }
  presale?: {
    price: number
    amount: number
    startDate: string
    endDate: string
    whitelist?: string[]
  }
}

export interface TokenLaunchResponse {
  tokenId: string
  contractAddress: string
  transactionHash: string
  productId: string
  status: 'deploying' | 'deployed' | 'failed'
}

export const tokenApi = {
  // 发行代币
  launch: async (data: TokenLaunchRequest): Promise<TokenLaunchResponse> => {
    return apiClient.post('/tokens/launch', data)
  },
  
  // 查询代币状态
  getStatus: async (tokenId: string) => {
    return apiClient.get(`/tokens/${tokenId}/status`)
  },
  
  // 购买代币
  buy: async (tokenId: string, amount: number, paymentMethod: string) => {
    return apiClient.post(`/tokens/${tokenId}/buy`, {
      amount,
      paymentMethod
    })
  }
}
```

**工作量**：2 天

#### 4.5.2 新增文件

**文件**：`paymindfrontend/lib/api/nft.api.ts`

**功能**：
- NFT 集合创建 API
- NFT Mint API
- NFT 购买 API

**代码示例**：
```typescript
export interface NFTCollectionRequest {
  name: string
  description?: string
  chain: 'ethereum' | 'solana' | 'bsc' | 'polygon' | 'base'
  standard: 'ERC-721' | 'ERC-1155' | 'SPL-NFT'
  royalty: number
  image?: string
}

export interface NFTMintRequest {
  collectionId: string
  items: Array<{
    name: string
    description?: string
    image: string | File
    attributes?: Array<{
      trait_type: string
      value: string | number
    }>
    price?: number
  }>
  uploadTo: 'ipfs' | 'arweave'
  autoList?: boolean
}

export const nftApi = {
  // 创建NFT集合
  createCollection: async (data: NFTCollectionRequest) => {
    return apiClient.post('/nfts/collections', data)
  },
  
  // 批量Mint NFT
  mint: async (collectionId: string, data: NFTMintRequest) => {
    const formData = new FormData()
    // 处理文件上传
    return apiClient.post(`/nfts/collections/${collectionId}/mint`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  // 购买NFT
  buy: async (nftId: string, paymentMethod: string) => {
    return apiClient.post(`/nfts/${nftId}/buy`, { paymentMethod })
  }
}
```

**工作量**：2 天

### 4.6 Marketplace 资产聚合 UI（新增）

**目标**：展示聚合资产、支持即时交易/提交资产/AI 推荐。**

| 子任务 | 文件 | 功能点 | 工作量 | 优先级 |
|--------|------|--------|--------|--------|
| Stage1 资产列表 | `components/marketplace/AssetDiscovery.tsx` (新建) | 展示 token/交易对/NFT/RWA/Launchpad，含来源标签、流动性、价格、波动 | 4 天 | P0 |
| 筛选与操作面板 | `components/marketplace/AssetFilters.tsx`、`AssetActionPanel.tsx` (新建) | 多维筛选、发起 swap/限价/扫地/抢购、显示 AI 推荐策略 | 3 天 | P0 |
| 提交资产入口 | `components/marketplace/AssetSubmissionModal.tsx` (新建) | 项目方/Agent/开发者上传资产、配置返佣、查看状态 | 2 天 | P1 |
| AI 推荐卡片 | `components/marketplace/AssetInsights.tsx` (新建) | 展示 AI 生成的描述、风险评级、策略建议 | 3 天 | P2 |
| 首页宣传段落 | `pages/index.tsx` | 在 Hero/Marketplace 区块强调“AI 聚合资产” | 1 天 | P0 |

**依赖**：`marketplace_assets` API、资产提交流程、AI Insights API。

### 4.7 前端开发总结

| 任务 | 文件 | 工作量 | 优先级 |
|------|------|--------|--------|
| Agent 意图识别增强 | `AgentChatEnhanced.tsx` | 2 天 | P0 |
| 文件上传支持 | `FileUpload.tsx` (新建) | 3 天 | P0 |
| Agent 对话引导增强 | `AgentChatEnhanced.tsx` | 5 天 | P0 |
| 结构化消息卡片扩展 | `StructuredMessageCard.tsx` | 3 天 | P0 |
| 代币 API 客户端 | `token.api.ts` (新建) | 2 天 | P0 |
| NFT API 客户端 | `nft.api.ts` (新建) | 2 天 | P0 |

**总工作量**：30 天（可与后端并行，按阶段交付）

---

## 5. 后端开发内容

### 5.1 代币发行服务

#### 5.1.1 新增文件

**文件**：`backend/src/modules/token/token.service.ts`

**功能**：
- 代币创建
- 智能合约部署
- 代币状态查询
- 自动创建商品 SKU

**代码示例**：
```typescript
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ContractDeploymentService } from '../contract/contract-deployment.service'
import { ProductService } from '../product/product.service'
import { Token } from '../../entities/token.entity'

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
    private contractDeploymentService: ContractDeploymentService,
    private productService: ProductService,
  ) {}

  async launchToken(data: TokenLaunchDto): Promise<TokenLaunchResult> {
    // 1. 创建代币记录
    const token = this.tokenRepository.create({
      name: data.name,
      symbol: data.symbol,
      totalSupply: data.totalSupply,
      decimals: data.decimals,
      chain: data.chain,
      status: 'deploying',
      projectId: data.projectId,
    })
    await this.tokenRepository.save(token)

    // 2. 部署智能合约
    const deployment = await this.contractDeploymentService.deployTokenContract({
      name: data.name,
      symbol: data.symbol,
      totalSupply: data.totalSupply,
      decimals: data.decimals,
      chain: data.chain,
    })

    // 3. 更新代币记录
    token.contractAddress = deployment.contractAddress
    token.transactionHash = deployment.transactionHash
    token.status = 'deployed'
    await this.tokenRepository.save(token)

    // 4. 自动创建商品 SKU
    const product = await this.productService.createFromToken(token)

    return {
      tokenId: token.id,
      contractAddress: deployment.contractAddress,
      transactionHash: deployment.transactionHash,
      productId: product.id,
      status: 'deployed',
    }
  }

  async getTokenStatus(tokenId: string): Promise<TokenStatus> {
    const token = await this.tokenRepository.findOne({ where: { id: tokenId } })
    if (!token) throw new NotFoundException('Token not found')

    return {
      status: token.status,
      contractAddress: token.contractAddress,
      transactionHash: token.transactionHash,
      deployedAt: token.deployedAt,
      stats: {
        totalSupply: token.totalSupply,
        sold: token.sold || '0',
        remaining: (BigInt(token.totalSupply) - BigInt(token.sold || '0')).toString(),
        totalRaised: token.totalRaised || '0',
      },
    }
  }

  async buyToken(tokenId: string, amount: number, buyerAddress: string): Promise<TransactionResult> {
    const token = await this.tokenRepository.findOne({ where: { id: tokenId } })
    if (!token) throw new NotFoundException('Token not found')

    // 调用销售合约执行交易
    const result = await this.contractDeploymentService.executeTokenSale({
      contractAddress: token.contractAddress,
      amount,
      buyerAddress,
      chain: token.chain,
    })

    // 更新代币记录
    token.sold = (BigInt(token.sold || '0') + BigInt(amount)).toString()
    await this.tokenRepository.save(token)

    return result
  }
}
```

**工作量**：5 天

#### 5.1.2 新增文件

**文件**：`backend/src/modules/token/token.controller.ts`

**功能**：
- 代币发行 API 端点
- 代币状态查询 API 端点
- 代币购买 API 端点

**代码示例**：
```typescript
import { Controller, Post, Get, Body, Param } from '@nestjs/common'
import { TokenService } from './token.service'
import { Public } from '../auth/decorators/public.decorator'

@Controller('tokens')
export class TokenController {
  constructor(private tokenService: TokenService) {}

  @Post('launch')
  async launchToken(@Body() data: TokenLaunchDto) {
    return this.tokenService.launchToken(data)
  }

  @Get(':id/status')
  async getTokenStatus(@Param('id') id: string) {
    return this.tokenService.getTokenStatus(id)
  }

  @Post(':id/buy')
  async buyToken(
    @Param('id') id: string,
    @Body() data: { amount: number; paymentMethod: string; walletAddress?: string },
  ) {
    return this.tokenService.buyToken(id, data.amount, data.walletAddress)
  }
}
```

**工作量**：1 天

#### 5.1.3 新增文件

**文件**：`backend/src/entities/token.entity.ts`

**功能**：
- 代币实体定义

**代码示例**：
```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export enum TokenStatus {
  DEPLOYING = 'deploying',
  DEPLOYED = 'deployed',
  FAILED = 'failed',
}

@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column()
  symbol: string

  @Column('decimal', { precision: 36, scale: 18 })
  totalSupply: string

  @Column()
  decimals: number

  @Column()
  chain: string

  @Column({ nullable: true })
  contractAddress: string

  @Column({ nullable: true })
  transactionHash: string

  @Column({ type: 'enum', enum: TokenStatus, default: TokenStatus.DEPLOYING })
  status: TokenStatus

  @Column('decimal', { precision: 36, scale: 18, default: '0' })
  sold: string

  @Column('decimal', { precision: 36, scale: 18, default: '0' })
  totalRaised: string

  @Column({ nullable: true })
  projectId: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ nullable: true })
  deployedAt: Date
}
```

**工作量**：1 天

### 5.2 NFT 发行服务

#### 5.2.1 新增文件

**文件**：`backend/src/modules/nft/nft.service.ts`

**功能**：
- NFT 集合创建
- NFT 批量 Mint
- NFT 状态查询
- 自动创建商品 SKU

**代码示例**：
```typescript
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ContractDeploymentService } from '../contract/contract-deployment.service'
import { MetadataStorageService } from '../metadata/metadata-storage.service'
import { ProductService } from '../product/product.service'
import { NFTCollection, NFT } from '../../entities/nft.entity'

@Injectable()
export class NFTService {
  constructor(
    @InjectRepository(NFTCollection)
    private collectionRepository: Repository<NFTCollection>,
    @InjectRepository(NFT)
    private nftRepository: Repository<NFT>,
    private contractDeploymentService: ContractDeploymentService,
    private metadataStorageService: MetadataStorageService,
    private productService: ProductService,
  ) {}

  async createCollection(data: NFTCollectionDto): Promise<NFTCollectionResult> {
    // 1. 创建集合记录
    const collection = this.collectionRepository.create({
      name: data.name,
      description: data.description,
      chain: data.chain,
      standard: data.standard,
      royalty: data.royalty,
      status: 'deploying',
      creatorId: data.creatorId,
    })
    await this.collectionRepository.save(collection)

    // 2. 部署智能合约
    const deployment = await this.contractDeploymentService.deployNFTContract({
      name: data.name,
      symbol: data.name.replace(/\s+/g, ''),
      chain: data.chain,
      standard: data.standard,
      royalty: data.royalty,
      royaltyRecipient: data.creatorId,
    })

    // 3. 更新集合记录
    collection.contractAddress = deployment.contractAddress
    collection.transactionHash = deployment.transactionHash
    collection.status = 'deployed'
    await this.collectionRepository.save(collection)

    return {
      collectionId: collection.id,
      contractAddress: deployment.contractAddress,
      transactionHash: deployment.transactionHash,
      status: 'deployed',
    }
  }

  async mintNFT(collectionId: string, items: NFTMintItem[]): Promise<MintResult> {
    const collection = await this.collectionRepository.findOne({ where: { id: collectionId } })
    if (!collection) throw new NotFoundException('Collection not found')

    const results: MintResultItem[] = []
    let minted = 0
    let failed = 0

    for (const item of items) {
      try {
        // 1. 上传元数据到 IPFS/Arweave
        const metadataURI = await this.metadataStorageService.uploadMetadata({
          name: item.name,
          description: item.description,
          image: item.image,
          attributes: item.attributes,
        }, collection.uploadTo || 'ipfs')

        // 2. Mint NFT
        const mintResult = await this.contractDeploymentService.mintNFT({
          contractAddress: collection.contractAddress,
          to: collection.creatorId,
          tokenURI: metadataURI,
          chain: collection.chain,
        })

        // 3. 创建 NFT 记录
        const nft = this.nftRepository.create({
          collectionId: collection.id,
          tokenId: mintResult.tokenId,
          name: item.name,
          description: item.description,
          image: item.image,
          metadataURI,
          price: item.price,
          status: 'minted',
          creatorId: collection.creatorId,
        })
        await this.nftRepository.save(nft)

        // 4. 自动创建商品 SKU
        const product = await this.productService.createFromNFT(nft)

        results.push({
          tokenId: mintResult.tokenId,
          productId: product.id,
          metadataURI,
          status: 'minted',
          transactionHash: mintResult.transactionHash,
        })

        minted++
      } catch (error) {
        results.push({
          tokenId: null,
          productId: null,
          metadataURI: null,
          status: 'failed',
          error: error.message,
        })
        failed++
      }
    }

    return {
      minted,
      failed,
      nfts: results,
    }
  }
}
```

**工作量**：6 天

#### 5.2.2 新增文件

**文件**：`backend/src/modules/nft/nft.controller.ts`

**功能**：
- NFT 集合创建 API 端点
- NFT Mint API 端点
- NFT 购买 API 端点

**代码示例**：
```typescript
import { Controller, Post, Get, Body, Param, UseInterceptors, UploadedFiles } from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { NFTService } from './nft.service'

@Controller('nfts')
export class NFTController {
  constructor(private nftService: NFTService) {}

  @Post('collections')
  async createCollection(@Body() data: NFTCollectionDto) {
    return this.nftService.createCollection(data)
  }

  @Post('collections/:id/mint')
  @UseInterceptors(FilesInterceptor('files'))
  async mintNFT(
    @Param('id') id: string,
    @Body() data: NFTMintDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // 处理文件上传
    return this.nftService.mintNFT(id, data.items, files)
  }

  @Get('collections/:id/mint-status')
  async getMintStatus(@Param('id') id: string) {
    return this.nftService.getMintStatus(id)
  }

  @Post(':id/buy')
  async buyNFT(
    @Param('id') id: string,
    @Body() data: { paymentMethod: string; walletAddress?: string },
  ) {
    return this.nftService.buyNFT(id, data.walletAddress)
  }
}
```

**工作量**：2 天

#### 5.2.3 新增文件

**文件**：`backend/src/entities/nft.entity.ts`

**功能**：
- NFT 集合实体定义
- NFT 实体定义

**代码示例**：
```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm'

export enum NFTStatus {
  MINTING = 'minting',
  MINTED = 'minted',
  FAILED = 'failed',
}

@Entity('nft_collections')
export class NFTCollection {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column()
  chain: string

  @Column()
  standard: string  // ERC-721, ERC-1155, SPL-NFT

  @Column('decimal', { precision: 5, scale: 2 })
  royalty: number

  @Column({ nullable: true })
  contractAddress: string

  @Column({ nullable: true })
  transactionHash: string

  @Column({ type: 'enum', enum: NFTStatus, default: NFTStatus.MINTING })
  status: NFTStatus

  @Column()
  creatorId: string

  @Column({ default: 'ipfs' })
  uploadTo: string  // ipfs, arweave

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

@Entity('nfts')
export class NFT {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  collectionId: string

  @Column()
  tokenId: string

  @Column()
  name: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column()
  image: string

  @Column()
  metadataURI: string

  @Column('decimal', { precision: 36, scale: 18, nullable: true })
  price: string

  @Column({ type: 'enum', enum: NFTStatus, default: NFTStatus.MINTING })
  status: NFTStatus

  @Column()
  creatorId: string

  @Column({ nullable: true })
  ownerId: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => NFTCollection, collection => collection.id)
  collection: NFTCollection
}
```

**工作量**：2 天

### 5.3 智能合约部署服务

#### 5.3.1 新增文件

**文件**：`backend/src/modules/contract/contract-deployment.service.ts`

**功能**：
- 代币合约部署
- NFT 合约部署
- 销售合约部署
- 合约验证

**代码示例**：
```typescript
import { Injectable } from '@nestjs/common'
import { ethers } from 'ethers'
import * as solanaWeb3 from '@solana/web3.js'

@Injectable()
export class ContractDeploymentService {
  // 部署 ERC-20 代币合约
  async deployTokenContract(config: TokenConfig): Promise<DeploymentResult> {
    if (config.chain === 'ethereum' || config.chain === 'bsc' || config.chain === 'polygon') {
      return this.deployERC20Token(config)
    } else if (config.chain === 'solana') {
      return this.deploySPLToken(config)
    }
  }

  private async deployERC20Token(config: TokenConfig): Promise<DeploymentResult> {
    // 1. 生成合约代码
    const contractCode = this.generateERC20Contract(config)

    // 2. 编译合约
    const compiled = await this.compileContract(contractCode, 'solidity')

    // 3. 部署到链上
    const provider = this.getProvider(config.chain)
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider)
    const factory = new ethers.ContractFactory(
      compiled.abi,
      compiled.bytecode,
      wallet,
    )
    const contract = await factory.deploy(
      config.name,
      config.symbol,
      ethers.parseUnits(config.totalSupply, config.decimals),
    )
    await contract.waitForDeployment()

    // 4. 验证合约
    await this.verifyContract(await contract.getAddress(), contractCode, config.chain)

    return {
      contractAddress: await contract.getAddress(),
      transactionHash: contract.deploymentTransaction()?.hash || '',
      status: 'deployed',
    }
  }

  private async deploySPLToken(config: TokenConfig): Promise<DeploymentResult> {
    // Solana SPL Token 部署逻辑
    // ...
  }

  // 部署 NFT 合约
  async deployNFTContract(config: NFTConfig): Promise<DeploymentResult> {
    if (config.chain === 'ethereum' || config.chain === 'bsc' || config.chain === 'polygon') {
      return this.deployERC721NFT(config)
    } else if (config.chain === 'solana') {
      return this.deploySPLNFT(config)
    }
  }

  // Mint NFT
  async mintNFT(config: MintConfig): Promise<MintResult> {
    // 调用合约 Mint 方法
    // ...
  }

  // 执行代币销售
  async executeTokenSale(config: SaleConfig): Promise<TransactionResult> {
    // 调用销售合约执行交易
    // ...
  }
}
```

**工作量**：8 天

### 5.4 元数据存储服务

#### 5.4.1 新增文件

**文件**：`backend/src/modules/metadata/metadata-storage.service.ts`

**功能**：
- IPFS 集成
- Arweave 集成
- 元数据上传

**代码示例**：
```typescript
import { Injectable } from '@nestjs/common'
import { create } from 'ipfs-http-client'
import Arweave from 'arweave'

@Injectable()
export class MetadataStorageService {
  private ipfsClient
  private arweaveClient

  constructor() {
    // 初始化 IPFS 客户端
    this.ipfsClient = create({
      host: process.env.IPFS_HOST || 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
      headers: {
        authorization: `Basic ${Buffer.from(
          `${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`,
        ).toString('base64')}`,
      },
    })

    // 初始化 Arweave 客户端
    this.arweaveClient = Arweave.init({
      host: 'arweave.net',
      port: 443,
      protocol: 'https',
    })
  }

  async uploadMetadata(metadata: any, storage: 'ipfs' | 'arweave'): Promise<string> {
    if (storage === 'ipfs') {
      return this.uploadToIPFS(metadata)
    } else {
      return this.uploadToArweave(metadata)
    }
  }

  private async uploadToIPFS(metadata: any): Promise<string> {
    const metadataString = JSON.stringify(metadata)
    const result = await this.ipfsClient.add(metadataString)
    return `ipfs://${result.path}`
  }

  private async uploadToArweave(metadata: any): Promise<string> {
    const metadataString = JSON.stringify(metadata)
    const transaction = await this.arweaveClient.createTransaction({
      data: metadataString,
    })
    await this.arweaveClient.transactions.sign(transaction)
    await this.arweaveClient.transactions.post(transaction)
    return `ar://${transaction.id}`
  }

  async uploadFile(file: Buffer, filename: string, storage: 'ipfs' | 'arweave'): Promise<string> {
    if (storage === 'ipfs') {
      const result = await this.ipfsClient.add(file)
      return `ipfs://${result.path}`
    } else {
      const transaction = await this.arweaveClient.createTransaction({
        data: file,
      })
      await this.arweaveClient.transactions.sign(transaction)
      await this.arweaveClient.transactions.post(transaction)
      return `ar://${transaction.id}`
    }
  }
}
```

**工作量**：4 天

### 5.5 Launchpad 服务

#### 5.5.1 新增文件

**文件**：`backend/src/modules/launchpad/launchpad.service.ts`

**功能**：
- 代币预售创建
- NFT 预售创建
- 白名单管理
- 自动分发

**工作量**：5 天

### 5.6 数据库迁移

#### 5.6.1 新增文件

**文件**：`backend/src/migrations/XXXXXX-AddTokenAndNFT.ts`

**功能**：
- 创建 tokens 表
- 创建 nft_collections 表
- 创建 nfts 表
- 创建 presales 表
- 创建 whitelists 表

**工作量**：1 天

### 5.7 资产聚合服务（新增）

| 子系统 | 文件 | 功能点 | 工作量 | 优先级 |
|--------|------|--------|--------|--------|
| AssetIngestorService | `backend/src/modules/marketplace/asset-ingestor.service.ts` (新建) | 解析 token-list、DEX、NFT、RWA、Launchpad 数据源，统一写入 `marketplace_assets` | 6 天 | P0 |
| AssetNormalizer & Scheduler | `backend/src/modules/marketplace/asset-normalizer.service.ts`、`asset-scheduler.ts` (新建) | 定时拉取、去重、归一化、更新价格/流动性指标 | 4 天 | P0 |
| AssetTradingService | `backend/src/modules/marketplace/asset-trading.service.ts` (新建) | 对接 swap/DEX/NFT/RWA API，封装市价/限价/扫地/抢购操作 | 5 天 | P0 |
| AssetSubmissionController | `backend/src/modules/marketplace/asset.controller.ts` (新建) | 项目方/Agent/开发者提交资产、配置返佣、审核流程 | 4 天 | P1 |
| AssetReferralService | `backend/src/modules/marketplace/asset-referral.service.ts` (新建) | 记录上架者、计算返佣、与 0.5% 商户分成联动 | 3 天 | P1 |
| AssetInsightsService | `backend/src/modules/marketplace/asset-insights.service.ts` (新建) | 调用 AI/数据源生成描述、风险评级、策略建议 | 5 天 | P2 |
| 数据库迁移 | `backend/src/migrations/XXXXXX-AddMarketplaceAssets.ts` (新建) | `marketplace_assets`、`asset_sources`、`asset_referrals`、`asset_insights` 表结构 | 2 天 | P0 |

### 5.8 后端开发总结

| 任务 | 文件 | 工作量 | 优先级 |
|------|------|--------|--------|
| 代币发行服务 | `token.service.ts` (新建) | 5 天 | P0 |
| 代币控制器 | `token.controller.ts` (新建) | 1 天 | P0 |
| 代币实体 | `token.entity.ts` (新建) | 1 天 | P0 |
| NFT 发行服务 | `nft.service.ts` (新建) | 6 天 | P0 |
| NFT 控制器 | `nft.controller.ts` (新建) | 2 天 | P0 |
| NFT 实体 | `nft.entity.ts` (新建) | 2 天 | P0 |
| 智能合约部署服务 | `contract-deployment.service.ts` (新建) | 8 天 | P0 |
| 元数据存储服务 | `metadata-storage.service.ts` (新建) | 4 天 | P0 |
| Launchpad 服务 | `launchpad.service.ts` (新建) | 5 天 | P1 |
| 资产聚合服务 | `asset-*.service.ts` (新建) | 17 天 | P0/P1 |
| 数据库迁移 | `AddTokenAndNFT.ts`、`AddMarketplaceAssets.ts` | 3 天 | P0 |

**总工作量**：55 天

---

## 6. 智能合约开发内容

### 6.1 ERC-20 代币合约

#### 6.1.1 新增文件

**文件**：`contracts/contracts/ERC20Token.sol`

**功能**：
- 标准 ERC-20 代币实现
- 可配置的总供应量
- 可配置的精度

**代码示例**：
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PayMindToken is ERC20, Ownable {
    uint256 public constant TOTAL_SUPPLY = 1000000 * 10**18;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, totalSupply);
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
```

**工作量**：2 天

### 6.2 ERC-721 NFT 合约

#### 6.2.1 新增文件

**文件**：`contracts/contracts/ERC721NFT.sol`

**功能**：
- 标准 ERC-721 NFT 实现
- 版税支持
- Mint 功能

**代码示例**：
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PayMindNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    uint256 public royaltyPercentage;  // 基点（如 1000 = 10%）
    address public royaltyRecipient;
    
    mapping(uint256 => string) private _tokenURIs;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 _royaltyPercentage,
        address _royaltyRecipient
    ) ERC721(name, symbol) {
        royaltyPercentage = _royaltyPercentage;
        royaltyRecipient = _royaltyRecipient;
    }
    
    function mint(address to, string memory tokenURI) external onlyOwner returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        return newTokenId;
    }
    
    function _setTokenURI(uint256 tokenId, string memory tokenURI) internal {
        _tokenURIs[tokenId] = tokenURI;
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return _tokenURIs[tokenId];
    }
}
```

**工作量**：2 天

### 6.3 代币销售合约

#### 6.3.1 新增文件

**文件**：`contracts/contracts/TokenSale.sol`

**功能**：
- 代币直接销售
- 价格管理
- 白名单支持

**代码示例**：
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenSale is Ownable {
    IERC20 public token;
    IERC20 public paymentToken;  // USDC/USDT
    address public seller;
    uint256 public price;         // 代币价格
    uint256 public totalSupply;   // 总供应量
    uint256 public sold;           // 已售数量
    bool public isActive;
    
    mapping(address => bool) public whitelist;
    bool public hasWhitelist;
    
    event TokensPurchased(address buyer, uint256 amount, uint256 payment);
    
    constructor(
        address _token,
        address _paymentToken,
        address _seller,
        uint256 _price,
        uint256 _totalSupply
    ) {
        token = IERC20(_token);
        paymentToken = IERC20(_paymentToken);
        seller = _seller;
        price = _price;
        totalSupply = _totalSupply;
        isActive = true;
    }
    
    function buy(uint256 tokenAmount) external {
        require(isActive, "Sale not active");
        require(sold + tokenAmount <= totalSupply, "Insufficient supply");
        
        if (hasWhitelist) {
            require(whitelist[msg.sender], "Not whitelisted");
        }
        
        uint256 payment = tokenAmount * price / 10**18;
        paymentToken.transferFrom(msg.sender, seller, payment);
        token.transfer(msg.sender, tokenAmount);
        
        sold += tokenAmount;
        
        emit TokensPurchased(msg.sender, tokenAmount, payment);
    }
    
    function setPrice(uint256 newPrice) external onlyOwner {
        price = newPrice;
    }
    
    function setActive(bool active) external onlyOwner {
        isActive = active;
    }
    
    function addToWhitelist(address[] memory addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = true;
        }
        hasWhitelist = true;
    }
}
```

**工作量**：2 天

### 6.4 NFT 销售合约

#### 6.4.1 新增文件

**文件**：`contracts/contracts/NFTSale.sol`

**功能**：
- NFT 直接销售
- 版税自动分配
- 价格管理

**代码示例**：
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract NFTSale {
    IERC721 public nft;
    IERC20 public paymentToken;  // USDC/USDT
    address public creator;
    uint256 public royalty;       // 版税比例（基点，如 1000 = 10%）
    
    mapping(uint256 => uint256) public prices;  // tokenId => price
    mapping(uint256 => bool) public listed;     // tokenId => isListed
    
    event NFTPurchased(uint256 tokenId, address buyer, uint256 price, uint256 royalty);
    
    constructor(
        address _nft,
        address _paymentToken,
        address _creator,
        uint256 _royalty
    ) {
        nft = IERC721(_nft);
        paymentToken = IERC20(_paymentToken);
        creator = _creator;
        royalty = _royalty;
    }
    
    function buy(uint256 tokenId) external {
        require(listed[tokenId], "Not listed");
        uint256 price = prices[tokenId];
        
        // 计算版税
        uint256 royaltyAmount = price * royalty / 10000;
        uint256 sellerAmount = price - royaltyAmount;
        
        address seller = nft.ownerOf(tokenId);
        
        // 支付
        paymentToken.transferFrom(msg.sender, creator, royaltyAmount);
        paymentToken.transferFrom(msg.sender, seller, sellerAmount);
        
        // 转移 NFT
        nft.transferFrom(seller, msg.sender, tokenId);
        
        listed[tokenId] = false;
        
        emit NFTPurchased(tokenId, msg.sender, price, royaltyAmount);
    }
    
    function list(uint256 tokenId, uint256 price) external {
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");
        prices[tokenId] = price;
        listed[tokenId] = true;
    }
    
    function delist(uint256 tokenId) external {
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");
        listed[tokenId] = false;
    }
}
```

**工作量**：2 天

### 6.5 合约测试

#### 6.5.1 新增文件

**文件**：`contracts/test/TokenSale.test.ts`

**功能**：
- 代币销售合约测试
- NFT 销售合约测试

**工作量**：3 天

### 6.6 智能合约开发总结

| 任务 | 文件 | 工作量 | 优先级 |
|------|------|--------|--------|
| ERC-20 代币合约 | `ERC20Token.sol` (新建) | 2 天 | P0 |
| ERC-721 NFT 合约 | `ERC721NFT.sol` (新建) | 2 天 | P0 |
| 代币销售合约 | `TokenSale.sol` (新建) | 2 天 | P0 |
| NFT 销售合约 | `NFTSale.sol` (新建) | 2 天 | P0 |
| 合约测试 | `TokenSale.test.ts` (新建) | 3 天 | P0 |

**总工作量**：11 天

---

## 7. 开发计划

### 7.1 Phase 1：核心功能开发（0-6周）

#### Week 1-2：基础设施搭建
- ✅ 数据库设计和迁移
- ✅ 智能合约开发
- ✅ 合约部署服务框架

#### Week 3-4：后端核心服务
- ✅ 代币发行服务
- ✅ NFT 发行服务
- ✅ 元数据存储服务

#### Week 5-6：前端集成
- ✅ Agent 意图识别增强
- ✅ 文件上传支持
- ✅ Agent 对话引导

**里程碑**：代币和 NFT 可以通过 Agent 发行

### 7.2 Phase 2：直接交易功能（6-10周）

#### Week 7-8：销售合约和交易服务
- ✅ 代币销售合约
- ✅ NFT 销售合约
- ✅ 交易服务实现

#### Week 9-10：前端交易界面
- ✅ 代币购买界面
- ✅ NFT 购买界面
- ✅ 交易确认流程

**里程碑**：代币和 NFT 可以直接交易

### 7.3 Phase 3：Launchpad 功能（10-12周）

#### Week 11-12：Launchpad 服务
- ✅ 预售功能
- ✅ 白名单管理
- ✅ 自动分发

**里程碑**：支持代币和 NFT 预售

### 7.4 Phase 4：测试和优化（12-14周）

#### Week 13-14：测试和优化
- ✅ 单元测试
- ✅ 集成测试
- ✅ 性能优化
- ✅ Bug 修复

**里程碑**：所有功能测试通过，准备上线

---

## 8. 交付物清单

### 8.1 前端交付物

| 交付物 | 文件路径 | 状态 |
|--------|----------|------|
| Agent 意图识别增强 | `paymindfrontend/components/agent/AgentChatEnhanced.tsx` | ⏳ |
| 文件上传组件 | `paymindfrontend/components/agent/FileUpload.tsx` | ⏳ |
| 代币信息卡片 | `paymindfrontend/components/agent/StructuredMessageCard.tsx` | ⏳ |
| NFT 信息卡片 | `paymindfrontend/components/agent/StructuredMessageCard.tsx` | ⏳ |
| 代币 API 客户端 | `paymindfrontend/lib/api/token.api.ts` | ⏳ |
| NFT API 客户端 | `paymindfrontend/lib/api/nft.api.ts` | ⏳ |

### 8.2 后端交付物

| 交付物 | 文件路径 | 状态 |
|--------|----------|------|
| 代币发行服务 | `backend/src/modules/token/token.service.ts` | ⏳ |
| 代币控制器 | `backend/src/modules/token/token.controller.ts` | ⏳ |
| 代币实体 | `backend/src/entities/token.entity.ts` | ⏳ |
| NFT 发行服务 | `backend/src/modules/nft/nft.service.ts` | ⏳ |
| NFT 控制器 | `backend/src/modules/nft/nft.controller.ts` | ⏳ |
| NFT 实体 | `backend/src/entities/nft.entity.ts` | ⏳ |
| 智能合约部署服务 | `backend/src/modules/contract/contract-deployment.service.ts` | ⏳ |
| 元数据存储服务 | `backend/src/modules/metadata/metadata-storage.service.ts` | ⏳ |
| Launchpad 服务 | `backend/src/modules/launchpad/launchpad.service.ts` | ⏳ |
| 数据库迁移 | `backend/src/migrations/XXXXXX-AddTokenAndNFT.ts` | ⏳ |

### 8.3 智能合约交付物

| 交付物 | 文件路径 | 状态 |
|--------|----------|------|
| ERC-20 代币合约 | `contracts/contracts/ERC20Token.sol` | ⏳ |
| ERC-721 NFT 合约 | `contracts/contracts/ERC721NFT.sol` | ⏳ |
| 代币销售合约 | `contracts/contracts/TokenSale.sol` | ⏳ |
| NFT 销售合约 | `contracts/contracts/NFTSale.sol` | ⏳ |
| 合约测试 | `contracts/test/TokenSale.test.ts` | ⏳ |

### 8.4 文档交付物

| 交付物 | 文件路径 | 状态 |
|--------|----------|------|
| API 文档 | `docs/api/token-api.md` | ⏳ |
| API 文档 | `docs/api/nft-api.md` | ⏳ |
| 智能合约文档 | `docs/contracts/README.md` | ⏳ |
| 部署文档 | `docs/deployment/README.md` | ⏳ |

---

## 9. 总结

### 9.1 开发工作量统计

| 模块 | 工作量 | 优先级 |
|------|--------|--------|
| 前端开发 | 17 天 | P0 |
| 后端开发 | 35 天 | P0 |
| 智能合约开发 | 11 天 | P0 |
| **总计** | **63 天** | - |

### 9.2 关键里程碑

1. **Week 6**：代币和 NFT 可以通过 Agent 发行
2. **Week 10**：代币和 NFT 可以直接交易
3. **Week 12**：支持代币和 NFT 预售
4. **Week 14**：所有功能测试通过，准备上线

### 9.3 风险与应对

#### 风险1：智能合约部署失败
- **应对**：完善的错误处理和重试机制
- **应对**：测试网充分测试

#### 风险2：IPFS/Arweave 上传失败
- **应对**：多存储方案支持
- **应对**：本地备份机制

#### 风险3：Agent 意图识别不准确
- **应对**：完善的引导流程
- **应对**：错误提示和重试机制

---

**文档版本**：V3.0  
**最后更新**：2025年1月

---

*本文档详细说明了 PayMind V3.0 的技术开发内容，包括前端、后端、智能合约的开发任务、工作量和交付物。*

