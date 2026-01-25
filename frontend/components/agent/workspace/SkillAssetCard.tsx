'use client';

import React from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { 
  Cpu,
  DollarSign,
  Activity,
  Bot,
  Edit,
  Eye,
  ExternalLink,
  MoreHorizontal,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Pause,
  Zap,
  Database,
  Code,
  Package
} from 'lucide-react';

export type SkillStatus = 'active' | 'pending_review' | 'draft' | 'rejected' | 'suspended';
export type SkillType = 'api' | 'agent' | 'product' | 'workflow' | 'data' | 'other';
export type PricingType = 'per_call' | 'subscription' | 'free' | 'one_time';

export interface SkillAsset {
  id: string;
  name: string;
  description: string;
  type: SkillType;
  status: SkillStatus;
  pricingType: PricingType;
  price?: number;
  currency?: string;
  // 7-day stats snapshot
  calls7d?: number;
  revenue7d?: number;
  agentCount7d?: number;
  // Protocol distribution
  platforms?: string[];
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

interface SkillAssetCardProps {
  skill: SkillAsset;
  viewMode?: 'card' | 'table';
  onViewDetails?: (skillId: string) => void;
  onEdit?: (skillId: string) => void;
  onPromote?: (skillId: string) => void;
  onMoreActions?: (skillId: string) => void;
}

export function SkillAssetCard({ 
  skill, 
  viewMode = 'card',
  onViewDetails,
  onEdit,
  onPromote,
  onMoreActions
}: SkillAssetCardProps) {
  const { t } = useLocalization();

  const getTypeIcon = (type: SkillType) => {
    const icons = {
      api: Code,
      agent: Bot,
      product: Package,
      workflow: Zap,
      data: Database,
      other: Cpu,
    };
    return icons[type] || Cpu;
  };

  const getTypeLabel = (type: SkillType) => {
    const labels = {
      api: 'API',
      agent: 'Agent',
      product: t({ zh: '商品', en: 'Product' }),
      workflow: 'Workflow',
      data: t({ zh: '数据', en: 'Data' }),
      other: t({ zh: '其他', en: 'Other' }),
    };
    return labels[type] || type;
  };

  const getStatusConfig = (status: SkillStatus) => {
    const configs = {
      active: {
        label: t({ zh: '已发布', en: 'Active' }),
        color: 'bg-green-500/10 text-green-400 border-green-500/20',
        icon: CheckCircle2,
      },
      pending_review: {
        label: t({ zh: '审核中', en: 'Pending' }),
        color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        icon: Clock,
      },
      draft: {
        label: t({ zh: '草稿', en: 'Draft' }),
        color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        icon: Edit,
      },
      rejected: {
        label: t({ zh: '已拒绝', en: 'Rejected' }),
        color: 'bg-red-500/10 text-red-400 border-red-500/20',
        icon: XCircle,
      },
      suspended: {
        label: t({ zh: '已下线', en: 'Suspended' }),
        color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        icon: Pause,
      },
    };
    return configs[status] || configs.draft;
  };

  const getPricingLabel = () => {
    if (skill.pricingType === 'free') return t({ zh: '免费', en: 'Free' });
    if (skill.pricingType === 'per_call') {
      return `$${skill.price?.toFixed(2) || '0.00'}/${t({ zh: '次', en: 'call' })}`;
    }
    if (skill.pricingType === 'subscription') {
      return `$${skill.price?.toFixed(0) || '0'}/${t({ zh: '月', en: 'mo' })}`;
    }
    if (skill.pricingType === 'one_time') {
      return `$${skill.price?.toFixed(2) || '0.00'}`;
    }
    return `$${skill.price || '0'}`;
  };

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const TypeIcon = getTypeIcon(skill.type);
  const statusConfig = getStatusConfig(skill.status);
  const StatusIcon = statusConfig.icon;

  if (viewMode === 'table') {
    return (
      <tr className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              {skill.coverImage ? (
                <img src={skill.coverImage} alt={skill.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <TypeIcon className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <div className="font-medium text-white">{skill.name}</div>
              <div className="text-xs text-slate-400 line-clamp-1">{skill.description}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">
            {getTypeLabel(skill.type)}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${statusConfig.color}`}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-slate-300">{getPricingLabel()}</td>
        <td className="px-4 py-3 text-sm text-slate-300">{formatNumber(skill.calls7d)}</td>
        <td className="px-4 py-3 text-sm text-green-400">${skill.revenue7d?.toFixed(2) || '0.00'}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button 
              onClick={() => onViewDetails?.(skill.id)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title={t({ zh: '查看详情', en: 'View Details' })}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onEdit?.(skill.id)}
              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
              title={t({ zh: '编辑', en: 'Edit' })}
            >
              <Edit className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onMoreActions?.(skill.id)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title={t({ zh: '更多', en: 'More' })}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800/70 hover:border-slate-600/50 transition-all group">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {/* Cover */}
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          {skill.coverImage ? (
            <img src={skill.coverImage} alt={skill.name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <TypeIcon className="w-8 h-8 text-white" />
          )}
        </div>

        {/* Basic Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{skill.name}</h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 uppercase">
              {getTypeLabel(skill.type)}
            </span>
          </div>
          <p className="text-sm text-slate-400 line-clamp-2 mb-2">{skill.description}</p>
          
          {/* Status Badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${statusConfig.color}`}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Business Summary */}
      <div className="p-3 bg-slate-900/50 rounded-lg mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500 uppercase tracking-wider">
            {t({ zh: '商业摘要', en: 'Business Summary' })}
          </span>
          <span className="text-xs text-slate-400">
            {t({ zh: '平台默认分佣', en: 'Platform commission' })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-400" />
          <span className="text-lg font-bold text-white">{getPricingLabel()}</span>
          <span className="text-xs text-slate-500">
            {skill.pricingType === 'per_call' && t({ zh: '按次计费', en: 'Per call' })}
            {skill.pricingType === 'subscription' && t({ zh: '订阅制', en: 'Subscription' })}
            {skill.pricingType === 'free' && t({ zh: '免费使用', en: 'Free' })}
            {skill.pricingType === 'one_time' && t({ zh: '一次性', en: 'One-time' })}
          </span>
        </div>
      </div>

      {/* 7-Day Stats Snapshot */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-slate-900/30 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
            <Activity className="w-3 h-3" />
            <span className="text-[10px] uppercase">{t({ zh: '调用', en: 'Calls' })}</span>
          </div>
          <div className="text-sm font-bold text-white">{formatNumber(skill.calls7d)}</div>
        </div>
        <div className="text-center p-2 bg-slate-900/30 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
            <DollarSign className="w-3 h-3" />
            <span className="text-[10px] uppercase">{t({ zh: '收入', en: 'Revenue' })}</span>
          </div>
          <div className="text-sm font-bold text-green-400">${skill.revenue7d?.toFixed(2) || '0.00'}</div>
        </div>
        <div className="text-center p-2 bg-slate-900/30 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
            <Bot className="w-3 h-3" />
            <span className="text-[10px] uppercase">Agents</span>
          </div>
          <div className="text-sm font-bold text-white">{skill.agentCount7d || 0}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-700/50">
        <button 
          onClick={() => onViewDetails?.(skill.id)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          {t({ zh: '查看详情', en: 'Details' })}
        </button>
        <button 
          onClick={() => onEdit?.(skill.id)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-blue-400 bg-slate-700/50 hover:bg-blue-500/10 rounded-lg transition-colors"
        >
          <Edit className="w-3.5 h-3.5" />
          {t({ zh: '编辑', en: 'Edit' })}
        </button>
        <button 
          onClick={() => onPromote?.(skill.id)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-green-400 bg-slate-700/50 hover:bg-green-500/10 rounded-lg transition-colors"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          {t({ zh: '推广', en: 'Promote' })}
        </button>
        <button 
          onClick={() => onMoreActions?.(skill.id)}
          className="p-2 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default SkillAssetCard;
