# 商户对接SDK与商品上传指南

**日期**: 2025-11-26  
**版本**: V2.2

---

## 📋 商户对接流程

### 1. 注册商户账号

商户需要：
1. 访问 PayMind 商户后台
2. 注册/登录商户账号
3. 完成 KYC 认证（如果需要）
4. 获取 API Key

### 2. 安装SDK

#### JavaScript/TypeScript
```bash
npm install @paymind/sdk
```

#### Python
```bash
pip install paymind-sdk
```

### 3. 初始化SDK

```typescript
import { PayMind } from '@paymind/sdk';

const paymind = new PayMind({
  apiKey: 'your-api-key-here',
  baseUrl: 'https://api.paymind.com/api', // 可选，默认生产环境
});
```

---

## 🎁 商户使用SDK后获得什么？

### 1. 商品管理功能 ✅

#### 创建商品
```typescript
const product = await paymind.merchants.createProduct({
  name: 'Nike Air Max 2024',
  description: 'Premium running shoes with advanced cushioning',
  price: 120,
  currency: 'USD',
  category: 'sports',
  stock: 100,
  availableToAgents: true, // ✅ 关键：上传到Marketplace
  commissionRate: 10, // 10% 分润给Agent
  productType: 'physical', // 商品类型
});
```

#### 商品管理
- ✅ `createProduct()` - 创建商品
- ✅ `getProduct()` - 获取商品详情
- ✅ `listProducts()` - 列出所有商品
- ✅ `updateProduct()` - 更新商品信息
- ✅ `deleteProduct()` - 删除商品

### 2. 订单管理功能 ✅

#### 订单查询
```typescript
// 获取订单列表
const orders = await paymind.merchants.listOrders({
  page: 1,
  limit: 20,
  status: 'completed',
});

// 获取订单详情
const order = await paymind.merchants.getOrder(orderId);
```

#### 订单管理
- ✅ `getOrder()` - 获取订单详情
- ✅ `listOrders()` - 列出所有订单
- ✅ 订单状态跟踪
- ✅ 订单支付状态查询

### 3. 支付集成功能 ✅

#### 创建支付
```typescript
const payment = await paymind.payments.create({
  amount: 120,
  currency: 'USD',
  description: 'Purchase: Nike Air Max 2024',
  merchantId: 'your-merchant-id',
  metadata: {
    productId: product.id,
    orderId: 'order-123',
  },
});
```

#### 支付功能
- ✅ 创建支付意图
- ✅ 查询支付状态
- ✅ 支付回调处理
- ✅ 退款处理

### 4. Marketplace集成功能 ✅

#### 上传商品到Marketplace
```typescript
// 通过 availableToAgents: true 参数上传到Marketplace
const product = await paymind.merchants.createProduct({
  name: 'Premium Service',
  price: 99.99,
  availableToAgents: true, // ✅ 关键参数
  commissionRate: 10,
});
```

**自动处理**：
1. ✅ 商品存储到数据库
2. ✅ 生成 embedding（标题 + 描述）
3. ✅ 索引到向量数据库（支持语义搜索）
4. ✅ 同步到 Marketplace Catalog
5. ✅ 可供 AI Agent 检索和推荐

---

## 📦 商品上传到Marketplace流程

### 方式1: 通过SDK上传（推荐）✅

```typescript
import { PayMind } from '@paymind/sdk';

const paymind = new PayMind({
  apiKey: 'your-api-key',
});

// 创建商品并上传到Marketplace
const product = await paymind.merchants.createProduct({
  name: 'Nike Air Max 2024',
  description: 'Premium running shoes...',
  price: 120,
  currency: 'USD',
  category: 'sports',
  stock: 100,
  availableToAgents: true, // ✅ 关键：上传到Marketplace
  commissionRate: 10, // 10% 分润给Agent
  productType: 'physical', // 商品类型
  metadata: {
    image: 'https://example.com/image.jpg',
    attributes: {
      size: ['S', 'M', 'L'],
      color: ['Black', 'White'],
    },
  },
});

console.log('商品已上传到Marketplace:', product.id);
```

### 方式2: 通过Marketplace资源类上传

