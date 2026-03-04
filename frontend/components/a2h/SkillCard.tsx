/**
 * SkillCard Component
 * 
 * V2.0: 统一的 Skill 卡片组件，用于展示所有类型的 Skill
 */

import React from 'react';
import Image from 'next/image';
import { 
  Zap, 
  Package, 
  Code, 
  Layers, 
  Star, 
  TrendingUp,
  ExternalLink,
  Play,
  ShoppingCart,
  Percent,
  Shield,
  Database,
  UserCheck,
  Wrench,
  Clock,
  BarChart3,
  Workflow,
} from 'lucide-react';
import { SkillLayer, SkillSource, SkillResourceType } from '../../types/skill';

export type SkillPersona = 'api_provider' | 'data_provider' | 'expert' | 'merchant' | 'developer';

export interface SkillCardProps {
  id?: string;
  name?: string;
  displayName?: string;
  description?: string;
  layer?: SkillLayer;
  category?: string;
  resourceType?: SkillResourceType;
  source?: SkillSource;
  persona?: SkillPersona;
  rating?: number;
  callCount?: number;
  price?: number;
  currency?: string;
  pricingType?: 'per_call' | 'subscription' | 'commission' | 'free';
  minFee?: number;
  commissionRate?: number;
  tags?: string[];
  authorName?: string;
  humanAccessible?: boolean;
  imageUrl?: string;
  thumbnailUrl?: string;
  ucpEnabled?: boolean;
  x402Enabled?: boolean;
  performanceMetric?: string;
  onClick?: () => void;
  onExecute?: () => void;
  onAddToCart?: () => void;
  onAction?: () => void;
  compact?: boolean;
  skill?: any;
}

// 层级图标映射
const layerIcons: Record<SkillLayer, React.ReactNode> = {
  infra: <Zap className="w-4 h-4" />,
  resource: <Package className="w-4 h-4" />,
  logic: <Code className="w-4 h-4" />,
  composite: <Layers className="w-4 h-4" />,
};

// 层级颜色映射
const layerColors: Record<SkillLayer, string> = {
  infra: 'bg-purple-100 text-purple-700 border-purple-200',
  resource: 'bg-green-100 text-green-700 border-green-200',
  logic: 'bg-blue-100 text-blue-700 border-blue-200',
  composite: 'bg-orange-100 text-orange-700 border-orange-200',
};

// 来源标签
const sourceLabels: Record<SkillSource, { label: string; color: string }> = {
  native: { label: 'Native', color: 'bg-emerald-500' },
  imported: { label: 'Imported', color: 'bg-sky-500' },
  converted: { label: 'Product', color: 'bg-amber-500' },
};

// 资源类型图标
const resourceTypeIcons: Record<SkillResourceType, string> = {
  physical: '📦',
  service: '🛠️',
  digital: '💾',
  data: '📊',
  logic: '⚙️',
};

