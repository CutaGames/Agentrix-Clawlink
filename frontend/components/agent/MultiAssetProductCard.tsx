/**
 * Agent对话框内的多资产类型商品卡片组件
 * 
 * 支持资产类型：
 * - physical: 物理商品
 * - service: 服务类商品
 * - nft: NFT数字藏品
 * - ft: 可替代代币
 * - game_asset: 游戏资产
 * - rwa: 真实世界资产
 */

import { useState } from 'react';
import { ShoppingCart, Eye, ExternalLink, Zap, Clock, Shield, Coins, Image } from 'lucide-react';

export type AssetType = 'physical' | 'service' | 'nft' | 'ft' | 'game_asset' | 'rwa' | 'plugin' | 'subscription';

export interface MultiAssetProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  priceDisplay?: string;
  image?: string;
  category?: string;
  stock?: number;
  inStock?: boolean;
  merchantId?: string;
  merchantName?: string;
  // 资产类型（优先级：顶级字段 > metadata）
  assetType?: AssetType;
  // 区块链相关
  tokenAddress?: string;
  chainId?: number;
  tokenId?: string;
  // 服务相关
  duration?: string;
  serviceType?: string;
  // 评分和销量
  rating?: number;
  salesCount?: number;
  // 元数据
  metadata?: {
    assetType?: AssetType;
    productType?: string;
    // NFT特有字段
    contractAddress?: string;
    tokenId?: string;
    chain?: string;
    rarity?: string;
    // FT特有字段
    tokenSymbol?: string;
    tokenDecimals?: number;
    marketCap?: string;
    priceChange24h?: number;
    // 服务特有字段
    duration?: string;
    deliveryTime?: string;
    // 通用字段
    image?: string;
    currency?: string;
    paymentMethod?: string;
    [key: string]: any;
  };
}

interface MultiAssetProductCardProps {
  product: MultiAssetProduct;
  onAddToCart?: (productId: string, quantity?: number) => void;
  onViewDetail?: (product: MultiAssetProduct) => void;
  onBuyNow?: (product: MultiAssetProduct) => void;
  isAddingToCart?: boolean;
  isPaying?: boolean;
  compact?: boolean;
}

/**
 * 获取资产类型配置
 */
function getAssetTypeConfig(assetType?: AssetType) {
  const configs: Record<AssetType, { 
    icon: string; 
    label: string; 
    color: string; 
    bgColor: string;
    borderColor: string;
  }> = {
    physical: { 
      icon: '📦', 
      label: '实物商品', 
      color: 'text-blue-400',
      bgColor: 'from-blue-900/30 to-blue-800/20',
      borderColor: 'border-blue-500/30',
    },
    service: { 
      icon: '🛠️', 
      label: '服务', 
      color: 'text-green-400',
      bgColor: 'from-green-900/30 to-green-800/20',
      borderColor: 'border-green-500/30',
    },
    nft: { 
      icon: '🎨', 
      label: 'NFT', 
      color: 'text-purple-400',
      bgColor: 'from-purple-900/30 to-pink-800/20',
      borderColor: 'border-purple-500/30',
    },
    ft: { 
      icon: '🪙', 
      label: '代币', 
      color: 'text-yellow-400',
      bgColor: 'from-yellow-900/30 to-orange-800/20',
      borderColor: 'border-yellow-500/30',
    },
    game_asset: { 
      icon: '🎮', 
      label: '游戏资产', 
      color: 'text-cyan-400',
      bgColor: 'from-cyan-900/30 to-teal-800/20',
      borderColor: 'border-cyan-500/30',
    },
    rwa: { 
      icon: '🏛️', 
      label: 'RWA', 
      color: 'text-amber-400',
      bgColor: 'from-amber-900/30 to-orange-800/20',
      borderColor: 'border-amber-500/30',
    },
    plugin: { 
      icon: '🔌', 
      label: '插件', 
      color: 'text-indigo-400',
      bgColor: 'from-indigo-900/30 to-violet-800/20',
      borderColor: 'border-indigo-500/30',
    },
    subscription: { 
      icon: '📅', 
      label: '订阅', 
      color: 'text-rose-400',
      bgColor: 'from-rose-900/30 to-pink-800/20',
      borderColor: 'border-rose-500/30',
    },
  };
  
  return configs[assetType || 'physical'] || configs.physical;
}

/**
 * 格式化货币显示
 */
function formatPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    USDT: '$',
    USDC: '$',
    CNY: '¥',
    EUR: '€',
    ETH: 'Ξ',
    BTC: '₿',
  };
  
  const symbol = symbols[currency] || '';
  
  // 对于加密货币，显示更多小数位
  if (['ETH', 'BTC'].includes(currency)) {
    return `${symbol}${price.toFixed(6)}`;
  }
  
  return `${symbol}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * NFT特有信息展示
 */
function NFTInfo({ metadata }: { metadata: MultiAssetProduct['metadata'] }) {
  if (!metadata) return null;
  
  return (
    <div className="flex flex-wrap gap-2 mt-2 text-xs">
      {metadata.chain && (
        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full flex items-center gap-1">
          <Coins size={10} />
          {metadata.chain}
        </span>
      )}
      {metadata.rarity && (
        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full">
          ✨ {metadata.rarity}
        </span>
      )}
      {metadata.contractAddress && (
        <span className="px-2 py-0.5 bg-slate-500/20 text-slate-300 rounded-full flex items-center gap-1 cursor-pointer hover:bg-slate-500/30">
          <ExternalLink size={10} />
          {metadata.contractAddress.slice(0, 6)}...{metadata.contractAddress.slice(-4)}
        </span>
      )}
    </div>
  );
}

/**
 * FT代币特有信息展示
 */
function FTInfo({ metadata }: { metadata: MultiAssetProduct['metadata'] }) {
  if (!metadata) return null;
  
  return (
    <div className="flex flex-wrap gap-2 mt-2 text-xs">
      {metadata.tokenSymbol && (
        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full font-mono">
          ${metadata.tokenSymbol}
        </span>
      )}
      {metadata.priceChange24h !== undefined && (
        <span className={`px-2 py-0.5 rounded-full ${
          metadata.priceChange24h >= 0 
            ? 'bg-green-500/20 text-green-300' 
            : 'bg-red-500/20 text-red-300'
        }`}>
          {metadata.priceChange24h >= 0 ? '↑' : '↓'} {Math.abs(metadata.priceChange24h).toFixed(2)}%
        </span>
      )}
      {metadata.marketCap && (
        <span className="px-2 py-0.5 bg-slate-500/20 text-slate-300 rounded-full">
          MC: {metadata.marketCap}
        </span>
      )}
    </div>
  );
}

/**
 * 服务特有信息展示
 */
function ServiceInfo({ metadata }: { metadata: MultiAssetProduct['metadata'] }) {
  if (!metadata) return null;
  
  return (
    <div className="flex flex-wrap gap-2 mt-2 text-xs">
      {metadata.duration && (
        <span className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full flex items-center gap-1">
          <Clock size={10} />
          {metadata.duration}
        </span>
      )}
      {metadata.deliveryTime && (
        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full flex items-center gap-1">
          <Zap size={10} />
          {metadata.deliveryTime}
        </span>
      )}
    </div>
  );
}

/**
 * 多资产类型商品卡片
 */
export function MultiAssetProductCard({
  product,
  onAddToCart,
  onViewDetail,
  onBuyNow,
  isAddingToCart = false,
  isPaying = false,
  compact = false,
}: MultiAssetProductCardProps) {
  const [imageError, setImageError] = useState(false);
  
  // 优先使用顶级assetType，然后是metadata中的字段
  const assetType = (product.assetType || product.metadata?.assetType || product.metadata?.productType || 'physical') as AssetType;
  const config = getAssetTypeConfig(assetType);
  const imageUrl = product.image || product.metadata?.image;
  const currency = product.currency || product.metadata?.currency || 'CNY';
  
  // 紧凑模式（用于列表）
  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r ${config.bgColor} border ${config.borderColor} hover:scale-[1.02] transition-all cursor-pointer`}
           onClick={() => onViewDetail?.(product)}>
        {/* 图片/图标 */}
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center">
          {imageUrl && !imageError ? (
            <img 
              src={imageUrl} 
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <span className="text-2xl">{config.icon}</span>
          )}
        </div>
        
        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs ${config.color}`}>{config.label}</span>
          </div>
          <div className="font-medium text-white truncate">{product.name}</div>
          <div className={`text-sm font-bold ${config.color}`}>
            {formatPrice(product.price, currency)}
          </div>
        </div>
        
        {/* 快捷操作 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart?.(product.id, 1);
          }}
          disabled={isAddingToCart}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-50"
        >
          <ShoppingCart size={16} />
        </button>
      </div>
    );
  }
  
  // 完整卡片模式
  return (
    <div className={`rounded-xl overflow-hidden bg-gradient-to-br ${config.bgColor} border ${config.borderColor} hover:shadow-lg hover:shadow-${config.color.replace('text-', '')}/20 transition-all`}>
      {/* 图片区域 */}
      <div className="relative aspect-square bg-slate-800">
        {imageUrl && !imageError ? (
          <img 
            src={imageUrl} 
            alt={product.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">{config.icon}</span>
          </div>
        )}
        
        {/* 资产类型标签 */}
        <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-medium ${config.color} bg-black/50 backdrop-blur-sm flex items-center gap-1`}>
          <span>{config.icon}</span>
          <span>{config.label}</span>
        </div>
        
        {/* 库存/稀缺性 */}
        {product.stock !== undefined && product.stock <= 10 && product.stock > 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium text-orange-300 bg-orange-500/30 backdrop-blur-sm">
            仅剩 {product.stock} 件
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium text-red-300 bg-red-500/30 backdrop-blur-sm">
            已售罄
          </div>
        )}
      </div>
      
      {/* 信息区域 */}
      <div className="p-4">
        {/* 分类 */}
        {product.category && (
          <div className="text-xs text-slate-400 mb-1">{product.category}</div>
        )}
        
        {/* 名称 */}
        <h3 className="font-semibold text-white mb-1 line-clamp-2">{product.name}</h3>
        
        {/* 描述 */}
        {product.description && (
          <p className="text-xs text-slate-400 mb-2 line-clamp-2">{product.description}</p>
        )}
        
        {/* 资产类型特有信息 */}
        {assetType === 'nft' && <NFTInfo metadata={product.metadata} />}
        {assetType === 'ft' && <FTInfo metadata={product.metadata} />}
        {assetType === 'service' && <ServiceInfo metadata={product.metadata} />}
        
        {/* 价格 */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-xl font-bold ${config.color}`}>
            {formatPrice(product.price, currency)}
          </span>
          <span className="text-xs text-slate-500">{currency}</span>
        </div>
        
        {/* 操作按钮 */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onViewDetail?.(product)}
            className="flex-1 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <Eye size={14} />
            详情
          </button>
          
          <button
            onClick={() => onBuyNow?.(product)}
            disabled={product.stock === 0 || isPaying}
            className={`flex-1 py-2 px-3 rounded-lg ${config.color.replace('text-', 'bg-').replace('-400', '-600')} hover:opacity-90 text-white text-sm font-medium flex items-center justify-center gap-1 transition-colors disabled:opacity-50`}
          >
            {isPaying ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                支付中...
              </>
            ) : (
              <>
                <Zap size={14} />
                立即购买
              </>
            )}
          </button>
          
          {(assetType === 'physical') && (
            <button
              onClick={() => onAddToCart?.(product.id, 1)}
              disabled={isAddingToCart || product.stock === 0}
              className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
            >
              {isAddingToCart ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <ShoppingCart size={14} />
              )}
              {isAddingToCart ? '添加中...' : '加入购物车'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 多资产商品网格展示
 */
interface MultiAssetProductGridProps {
  products: MultiAssetProduct[];
  onAddToCart?: (productId: string, quantity: number) => void;
  onViewDetail?: (product: MultiAssetProduct) => void;
  onBuyNow?: (product: MultiAssetProduct) => void;
  addingToCartId?: string | null;
  columns?: 2 | 3 | 4;
}

export function MultiAssetProductGrid({
  products,
  onAddToCart,
  onViewDetail,
  onBuyNow,
  addingToCartId,
  columns = 2,
}: MultiAssetProductGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  };
  
  return (
    <div className={`grid ${gridCols[columns]} gap-4`}>
      {products.map((product) => (
        <MultiAssetProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          onViewDetail={onViewDetail}
          onBuyNow={onBuyNow}
          isAddingToCart={addingToCartId === product.id}
        />
      ))}
    </div>
  );
}

/**
 * 多资产商品列表展示（紧凑模式）
 */
interface MultiAssetProductListProps {
  products: MultiAssetProduct[];
  onAddToCart?: (productId: string, quantity?: number) => void;
  onViewProduct?: (product: MultiAssetProduct) => void;
  onViewDetail?: (product: MultiAssetProduct) => void;
  onBuyNow?: (product: MultiAssetProduct) => void;
  isAddingToCart?: string | null;
  addingToCartId?: string | null;
  payingProductId?: string | null;
  maxDisplay?: number;
  layout?: 'list' | 'grid';
  showTotal?: boolean;
  totalCount?: number;
}

export function MultiAssetProductList({
  products,
  onAddToCart,
  onViewProduct,
  onViewDetail,
  onBuyNow,
  isAddingToCart,
  addingToCartId,
  payingProductId,
  maxDisplay = 5,
  layout = 'list',
  showTotal = false,
  totalCount,
}: MultiAssetProductListProps) {
  const displayProducts = products.slice(0, maxDisplay);
  const remainingCount = (totalCount || products.length) - maxDisplay;
  const handleViewDetail = onViewProduct || onViewDetail;
  const loadingId = isAddingToCart || addingToCartId;

  return (
    <div className="space-y-3">
      {showTotal && (
        <div className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-2">
          <span>🔍</span>
          <span>找到 {totalCount || products.length} 件商品</span>
        </div>
      )}
      <div className={layout === 'grid' 
        ? 'grid grid-cols-2 gap-2 max-h-96 overflow-y-auto'
        : 'space-y-2 max-h-96 overflow-y-auto'
      }>
        {displayProducts.map((product) => (
          <MultiAssetProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
            onViewDetail={handleViewDetail}
            onBuyNow={onBuyNow}
            isAddingToCart={loadingId === product.id}
            isPaying={payingProductId === product.id}
            compact
          />
        ))}
      </div>
      {remainingCount > 0 && (
        <div className="text-xs text-neutral-400 text-center">
          还有 {remainingCount} 件商品...
        </div>
      )}
    </div>
  );
}