```typescript
// 使用Marketplace资源类
const product = await paymind.marketplace.createProduct({
  name: 'Digital Service',
  description: 'Premium digital service',
  price: 99.99,
  stock: 1000,
  category: 'digital',
  productType: 'service',
  commissionRate: 5,
  currency: 'USD',
});
```

### 后端自动处理流程

当商户通过SDK创建商品并设置 `availableToAgents: true` 时，后端会自动：

1. **存储商品** → 保存到数据库
2. **生成Embedding** → 使用商品标题和描述生成向量
3. **索引到向量库** → 支持语义搜索
4. **同步到Marketplace** → 可供AI Agent检索

---

## 🏷️ 商品类型支持

### 支持的SKU类型

PayMind支持以下商品类型：

| 类型 | 枚举值 | 说明 | 示例 |
|------|--------|------|------|
| **实物商品** | `physical` | 实体商品，需要物流配送 | 鞋子、衣服、电子产品 |
| **服务** | `service` | 虚拟服务，无需物流 | 咨询、课程、订阅服务 |
| **NFT** | `nft` | 非同质化代币（链上资产） | 数字艺术品、收藏品 |
| **FT** | `ft` | 同质化代币（链上资产） | 代币、积分 |
| **游戏资产** | `game_asset` | 游戏内资产（链上/链下） | 游戏道具、装备 |
| **RWA** | `rwa` | 现实世界资产代币化 | 房地产代币、商品代币 |

### 商品类型定义

```typescript
enum ProductType {
  PHYSICAL = 'physical',      // 实物商品
  SERVICE = 'service',        // 服务
  NFT = 'nft',               // NFT（链上资产）
  FT = 'ft',                 // 同质化代币（链上资产）
  GAME_ASSET = 'game_asset', // 游戏资产
  RWA = 'rwa',               // 现实世界资产
}
```

### 使用示例

#### 1. 实物商品
```typescript
const product = await paymind.merchants.createProduct({
  name: 'Nike Air Max 2024',
  price: 120,
  productType: 'physical', // ✅ 实物商品
  metadata: {
    shipping: 'Worldwide',
    deliveryTime: '7-14 days',
  },
});
```

#### 2. 服务
```typescript
const product = await paymind.merchants.createProduct({
  name: 'Premium Consulting Service',
  price: 500,
  productType: 'service', // ✅ 服务
  metadata: {
    duration: '1 hour',
    format: 'online',
  },
});
```

#### 3. NFT（链上资产）
```typescript
const product = await paymind.merchants.createProduct({
  name: 'Digital Art NFT #123',
  price: 0.5, // ETH价格
  productType: 'nft', // ✅ NFT
  metadata: {
    contractAddress: '0x...',
    tokenId: '123',
    chain: 'ethereum',
    image: 'https://...',
  },
});
```

#### 4. 同质化代币（FT）
```typescript
const product = await paymind.merchants.createProduct({
  name: 'Premium Token',
  price: 10,
  productType: 'ft', // ✅ 同质化代币
  metadata: {
    contractAddress: '0x...',
    chain: 'bsc',
    decimals: 18,
  },
});
```

#### 5. 游戏资产
```typescript
const product = await paymind.merchants.createProduct({
  name: 'Legendary Sword',
  price: 50,
  productType: 'game_asset', // ✅ 游戏资产
  metadata: {
    game: 'Fantasy RPG',
    rarity: 'legendary',
    attributes: {
      attack: 100,
      defense: 80,
    },
  },
});
```

#### 6. 现实世界资产（RWA）
```typescript
const product = await paymind.merchants.createProduct({
  name: 'Real Estate Token',
  price: 10000,
  productType: 'rwa', // ✅ 现实世界资产
  metadata: {
    assetType: 'real_estate',
    location: 'New York',
    tokenizedValue: 1000000,
  },
});
```

---

## 🔄 完整商品上传流程

### 步骤1: 商户创建商品

```typescript
const product = await paymind.merchants.createProduct({
  name: 'Product Name',
  description: 'Product description',
  price: 99.99,
  currency: 'USD',
  category: 'electronics',
  stock: 100,
  availableToAgents: true, // ✅ 上传到Marketplace
  commissionRate: 10, // 10% 分润
  productType: 'physical', // 商品类型
  metadata: {
    image: 'https://example.com/image.jpg',
    attributes: {
      brand: 'Brand Name',
      model: 'Model Number',
    },
  },
});
```

