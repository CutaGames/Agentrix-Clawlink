/**
 * 产品数据转换工具
 * 将旧格式转换为统一数据标准格式
 */

import { CreateProductDto } from '../api/product.api';

/**
 * 将简化的产品数据转换为统一标准格式
 */
export function convertToUnifiedProduct(data: {
  name: string;
  description?: string;
  price: number | string;
  stock?: number | string;
  category: string;
  productType?: 'physical' | 'service' | 'nft' | 'ft' | 'plugin' | 'subscription' | 'game_asset' | 'rwa';
  commissionRate?: number;
  currency?: string;
  image?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}): CreateProductDto {
  const priceAmount = typeof data.price === 'string' ? parseFloat(data.price) : data.price;
  const stockQuantity = data.stock !== undefined 
    ? (typeof data.stock === 'string' ? parseInt(data.stock, 10) : data.stock)
    : 0;
  
  // 确定库存类型
  let inventoryType: 'finite' | 'unlimited' | 'digital' = 'finite';
  if (data.productType === 'service' || data.productType === 'plugin' || data.productType === 'subscription') {
    inventoryType = 'unlimited';
  } else if (data.productType === 'nft' || data.productType === 'ft' || data.productType === 'game_asset') {
    inventoryType = 'digital';
  }

  // 构建统一格式
  const unified: CreateProductDto = {
    name: data.name,
    description: data.description || '',
    category: data.category,
    productType: data.productType || 'physical',
    price: {
      amount: priceAmount,
      currency: data.currency || 'CNY',
    },
    inventory: {
      type: inventoryType,
      quantity: inventoryType === 'finite' ? stockQuantity : undefined,
    },
    metadata: {
      core: {
        media: {
          images: data.image ? [{
            url: data.image,
            type: 'thumbnail' as const,
          }] : [],
        },
      },
      typeSpecific: {},
      extensions: {
        // 保留旧字段用于兼容
        ...(data.metadata || {}),
        ...(data.commissionRate ? { commissionRate: data.commissionRate } : {}),
      },
    },
    ...(data.tags && data.tags.length > 0 ? { tags: data.tags } : {}),
  };

  // 如果提供了旧格式的字段，转换为新格式
  if (data.commissionRate) {
    unified.metadata.extensions = {
      ...unified.metadata.extensions,
      commissionRate: data.commissionRate,
    };
  }

  return unified;
}

/**
 * 从统一格式转换为简化格式（用于显示）
 */
export function convertFromUnifiedProduct(product: any): {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  productType: string;
  currency: string;
  image?: string;
  commissionRate?: number;
} {
  return {
    name: product.name,
    description: product.description || '',
    price: typeof product.price === 'object' ? product.price.amount : product.price,
    stock: typeof product.inventory === 'object' 
      ? (product.inventory.quantity || 0)
      : product.stock || 0,
    category: product.category,
    productType: product.productType || 'physical',
    currency: typeof product.price === 'object' ? product.price.currency : (product.metadata?.currency || 'CNY'),
    image: product.metadata?.core?.media?.images?.[0]?.url || product.metadata?.image,
    commissionRate: product.metadata?.extensions?.commissionRate || product.commissionRate,
  };
}

