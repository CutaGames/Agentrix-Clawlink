import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Settings, Archive, Trash2, Play, Eye, ChevronRight, Users, Percent, Layers, Check, X } from 'lucide-react';
import { useLocalization } from '../../../../contexts/LocalizationContext';
import { useToast } from '../../../../contexts/ToastContext';
import { commerceApi, SplitPlan, SplitPlanStatus, ProductType, SplitRule } from '../../../../lib/api/commerce.api';
import { CommerceHintsBanner } from './CommerceHintsBanner';

interface SplitPlansPanelProps {
  onSelect?: (plan: SplitPlan) => void;
}

const PRODUCT_TYPE_LABELS: Record<ProductType, { zh: string; en: string }> = {
  physical: { zh: '实物商品', en: 'Physical' },
  service: { zh: '服务', en: 'Service' },
  virtual: { zh: '虚拟商品', en: 'Virtual' },
  nft: { zh: 'NFT', en: 'NFT' },
  skill: { zh: '技能', en: 'Skill' },
  agent_task: { zh: 'Agent任务', en: 'Agent Task' },
};

const STATUS_STYLES: Record<SplitPlanStatus, string> = {
  draft: 'bg-slate-500/20 text-slate-400',
  active: 'bg-emerald-500/20 text-emerald-400',
  archived: 'bg-amber-500/20 text-amber-400',
};

