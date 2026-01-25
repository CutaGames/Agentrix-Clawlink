/**
 * Skill Detail Modal V2.0
 * 
 * 深度详情页模态框，支持三种模板：
 * 1. 商品类 (resource) - 大图、规格、商家信息
 * 2. 工具类 (logic) - Playground演练场、API示例
 * 3. Agent工作流类 (composite) - 流程图、协作Agent列表
 * 
 * V2.0 特性：
 * - Agent集成指南 (JSON代码示例)
 * - Playground预览调用
 * - Revenue Share展示
 * - SLA标志
 */

import React, { useState } from 'react';
import { 
  X, 
  Zap, 
  Package, 
  Star, 
  TrendingUp,
  Play,
  ShoppingCart,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Shield,
  Percent,
  Code,
  BookOpen,
  Terminal,
  ChevronRight,
  Users,
  Workflow,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export interface SkillDetailProps {
  isOpen: boolean;
  onClose: () => void;
  skill: {
    id: string;
    name: string;
    displayName?: string;
    description?: string;
    layer?: 'infra' | 'resource' | 'logic' | 'composite';
    valueType?: 'action' | 'deliverable' | 'decision' | 'data';
    rating?: number;
    callCount?: number;
    // 定价
    pricingType?: 'free' | 'per_call' | 'subscription' | 'revenue_share';
    price?: number;
    currency?: string;
    commissionRate?: number;
    // 协议
    ucpEnabled?: boolean;
    x402Enabled?: boolean;
    // 元信息
    authorName?: string;
    authorAvatar?: string;
    imageUrl?: string;
    images?: string[];
    tags?: string[];
    version?: string;
    // 输入输出Schema
    inputSchema?: any;
    outputSchema?: any;
    // SLA
    slaGuarantee?: boolean;
    avgResponseTime?: number;
    successRate?: number;
  };
  onTryIt?: (params: any) => Promise<any>;
  onPurchase?: () => void;
  onAddToAgent?: () => void;
}

// 层级配置
const layerLabels = {
  infra: { label: '核心工具', color: 'purple' },
  resource: { label: '商品服务', color: 'emerald' },
  logic: { label: '插件扩展', color: 'blue' },
  composite: { label: '自动化流', color: 'orange' },
};

const valueTypeLabels = {
  action: { emoji: '🎯', label: '交易执行', desc: '改变现实世界状态' },
  deliverable: { emoji: '📄', label: '结果交付', desc: '输出确定性交付物' },
  decision: { emoji: '🧠', label: '决策支持', desc: '专业判断与建议' },
  data: { emoji: '📊', label: '数据访问', desc: '独家数据源' },
};

export const SkillDetailModal: React.FC<SkillDetailProps> = ({
  isOpen,
  onClose,
  skill,
  onTryIt,
  onPurchase,
  onAddToAgent,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'integrate' | 'playground'>('overview');
  const [copied, setCopied] = useState(false);
  const [playgroundInput, setPlaygroundInput] = useState('{}');
  const [playgroundOutput, setPlaygroundOutput] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) return null;

  const layer = skill.layer || 'resource';
  const layerInfo = layerLabels[layer];
  const valueInfo = skill.valueType ? valueTypeLabels[skill.valueType] : null;
  const isPaid = skill.pricingType !== 'free' && skill.price && skill.price > 0;

  // 生成集成代码示例
  const integrationCode = `// 在您的 Agent 中集成 "${skill.displayName || skill.name}"
const response = await agentrix.skills.execute({
  skillId: "${skill.id}",
  params: {
    // 根据输入Schema填写参数
    ${skill.inputSchema?.properties 
      ? Object.keys(skill.inputSchema.properties).map(k => `${k}: "your_value"`).join(',\n    ')
      : '// 无需参数'
    }
  }
});

// 处理返回结果
console.log(response.result);`;

  const copyCode = () => {
    navigator.clipboard.writeText(integrationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runPlayground = async () => {
    if (!onTryIt) return;
    setIsRunning(true);
    try {
      const params = JSON.parse(playgroundInput);
      const result = await onTryIt(params);
      setPlaygroundOutput(result);
    } catch (err: any) {
      setPlaygroundOutput({ error: err.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-slate-100">
          {skill.imageUrl ? (
            <img 
              src={skill.imageUrl} 
              alt={skill.displayName || skill.name}
              className="w-20 h-20 rounded-xl object-cover"
            />
          ) : (
            <div className={`w-20 h-20 rounded-xl bg-${layerInfo.color}-100 flex items-center justify-center`}>
              {layer === 'resource' && <Package className={`w-8 h-8 text-${layerInfo.color}-600`} />}
              {layer === 'logic' && <Code className={`w-8 h-8 text-${layerInfo.color}-600`} />}
              {layer === 'composite' && <Workflow className={`w-8 h-8 text-${layerInfo.color}-600`} />}
              {layer === 'infra' && <Shield className={`w-8 h-8 text-${layerInfo.color}-600`} />}
            </div>
          )}
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium bg-${layerInfo.color}-100 text-${layerInfo.color}-700`}>
                {layerInfo.label}
              </span>
              {valueInfo && <span className="text-sm">{valueInfo.emoji} {valueInfo.label}</span>}
              {skill.x402Enabled && <span title="瞬时调用"><Zap className="w-4 h-4 text-amber-500" /></span>}
              {skill.ucpEnabled && <span title="物流履约"><Package className="w-4 h-4 text-blue-500" /></span>}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{skill.displayName || skill.name}</h2>
            <p className="text-sm text-slate-500 mt-1">{skill.description}</p>
            
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                {(skill.rating || 0).toFixed(1)}
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <TrendingUp className="w-4 h-4" />
                {(skill.callCount || 0).toLocaleString()} 次调用
              </span>
              {skill.commissionRate && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <Percent className="w-4 h-4" />
                  {skill.commissionRate}% 开发者收益
                </span>
              )}
              {skill.slaGuarantee && (
                <span className="flex items-center gap-1 text-blue-600">
                  <CheckCircle className="w-4 h-4" />
                  SLA保障
                </span>
              )}
            </div>
          </div>

          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            概览
          </button>
          <button
            onClick={() => setActiveTab('integrate')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'integrate' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Code className="w-4 h-4 inline mr-2" />
            集成指南
          </button>
          {layer === 'logic' && (
            <button
              onClick={() => setActiveTab('playground')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'playground' 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Terminal className="w-4 h-4 inline mr-2" />
              演练场
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Images Gallery */}
              {skill.images && skill.images.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {skill.images.slice(0, 4).map((img, i) => (
                    <img 
                      key={i} 
                      src={img} 
                      alt={`${skill.name} ${i + 1}`}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* Value Type Description */}
              {valueInfo && (
                <div className={`p-4 rounded-xl bg-slate-50 border border-slate-200`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{valueInfo.emoji}</span>
                    <span className="font-semibold text-slate-900">{valueInfo.label}</span>
                  </div>
                  <p className="text-sm text-slate-600">{valueInfo.desc}</p>
                </div>
              )}

              {/* SLA Info */}
              {skill.slaGuarantee && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    服务保障 (SLA)
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {skill.avgResponseTime && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>平均响应: <strong>{skill.avgResponseTime}ms</strong></span>
                      </div>
                    )}
                    {skill.successRate && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>成功率: <strong>{skill.successRate}%</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Input/Output Schema */}
              {skill.inputSchema && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">输入参数</h4>
                  <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-slate-300">
                      {JSON.stringify(skill.inputSchema, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Author Info */}
              {skill.authorName && (
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                  {skill.authorAvatar ? (
                    <img src={skill.authorAvatar} alt={skill.authorName} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-600">
                      {skill.authorName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-slate-900">{skill.authorName}</p>
                    <p className="text-xs text-slate-500">开发者</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Integration Tab */}
          {activeTab === 'integrate' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900">在您的 Agent 中集成</h4>
                  <button 
                    onClick={copyCode}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? '已复制' : '复制代码'}
                  </button>
                </div>
                <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-sm text-slate-300 font-mono">
                    {integrationCode}
                  </pre>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  注意事项
                </h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• 确保您的 Agent 已获得用户的支付授权</li>
                  <li>• 调用前请验证输入参数格式</li>
                  {isPaid && <li>• 每次调用将扣除 ${skill.price} {skill.currency || 'USD'}</li>}
                </ul>
              </div>
            </div>
          )}

          {/* Playground Tab */}
          {activeTab === 'playground' && layer === 'logic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">输入参数 (JSON)</label>
                <textarea
                  value={playgroundInput}
                  onChange={(e) => setPlaygroundInput(e.target.value)}
                  className="w-full h-32 px-4 py-3 bg-slate-900 text-slate-300 font-mono text-sm rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder='{"query": "test"}'
                />
              </div>

              <button
                onClick={runPlayground}
                disabled={isRunning}
                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isRunning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    运行中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    运行测试
                  </>
                )}
              </button>

              {playgroundOutput && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">输出结果</label>
                  <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                    <pre className={`text-sm font-mono ${playgroundOutput.error ? 'text-red-400' : 'text-emerald-400'}`}>
                      {JSON.stringify(playgroundOutput, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-slate-50">
          <div>
            {skill.pricingType === 'free' ? (
              <span className="text-lg font-bold text-emerald-600">免费</span>
            ) : skill.pricingType === 'revenue_share' ? (
              <span className="text-lg font-bold text-blue-600">{skill.commissionRate}% 分成模式</span>
            ) : (
              <span className="text-lg font-bold text-slate-900">
                ${skill.price} <span className="text-sm font-normal text-slate-500">/ 次调用</span>
              </span>
            )}
          </div>
          <div className="flex gap-3">
            {onAddToAgent && (
              <button
                onClick={onAddToAgent}
                className="px-5 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
              >
                添加到我的Agent
              </button>
            )}
            {onPurchase && isPaid && (
              <button
                onClick={onPurchase}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                立即购买
              </button>
            )}
            {!isPaid && onAddToAgent && (
              <button
                onClick={onAddToAgent}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                免费使用
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillDetailModal;
