# PayMind 统一产品数据标准 - 类型扩展规范

## 1. 实物商品 (Physical)

### 1.1 类型特定字段

```typescript
interface PhysicalProductMetadata {
  typeSpecific: {
    // 物流信息
    shipping: {
      weight?: number;              // 重量（kg）
      dimensions?: {                // 尺寸
        length: number;
        width: number;
        height: number;
        unit: 'cm' | 'inch';
      };
      shippingMethods: Array<{      // 配送方式
        method: string;              // 如：standard, express, overnight
        cost: number;
        currency: string;
        estimatedDays: number;
      }>;
      freeShippingThreshold?: number; // 免运费门槛
    };
    
    // 商品属性
    attributes: {
      brand?: string;               // 品牌
      model?: string;               // 型号
      sku?: string;                 // SKU
      barcode?: string;             // 条形码
      warranty?: {                   // 保修信息
        period: number;              // 保修期（月）
        type: string;                // 保修类型
      };
      specifications?: Record<string, any>; // 规格参数
    };
    
    // 合规信息
    compliance?: {
      certifications?: string[];   // 认证（如：CE, FCC）
      origin?: string;               // 原产地
      customsCode?: string;         // 海关编码
    };
  };
}
```

### 1.2 示例

```json
{
  "productType": "physical",
  "name": "无线蓝牙耳机",
  "metadata": {
    "typeSpecific": {
      "shipping": {
        "weight": 0.2,
        "dimensions": {
          "length": 15,
          "width": 10,
          "height": 5,
          "unit": "cm"
        },
        "shippingMethods": [
          {
            "method": "standard",
            "cost": 10,
            "currency": "CNY",
            "estimatedDays": 3
          }
        ]
      },
      "attributes": {
        "brand": "TechBrand",
        "model": "TB-2024",
        "warranty": {
          "period": 12,
          "type": "manufacturer"
        }
      }
    }
  }
}
```

## 2. 服务类商品 (Service)

### 2.1 类型特定字段

```typescript
interface ServiceProductMetadata {
  typeSpecific: {
    // 服务类型
    serviceType: 'consultation' | 'virtual' | 'technical' | 'subscription';
    
    // 交付方式
    delivery: {
      method: 'online' | 'offline' | 'hybrid';
      platform?: string[];         // 如：zoom, teams, wechat
      duration?: number;            // 服务时长（分钟）
      schedule?: {                  // 可预约时间
        timezone: string;
        availableSlots: Array<{
          date: string;
          times: string[];
        }>;
      };
    };
    
    // 服务内容
    serviceDetails: {
      deliverables?: string[];      // 交付物
      prerequisites?: string[];     // 前置要求
      cancellationPolicy?: string;  // 取消政策
      refundPolicy?: string;         // 退款政策
    };
    
    // 服务提供者
    provider?: {
      name: string;
      qualifications?: string[];    // 资质
      rating?: number;
    };
  };
}
```

### 2.2 示例

```json
{
  "productType": "service",
  "name": "UI/UX设计咨询服务",
  "metadata": {
    "typeSpecific": {
      "serviceType": "consultation",
      "delivery": {
        "method": "online",
        "platform": ["zoom", "teams"],
        "duration": 60,
        "schedule": {
          "timezone": "Asia/Shanghai",
          "availableSlots": [
            {
              "date": "2024-12-01",
              "times": ["09:00", "14:00", "16:00"]
            }
          ]
        }
      },
      "serviceDetails": {
        "deliverables": ["设计建议文档", "原型图"],
        "prerequisites": ["提供项目背景"]
      }
    }
  }
}
```

## 3. NFT (Non-Fungible Token)

### 3.1 类型特定字段

```typescript
interface NFTProductMetadata {
  typeSpecific: {
    // 区块链信息
    blockchain: {
      chain: 'ethereum' | 'solana' | 'polygon' | 'bsc' | 'arbitrum';
      network: 'mainnet' | 'testnet';
      contractAddress: string;     // 合约地址
      tokenId?: string;              // Token ID（ERC-721）
      tokenStandard: 'ERC-721' | 'ERC-1155' | 'SPL' | 'other';
    };
    
    // NFT属性
    nftAttributes: {
      collection?: string;            // 系列名称
      rarity?: string;               // 稀有度
      traits?: Array<{               // 特征
        trait_type: string;
        value: string | number;
        rarity_score?: number;
      }>;
      edition?: {                    // 版本信息
        total: number;
        number: number;
      };
    };
    
    // 所有权
    ownership: {
      currentOwner?: string;         // 当前持有者地址
      creator?: string;              // 创作者地址
      royalty?: {                    // 版税
        percentage: number;
        recipient: string;
      };
    };
    
    // 元数据存储
    metadataStorage: {
      type: 'ipfs' | 'arweave' | 'onchain' | 'centralized';
      uri?: string;                  // 元数据URI
      cid?: string;                  // IPFS CID
    };
  };
}
```

### 3.2 示例

```json
{
  "productType": "nft",
  "name": "CryptoPunk #1234",
  "metadata": {
    "typeSpecific": {
      "blockchain": {
        "chain": "ethereum",
        "network": "mainnet",
        "contractAddress": "0x...",
        "tokenId": "1234",
        "tokenStandard": "ERC-721"
      },
      "nftAttributes": {
        "collection": "CryptoPunks",
        "rarity": "rare",
        "traits": [
          {
            "trait_type": "Background",
            "value": "Blue",
            "rarity_score": 0.15
          }
        ]
      },
      "ownership": {
        "creator": "0x...",
        "royalty": {
          "percentage": 5,
          "recipient": "0x..."
        }
      },
      "metadataStorage": {
        "type": "ipfs",
        "cid": "Qm..."
      }
    }
  }
}
```

