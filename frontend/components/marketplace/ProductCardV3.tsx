import { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { AIButton } from '../ui/AIButton';

interface ProductCardV3Props {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  image?: string;
  category?: string;
  stock?: number;
  merchantId?: string;
  isInCart?: boolean;
  cartQuantity?: number;
  onSelect?: (id: string) => void;
  onAddToCart?: (product: {
    id: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    image?: string;
    category?: string;
    stock?: number;
    merchantId?: string;
  }) => void;
  onBuyNow?: (id: string) => void;
}

/**
 * 商品卡片组件（Agentrix V3.0设计规范）
 * 商城商品展示卡片
 * 
 * 优化:
 * - 支持传递完整商品信息到购物车
 * - 显示购物车状态
 * - 支持立即购买
 * - 显示库存状态
 */
export function ProductCardV3({
  id,
  name,
  description,
  price,
  currency,
  image,
  category,
  stock,
  merchantId,
  isInCart = false,
  cartQuantity = 0,
  onSelect,
  onAddToCart,
  onBuyNow,
}: ProductCardV3Props) {
  const [adding, setAdding] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAddToCart || adding) return;
    
    setAdding(true);
    try {
      await onAddToCart({
        id,
        name,
        description,
        price,
        currency,
        image,
        category,
        stock,
        merchantId,
      });
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBuyNow?.(id);
  };

  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case 'USD':
      case 'USDT':
      case 'USDC':
        return '$';
      case 'CNY':
        return '¥';
      case 'EUR':
        return '€';
      default:
        return '';
    }
  };

  const isOutOfStock = stock !== undefined && stock <= 0;

  return (
    <div onClick={() => onSelect?.(id)}>
      <GlassCard 
        className="cursor-pointer hover:scale-105 transition-all duration-300 relative" 
        hover
      >
        {/* 库存状态标签 */}
        {isOutOfStock && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-red-500/80 text-white text-xs rounded-lg z-10">
            已售罄
          </div>
        )}
        
        {/* 购物车数量标签 */}
        {isInCart && cartQuantity > 0 && (
          <div className="absolute top-2 left-2 w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center z-10">
            {cartQuantity}
          </div>
        )}

        {/* 商品图片 */}
        <div className="w-full h-48 bg-gradient-to-br from-primary-blue/20 to-primary-cyan/20 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
          {image ? (
            <img src={image} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl">🛍️</span>
          )}
      </div>

      {/* 商品信息 */}
      <div className="mb-3">
        {category && (
          <div className="text-xs text-primary-cyan mb-1">{category}</div>
        )}
        <div className="text-base font-semibold text-neutral-100 mb-1 line-clamp-2">
          {name}
        </div>
        {description && (
          <div className="text-xs text-neutral-400 line-clamp-2 mb-3">
            {description}
          </div>
        )}
        
        {/* 价格和库存 */}
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-bold text-primary-neon">
            {getCurrencySymbol(currency)}{price.toFixed(2)}
          </span>
          {stock !== undefined && (
            <span className={`text-xs ${isOutOfStock ? 'text-red-400' : 'text-neutral-500'}`}>
              库存: {stock}
            </span>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        {onBuyNow && (
          <AIButton
            variant="outline"
            className="flex-1 text-sm py-2"
            onClick={handleBuyNow}
            disabled={isOutOfStock}
          >
            立即购买
          </AIButton>
        )}
        <AIButton
          className={`flex-1 text-sm py-2 ${isInCart ? 'bg-green-600 hover:bg-green-700' : ''}`}
          onClick={handleAddToCart}
          disabled={isOutOfStock || adding}
        >
          {adding ? '添加中...' : isInCart ? '✓ 已加入' : '加入购物车'}
        </AIButton>
      </div>
      </GlassCard>
    </div>
  );
}

