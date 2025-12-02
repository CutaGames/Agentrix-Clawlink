# PayMind 商品展示标准格式

## 概述

本文档定义了 PayMind 系统中商品数据的标准展示格式，确保在 PayMind Agent、ChatGPT、Claude 等所有 AI 平台中都能提供一致且良好的用户体验。

## 标准商品数据格式

### 核心字段

```typescript
interface StandardProductDisplay {
  // 基础信息
  id: string;                    // 商品ID
  name: string;                  // 商品名称
  description?: string;          // 商品描述（可选）
  
  // 价格信息
  price: number;                 // 价格（数字）
  currency: string;              // 货币代码（CNY, USD, USDT等）
  priceDisplay?: string;         // 格式化后的价格显示（如 "¥899.00"）
  
  // 库存信息
  stock: number;                 // 库存数量
  inStock: boolean;             // 是否有货（stock > 0）
  
  // 分类信息
  category: string;             // 商品分类
  productType: string;           // 商品类型（physical, service, nft, ft等）
  
  // 图片信息（标准格式）
  image?: string;                // 主图URL（从 metadata.core.media.images[0].url 提取）
  images?: string[];             // 所有图片URL数组
  
  // 商户信息
  merchantId: string;            // 商户ID
  merchantName?: string;         // 商户名称（可选）
  
  // 评分和相关性
  score?: number;                // 搜索相关性分数（0-1）
  relevanceScore?: number;      // 推荐相关性分数
  
  // 其他元数据
  metadata?: any;               // 完整元数据（保留）
  
  // 索引信息（用于用户选择）
  index?: number;                // 在搜索结果中的序号（1, 2, 3...）
}
```

## 图片处理标准

### 图片来源优先级

1. **统一数据标准格式**（优先）：
   ```typescript
   metadata.core.media.images[0].url
   ```

2. **旧格式兼容**：
   ```typescript
   metadata.image
   metadata.extensions.image
   ```

3. **默认占位图**：
   如果以上都不存在，使用默认占位图：
   ```
   /images/product-placeholder.png
   ```

### 图片尺寸规范

- **缩略图（列表展示）**：200x200px
- **主图（详情展示）**：800x800px
- **大图（放大查看）**：1200x1200px

## 价格显示格式

### 货币符号映射

```typescript
const CURRENCY_SYMBOLS: Record<string, string> = {
  'CNY': '¥',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
  'USDT': 'USDT',
  'USDC': 'USDC',
  'ETH': 'ETH',
  'BTC': 'BTC',
};

// 格式化价格
function formatPrice(price: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  if (['USDT', 'USDC', 'ETH', 'BTC'].includes(currency)) {
    return `${price} ${symbol}`;
  }
  return `${symbol}${price.toFixed(2)}`;
}
```

## 前端展示组件标准

### PayMind Agent 展示

```tsx
<ProductCard
  id={product.id}
  name={product.name}
  description={product.description}
  price={product.price}
  currency={product.currency}
  image={product.image || '/images/product-placeholder.png'}
  stock={product.stock}
  inStock={product.inStock}
  category={product.category}
  index={product.index}
  onClick={() => handleProductSelect(product.id)}
/>
```

### ChatGPT/Claude 展示（文本格式）

由于 ChatGPT 和 Claude 主要使用文本展示，需要生成结构化的文本描述：

```
📦 商品 #{index}: {name}

💰 价格: {priceDisplay}
📊 库存: {inStock ? '✅ 有货' : '⚠️ 缺货'}
🏷️ 分类: {category}
📝 描述: {description}

{image ? '[图片: {image}]' : ''}
```

## 后端数据转换标准

### 统一转换函数

所有后端服务在返回商品数据前，必须使用统一的转换函数：

```typescript
function formatProductForDisplay(product: Product): StandardProductDisplay {
  // 提取图片（按优先级）
  const image = 
    product.metadata?.core?.media?.images?.[0]?.url ||
    product.metadata?.image ||
    product.metadata?.extensions?.image ||
    null;
  
  const images = 
    product.metadata?.core?.media?.images?.map(img => img.url) ||
    (image ? [image] : []);
  
  // 提取货币
  const currency = 
    product.metadata?.extensions?.currency ||
    product.metadata?.currency ||
    'CNY';
  
  // 格式化价格
  const priceDisplay = formatPrice(Number(product.price), currency);
  
  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    price: Number(product.price),
    currency,
    priceDisplay,
    stock: product.stock || 0,
    inStock: (product.stock || 0) > 0,
    category: product.category || '',
    productType: product.productType,
    image,
    images,
    merchantId: product.merchantId,
    metadata: product.metadata,
  };
}
```

## 实施要求

### 后端修改点

1. **product-search.skill.ts**：添加图片字段
2. **agent-p0-integration.service.ts**：统一使用转换函数
3. **openai-integration.service.ts**：统一使用转换函数
4. **rag-api.service.ts**：统一使用转换函数

### 前端修改点

1. **StructuredResponseCard.tsx**：支持标准格式展示
2. **UnifiedAgentChat.tsx**：确保数据正确传递
3. **ChatGPT 集成**：生成文本格式的商品描述

## 测试检查清单

- [ ] 商品搜索返回的数据包含 `image` 字段
- [ ] 图片正确显示（有图片时显示，无图片时显示占位图）
- [ ] 价格格式正确（货币符号、小数位数）
- [ ] 库存状态正确显示
- [ ] PayMind Agent 中商品卡片正常展示
- [ ] ChatGPT 中商品信息以文本形式正确展示
- [ ] 所有商品类型（实物、服务、NFT等）都能正确展示