## 4. 同质化代币 (FT - Fungible Token)

### 4.1 类型特定字段

```typescript
interface FTProductMetadata {
  typeSpecific: {
    // 区块链信息
    blockchain: {
      chain: 'ethereum' | 'solana' | 'polygon' | 'bsc';
      network: 'mainnet' | 'testnet';
      contractAddress: string;       // 代币合约地址
      tokenStandard: 'ERC-20' | 'SPL' | 'BEP-20' | 'other';
      decimals: number;             // 小数位数
    };
    
    // 代币信息
    tokenInfo: {
      symbol: string;               // 代币符号
      totalSupply?: number;          // 总供应量
      circulatingSupply?: number;    // 流通量
      price?: {                      // 当前价格
        amount: number;
        currency: string;
        source?: string;             // 价格来源
      };
    };
    
    // 交易信息
    trading?: {
      liquidity?: number;            // 流动性
      volume24h?: number;           // 24小时交易量
      marketCap?: number;            // 市值
    };
  };
}
```

## 5. 开发者插件 (Plugin)

### 5.1 类型特定字段

```typescript
interface PluginProductMetadata {
  typeSpecific: {
    // 插件信息
    plugin: {
      type: 'agent_skill' | 'payment_gateway' | 'integration' | 'widget';
      version: string;               // 版本号
      compatibility: {                // 兼容性
        minVersion?: string;
        maxVersion?: string;
        platforms?: string[];         // 支持的平台
      };
    };
    
    // 技术信息
    technical: {
      language?: string[];            // 编程语言
      framework?: string[];          // 框架
      dependencies?: Array<{          // 依赖
        name: string;
        version: string;
      }>;
      apiEndpoints?: Array<{         // API端点
        method: string;
        path: string;
        description: string;
      }>;
    };
    
    // 安装和使用
    installation: {
      method: 'npm' | 'manual' | 'api' | 'marketplace';
      instructions?: string;          // 安装说明
      configuration?: Record<string, any>; // 配置项
    };
    
    // 文档
    documentation?: {
      readme?: string;               // README URL
      apiDocs?: string;              // API文档URL
      examples?: string[];            // 示例代码URL
    };
  };
}
```

### 5.2 示例

```json
{
  "productType": "plugin",
  "name": "PayMind Agent Skill - 商品搜索",
  "metadata": {
    "typeSpecific": {
      "plugin": {
        "type": "agent_skill",
        "version": "1.0.0",
        "compatibility": {
          "minVersion": "2.0.0",
          "platforms": ["paymind-agent"]
        }
      },
      "technical": {
        "language": ["typescript"],
        "framework": ["nestjs"],
        "dependencies": [
          {
            "name": "@paymind/sdk",
            "version": "^2.0.0"
          }
        ]
      },
      "installation": {
        "method": "npm",
        "instructions": "npm install @paymind/skill-product-search"
      }
    }
  }
}
```

## 6. 订阅服务 (Subscription)

### 6.1 类型特定字段

```typescript
interface SubscriptionProductMetadata {
  typeSpecific: {
    // 订阅信息
    subscription: {
      billingCycle: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
      trialPeriod?: number;          // 试用期（天）
      autoRenew: boolean;            // 自动续费
      cancellationPolicy?: string;  // 取消政策
    };
    
    // 套餐信息
    plan: {
      features: string[];            // 包含的功能
      limits?: Record<string, number>; // 使用限制
      upgrades?: string[];           // 可升级到的套餐ID
    };
    
    // 价格信息
    pricing: {
      basePrice: number;             // 基础价格
      currency: string;
      discounts?: Array<{            // 折扣
        type: 'percentage' | 'fixed';
        value: number;
        condition?: string;
      }>;
    };
  };
}
```

## 7. 混合类型 (Hybrid)

### 7.1 类型特定字段

```typescript
interface HybridProductMetadata {
  typeSpecific: {
    // 组合类型
    components: Array<{
      type: ProductType;
      productId?: string;           // 关联的产品ID
      metadata: any;                 // 该组件的元数据
    }>;
    
    // 组合规则
    bundle: {
      discount?: number;            // 组合折扣
      required?: string[];          // 必需组件
      optional?: string[];          // 可选组件
    };
  };
}
```

## 8. 类型验证规则

### 8.1 实物商品
- ✅ 必须包含 `shipping` 信息
- ✅ `shipping.weight` 必须 > 0
- ✅ 至少提供一种配送方式

### 8.2 服务商品
- ✅ 必须指定 `serviceType`
- ✅ 必须包含 `delivery.method`
- ✅ 在线服务必须指定 `platform`

### 8.3 NFT
- ✅ 必须包含 `blockchain.contractAddress`
- ✅ 必须指定 `blockchain.chain` 和 `network`
- ✅ ERC-721 必须包含 `tokenId`

### 8.4 插件
- ✅ 必须指定 `plugin.type` 和 `version`
- ✅ 必须包含 `installation.method`
- ✅ 建议提供 `documentation`

## 9. 下一步

- 查看 `PayMind-产品数据标准-03-AI生态对接.md` 了解如何转换为AI平台格式
- 查看 `PayMind-产品数据标准-04-商户上传接口.md` 了解上传API