### 步骤2: 后端自动处理

1. **存储商品** → `Product` 实体保存到数据库
2. **生成Embedding** → 使用 `SearchService.indexProduct()` 生成向量
3. **索引到向量库** → 支持语义搜索
4. **同步到Marketplace** → 可供AI Agent检索

### 步骤3: AI Agent检索

```typescript
// Agent可以语义搜索商品
const results = await paymind.agents.searchProducts(
  '适合跑步的鞋子，不要超过150美元',
  {
    priceMax: 150,
    currency: 'USD',
    inStock: true,
  }
);
```

### 步骤4: 用户购买

```typescript
// Agent创建订单
const order = await paymind.agents.createOrder({
  productId: product.id,
  userId: 'user-123',
  quantity: 1,
});

// 用户支付
const payment = await paymind.payments.create({
  amount: product.price,
  currency: product.currency,
  description: `Purchase: ${product.name}`,
  metadata: {
    productId: product.id,
    orderId: order.id,
  },
});
```

---

## 📊 商品类型与支付流程

### 不同商品类型的支付流程

#### 1. 实物商品（Physical）
```
用户支付 → 资金托管（Escrow） → 商户发货 → 用户确认收货 → 自动分账
```

#### 2. 服务（Service）⚠️ 重要：延迟分账（按Commission合约规则）
```
用户支付 → 资金托管 → 服务开始 → 服务完成 → 设置settlementTime(T+1/T+3) → 等待结算时间 → 调用分账 → 商户收到款项
```
**Commission合约规则**：
- ✅ 服务完成后，通过`setSplitConfig`设置`settlementTime`（服务完成时间 + T+1或T+3）
- ✅ `_autoSplit`函数会检查：`block.timestamp >= config.settlementTime`
- ✅ 如果`settlementTime = 0`，则即时结算；如果`settlementTime > 0`，必须等待到该时间才能分账
- ✅ 支持叫停机制：通过`setDisputeStatus`设置`isDisputed=true`，`_autoSplit`会revert
- ⚠️ **不是立即分账**，需要等待服务完成和结算周期

#### 3. NFT/FT（链上资产）⚠️ 重要：先转移资产再分账（按Commission合约规则）
```
用户支付 → 资金托管 → 链上资产转移（NFT/代币） → 资产转移成功 → 设置settlementTime=0 → 调用分账 → 完成
```
**Commission合约规则**：
- ✅ **先转移资产，再分账**（资产转移在后端执行，不在合约中）
- ✅ 资产转移成功后，通过`setSplitConfig`设置`settlementTime = 0`（即时结算）
- ✅ 然后调用`quickPaySplit`或`walletSplit`触发`_autoSplit`分账
- ✅ 如果资产转移失败，不设置分账配置，不进行分账（可退款）
- ⚠️ **顺序很重要**：资产转移（后端） → 设置settlementTime=0 → 调用分账（合约）

#### 4. 游戏资产（Game Asset）⚠️ 重要：先发放资产再分账（按Commission合约规则）
```
用户支付 → 资金托管 → 游戏内资产发放 → 发放成功 → 设置settlementTime=0 → 调用分账 → 完成
```
**Commission合约规则**：
- ✅ **先发放游戏资产，再分账**（资产发放在后端执行）
- ✅ 资产发放成功后，通过`setSplitConfig`设置`settlementTime = 0`（即时结算）
- ✅ 然后调用分账函数触发`_autoSplit`分账
- ✅ 如果发放失败，不设置分账配置，不进行分账（可退款）

#### 5. RWA（现实世界资产）⚠️ 重要：先转移代币再分账（按Commission合约规则）
```
用户支付 → 资金托管 → 资产代币转移 → 转移成功 → 设置settlementTime=0 → 调用分账 → 完成
```
**Commission合约规则**：
- ✅ **先转移RWA代币，再分账**（代币转移在后端执行）
- ✅ 代币转移成功后，通过`setSplitConfig`设置`settlementTime = 0`（即时结算）
- ✅ 然后调用分账函数触发`_autoSplit`分账
- ✅ 如果转移失败，不设置分账配置，不进行分账（可退款）

---

## ⚙️ Commission合约分账规则说明

### 核心规则（基于Commission.sol合约）

