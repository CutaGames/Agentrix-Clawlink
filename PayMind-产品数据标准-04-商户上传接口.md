# PayMind 统一产品数据标准 - 商户上传接口

## 1. API设计原则

### 1.1 简单易用
- **统一接口**：所有商品类型使用同一套API
- **智能推断**：根据数据自动识别商品类型
- **批量支持**：支持单条和批量上传

### 1.2 灵活扩展
- **可选字段**：核心字段必需，扩展字段可选
- **类型特定**：根据 `productType` 验证对应字段
- **版本兼容**：支持标准版本演进

## 2. 创建产品接口

### 2.1 单条创建

```typescript
// POST /api/products
interface CreateProductRequest {
  // 基础字段（必需）
  name: string;
  description: string;
  category: string;
  productType: 'physical' | 'service' | 'nft' | 'ft' | 'plugin' | 'subscription';
  
  // 价格信息
  price: {
    amount: number;
    currency: string;
  };
  
  // 库存信息
  inventory: {
    type: 'finite' | 'unlimited' | 'digital';
    quantity?: number;
  };
  
  // 元数据（必需核心字段，其他可选）
  metadata: {
    core: {
      media: {
        images: Array<{
          url: string;
          type: 'thumbnail' | 'gallery';
        }>;
      };
    };
    typeSpecific?: any;  // 根据 productType 定义
  };
  
  // 可选字段
  tags?: string[];
  subcategory?: string;
}
```

### 2.2 批量创建

```typescript
// POST /api/products/batch
interface BatchCreateProductRequest {
  products: CreateProductRequest[];
  options?: {
    skipValidation?: boolean;  // 跳过验证（不推荐）
    generateAIFormats?: boolean; // 自动生成AI格式
  };
}

interface BatchCreateProductResponse {
  success: number;
  failed: number;
  results: Array<{
    index: number;
    productId?: string;
    error?: string;
  }>;
}
```

## 3. 更新产品接口

### 3.1 部分更新

```typescript
// PATCH /api/products/:id
interface UpdateProductRequest {
  // 只包含要更新的字段
  name?: string;
  price?: {
    amount?: number;
    currency?: string;
  };
  inventory?: {
    quantity?: number;
    available?: boolean;
  };
  metadata?: {
    core?: Partial<UnifiedMetadata['core']>;
    typeSpecific?: any;
  };
  status?: 'active' | 'inactive' | 'draft';
}
```

### 3.2 完整更新

```typescript
// PUT /api/products/:id
// 使用 CreateProductRequest 格式，替换整个产品
```

## 4. 简化上传接口（推荐）

### 4.1 智能推断类型

```typescript
// POST /api/products/simple
// 根据提供的数据自动推断 productType
interface SimpleProductUpload {
  name: string;
  description: string;
  price: number;
  currency: string;
  
  // 可选：明确指定类型
  productType?: string;
  
  // 类型特定字段（可选，系统会推断）
  // 如果提供 shipping，推断为 physical
  shipping?: {
    weight?: number;
    methods?: any[];
  };
  
  // 如果提供 blockchain，推断为 nft/ft
  blockchain?: {
    chain: string;
    contractAddress: string;
  };
  
  // 如果提供 serviceType，推断为 service
  serviceType?: string;
  
  // 如果提供 plugin，推断为 plugin
  plugin?: {
    type: string;
    version: string;
  };
  
  // 通用字段
  images?: string[];  // 图片URL数组
  tags?: string[];
  category?: string;
}
```

### 4.2 实现逻辑

```typescript
class ProductUploadService {
  inferProductType(data: SimpleProductUpload): ProductType {
    // 优先级：明确指定 > 特征推断
    if (data.productType) {
      return data.productType as ProductType;
    }
    
    if (data.blockchain) {
      return data.blockchain.tokenId ? 'nft' : 'ft';
    }
    
    if (data.shipping) {
      return 'physical';
    }
    
    if (data.serviceType) {
      return 'service';
    }
    
    if (data.plugin) {
      return 'plugin';
    }
    
    // 默认
    return 'physical';
  }
  
  async createFromSimple(data: SimpleProductUpload): Promise<UnifiedProduct> {
    const productType = this.inferProductType(data);
    
    // 转换为标准格式
    return {
      id: generateId(),
      merchantId: getCurrentMerchantId(),
      name: data.name,
      description: data.description,
      category: data.category || 'other',
      productType,
      price: {
        amount: data.price,
        currency: data.currency,
      },
      inventory: {
        type: productType === 'digital' ? 'unlimited' : 'finite',
        quantity: data.stock || 0,
        available: true,
      },
      metadata: {
        core: {
          media: {
            images: (data.images || []).map(url => ({
              url,
              type: 'gallery' as const,
            })),
          },
        },
        typeSpecific: this.buildTypeSpecific(data, productType),
      },
      tags: data.tags || [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
```

