# PayMind 统一产品数据标准 - AI生态对接规范

## 1. 设计目标

### 1.1 多平台兼容
- **OpenAI**：ChatGPT、GPT-4 Function Calling
- **Anthropic**：Claude 3.x Tools
- **Google**：Gemini Functions
- **通用格式**：JSON Schema 标准

### 1.2 自动转换
- 从 `UnifiedProduct` 自动生成各平台格式
- 支持批量转换和实时转换
- 缓存机制提高性能

## 2. OpenAI Function Calling 格式

### 2.1 产品搜索函数

```typescript
interface OpenAIProductSearchFunction {
  name: 'search_paymind_products';
  description: 'Search for products in PayMind marketplace. Supports physical goods, services, NFTs, and plugins.';
  parameters: {
    type: 'object';
    properties: {
      query: {
        type: 'string';
        description: 'Search query or product name';
      };
      category: {
        type: 'string';
        enum: ['physical', 'service', 'nft', 'ft', 'plugin', 'subscription'];
        description: 'Product category filter';
      };
      priceMin: {
        type: 'number';
        description: 'Minimum price';
      };
      priceMax: {
        type: 'number';
        description: 'Maximum price';
      };
      currency: {
        type: 'string';
        description: 'Currency code (ISO 4217)';
      };
      tags: {
        type: 'array';
        items: { type: 'string' };
        description: 'Filter by tags';
      };
    };
    required: ['query'];
  };
}
```

### 2.2 产品详情函数

```typescript
interface OpenAIProductDetailsFunction {
  name: 'get_paymind_product_details';
  description: 'Get detailed information about a specific product in PayMind marketplace.';
  parameters: {
    type: 'object';
    properties: {
      productId: {
        type: 'string';
        description: 'Product ID';
      };
      includeMetadata: {
        type: 'boolean';
        description: 'Include full metadata';
        default: false;
      };
    };
    required: ['productId'];
  };
}
```

### 2.3 转换实现

```typescript
class OpenAIAdapter {
  convertProductToFunction(product: UnifiedProduct): OpenAIProductSearchFunction {
    return {
      name: 'search_paymind_products',
      description: `Search for ${product.productType} products: ${product.name}`,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: product.description,
          },
          category: {
            type: 'string',
            enum: [product.productType],
          },
          // ... 其他字段
        },
        required: ['query'],
      },
    };
  }
  
  convertProductToResponse(product: UnifiedProduct): any {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: `${product.price.currency} ${product.price.amount}`,
      category: product.category,
      available: product.inventory.available,
      // 简化版本，只返回核心信息
    };
  }
}
```

## 3. Claude Tools 格式

### 3.1 产品搜索工具

```typescript
interface ClaudeProductSearchTool {
  name: 'search_paymind_products';
  description: 'Search for products in PayMind marketplace. Supports physical goods, services, NFTs, and plugins.';
  input_schema: {
    type: 'object';
    properties: {
      query: {
        type: 'string';
        description: 'Search query or product name';
      };
      category: {
        type: 'string';
        enum: ['physical', 'service', 'nft', 'ft', 'plugin', 'subscription'];
        description: 'Product category filter';
      };
      price_range: {
        type: 'object';
        properties: {
          min: { type: 'number' };
          max: { type: 'number' };
        };
        description: 'Price range filter';
      };
    };
    required: ['query'];
  };
}
```

### 3.2 转换实现

```typescript
class ClaudeAdapter {
  convertProductToTool(product: UnifiedProduct): ClaudeProductSearchTool {
    return {
      name: 'search_paymind_products',
      description: `Search for ${product.productType} products: ${product.name}`,
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: product.description,
          },
          category: {
            type: 'string',
            enum: [product.productType],
          },
        },
        required: ['query'],
      },
    };
  }
  
  convertProductToResponse(product: UnifiedProduct): any {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: {
        amount: product.price.amount,
        currency: product.price.currency,
      },
      category: product.category,
      available: product.inventory.available,
    };
  }
}
```

## 4. Google Gemini Functions 格式

### 4.1 产品搜索函数