#### 1. settlementTime（结算时间）
- **`settlementTime = 0`**：即时结算，资产转移后立即分账
- **`settlementTime > 0`**：延迟结算，必须等待到该时间戳才能分账
- **服务类商品**：`settlementTime = 服务完成时间戳 + (T+1: 1天 或 T+3: 3天)`
- **链上资产**：`settlementTime = 0`（资产转移后立即分账）

#### 2. isDisputed（叫停机制）
- **`isDisputed = false`**：正常状态，可以分账
- **`isDisputed = true`**：争议状态，`_autoSplit`函数会revert，阻止分账
- 通过`setDisputeStatus(orderId, true)`设置争议状态

#### 3. 分账流程
```
1. 用户支付 → 资金进入合约（通过quickPaySplit/walletSplit/providerFiatToCryptoSplit）
2. 设置分账配置 → setSplitConfig(orderId, config)
   - 服务类：设置settlementTime（T+1或T+3）
   - 链上资产：先转移资产，然后设置settlementTime=0
3. 等待结算时间 → block.timestamp >= settlementTime
4. 调用分账函数 → 触发_autoSplit自动分账
```

#### 4. _autoSplit函数检查
```solidity
// 检查争议状态
require(!config.isDisputed, "Order is disputed");

// 检查结算时间
if (config.settlementTime > 0) {
    require(block.timestamp >= config.settlementTime, "Settlement time not reached");
}
```

#### 5. 链上资产转移顺序
- ✅ **先转移资产**（在后端执行，不在合约中）
- ✅ **再设置分账配置**（settlementTime=0）
- ✅ **最后调用分账**（触发_autoSplit）

---

## 🎯 SDK功能总结

### 商户获得的核心功能

| 功能模块 | 功能描述 | SDK方法 |
|---------|---------|---------|
| **商品管理** | 创建、查询、更新、删除商品 | `merchants.createProduct()`, `merchants.getProduct()`, `merchants.listProducts()`, `merchants.updateProduct()`, `merchants.deleteProduct()` |
| **订单管理** | 查询订单、跟踪订单状态 | `merchants.getOrder()`, `merchants.listOrders()` |
| **支付集成** | 创建支付、查询支付状态 | `payments.create()`, `payments.get()` |
| **Marketplace** | 上传商品到Marketplace，供Agent检索 | `merchants.createProduct({ availableToAgents: true })` |
| **Webhook** | 接收支付和订单事件 | Webhook配置 |

### 商品上传到Marketplace的关键参数

```typescript
{
  availableToAgents: true,  // ✅ 必须：上传到Marketplace
  commissionRate: 10,        // ✅ 推荐：设置Agent分润率（%）
  productType: 'physical',   // ✅ 必须：商品类型
  name: 'Product Name',      // ✅ 必须：商品名称
  description: '...',        // ✅ 推荐：详细描述（用于语义搜索）
  price: 99.99,              // ✅ 必须：价格
  currency: 'USD',            // ✅ 必须：货币
  category: 'electronics',    // ✅ 必须：分类
  stock: 100,                // ✅ 必须：库存
}
```

---

## 🔍 商品类型详细说明

### 1. 实物商品（Physical）

**特点**：
- 需要物流配送
- 支持托管支付（Escrow）
- 需要确认收货流程

**metadata示例**：
```typescript
{
  shipping: 'Worldwide',
  deliveryTime: '7-14 days',
  weight: '1.5kg',
  dimensions: '30x20x10cm',
}
```

### 2. 服务（Service）⚠️ 重要：延迟分账机制（按Commission合约规则）

**特点**：
- 无需物流
- 需要服务完成确认
- 支持订阅模式
- **延迟分账**：服务完成后T+1或T+3才分账给商户

**Commission合约分账规则**：
- ✅ 用户支付后，资金先托管在合约中（通过`quickPaySplit`/`walletSplit`接收）
- ✅ 商户提供服务，用户确认服务完成
- ✅ 服务完成后，通过`setSplitConfig`设置`settlementTime`：
  - `settlementTime = 服务完成时间戳 + (T+1: 1天 或 T+3: 3天)`
  - 例如：`settlementTime = block.timestamp + 1 days`（T+1）
- ✅ 结算周期到期后（`block.timestamp >= settlementTime`），调用分账函数触发`_autoSplit`
- ✅ 支持叫停机制：通过`setDisputeStatus(orderId, true)`设置`isDisputed=true`，`_autoSplit`会revert阻止分账

