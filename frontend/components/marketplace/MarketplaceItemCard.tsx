/**
 * Marketplace Item Card V2.0
 * 
 * 去术语化的商品/能力卡片，用于 "Capabilities & Assets" 展示
 * 
 * 设计原则：
 * - 弱化 UCP/X402/Skill 等技术术语
 * - 使用图标替代协议标签 (⚡️ = 瞬时调用, 📦 = 物流履约)
 * - 展示开发者分成比例
 * - 支持多种模板：商品类、工具类、工作流类
 */

import React from 'react';
import { 
  Zap, 
  Package, 
  Wrench, 
  Workflow,
  Star, 
  TrendingUp,
  ExternalLink,
  Play,
  ShoppingCart,
  Percent,
  Users,
  Clock,
  Shield,
  CheckCircle,
} from 'lucide-react';

// 四层架构的用户友好标签
export type ItemLayer = 'infra' | 'resource' | 'logic' | 'composite';
export type ItemValueType = 'action' | 'deliverable' | 'decision' | 'data';
export type ItemSource = 'internal' | 'external_ucp' | 'partner' | 'mcp_registry';

export interface MarketplaceItemProps {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  layer?: ItemLayer;
  valueType?: ItemValueType;
  source?: ItemSource;
  rating?: number;
  callCount?: number;
  // 定价
  pricingType?: 'free' | 'per_call' | 'subscription' | 'revenue_share';
  price?: number;
  currency?: string;
  commissionRate?: number; // 开发者分成比例
  // 协议支持 (图标化展示)
  supportsInstant?: boolean;  // ⚡️ X402 瞬时调用
  supportsDelivery?: boolean; // 📦 UCP 物流履约
  // 元信息
  authorName?: string;
  authorAvatar?: string;
  imageUrl?: string;
  tags?: string[];
  slaGuarantee?: boolean;
  // 交互
  onClick?: () => void;
  onTryIt?: () => void;
  onAddToCart?: () => void;
  variant?: 'default' | 'compact' | 'featured';
}

// 层级配置 (V2.0 去术语化)
const layerConfig: Record<ItemLayer, { icon: React.ReactNode; label: string; labelZh: string; color: string }> = {
  infra: { 
    icon: <Shield className="w-4 h-4" />, 
    label: 'Essential Tools',
    labelZh: '核心工具',
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
  },
  resource: { 
    icon: <Package className="w-4 h-4" />, 
    label: 'Marketplace Items',
    labelZh: '商品服务',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
  },
  logic: { 
    icon: <Wrench className="w-4 h-4" />, 
    label: 'Add-ons & Plugins',
    labelZh: '插件扩展',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  },
  composite: { 
    icon: <Workflow className="w-4 h-4" />, 
    label: 'Agent Workflows',
    labelZh: '自动化流',
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/20'
  },
};

// 价值类型配置
const valueTypeConfig: Record<ItemValueType, { emoji: string; label: string; labelZh: string }> = {
  action: { emoji: '🎯', label: 'Action', labelZh: '交易执行' },
  deliverable: { emoji: '📄', label: 'Deliverable', labelZh: '结果交付' },
  decision: { emoji: '🧠', label: 'Decision', labelZh: '决策支持' },
  data: { emoji: '📊', label: 'Data Access', labelZh: '数据访问' },
};

