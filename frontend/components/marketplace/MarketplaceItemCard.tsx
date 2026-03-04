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
  Database,
  UserCheck,
  BarChart3,
  FileText,
  Plus,
  GitFork,
  Landmark,
} from 'lucide-react';

// 四层架构的用户友好标签
export type ItemLayer = 'infra' | 'resource' | 'logic' | 'composite';
export type ItemValueType = 'action' | 'deliverable' | 'decision' | 'data';
export type ItemSource = 'internal' | 'external_ucp' | 'partner' | 'mcp_registry';
export type ItemPersona = 'api_provider' | 'data_provider' | 'expert' | 'merchant' | 'developer';

export interface MarketplaceItemProps {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  layer?: ItemLayer;
  valueType?: ItemValueType;
  persona?: ItemPersona;
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
  performanceMetric?: string; // e.g., "99.9% Uptime" or "24h delivery"
  // Commerce 标识
  hasSplitPlan?: boolean;
  hasBudgetPool?: boolean;
  ucpEnabled?: boolean;
  x402Enabled?: boolean;
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
  persona,
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
  hasSplitPlan,
  hasBudgetPool,
  ucpEnabled,
  x402Enabled,
  onClick,
  onTryIt,
  onAddToCart,
  performanceMetric,
  variant = 'default',
}) => {
  const isCommerceSkill = hasSplitPlan || hasBudgetPool || ucpEnabled || x402Enabled;
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

  // Default 变体 (基于 Persona 自适应渲染)
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all overflow-hidden cursor-pointer group flex flex-col h-full ${
        persona === 'api_provider' ? 'border-l-4 border-l-blue-500' : 
        persona === 'merchant' ? 'border-l-4 border-l-emerald-500' :
        persona === 'data_provider' ? 'border-l-4 border-l-amber-500' :
        persona === 'expert' ? 'border-l-4 border-l-purple-500' : ''
      }`}
    >
      {/* 图片/头部区域 */}
      <div className="relative h-40 bg-slate-50 overflow-hidden flex-shrink-0">
        {hasImage ? (
          <img 
            src={imageUrl} 
            alt={displayName || name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-50">
            {persona === 'api_provider' && <Zap className="w-12 h-12 text-blue-200" />}
            {persona === 'data_provider' && <Database className="w-12 h-12 text-amber-200" />}
            {persona === 'expert' && <UserCheck className="w-12 h-12 text-purple-200" />}
            {persona === 'developer' && <Wrench className="w-12 h-12 text-indigo-200" />}
            {!persona && layerInfo.icon}
          </div>
        )}
        
        {/* 协议图标 (右上角) */}
        <div className="absolute top-2 right-2 flex gap-1">
          {supportsInstant && (
            <span className="w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm border border-amber-100" title="⚡️ 瞬时结算 (X402)">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            </span>
          )}
          {supportsDelivery && (
            <span className="w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm border border-blue-100" title="📦 物流履约 (UCP)">
              <Package className="w-3.5 h-3.5 text-blue-500" />
            </span>
          )}
        </div>

        {/* 状态/性能标记 (左上角) */}
        <div className="absolute top-2 left-2 flex gap-1">
          {slaGuarantee && (
            <div className="px-1.5 py-0.5 bg-slate-900/80 backdrop-blur-sm text-[9px] font-bold text-white rounded-md uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Shield className="w-2.5 h-2.5 text-emerald-400" />
              Verified
            </div>
          )}
          {isCommerceSkill && (
            <div className="px-1.5 py-0.5 bg-emerald-600/90 backdrop-blur-sm text-[9px] font-bold text-white rounded-md flex items-center gap-1 shadow-sm">
              <ShoppingCart className="w-2.5 h-2.5" />
              Commerce
            </div>
          )}
        </div>
        
        {/* 价格标签 */}
        <div className="absolute bottom-2 right-2">
          {isPaid ? (
            <div className="bg-slate-900/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-xs font-bold shadow-lg">
              ${price}
            </div>
          ) : (
            <div className="bg-emerald-500/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-xs font-bold shadow-lg">
              Free
            </div>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-3 flex-1 flex flex-col">
        {/* 分类与价值类型 */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter border ${layerInfo.color}`}>
              {layerInfo.labelZh}
            </span>
            {valueInfo && (
              <span className="text-xs" title={valueInfo.labelZh}>{valueInfo.emoji}</span>
            )}
            {hasSplitPlan && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                <GitFork className="w-2.5 h-2.5" />Split
              </span>
            )}
            {hasBudgetPool && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                <Landmark className="w-2.5 h-2.5" />Pool
              </span>
            )}
          </div>
          {performanceMetric && (
            <span className="text-[9px] font-medium text-slate-400 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {performanceMetric}
            </span>
          )}
        </div>

        {/* 标题 */}
        <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm line-clamp-1 mb-1">
          {displayName || name}
        </h3>
        
        {/* 针对不同画像的描述区域差异化 */}
        <div className="flex-1">
          <p className="text-xs text-slate-500 line-clamp-2 mb-2 min-h-[32px] leading-relaxed">
            {description}
          </p>

          {/* 实时数据采样 (针对 Data Provider) */}
          {persona === 'data_provider' && (
            <div className="mb-2 p-1.5 bg-slate-50 rounded-md border border-slate-100">
              <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5 font-mono">
                <span>SAMPLE_DATA</span>
                <BarChart3 className="w-2.5 h-2.5" />
              </div>
              <div className="text-[9px] text-slate-600 font-mono truncate">
                &#123; &quot;id&quot;: &quot;tx_982&quot;, &quot;val&quot;: 0.45 &#125;
              </div>
            </div>
          )}

          {/* 技术参数 (针对 API Provider / Developer) */}
          {(persona === 'api_provider' || persona === 'developer') && (
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <div className="px-1.5 py-0.5 bg-blue-50 rounded border border-blue-100 text-[9px] text-blue-700 flex items-center justify-between">
                <span>{persona === 'developer' ? 'Verson' : 'Latency'}</span>
                <span className="font-bold">{persona === 'developer' ? 'v1.2.0' : '~45ms'}</span>
              </div>
              <div className="px-1.5 py-0.5 bg-emerald-50 rounded border border-emerald-100 text-[9px] text-emerald-700 flex items-center justify-between">
                <span>{persona === 'developer' ? 'License' : 'Reliability'}</span>
                <span className="font-bold">{persona === 'developer' ? 'MIT' : '99.9%'}</span>
              </div>
            </div>
          )}

          {/* 专家详情 (针对 Expert) */}
          {persona === 'expert' && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex -space-x-1">
                {[1,2,3].map(i => (
                  <div key={i} className="w-4 h-4 rounded-full bg-slate-200 border border-white" />
                ))}
              </div>
              <span className="text-[9px] text-slate-400 font-medium">12位同行已调用</span>
            </div>
          )}
        </div>

        {/* 底部统计与分成 */}
        <div className="flex items-center justify-between text-[9px] text-slate-400 pt-2 border-t border-slate-50">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              {rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" />
              {callCount.toLocaleString()}
            </span>
          </div>
          
          {commissionRate && (
            <div className="px-1 py-0.5 bg-emerald-50 text-emerald-600 rounded flex items-center gap-0.5 font-bold">
              <Percent className="w-2 h-2" />
              {commissionRate}%
            </div>
          )}
        </div>

        {/* 操作区 */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
          {persona === 'expert' ? (
            <button
              onClick={(e) => { e.stopPropagation(); onTryIt?.(); }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-md shadow-purple-100"
            >
              <Workflow className="w-3 h-3" />
              执行逻辑
            </button>
          ) : persona === 'merchant' ? (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToCart?.(); }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-100"
            >
              <ShoppingCart className="w-3 h-3" />
              立即购入
            </button>
          ) : persona === 'developer' ? (
            <button
              onClick={(e) => { e.stopPropagation(); onTryIt?.(); }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
            >
              <Wrench className="w-3 h-3" />
              开发对接
            </button>
          ) : (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onTryIt?.(); }}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Play className="w-3 h-3" />
                试用
              </button>
              {isPaid && onAddToCart && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddToCart?.(); }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-100"
                >
                  <Plus className="w-3 h-3" />
                  订阅
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketplaceItemCard;