```typescript
interface GeminiProductSearchFunction {
  name: 'search_paymind_products';
  description: 'Search for products in PayMind marketplace. Supports physical goods, services, NFTs, and plugins.';
  parameters: {
    type: 'object';
    properties: {
      query: {
        type: 'string';
        description: 'Search query or product name';
      };
      category: {
        type: 'string';
        enum: ['physical', 'service', 'nft', 'ft', 'plugin', 'subscription'];
        description: 'Product category filter';
      };
      filters: {
        type: 'object';
        properties: {
          priceMin: { type: 'number' };
          priceMax: { type: 'number' };
          currency: { type: 'string' };
          tags: {
            type: 'array';
            items: { type: 'string' };
          };
        };
      };
    };
    required: ['query'];
  };
}
```

### 4.2 转换实现

```typescript
class GeminiAdapter {
  convertProductToFunction(product: UnifiedProduct): GeminiProductSearchFunction {
    return {
      name: 'search_paymind_products',
      description: `Search for ${product.productType} products: ${product.name}`,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: product.description,
          },
          category: {
            type: 'string',
            enum: [product.productType],
          },
        },
        required: ['query'],
      },
    };
  }
}
```

## 5. 统一转换服务

### 5.1 转换器接口

```typescript
interface AIPlatformAdapter {
  platform: 'openai' | 'claude' | 'gemini' | 'generic';
  
  // 转换为平台特定的函数/工具定义
  convertToFunction(product: UnifiedProduct): any;
  
  // 转换为平台特定的响应格式
  convertToResponse(product: UnifiedProduct): any;
  
  // 批量转换
  convertBatch(products: UnifiedProduct[]): any[];
}
```

### 5.2 实现示例

```typescript
class AIAdapterService {
  private adapters: Map<string, AIPlatformAdapter> = new Map();
  
  constructor() {
    this.adapters.set('openai', new OpenAIAdapter());
    this.adapters.set('claude', new ClaudeAdapter());
    this.adapters.set('gemini', new GeminiAdapter());
  }
  
  convert(product: UnifiedProduct, platform: string): any {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return adapter.convertToFunction(product);
  }
  
  convertResponse(product: UnifiedProduct, platform: string): any {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return adapter.convertToResponse(product);
  }
}
```

## 6. 元数据中的AI兼容字段

### 6.1 自动生成

在产品创建/更新时，自动生成AI兼容字段：

```typescript
async function generateAICompatibleFields(product: UnifiedProduct): Promise<UnifiedMetadata> {
  const openaiAdapter = new OpenAIAdapter();
  const claudeAdapter = new ClaudeAdapter();
  const geminiAdapter = new GeminiAdapter();
  
  return {
    ...product.metadata,
    aiCompatible: {
      openai: openaiAdapter.convertToFunction(product),
      claude: claudeAdapter.convertToTool(product),
      gemini: geminiAdapter.convertToFunction(product),
    },
  };
}
```

### 6.2 缓存策略

```typescript
class AICacheService {
  private cache: Map<string, any> = new Map();
  
  async getCached(platform: string, productId: string): Promise<any> {
    const key = `${platform}:${productId}`;
    return this.cache.get(key);
  }
  
  async setCached(platform: string, productId: string, data: any): Promise<void> {
    const key = `${platform}:${productId}`;
    this.cache.set(key, data);
  }
}
```

## 7. API端点设计

### 7.1 获取AI格式的产品定义

```typescript
// GET /api/products/:id/ai-format?platform=openai
async getAIFormat(productId: string, platform: string) {
  const product = await this.productService.getProduct(productId);
  const adapter = this.aiAdapterService.getAdapter(platform);
  return adapter.convertToFunction(product);
}
```

### 7.2 批量获取

```typescript
// POST /api/products/ai-format/batch
async getBatchAIFormat(productIds: string[], platform: string) {
  const products = await this.productService.getProducts(productIds);
  const adapter = this.aiAdapterService.getAdapter(platform);
  return products.map(p => adapter.convertToFunction(p));
}
```

## 8. 使用示例

### 8.1 ChatGPT集成

```typescript
// 在ChatGPT中注册PayMind产品搜索函数
const functions = await paymindAPI.getAIFunctions('openai');
await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: '帮我找耳机' }],
  functions: functions,
});
```

### 8.2 Claude集成

```typescript
// 在Claude中注册PayMind产品搜索工具
const tools = await paymindAPI.getAITools('claude');
await anthropic.messages.create({
  model: 'claude-3-opus',
  messages: [{ role: 'user', content: '帮我找耳机' }],
  tools: tools,
});
```

## 9. 下一步

- 查看 `PayMind-产品数据标准-04-商户上传接口.md` 了解商户如何上传产品
- 查看 `PayMind-产品数据标准-05-数据验证与迁移.md` 了解数据验证规则