export const SkillCard: React.FC<SkillCardProps> = (props) => {
  const {
    onClick,
    onExecute,
    onAddToCart,
    onAction,
    compact = false,
    skill,
  } = props;

  // 使用传入的 skill 对象或直接传入的 props
  const id = skill?.id || props.id;
  const name = skill?.name || props.name;
  const displayName = skill?.displayName || props.displayName;
  const description = skill?.description || props.description;
  const layer = (skill?.layer || props.layer || 'resource') as SkillLayer;
  const category = skill?.category || props.category;
  const resourceType = (skill?.resourceType || props.resourceType) as SkillResourceType;
  const source = (skill?.source || props.source || 'native') as SkillSource;
  const rating = skill?.rating || props.rating || 0;
  const callCount = skill?.callCount || props.callCount || 0;
  const price = skill?.price || skill?.pricing?.pricePerCall || props.price;
  const currency = skill?.currency || skill?.pricing?.currency || props.currency || 'USD';
  const tags = skill?.tags || props.tags || [];
  const authorName = skill?.authorName || skill?.authorInfo?.name || props.authorName;
  const humanAccessible = skill?.humanAccessible ?? props.humanAccessible ?? true;
  const imageUrl = skill?.imageUrl || skill?.thumbnailUrl || props.imageUrl || props.thumbnailUrl;
  
  // 新增：画像、佣金与协议支持
  const persona = skill?.metadata?.persona || props.persona || (layer === 'resource' ? 'merchant' : 'developer') as SkillPersona;
  const commissionRate = skill?.pricing?.commissionRate || props.commissionRate;
  const ucpEnabled = skill?.ucpEnabled ?? props.ucpEnabled ?? (layer === 'resource');
  const x402Enabled = skill?.x402Enabled ?? props.x402Enabled ?? true;
  const performanceMetric = skill?.metadata?.performanceMetric || props.performanceMetric;

  const handleAction = onAction || onExecute || onClick;
  const isResource = layer === 'resource';
  const hasPrice = price !== undefined && price > 0;
  const hasImage = !!imageUrl;

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
        onClick={handleAction}
      >
        {hasImage ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
            <Image 
              src={imageUrl} 
              alt={displayName || name} 
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className={`p-2 rounded-lg ${layerColors[layer]}`}>
            {layerIcons[layer]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-slate-900 truncate">
            {displayName || name}
          </h4>
          <p className="text-xs text-slate-500 truncate">{description}</p>
        </div>
        {hasPrice && (
          <div className="text-sm font-semibold text-slate-900">
            ${price}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`group relative bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300 cursor-pointer`}
      onClick={handleAction}
    >
      {hasImage && (
        <div className="relative w-full h-40 overflow-hidden bg-slate-100">
          <Image 
            src={imageUrl} 
            alt={displayName || name} 
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
          {/* Protocol Badges - Bottom Left */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            {ucpEnabled && (
              <span className="px-1.5 py-0.5 text-[9px] font-medium bg-emerald-500/90 text-white rounded flex items-center gap-0.5" title="UCP 物流履约">
                📦 UCP
              </span>
            )}
            {x402Enabled && (
              <span className="px-1.5 py-0.5 text-[9px] font-medium bg-amber-500/90 text-white rounded flex items-center gap-0.5" title="X402 瞬时结算">
                ⚡ X402
              </span>
            )}
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            {/* Source Badge */}
            <span className={`px-2 py-0.5 text-[10px] font-bold text-white rounded-full ${sourceLabels[source].color}`}>
              {sourceLabels[source].label}
            </span>
            {/* Resource Type */}
            {resourceType && (
              <span className="text-sm bg-white/90 rounded-full px-1.5" title={resourceType}>
                {resourceTypeIcons[resourceType]}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 pb-3">
        {!hasImage && (
          <div className="flex items-start justify-between gap-3">
            <div className={`p-2.5 rounded-xl ${layerColors[layer]} border`}>
              {layerIcons[layer]}
            </div>
            <div className="flex items-center gap-1.5">
              {/* Source Badge */}
              <span className={`px-2 py-0.5 text-[10px] font-bold text-white rounded-full ${sourceLabels[source].color}`}>
                {sourceLabels[source].label}
              </span>
              {/* Resource Type */}
              {resourceType && (
                <span className="text-sm" title={resourceType}>
                  {resourceTypeIcons[resourceType]}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Title & Description */}
        <div className={hasImage ? '' : 'mt-3'}>
          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
            {displayName || name}
          </h3>
          <p className="mt-1 text-sm text-slate-500 line-clamp-2">
            {description}
          </p>
        </div>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-slate-400">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats - Persona Adaptive */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
        {/* Persona-specific Performance Metrics */}
        {persona === 'api_provider' && (
          <div className="flex items-center gap-3 text-xs text-slate-600 mb-1.5">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              {performanceMetric || '~50ms'} 延迟
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5 text-green-500" />
              99.9% 可用
            </span>
          </div>
        )}
        {persona === 'data_provider' && (
          <div className="flex items-center gap-3 text-xs text-slate-600 mb-1.5">
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-purple-500" />
              {performanceMetric || '1M+'} 记录
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              隐私合规
            </span>
          </div>
        )}
        {persona === 'expert' && (
          <div className="flex items-center gap-3 text-xs text-slate-600 mb-1.5">
            <span className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-amber-500" />
              {performanceMetric || '专家认证'}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              98% 好评
            </span>
          </div>
        )}
        {persona === 'merchant' && (
          <div className="flex items-center gap-3 text-xs text-slate-600 mb-1.5">
            <span className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-orange-500" />
              {performanceMetric || '现货直发'}
            </span>
            {ucpEnabled && (
              <span className="flex items-center gap-1 text-emerald-600">
                <Workflow className="w-3.5 h-3.5" />
                UCP履约
              </span>
            )}
          </div>
        )}
        {persona === 'developer' && (
          <div className="flex items-center gap-3 text-xs text-slate-600 mb-1.5">
            <span className="flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-slate-500" />
              {performanceMetric || 'SDK Ready'}
            </span>
            <span className="flex items-center gap-1">
              <Code className="w-3.5 h-3.5 text-blue-500" />
              MIT协议
            </span>
          </div>
        )}
        
        {/* Common Stats Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                {rating.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {callCount.toLocaleString()} calls
            </span>
          </div>
          {authorName && (
            <span className="text-xs text-slate-400 truncate max-w-[100px]">
              by {authorName}
            </span>
          )}
        </div>
      </div>

      {/* Footer Actions with Commission Display */}
      <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {props.pricingType === 'commission' ? (
            <div className="font-bold text-slate-900">
              <span className="text-lg">{commissionRate || price}%</span>
              <span className="text-xs text-slate-400 ml-1">抽成</span>
              {props.minFee && (
                <span className="text-xs text-slate-400 ml-1">(最低 ${props.minFee})</span>
              )}
            </div>
          ) : hasPrice ? (
            <div className="font-bold text-slate-900">
              <span className="text-lg">${price}</span>
              <span className="text-xs text-slate-400 ml-1">{currency}</span>
            </div>
          ) : (
            <span className="text-sm font-medium text-emerald-600">Free</span>
          )}
          
          {/* Commission Rate Badge */}
          {props.pricingType !== 'commission' && commissionRate > 0 && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-medium rounded" title="分佣比例">
              <Percent className="w-3 h-3" />
              {commissionRate}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isResource && onAddToCart && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart();
              }}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Add to Cart"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          )}
          {humanAccessible && handleAction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAction();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              {isResource ? 'Buy' : 'Execute'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkillCard;