**metadata示例**：
```typescript
{
  duration: '1 hour',
  format: 'online',
  schedule: 'flexible',
  settlementPeriod: 'T+1', // 或 'T+3'，服务完成后的结算周期
  // 后端会根据此值计算settlementTime
}
```

### 3. NFT（链上资产）⚠️ 重要：先转移资产再分账（按Commission合约规则）

**特点**：
- 链上资产
- 需要合约地址和Token ID
- 支持多链（Ethereum, BSC, Polygon等）
- **先转移资产，再分账**（不是先分账再转移）

**Commission合约分账规则**：
- ✅ 用户支付后，资金先托管在合约中（通过`quickPaySplit`/`walletSplit`接收）
- ✅ **先执行NFT转移**（在后端执行，从商户转移到用户）
- ✅ NFT转移成功后，通过`setSplitConfig`设置`settlementTime = 0`（即时结算）
- ✅ 然后调用分账函数触发`_autoSplit`分账
- ✅ 如果NFT转移失败，不设置分账配置，不进行分账（可退款）
- ✅ 支持叫停机制：通过`setDisputeStatus(orderId, true)`设置`isDisputed=true`，阻止分账

**metadata示例**：
```typescript
{
  contractAddress: '0x...',
  tokenId: '123',
  chain: 'ethereum',
  standard: 'ERC721',
  image: 'https://...',
  attributes: {
    rarity: 'legendary',
    collection: 'Collection Name',
  },
  // 重要：资产转移配置
  transferBeforeSplit: true, // 先转移资产再分账
  settlementTime: 0, // 即时结算（资产转移后立即分账）
}
```

### 4. FT（同质化代币）⚠️ 重要：先转移代币再分账（按Commission合约规则）

**特点**：
- 链上代币
- 支持批量购买
- 需要合约地址
- **先转移代币，再分账**（不是先分账再转移）

**Commission合约分账规则**：
- ✅ 用户支付后，资金先托管在合约中（通过`quickPaySplit`/`walletSplit`接收）
- ✅ **先执行代币转移**（在后端执行，从商户转移到用户）
- ✅ 代币转移成功后，通过`setSplitConfig`设置`settlementTime = 0`（即时结算）
- ✅ 然后调用分账函数触发`_autoSplit`分账
- ✅ 如果代币转移失败，不设置分账配置，不进行分账（可退款）

**metadata示例**：
```typescript
{
  contractAddress: '0x...',
  chain: 'bsc',
  standard: 'ERC20',
  decimals: 18,
  symbol: 'TOKEN',
  amount: '1000', // 代币数量
  // 重要：资产转移配置
  transferBeforeSplit: true, // 先转移代币再分账
  settlementTime: 0, // 即时结算（代币转移后立即分账）
}
```

### 5. 游戏资产（Game Asset）⚠️ 重要：先发放资产再分账（按Commission合约规则）

**特点**：
- 可以是链上或链下资产
- 支持游戏内属性
- 可能需要游戏内发放
- **先发放资产，再分账**（不是先分账再发放）

**Commission合约分账规则**：
- ✅ 用户支付后，资金先托管在合约中（通过`quickPaySplit`/`walletSplit`接收）
- ✅ **先执行游戏资产发放**（在后端执行，通过游戏API或链上转移）
- ✅ 资产发放成功后，通过`setSplitConfig`设置`settlementTime = 0`（即时结算）
- ✅ 然后调用分账函数触发`_autoSplit`分账
- ✅ 如果资产发放失败，不设置分账配置，不进行分账（可退款）

**metadata示例**：
```typescript
{
  game: 'Fantasy RPG',
  rarity: 'legendary',
  attributes: {
    attack: 100,
    defense: 80,
    level: 50,
  },
  chain: 'polygon', // 如果是链上资产
  // 重要：资产发放配置
  transferBeforeSplit: true, // 先发放资产再分账
  settlementTime: 0, // 即时结算（资产发放后立即分账）
}
```

### 6. RWA（现实世界资产）

**特点**：
- 现实世界资产代币化
- 需要合规性验证
- 支持资产证明