export const MarketplaceItemCard: React.FC<MarketplaceItemProps> = ({
  id,
  name,
  displayName,
  description,
  layer = 'resource',
  valueType,
  source,
  rating = 0,
  callCount = 0,
  pricingType = 'free',
  price,
  currency = 'USD',
  commissionRate,
  supportsInstant,
  supportsDelivery,
  authorName,
  authorAvatar,
  imageUrl,
  tags = [],
  slaGuarantee,
  onClick,
  onTryIt,
  onAddToCart,
  variant = 'default',
}) => {
  const layerInfo = layerConfig[layer];
  const valueInfo = valueType ? valueTypeConfig[valueType] : null;
  const hasImage = !!imageUrl;
  const isPaid = pricingType !== 'free' && price && price > 0;

  // 价格显示
  const renderPrice = () => {
    if (pricingType === 'free') {
      return <span className="text-emerald-600 font-bold">Free</span>;
    }
    if (pricingType === 'per_call') {
      return <span className="text-slate-900 font-bold">${price}<span className="text-xs text-slate-500">/call</span></span>;
    }
    if (pricingType === 'revenue_share' && commissionRate) {
      return <span className="text-blue-600 font-bold">{commissionRate}% <span className="text-xs">分成</span></span>;
    }
    return price ? <span className="font-bold">${price}</span> : null;
  };

  // Compact 变体
  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
      >
        {hasImage ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
            <img src={imageUrl} alt={displayName || name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${layerInfo.color}`}>
            {layerInfo.icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
              {displayName || name}
            </h4>
            {/* 协议图标 */}
            {supportsInstant && <span title="瞬时调用"><Zap className="w-3.5 h-3.5 text-amber-500" /></span>}
            {supportsDelivery && <span title="物流履约"><Package className="w-3.5 h-3.5 text-blue-500" /></span>}
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">{description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          {renderPrice()}
        </div>
      </div>
    );
  }

  // Featured 变体 (大卡片)
  if (variant === 'featured') {
    return (
      <div
        onClick={onClick}
        className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden cursor-pointer group"
      >
        {hasImage && (
          <div className="absolute inset-0 opacity-30 group-hover:opacity-40 transition-opacity">
            <img src={imageUrl} alt={displayName || name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="relative p-6">
          {/* 标签区 */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${layerInfo.color}`}>
              {layerInfo.icon}
              {layerInfo.labelZh}
            </span>
            {valueInfo && (
              <span className="text-lg">{valueInfo.emoji}</span>
            )}
            {supportsInstant && <Zap className="w-4 h-4 text-amber-400" />}
            {supportsDelivery && <Package className="w-4 h-4 text-blue-400" />}
          </div>

          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
            {displayName || name}
          </h3>
          <p className="text-slate-400 text-sm line-clamp-2 mb-4">{description}</p>

          {/* 底部信息 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="w-4 h-4 fill-current" />
                {rating.toFixed(1)}
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <TrendingUp className="w-4 h-4" />
                {callCount.toLocaleString()}
              </span>
              {commissionRate && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Percent className="w-4 h-4" />
                  {commissionRate}% 收益
                </span>
              )}
            </div>
            <div className="text-white">
              {renderPrice()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default 变体
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all overflow-hidden cursor-pointer group"
    >
      {/* 图片区域 */}
      {hasImage && (
        <div className="relative h-40 bg-slate-100 overflow-hidden">
          <img 
            src={imageUrl} 
            alt={displayName || name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* 协议图标 (右上角) */}
          <div className="absolute top-2 right-2 flex gap-1">
            {supportsInstant && (
              <span className="w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm" title="瞬时调用">
                <Zap className="w-4 h-4 text-amber-500" />
              </span>
            )}
            {supportsDelivery && (
              <span className="w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm" title="物流履约">
                <Package className="w-4 h-4 text-blue-500" />
              </span>
            )}
          </div>
          {/* 价格标签 */}
          {isPaid && (
            <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-sm font-semibold">
              ${price}
            </div>
          )}
          {pricingType === 'free' && (
            <div className="absolute bottom-2 right-2 bg-emerald-500/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-sm font-bold">
              Free
            </div>
          )}
        </div>
      )}

      {/* 内容区域 */}
      <div className="p-4">
        {/* 分类标签 */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${layerInfo.color}`}>
            {layerInfo.icon}
            {layerInfo.labelZh}
          </span>
          {valueInfo && (
            <span className="text-sm" title={valueInfo.labelZh}>{valueInfo.emoji}</span>
          )}
          {slaGuarantee && (
            <span className="flex items-center gap-0.5 text-xs text-emerald-600">
              <CheckCircle className="w-3 h-3" />
              SLA
            </span>
          )}
        </div>

        {/* 标题 */}
        <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1">
          {displayName || name}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-2 mb-3 min-h-[40px]">{description}</p>

        {/* 统计信息 */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              {rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {callCount.toLocaleString()}
            </span>
          </div>
          {/* 开发者分成 */}
          {commissionRate && (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <Percent className="w-3.5 h-3.5" />
              {commissionRate}% 收益
            </span>
          )}
        </div>

        {/* 作者信息 */}
        {authorName && (
          <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
            {authorAvatar ? (
              <img src={authorAvatar} alt={authorName} className="w-5 h-5 rounded-full" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-500">
                {authorName.charAt(0)}
              </div>
            )}
            <span className="text-xs text-slate-500">by {authorName}</span>
          </div>
        )}

        {/* 操作按钮 */}
        {!hasImage && (
          <div className="flex gap-2 mt-3">
            {onTryIt && (
              <button
                onClick={(e) => { e.stopPropagation(); onTryIt(); }}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Play className="w-4 h-4" />
                试用
              </button>
            )}
            {onAddToCart && isPaid && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                购买
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplaceItemCard;
