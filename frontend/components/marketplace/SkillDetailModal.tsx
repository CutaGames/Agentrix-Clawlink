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

import React, { useState, useEffect, useCallback } from 'react';
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
  MessageSquare,
  ThumbsUp,
  Send,
  Loader2,
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
  reviewCount?: number;
}

interface ReviewItem {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  verifiedUsage: boolean;
  helpfulCount: number;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'integrate' | 'playground' | 'reviews'>('overview');
  const [copied, setCopied] = useState(false);
  const [playgroundInput, setPlaygroundInput] = useState('{}');
  const [playgroundOutput, setPlaygroundOutput] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  // Reviews state
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  const loadReviews = useCallback(async () => {
    if (!skill.id) return;
    setReviewsLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/skills/${skill.id}/reviews?page=1&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.data?.reviews || data.reviews || []);
        setReviewsTotal(data.data?.total || data.total || 0);
      }
    } catch (e) {
      console.error('Failed to load reviews:', e);
    } finally {
      setReviewsLoading(false);
    }
  }, [skill.id, apiBase]);

  useEffect(() => {
    if (activeTab === 'reviews' && reviews.length === 0) {
      loadReviews();
    }
  }, [activeTab, loadReviews, reviews.length]);

  const submitReview = async () => {
    if (!newComment.trim()) { setReviewError('请输入评价内容'); return; }
    setSubmittingReview(true);
    setReviewError('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${apiBase}/api/skills/${skill.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ rating: newRating, comment: newComment }),
      });
      if (res.ok) {
        setNewComment('');
        setNewRating(5);
        await loadReviews();
      } else {
        const err = await res.json().catch(() => ({}));
        setReviewError(err.message || '提交失败，请重试');
      }
    } catch (e: any) {
      setReviewError(e.message || '网络错误');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStars = (rating: number, size = 'w-4 h-4', interactive = false) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${size} cursor-${interactive ? 'pointer' : 'default'} transition-colors ${
            i <= (interactive ? (hoverRating || newRating) : rating)
              ? 'text-amber-400 fill-amber-400'
              : 'text-slate-300'
          }`}
          onClick={interactive ? () => setNewRating(i) : undefined}
          onMouseEnter={interactive ? () => setHoverRating(i) : undefined}
          onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
        />
      ))}
    </div>
  );

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
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reviews' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            评价 {reviewsTotal > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-200 rounded-full">{reviewsTotal}</span>}
          </button>
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

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Rating Summary */}
              <div className="flex items-center gap-8 p-5 bg-slate-50 rounded-xl">
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-900">{(skill.rating || 0).toFixed(1)}</div>
                  {renderStars(skill.rating || 0, 'w-5 h-5')}
                  <div className="text-sm text-slate-500 mt-1">{reviewsTotal} 条评价</div>
                </div>
                <div className="flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = reviews.filter(r => Math.round(r.rating) === star).length;
                    const pct = reviewsTotal > 0 ? (count / reviewsTotal) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-sm">
                        <span className="w-3 text-slate-500">{star}</span>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-slate-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Review */}
              <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-semibold text-slate-900">写评价</h4>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-600">评分:</span>
                  {renderStars(newRating, 'w-6 h-6', true)}
                  <span className="text-sm text-slate-500">{newRating}.0</span>
                </div>
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="分享您的使用体验..."
                  className="w-full h-20 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
                {reviewError && <p className="text-sm text-red-500">{reviewError}</p>}
                <button
                  onClick={submitReview}
                  disabled={submittingReview || !newComment.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  提交评价
                </button>
              </div>

              {/* Review List */}
              {reviewsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review.id} className="p-4 border border-slate-100 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                            {review.userName?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <span className="font-medium text-slate-900 text-sm">{review.userName}</span>
                            {review.verifiedUsage && (
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 rounded">已验证使用</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                      {renderStars(review.rating, 'w-3.5 h-3.5')}
                      <p className="text-sm text-slate-700 mt-2">{review.comment}</p>
                      {review.helpfulCount > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                          <ThumbsUp className="w-3 h-3" />
                          {review.helpfulCount} 人觉得有帮助
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>还没有评价，成为第一个评价的人！</p>
                </div>
              )}
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