**metadata示例**：
```typescript
{
  assetType: 'real_estate',
  location: 'New York',
  tokenizedValue: 1000000,
  legalDocument: 'https://...',
}
```

---

## ✅ 商品类型支持总结

### 完全支持 ✅

- ✅ **实物商品** (`physical`) - 完全支持
- ✅ **服务** (`service`) - 完全支持
- ✅ **NFT** (`nft`) - 完全支持（链上资产）
- ✅ **FT** (`ft`) - 完全支持（同质化代币）
- ✅ **游戏资产** (`game_asset`) - 完全支持
- ✅ **RWA** (`rwa`) - 完全支持（现实世界资产）

### 支付流程支持

所有商品类型都支持：
- ✅ QuickPay支付（X402 Session）
- ✅ 钱包转账支付
- ✅ Provider支付（法币转数字货币）
- ✅ 自动分账功能

### 特殊处理

不同商品类型可能有不同的处理逻辑：
- **实物商品**: 支持托管支付（Escrow）
- **服务**: 即时交付，无需托管
- **链上资产**: 需要链上资产转移
- **游戏资产**: 可能需要游戏内发放

---

## 📝 使用示例

### 完整示例：上传实物商品到Marketplace

```typescript
import { PayMind } from '@paymind/sdk';

const paymind = new PayMind({
  apiKey: 'your-api-key',
});

// 1. 创建实物商品
const product = await paymind.merchants.createProduct({
  name: 'Nike Air Max 2024',
  description: 'Premium running shoes with advanced cushioning technology',
  price: 120,
  currency: 'USD',
  category: 'sports',
  stock: 100,
  availableToAgents: true, // ✅ 上传到Marketplace
  commissionRate: 10, // 10% 分润给Agent
  productType: 'physical', // ✅ 实物商品
  metadata: {
    image: 'https://example.com/nike-air-max.jpg',
    attributes: {
      brand: 'Nike',
      model: 'Air Max 2024',
      size: ['US 7', 'US 8', 'US 9', 'US 10'],
      color: ['Black', 'White', 'Red'],
    },
    shipping: {
      worldwide: true,
      deliveryTime: '7-14 days',
      freeShipping: false,
    },
  },
});

console.log('✅ 商品已上传到Marketplace:', product.id);
```

### 完整示例：上传NFT到Marketplace

```typescript
// 创建NFT商品
const nftProduct = await paymind.merchants.createProduct({
  name: 'Digital Art NFT #123',
  description: 'Unique digital artwork created by famous artist',
  price: 0.5, // ETH价格
  currency: 'ETH',
  category: 'art',
  stock: 1, // NFT通常是唯一的
  availableToAgents: true, // ✅ 上传到Marketplace
  commissionRate: 5, // 5% 分润
  productType: 'nft', // ✅ NFT类型
  metadata: {
    contractAddress: '0x1234567890abcdef...',
    tokenId: '123',
    chain: 'ethereum',
    standard: 'ERC721',
    image: 'https://example.com/nft-image.jpg',
    attributes: {
      rarity: 'legendary',
      collection: 'Digital Art Collection',
      artist: 'Artist Name',
    },
  },
});
```

---

## 🔗 相关文档

- **SDK文档**: `sdk-js/README.md`
- **Marketplace实现**: `SDK_MARKETPLACE_IMPLEMENTATION.md`
- **商品实体定义**: `backend/src/entities/product.entity.ts`
- **商品服务**: `backend/src/modules/product/product.service.ts`

---

## 📝 总结

### 商户对接SDK后获得

1. ✅ **商品管理**: 完整的商品CRUD功能
2. ✅ **订单管理**: 订单查询和跟踪
3. ✅ **支付集成**: 统一的支付接口
4. ✅ **Marketplace**: 商品自动上传到Marketplace，供AI Agent检索

### 商品上传到Marketplace

- **关键参数**: `availableToAgents: true`
- **自动处理**: 商品会自动索引到向量数据库，支持语义搜索
- **支持类型**: 实物、服务、NFT、FT、游戏资产、RWA

### SKU类型支持

✅ **完全支持6种商品类型**：
- 实物商品（physical）
- 服务（service）
- NFT（nft）
- 同质化代币（ft）
- 游戏资产（game_asset）
- 现实世界资产（rwa）

---

**文档维护**: PayMind 开发团队  
**最后更新**: 2025-11-26