export const SplitPlansPanel: React.FC<SplitPlansPanelProps> = ({ onSelect }) => {
  const { t } = useLocalization();
  const { success, error: showError } = useToast();
  
  const [plans, setPlans] = useState<SplitPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SplitPlan | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const data = await commerceApi.getSplitPlans();
      setPlans(data || []);
    } catch (err: any) {
      showError(err.message || 'Failed to load split plans');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleActivate = async (id: string) => {
    try {
      await commerceApi.activateSplitPlan(id);
      success(t({ zh: '分佣计划已激活', en: 'Split plan activated' }));
      loadPlans();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await commerceApi.archiveSplitPlan(id);
      success(t({ zh: '分佣计划已归档', en: 'Split plan archived' }));
      loadPlans();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t({ zh: '确定要删除此分佣计划吗？', en: 'Are you sure you want to delete this plan?' }))) {
      return;
    }
    try {
      await commerceApi.deleteSplitPlan(id);
      success(t({ zh: '分佣计划已删除', en: 'Split plan deleted' }));
      loadPlans();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const formatShare = (bps: number) => `${(bps / 100).toFixed(1)}%`;

  const renderRulesSummary = (rules: SplitRule[]) => {
    const activeRules = rules.filter(r => r.active);
    if (activeRules.length === 0) return t({ zh: '无规则', en: 'No rules' });
    
    return activeRules.slice(0, 3).map((r, i) => (
      <span key={i} className="inline-flex items-center gap-1 text-xs bg-slate-700/50 px-2 py-0.5 rounded mr-1">
        <span className="text-slate-400">{r.customRoleName || r.role}</span>
        <span className="text-blue-400">{formatShare(r.shareBps)}</span>
      </span>
    ));
  };

  return (
    <div className="space-y-4">
      <CommerceHintsBanner />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{t({ zh: '分佣计划', en: 'Split Plans' })}</h3>
          <p className="text-sm text-slate-400">{t({ zh: '配置多级分佣规则与费率', en: 'Configure multi-level split rules and rates' })}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold transition-colors"
        >
          <Plus size={16} />
          {t({ zh: '新建计划', en: 'New Plan' })}
        </button>
      </div>

      {/* Plans List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <Layers className="w-12 h-12 mx-auto mb-4 text-slate-500" />
          <p className="text-slate-400 mb-4">{t({ zh: '暂无分佣计划', en: 'No split plans found' })}</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold transition-colors"
          >
            {t({ zh: '创建首个计划', en: 'Create First Plan' })}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-white font-semibold">{plan.name}</h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${STATUS_STYLES[plan.status]}`}>
                      {plan.status}
                    </span>
                    {plan.isSystemTemplate && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                        {t({ zh: '系统模板', en: 'System' })}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                    <span className="flex items-center gap-1">
                      <Layers size={14} />
                      {t(PRODUCT_TYPE_LABELS[plan.productType])}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {plan.rules.filter(r => r.active).length} {t({ zh: '个角色', en: 'roles' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Percent size={14} />
                      {t({ zh: '分佣', en: 'Split' })}: {(plan.feeConfig.splitFeeBps / 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {renderRulesSummary(plan.rules)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {plan.status === 'draft' && !plan.isSystemTemplate && (
                    <>
                      <button
                        onClick={() => handleActivate(plan.id)}
                        className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                        title={t({ zh: '激活', en: 'Activate' })}
                      >
                        <Play size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                        title={t({ zh: '删除', en: 'Delete' })}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  {plan.status === 'active' && !plan.isSystemTemplate && (
                    <button
                      onClick={() => handleArchive(plan.id)}
                      className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                      title={t({ zh: '归档', en: 'Archive' })}
                    >
                      <Archive size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      onSelect?.(plan);
                    }}
                    className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-colors"
                    title={t({ zh: '查看详情', en: 'View Details' })}
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateSplitPlanModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadPlans();
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedPlan && (
        <SplitPlanDetailModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onUpdate={loadPlans}
        />
      )}
    </div>
  );
};

// ===== Create Modal =====

interface CreateSplitPlanModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateSplitPlanModal: React.FC<CreateSplitPlanModalProps> = ({ onClose, onSuccess }) => {
  const { t } = useLocalization();
  const { success, error: showError } = useToast();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productType, setProductType] = useState<ProductType>('service');
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // 分佣规则
  const [rules, setRules] = useState<Array<{
    role: string;
    customRoleName: string;
    shareBps: number;
    recipient: string;
    active: boolean;
  }>>([
    { role: 'merchant', customRoleName: '商家', shareBps: 7000, recipient: '', active: true },
    { role: 'platform', customRoleName: '平台', shareBps: 3000, recipient: '', active: true },
  ]);

  // 费率配置
  const [feeConfig, setFeeConfig] = useState({
    onrampFeeBps: 10,
    offrampFeeBps: 10,
    splitFeeBps: 30,
    minSplitFee: 100000,
  });

  const addRule = () => {
    setRules([...rules, {
      role: 'custom',
      customRoleName: '',
      shareBps: 0,
      recipient: '',
      active: true,
    }]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<typeof rules[0]>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  };

  const totalShare = rules.filter(r => r.active).reduce((sum, r) => sum + r.shareBps, 0);

  const handleSubmit = async () => {
    if (!name.trim()) {
      showError(t({ zh: '请输入计划名称', en: 'Please enter plan name' }));
      return;
    }

    if (showAdvanced && totalShare !== 10000) {
      showError(t({ zh: '分佣比例总和必须为100%', en: 'Total share must equal 100%' }));
      return;
    }

    try {
      setSubmitting(true);
      await commerceApi.createSplitPlan({
        name: name.trim(),
        description: description.trim() || undefined,
        productType,
        ...(showAdvanced && {
          rules: rules.map(r => ({
            role: r.role as any,
            customRoleName: r.customRoleName || undefined,
            shareBps: r.shareBps,
            recipient: r.recipient || undefined,
            source: 'merchant' as const,
            active: r.active,
          })),
          feeConfig,
        }),
      });
      success(t({ zh: '分佣计划已创建', en: 'Split plan created' }));
      onSuccess();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-900 pb-2 -mt-2 pt-2 z-10">
          <h3 className="text-xl font-bold text-white">{t({ zh: '新建分佣计划', en: 'Create Split Plan' })}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              {t({ zh: '计划名称', en: 'Plan Name' })} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t({ zh: '例如：技能开发者分润计划', en: 'e.g. Skill Developer Revenue Share' })}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              {t({ zh: '商品类型', en: 'Product Type' })}
            </label>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value as ProductType)}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500"
            >
              {Object.entries(PRODUCT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{t(label)}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {t({ zh: '系统将根据类型自动应用默认分佣规则', en: 'System will apply default rules based on type' })}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              {t({ zh: '描述', en: 'Description' })}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t({ zh: '可选，描述此计划的用途', en: 'Optional, describe the purpose of this plan' })}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500 h-20"
            />
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ChevronRight size={16} className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
            {t({ zh: '高级配置', en: 'Advanced Options' })}
          </button>

          {showAdvanced && (
            <>
              {/* Fee Configuration */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-bold text-slate-400">{t({ zh: '费率配置', en: 'Fee Configuration' })}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Onramp ({(feeConfig.onrampFeeBps / 100).toFixed(2)}%)</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={feeConfig.onrampFeeBps}
                      onChange={(e) => setFeeConfig({ ...feeConfig, onrampFeeBps: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Offramp ({(feeConfig.offrampFeeBps / 100).toFixed(2)}%)</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={feeConfig.offrampFeeBps}
                      onChange={(e) => setFeeConfig({ ...feeConfig, offrampFeeBps: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">{t({ zh: '分佣费', en: 'Split Fee' })} ({(feeConfig.splitFeeBps / 100).toFixed(2)}%)</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={feeConfig.splitFeeBps}
                      onChange={(e) => setFeeConfig({ ...feeConfig, splitFeeBps: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">{t({ zh: '最低分佣费 (USDC)', en: 'Min Split Fee (USDC)' })}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={feeConfig.minSplitFee / 1000000}
                      onChange={(e) => setFeeConfig({ ...feeConfig, minSplitFee: Math.round(parseFloat(e.target.value) * 1000000) })}
                      className="w-full bg-slate-700 border border-white/10 rounded px-3 py-1 text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Split Rules */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-400">{t({ zh: '分佣规则', en: 'Split Rules' })}</h4>
                  <span className={`text-xs font-mono ${totalShare === 10000 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {(totalShare / 100).toFixed(1)}% / 100%
                  </span>
                </div>
                
                {rules.map((rule, index) => (
                  <div key={index} className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-2">
                    <input
                      type="checkbox"
                      checked={rule.active}
                      onChange={(e) => updateRule(index, { active: e.target.checked })}
                      className="rounded"
                    />
                    <input
                      type="text"
                      value={rule.customRoleName}
                      onChange={(e) => updateRule(index, { customRoleName: e.target.value })}
                      placeholder={t({ zh: '角色名称', en: 'Role name' })}
                      className="flex-1 bg-slate-600 border-none rounded px-2 py-1 text-white text-sm"
                    />
                    <div className="flex items-center gap-1 w-24">
                      <input
                        type="number"
                        min="0"
                        max="10000"
                        value={rule.shareBps / 100}
                        onChange={(e) => updateRule(index, { shareBps: Math.round(parseFloat(e.target.value) * 100) })}
                        className="w-16 bg-slate-600 border-none rounded px-2 py-1 text-white text-sm text-right"
                      />
                      <span className="text-slate-400 text-sm">%</span>
                    </div>
                    <button
                      onClick={() => removeRule(index)}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addRule}
                  className="w-full py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  {t({ zh: '添加规则', en: 'Add Rule' })}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors"
          >
            {t({ zh: '取消', en: 'Cancel' })}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
          >
            {submitting ? t({ zh: '创建中...', en: 'Creating...' }) : t({ zh: '创建计划', en: 'Create Plan' })}
          </button>
        </div>
      </div>
    </div>
  );
};

// ===== Detail Modal =====

interface SplitPlanDetailModalProps {
  plan: SplitPlan;
  onClose: () => void;
  onUpdate: () => void;
}

const SplitPlanDetailModal: React.FC<SplitPlanDetailModalProps> = ({ plan, onClose, onUpdate }) => {
  const { t } = useLocalization();

  const formatShare = (bps: number) => `${(bps / 100).toFixed(1)}%`;
  const formatFee = (bps: number) => `${(bps / 100).toFixed(2)}%`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
            <p className="text-sm text-slate-400">{t(PRODUCT_TYPE_LABELS[plan.productType])} · v{plan.version}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {plan.description && (
          <p className="text-slate-300 mb-6">{plan.description}</p>
        )}

        {/* Fee Config */}
        <div className="mb-6">
          <h4 className="text-sm font-bold text-slate-400 uppercase mb-3">{t({ zh: '费率配置', en: 'Fee Configuration' })}</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Onramp</p>
              <p className="text-white font-semibold">{formatFee(plan.feeConfig.onrampFeeBps)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">Offramp</p>
              <p className="text-white font-semibold">{formatFee(plan.feeConfig.offrampFeeBps)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">{t({ zh: '分佣费', en: 'Split Fee' })}</p>
              <p className="text-white font-semibold">{formatFee(plan.feeConfig.splitFeeBps)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-1">{t({ zh: '最低分佣', en: 'Min Split' })}</p>
              <p className="text-white font-semibold">{(plan.feeConfig.minSplitFee / 1000000).toFixed(2)} USDC</p>
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="mb-6">
          <h4 className="text-sm font-bold text-slate-400 uppercase mb-3">{t({ zh: '分佣规则', en: 'Split Rules' })}</h4>
          {plan.rules.length === 0 ? (
            <p className="text-slate-500 text-sm">{t({ zh: '暂无规则', en: 'No rules defined' })}</p>
          ) : (
            <div className="space-y-2">
              {plan.rules.map((rule, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between bg-slate-800/50 rounded-lg p-3 ${!rule.active ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${rule.active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    <div>
                      <p className="text-white font-medium">{rule.customRoleName || rule.role}</p>
                      <p className="text-xs text-slate-500">{rule.source} · {rule.recipient || 'Not set'}</p>
                    </div>
                  </div>
                  <span className="text-blue-400 font-bold">{formatShare(rule.shareBps)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-slate-500 pt-4 border-t border-slate-700/50">
          <span>{t({ zh: '使用次数', en: 'Usage Count' })}: {plan.usageCount}</span>
          <span>{t({ zh: '创建于', en: 'Created' })}: {new Date(plan.createdAt).toLocaleDateString()}</span>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors"
        >
          {t({ zh: '关闭', en: 'Close' })}
        </button>
      </div>
    </div>
  );
};

export default SplitPlansPanel;
