# PayMind 统一产品数据标准 - 核心规范

## 1. 设计目标

### 1.1 统一标准
- **单一数据模型**：不论商品形态（实物、服务、NFT、插件），使用统一的数据结构
- **统一元数据**：所有商品类型共享核心元数据字段，类型特定字段通过扩展字段实现
- **统一接口**：商户上传、AI生态对接、内部处理使用同一套标准

### 1.2 AI生态兼容
- **OpenAI Function Calling**：支持 ChatGPT、GPT-4 等
- **Claude Tools**：支持 Claude 3.x
- **Google Gemini Functions**：支持 Gemini Pro
- **通用格式**：提供标准化的 JSON Schema 描述

### 1.3 易于扩展
- **类型扩展**：新增商品类型无需修改核心结构
- **字段扩展**：通过 `extensions` 字段支持自定义字段
- **版本控制**：支持标准版本演进

## 2. 核心数据结构

### 2.1 基础字段（所有商品类型必需）

```typescript
interface BaseProduct {
  // 标识信息
  id: string;                    // 产品唯一ID（UUID）
  merchantId: string;            // 商户ID
  name: string;                   // 产品名称（多语言支持）
  description: string;            // 产品描述（多语言支持）
  
  // 分类信息
  category: string;              // 主分类（如：electronics, service, nft, plugin）
  subcategory?: string;          // 子分类
  tags: string[];                // 标签（用于搜索和推荐）
  
  // 价格信息
  price: {
    amount: number;               // 价格数值
    currency: string;             // 货币代码（ISO 4217）
    displayPrice?: string;       // 显示价格（如："¥99.99"）
  };
  
  // 库存信息
  inventory: {
    type: 'finite' | 'unlimited' | 'digital';  // 库存类型
    quantity?: number;            // 库存数量（finite时必需）
    available: boolean;           // 是否可购买
  };
  
  // 状态信息
  status: 'active' | 'inactive' | 'draft' | 'archived';
  
  // 时间戳
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

### 2.2 统一元数据结构

```typescript
interface UnifiedMetadata {
  // 核心元数据（所有类型共享）
  core: {
    // 多语言支持
    i18n?: {
      [locale: string]: {
        name?: string;
        description?: string;
        shortDescription?: string;
      };
    };
    
    // 媒体资源
    media: {
      images: Array<{
        url: string;
        type: 'thumbnail' | 'gallery' | 'detail';
        alt?: string;
        width?: number;
        height?: number;
      }>;
      videos?: Array<{
        url: string;
        type: 'preview' | 'demo' | 'tutorial';
        thumbnail?: string;
        duration?: number;
      }>;
    };
    
    // SEO信息
    seo?: {
      keywords?: string[];
      metaDescription?: string;
      slug?: string;
    };
  };
  
  // 类型特定元数据（通过 productType 确定结构）
  typeSpecific: {
    [key: string]: any;  // 根据 productType 定义
  };
  
  // AI生态兼容字段
  aiCompatible: {
    // OpenAI Function Calling 格式
    openai?: {
      function: {
        name: string;
        description: string;
        parameters: {
          type: 'object';
          properties: Record<string, any>;
          required: string[];
        };
      };
    };
    
    // Claude Tools 格式
    claude?: {
      name: string;
      description: string;
      input_schema: {
        type: 'object';
        properties: Record<string, any>;
        required: string[];
      };
    };
    
    // Google Gemini Functions 格式
    gemini?: {
      name: string;
      description: string;
      parameters: {
        type: 'object';
        properties: Record<string, any>;
        required: string[];
      };
    };
  };
  
  // 扩展字段（用于未来扩展）
  extensions?: {
    [key: string]: any;
  };
}
```

### 2.3 完整产品结构

```typescript
interface UnifiedProduct extends BaseProduct {
  // 产品类型
  productType: 'physical' | 'service' | 'nft' | 'ft' | 'plugin' | 'subscription';
  
  // 统一元数据
  metadata: UnifiedMetadata;
  
  // 商户信息（简化）
  merchant: {
    id: string;
    name: string;
    verified: boolean;
  };
  
  // 统计信息
  stats?: {
    views?: number;
    purchases?: number;
    rating?: number;
    reviews?: number;
  };
}
```

## 3. 产品类型枚举

```typescript
enum ProductType {
  // 实物商品
  PHYSICAL = 'physical',
  
  // 服务类商品
  SERVICE = 'service',
  CONSULTATION = 'consultation',
  SUBSCRIPTION = 'subscription',
  
  // 链上资产
  NFT = 'nft',
  FT = 'ft',              // Fungible Token
  GAME_ASSET = 'game_asset',
  
  // 开发者相关
  PLUGIN = 'plugin',
  API_SERVICE = 'api_service',
  
  // 其他
  RWA = 'rwa',           // Real World Asset
  HYBRID = 'hybrid',     // 混合类型
}
```

## 4. 数据验证规则

### 4.1 必需字段验证
- `id`, `merchantId`, `name`, `description` 必须存在
- `price.amount` 必须 >= 0
- `price.currency` 必须是有效的 ISO 4217 代码
- `productType` 必须是有效的枚举值

### 4.2 类型特定验证
- 根据 `productType` 验证 `metadata.typeSpecific` 中的必需字段
- 实物商品：需要 `shipping` 信息
- NFT：需要 `blockchain` 和 `contract` 信息
- 服务：需要 `serviceType` 和 `deliveryMethod`

### 4.3 元数据验证
- `metadata.core.media.images` 至少包含一个 `thumbnail`
- `metadata.core.i18n` 必须包含至少一种语言
- AI兼容字段必须符合对应平台的 Schema 规范

## 5. 数据转换规范

### 5.1 内部存储格式
- 数据库存储：使用 JSONB 存储 `metadata`
- 索引字段：`id`, `merchantId`, `category`, `productType`, `status`
- 搜索字段：`name`, `description`, `tags`

### 5.2 API 响应格式
- REST API：返回完整的 `UnifiedProduct` 结构
- GraphQL：支持字段选择，按需返回
- WebSocket：增量更新，只返回变更字段

### 5.3 AI生态格式转换
- 提供转换器将 `UnifiedProduct` 转换为各AI平台的格式
- 支持批量转换和实时转换
- 缓存转换结果以提高性能

## 6. 版本控制

### 6.1 标准版本
- 当前版本：`v1.0`
- 版本格式：`v{major}.{minor}`
- 向后兼容：minor 版本更新保持兼容

### 6.2 版本标识
```typescript
interface VersionInfo {
  standardVersion: string;  // 如 "v1.0"
  schemaVersion: string;   // JSON Schema 版本
  supportedTypes: string[]; // 支持的产品类型列表
}
```

## 7. 下一步

- 查看 `PayMind-产品数据标准-02-类型扩展规范.md` 了解各类型产品的具体字段
- 查看 `PayMind-产品数据标准-03-AI生态对接.md` 了解AI平台对接细节
- 查看 `PayMind-产品数据标准-04-商户上传接口.md` 了解商户如何上传产品