## 5. 文件上传支持

### 5.1 图片上传

```typescript
// POST /api/products/upload/images
// multipart/form-data
interface ImageUploadRequest {
  files: File[];  // 图片文件
  productId?: string;  // 可选，关联到已有产品
}

interface ImageUploadResponse {
  images: Array<{
    url: string;
    type: 'thumbnail' | 'gallery';
    width: number;
    height: number;
  }>;
}
```

### 5.2 元数据文件上传

```typescript
// POST /api/products/upload/metadata
// 支持 JSON、CSV、Excel 格式
interface MetadataUploadRequest {
  file: File;
  format: 'json' | 'csv' | 'excel';
  mapping?: Record<string, string>;  // 字段映射
}
```

## 6. 验证与错误处理

### 6.1 验证规则

```typescript
class ProductValidator {
  validate(product: CreateProductRequest): ValidationResult {
    const errors: string[] = [];
    
    // 基础字段验证
    if (!product.name || product.name.trim().length === 0) {
      errors.push('产品名称不能为空');
    }
    
    if (!product.price || product.price.amount < 0) {
      errors.push('价格必须 >= 0');
    }
    
    // 类型特定验证
    if (product.productType === 'physical') {
      if (!product.metadata?.typeSpecific?.shipping) {
        errors.push('实物商品必须提供物流信息');
      }
    }
    
    if (product.productType === 'nft') {
      if (!product.metadata?.typeSpecific?.blockchain?.contractAddress) {
        errors.push('NFT必须提供合约地址');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
```

### 6.2 错误响应

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}
```

## 7. Webhook通知

### 7.1 产品状态变更

```typescript
// 当产品创建/更新时，发送Webhook
interface ProductWebhookPayload {
  event: 'product.created' | 'product.updated' | 'product.deleted';
  product: UnifiedProduct;
  timestamp: string;
}
```

## 8. SDK支持

### 8.1 JavaScript/TypeScript

```typescript
import { PayMindSDK } from '@paymind/sdk';

const sdk = new PayMindSDK({ apiKey: 'your-key' });

// 简单上传
const product = await sdk.products.create({
  name: '无线耳机',
  description: '高品质蓝牙耳机',
  price: 299,
  currency: 'CNY',
  images: ['https://example.com/image.jpg'],
  tags: ['electronics', 'audio'],
});

// 标准格式上传
const product2 = await sdk.products.createStandard({
  name: 'UI设计服务',
  productType: 'service',
  price: { amount: 500, currency: 'CNY' },
  metadata: {
    core: { /* ... */ },
    typeSpecific: { /* ... */ },
  },
});
```

### 8.2 Python

```python
from paymind import PayMindClient

client = PayMindClient(api_key='your-key')

# 简单上传
product = client.products.create(
    name='无线耳机',
    description='高品质蓝牙耳机',
    price=299,
    currency='CNY',
    images=['https://example.com/image.jpg'],
    tags=['electronics', 'audio'],
)
```

## 9. 最佳实践

### 9.1 上传流程

1. **准备数据**：收集产品信息、图片、规格等
2. **选择接口**：简单上传 vs 标准格式
3. **验证数据**：使用SDK或API验证
4. **上传产品**：单条或批量
5. **检查状态**：确认产品已创建
6. **更新信息**：根据需要更新产品信息

### 9.2 性能优化

- **批量上传**：一次上传多个产品
- **异步处理**：使用队列处理大量产品
- **图片优化**：压缩图片，使用CDN
- **缓存策略**：缓存常用产品数据

## 10. 下一步

- 查看 `PayMind-产品数据标准-05-数据验证与迁移.md` 了解数据验证和迁移规则
- 查看其他类型扩展规范了解各类型的具体字段要求

