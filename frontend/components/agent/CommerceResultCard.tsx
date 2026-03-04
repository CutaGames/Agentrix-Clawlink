import { CheckCircle, AlertCircle, Clock, ExternalLink, Copy, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export type CommerceResultStatus = 'success' | 'pending' | 'error';

export interface CommerceResultData {
  status: CommerceResultStatus;
  type: string; // payment, split, budget, milestone, publish, etc.
  title: string;
  id?: string;
  ucpRef?: string;
  x402Ref?: string;
  fields: Array<{
    label: string;
    value: string;
    highlight?: boolean;
  }>;
  actions?: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
  detailUrl?: string;
  errorMessage?: string;
  suggestion?: string;
}

interface CommerceResultCardProps {
  data: CommerceResultData;
  onAction?: (action: string) => void;
  onRetry?: () => void;
}

/**
 * 统一的 Commerce 操作结果卡片
 * 支持 UCP/X402 协议标识和状态可视化
 */
export function CommerceResultCard({ data, onAction, onRetry }: CommerceResultCardProps) {
  const [copied, setCopied] = useState(false);

  const statusConfig = {
    success: {
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      label: '成功',
    },
    pending: {
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      label: '处理中',
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      label: '失败',
    },
  };

  const config = statusConfig[data.status];
  const StatusIcon = config.icon;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const typeIcons: Record<string, string> = {
    payment: '💰',
    receive: '💳',
    exchange: '💱',
    split: '📊',
    budget: '🏦',
    milestone: '🎯',
    collaboration: '🤝',
    publish_task: '📋',
    publish_product: '📦',
    publish_skill: '⚡',
    fees: '🧮',
    rates: '📈',
  };

  return (
    <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-4`}>
      {/* 头部：状态 + 类型 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${config.color}`} />
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
          <span className="text-lg">{typeIcons[data.type] || '📌'}</span>
          <span className="text-sm text-slate-300">{data.title}</span>
        </div>
        
        {/* 协议标识 */}
        <div className="flex gap-2">
          {data.ucpRef && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
              UCP
            </span>
          )}
          {data.x402Ref && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
              X402
            </span>
          )}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="h-px bg-slate-700/50 mb-3" />

      {/* 字段列表 */}
      <div className="space-y-2 mb-3">
        {data.fields.map((field, index) => (
          <div key={index} className="flex justify-between items-center text-sm">
            <span className="text-slate-400">{field.label}:</span>
            <span className={field.highlight ? 'text-indigo-300 font-medium' : 'text-slate-200'}>
              {field.value}
            </span>
          </div>
        ))}
      </div>

      {/* ID 信息（可复制） */}
      {(data.id || data.ucpRef || data.x402Ref) && (
        <div className="space-y-1 mb-3 text-xs">
          {data.id && (
            <div className="flex items-center gap-2 text-slate-500">
              <span>ID:</span>
              <code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">{data.id}</code>
              <button
                onClick={() => copyToClipboard(data.id!)}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <Copy className="w-3 h-3" />
              </button>
              {copied && <span className="text-green-400">已复制</span>}
            </div>
          )}
          {data.ucpRef && (
            <div className="flex items-center gap-2 text-slate-500">
              <span>UCP Ref:</span>
              <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">{data.ucpRef}</code>
            </div>
          )}
          {data.x402Ref && (
            <div className="flex items-center gap-2 text-slate-500">
              <span>X402 Ref:</span>
              <code className="bg-slate-800 px-1.5 py-0.5 rounded text-purple-300">{data.x402Ref}</code>
            </div>
          )}
        </div>
      )}

      {/* 错误信息 */}
      {data.status === 'error' && data.errorMessage && (
        <div className="mb-3 p-2 rounded bg-red-900/20 border border-red-500/30">
          <div className="text-xs text-red-300 mb-1">错误原因：{data.errorMessage}</div>
          {data.suggestion && (
            <div className="text-xs text-slate-400">建议：{data.suggestion}</div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-2">
        {data.status === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-600/80 text-white hover:bg-red-500"
          >
            <RefreshCw className="w-3 h-3" />
            重试
          </button>
        )}
        
        {data.actions?.map((action, index) => (
          <button
            key={index}
            onClick={() => onAction?.(action.action)}
            className={`px-3 py-1.5 text-xs rounded-lg ${
              action.primary
                ? 'bg-indigo-600/80 text-white hover:bg-indigo-500'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {action.label}
          </button>
        ))}
        
        {data.detailUrl && (
          <a
            href={data.detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            <ExternalLink className="w-3 h-3" />
            查看详情
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * 辅助函数：创建支付结果卡片数据
 */
export function createPaymentResult(
  success: boolean,
  amount: string,
  currency: string,
  recipient: string,
  txId?: string,
  x402Ref?: string,
): CommerceResultData {
  return {
    status: success ? 'success' : 'error',
    type: 'payment',
    title: '支付',
    id: txId,
    x402Ref,
    fields: [
      { label: '金额', value: `${amount} ${currency}`, highlight: true },
      { label: '收款方', value: recipient },
    ],
    actions: success
      ? [
          { label: '再次支付', action: 'payment_again' },
          { label: '查看交易', action: 'view_tx', primary: true },
        ]
      : [],
    errorMessage: success ? undefined : '支付失败',
    suggestion: success ? undefined : '请检查余额或网络状态后重试',
  };
}

/**
 * 辅助函数：创建发布结果卡片数据
 */
export function createPublishResult(
  success: boolean,
  type: 'task' | 'product' | 'skill',
  title: string,
  id?: string,
  ucpRef?: string,
  detailUrl?: string,
): CommerceResultData {
  const typeMap = {
    task: { type: 'publish_task', label: '协作任务' },
    product: { type: 'publish_product', label: '商品' },
    skill: { type: 'publish_skill', label: 'Skill' },
  };

  return {
    status: success ? 'success' : 'error',
    type: typeMap[type].type,
    title: `发布${typeMap[type].label}`,
    id,
    ucpRef,
    fields: [
      { label: '类型', value: typeMap[type].label },
      { label: '标题', value: title, highlight: true },
    ],
    actions: success
      ? [
          { label: '分享', action: 'share' },
          { label: '编辑', action: 'edit' },
        ]
      : [],
    detailUrl,
    errorMessage: success ? undefined : '发布失败',
    suggestion: success ? undefined : '请检查内容是否完整后重试',
  };
}

/**
 * 辅助函数：创建分账方案结果卡片数据
 */
export function createSplitResult(
  success: boolean,
  planName: string,
  ratios: { platform: number; merchant: number; agent: number },
  splitPlanId?: string,
  ucpRef?: string,
): CommerceResultData {
  return {
    status: success ? 'success' : 'error',
    type: 'split',
    title: '分账方案',
    id: splitPlanId,
    ucpRef,
    fields: [
      { label: '方案名称', value: planName, highlight: true },
      { label: '平台', value: `${ratios.platform}%` },
      { label: '商家', value: `${ratios.merchant}%` },
      { label: '代理', value: `${ratios.agent}%` },
    ],
    actions: success
      ? [
          { label: '激活方案', action: 'activate', primary: true },
          { label: '关联商品', action: 'link_product' },
        ]
      : [],
    errorMessage: success ? undefined : '创建失败',
    suggestion: success ? undefined : '请检查分账比例是否正确',
  };
}
