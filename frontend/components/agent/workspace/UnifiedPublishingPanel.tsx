'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  Package, 
  Code, 
  Database, 
  Bot, 
  Globe, 
  Zap, 
  Lock, 
  ShieldCheck, 
  ArrowRight,
  ChevronRight,
  Info,
  CheckCircle2,
  RefreshCw,
  Search,
  Check,
  CreditCard,
  Target
} from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api/client';

type AssetType = 'skill' | 'api' | 'data' | 'agent' | 'service' | 'other';

interface UnifiedPublishingPanelProps {
  initialType?: AssetType;
  onSuccess?: (data: any) => void;
  onGuidedMode?: (persona: string) => void;
  allowedTypes?: AssetType[];
  allowedPersonas?: string[];
}

export const UnifiedPublishingPanel: React.FC<UnifiedPublishingPanelProps> = ({ 
  initialType = 'skill', 
  onSuccess, 
  onGuidedMode,
  allowedTypes,
  allowedPersonas
}) => {
  const { t } = useLocalization();
  const { success, error: showError } = useToast();
  
  const [step, setStep] = useState(0);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    apiUrl: '',
    pricingType: 'per_call',
    price: 0.01,
    subscriptionPrice: 29,
    usageExamples: [
      { id: 1, text: 'Help me check where this order is', checked: true },
      { id: 2, text: 'When will this package arrive?', checked: true },
      { id: 3, text: 'Track status for order #123456', checked: true }
    ],
    agreedToTerms: false
  });

  const allPersonas = [
    { id: 'api_provider', label: 'API 厂商', icon: Zap, desc: '自动化导入 OpenAPI，快速变现', color: 'from-blue-600/20 to-cyan-600/20' },
    { id: 'data_provider', label: '数据提供方', icon: Database, desc: '授权专有数据集，按查询收费', color: 'from-orange-600/20 to-amber-600/20' },
    { id: 'expert', label: '行业专家', icon: Bot, desc: '将专业知识转化为 AI 咨询技能', color: 'from-purple-600/20 to-pink-600/20' },
    { id: 'developer', label: '全能开发者', icon: Code, desc: '构建复杂 Skill 与工作流', color: 'from-slate-600/20 to-slate-800/20' },
    { id: 'merchant', label: '实物/服务商', icon: Globe, desc: '零门槛入驻 AI 购物生态', color: 'from-emerald-600/20 to-teal-600/20' },
  ];

  const personas = allowedPersonas
    ? allPersonas.filter(p => allowedPersonas.includes(p.id))
    : allPersonas;

  const handleNext = () => {
    // Step 1 validation
    if (step === 1) {
      if (selectedPersona === 'api_provider') {
        if (!formData.apiUrl && !formData.description) {
          showError(t({ zh: '请提供 API 地址或能力描述', en: 'Please provide API URL or description' }));
          return;
        }
      } else {
        if (!formData.description) {
          showError(t({ zh: '请填写能力描述', en: 'Please describe the capability' }));
          return;
        }
      }
    }
    
    // Step 2 validation
    if (step === 2) {
      if (!formData.name || formData.name.trim().length < 3) {
        showError(t({ zh: '请填写有效的技能名称（至少3个字符）', en: 'Please enter a valid skill name (at least 3 characters)' }));
        return;
      }
      if (formData.pricingType === 'per_call' && formData.price <= 0) {
        showError(t({ zh: '请设置有效的按次价格', en: 'Please set a valid per-call price' }));
        return;
      }
      if (formData.pricingType === 'subscription' && formData.subscriptionPrice <= 0) {
        showError(t({ zh: '请设置有效的订阅价格', en: 'Please set a valid subscription price' }));
        return;
      }
    }
    
    if (step < 3) setStep(step + 1);
    else handleSubmit();
  };

  const handlePersonaSelect = (personaId: string) => {
    setSelectedPersona(personaId);
    setStep(1);
    
    // Set default name based on persona (optional dynamic logic)
    if (personaId === 'api_provider') setFormData(prev => ({ ...prev, name: 'My New API Skill' }));
    if (personaId === 'data_provider') setFormData(prev => ({ ...prev, name: 'Data Query Service' }));
    if (personaId === 'expert') setFormData(prev => ({ ...prev, name: 'Expert Consultation' }));
  };

  const handleSubmit = async () => {
    if (!formData.agreedToTerms) {
      showError(t({ zh: '请确认发布范围与合规条款', en: 'Please agree to terms' }));
      return;
    }

    setIsSubmitting(true);
    try {
      // Build complete payload with all required fields for MCP/ACP/UCP/X402 compatibility
      const finalPrice = formData.pricingType === 'subscription' ? formData.subscriptionPrice : formData.price;
      
      const payload = {
        name: formData.name.trim(),
        displayName: formData.name.trim(),
        description: formData.description || `${formData.name} - Auto-generated from ${selectedPersona} wizard`,
        category: selectedPersona === 'data_provider' ? 'data' : selectedPersona === 'expert' ? 'analysis' : 'integration',
        layer: selectedPersona === 'data_provider' ? 'infra' : selectedPersona === 'expert' ? 'logic' : 'logic',
        valueType: selectedPersona === 'expert' ? 'decision' : selectedPersona === 'data_provider' ? 'data' : 'action',
        source: 'native',
        status: 'published',
        
        // Pricing configuration
        pricing: {
          type: formData.pricingType === 'subscription' ? 'subscription' : 'per_call',
          pricePerCall: finalPrice, // For subscription, this is monthly price
          currency: 'USD',
          commissionRate: 10, // Platform standard 10%
        },
        
        // Input/Output Schema (required for MCP/ACP/UCP)
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'User query or request' },
          },
          required: ['query']
        },
        
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'string', description: 'Response or result' },
          }
        },
        
        // Executor configuration
        executor: formData.apiUrl ? {
          type: 'http',
          endpoint: formData.apiUrl,
          method: 'POST'
        } : {
          type: 'internal',
          internalHandler: 'generic_skill_handler'
        },
        
        // Protocol enablement for ecosystem compatibility
        ucpEnabled: true,
        x402Enabled: true,
        
        // Metadata
        metadata: {
          persona: selectedPersona,
          apiUrl: formData.apiUrl,
          usageExamples: formData.usageExamples.filter(e => e.checked).map(e => e.text),
          createdVia: 'unified_publishing_wizard'
        }
      };

      const response = await apiClient.post('/skills', payload);
      success(t({ zh: '发布成功！技能已上线并可被 Agent 调用', en: 'Published successfully! Skill is live and callable by Agents' }));
      onSuccess?.((response as any).data);
      
      // Reset form
      setStep(0);
      setFormData({
        name: '', 
        description: '', 
        apiUrl: '', 
        pricingType: 'per_call', 
        price: 0.01,
        subscriptionPrice: 29,
        usageExamples: [
          { id: 1, text: 'Help me check where this order is', checked: true },
          { id: 2, text: 'When will this package arrive?', checked: true },
          { id: 3, text: 'Track status for order #123456', checked: true }
        ],
        agreedToTerms: false
      });
      setSelectedPersona(null);

    } catch (err) {
      console.error(err);
      showError(t({ zh: '发布失败，请重试', en: 'Failed to publish, please try again' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get step title
  const getStepTitle = (s: number) => {
    switch(s) {
      case 1: return t({ zh: '描述能力', en: 'Describe Capability' });
      case 2: return t({ zh: '确认价格', en: 'Confirm & Pricing' });
      case 3: return t({ zh: '发布', en: 'Publish' });
      default: return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Header Area */}
      {step === 0 && (
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-white">
            {t({ zh: '发布资产', en: 'Publish Assets' })}
          </h1>
          <p className="text-lg text-slate-400">
            {t({ 
              zh: '将你的 API、数据或能力上架到 Agent 市场', 
              en: 'List your API, data or skills to the Agent marketplace' 
            })}
          </p>
        </div>
      )}

      {/* Step 0: Main CTA & Persona Selection */}
      {step === 0 && (
        <>
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => handlePersonaSelect('api_provider')} // Default recommended path
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl text-lg font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105"
            >
              🚀 {t({ zh: '3 分钟智能发布（推荐）', en: '3-Minute Smart Publish (Recommended)' })}
            </button>
            <p className="text-sm text-slate-500">
              {t({ 
                zh: '系统会自动理解你的能力，并完成定价与发布', 
                en: 'System will automatically understand your capability and complete pricing & publishing' 
              })}
            </p>
          </div>

          <div className="space-y-4 pt-8 border-t border-slate-800">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">
                {t({ zh: '选择你的身份', en: 'Choose Your Role' })}
              </h3>
              <p className="text-sm text-slate-400">
                {t({ 
                  zh: '根据你的身份，我们会自动生成最合适的发布方式', 
                  en: 'Based on your role, we will generate the most suitable publishing method' 
                })}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {t({ zh: '无需编写代码 · 无需了解技术协议', en: 'No coding required · No technical protocol knowledge needed' })}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {personas.map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => handlePersonaSelect(persona.id)}
                  className={`p-6 bg-gradient-to-br ${persona.color} border border-slate-700 rounded-xl text-left hover:border-slate-600 hover:shadow-lg transition-all group`}
                >
                  <persona.icon className="w-10 h-10 text-white mb-3" />
                  <h4 className="text-lg font-bold text-white mb-2">{persona.label}</h4>
                  <p className="text-sm text-slate-400">{persona.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Mode - Collapsed */}
          <div className="text-center pt-8 border-t border-slate-800">
            <details className="inline-block">
              <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-400 transition-colors">
                🔧 {t({ zh: '高级发布模式（可选）', en: 'Advanced Mode (Optional)' })}
              </summary>
              <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-800 text-left w-[400px]">
                <p className="text-xs text-slate-400 mb-3">
                  {t({ 
                    zh: '适合熟悉高级配置或有特殊需求的开发者。您可以完全控制 Schema、鉴权方式和输出格式。', 
                    en: 'For developers familiar with advanced configurations. Full control over Schema, Auth, and Output.' 
                  })}
                </p>
                <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors">
                  {t({ zh: '进入专家模式', en: 'Enter Expert Mode' })}
                </button>
              </div>
            </details>
          </div>
        </>
      )}

      {/* Progress Steps (Visible for Step 1, 2, 3) */}
      {step > 0 && (
        <div className="flex items-center justify-center gap-4 py-4">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 ${step === s ? 'text-white' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  step >= s ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800'
                }`}>
                  {step > s ? <CheckCircle2 size={16} /> : s}
                </div>
                <span className="text-sm font-medium hidden md:block">{getStepTitle(s)}</span>
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-slate-800'}`} />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Step 1: Describe Capability */}
      {step === 1 && (
        <div className="space-y-6 bg-slate-900/50 border border-white/5 rounded-3xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400">
              <Zap size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {selectedPersona === 'api_provider' 
                  ? t({ zh: '你已经有 API 吗？', en: 'Do you have an API?' })
                  : selectedPersona === 'data_provider'
                  ? t({ zh: '你的数据可以帮助 Agent 做什么？', en: 'What can your data do?' })
                  : t({ zh: '描述你的能力', en: 'Describe your capability' })
                }
              </h2>
              <p className="text-sm text-slate-500">
                {selectedPersona === 'api_provider'
                  ? t({ zh: '你不需要编写任何新代码。Agentrix 会自动把你的 API 转换为 Agent 可调用的能力。', en: 'No new code needed. Agentrix converts your API into an Agent capability.' })
                  : t({ zh: 'Agentrix 只会按你的规则返回结果。', en: 'Agentrix returns results based on your rules.' })
                }
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {selectedPersona === 'api_provider' ? (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  {t({ zh: 'API 请求地址或 CURL 命令', en: 'API Endpoint or CURL Command' })}
                </label>
                <textarea
                  rows={4}
                  placeholder="https://api.example.com/v1/orders/track?id=..."
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none font-mono text-sm"
                  value={formData.apiUrl}
                  onChange={e => setFormData({ ...formData, apiUrl: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <ShieldCheck size={12} />
                  {t({ zh: '我们只用于结构识别，不会保存你的密钥。', en: 'Only used for structure identification, keys are not saved.' })}
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  {t({ zh: '能力描述', en: 'Capability Description' })}
                </label>
                <textarea
                  rows={4}
                  placeholder={t({ zh: '例如：我可以查询最新的半导体行业报告，或者分析某家公司的财报数据...', en: 'e.g., I can query the latest semiconductor industry reports...' })}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Confirm & Pricing */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Capability Understanding Card */}
          <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-purple-600/10 flex items-center justify-center text-purple-400">
                <Bot size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {t({ zh: '系统已理解你的能力', en: 'System Understood Your Capability' })}
                </h2>
                <p className="text-sm text-slate-500">
                  {t({ zh: '这是 Agent 能理解的能力描述，你可以手动修改', en: 'This is the capability description Agents will see' })}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  {t({ zh: '能力名称', en: 'Skill Name' })}
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none font-bold"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  {t({ zh: 'Agent 可能会在这些情况下使用它', en: 'Agents might use it when' })}
                </label>
                <div className="space-y-2 bg-slate-800/50 rounded-xl p-4">
                  {formData.usageExamples.map((ex) => (
                    <label key={ex.id} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        ex.checked ? 'bg-blue-600 border-blue-600' : 'border-slate-600 group-hover:border-slate-500'
                      }`}
                      onClick={() => {
                        const newExamples = formData.usageExamples.map(e => 
                          e.id === ex.id ? { ...e, checked: !e.checked } : e
                        );
                        setFormData({ ...formData, usageExamples: newExamples });
                      }}>
                        {ex.checked && <Check size={14} className="text-white" />}
                      </div>
                      <span className="text-sm text-slate-300">{ex.text}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedPersona === 'expert' && (
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg text-blue-400 text-xs">
                  <Info size={14} />
                  {t({ zh: 'Agent 只会在适合的场景推荐你，你可以随时调整或暂停。', en: 'Agents only recommend you in suitable scenarios.' })}
                </div>
              )}
            </div>
          </div>

          {/* Pricing Card */}
          <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8">
            <h3 className="text-lg font-bold text-white mb-4">{t({ zh: '价格与发布', en: 'Pricing & Publish' })}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.pricingType === 'per_call' ? 'bg-emerald-500/10 border-emerald-500' : 'bg-slate-800 border-slate-700'
                }`}
                onClick={() => setFormData({ ...formData, pricingType: 'per_call' })}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-white">{t({ zh: '按次付费', en: 'Per Call' })}</span>
                  {formData.pricingType === 'per_call' && <div className="w-4 h-4 rounded-full bg-emerald-500" />}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-20 bg-transparent border-b border-white/20 text-2xl font-bold text-white focus:border-emerald-500 outline-none"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    onClick={e => e.stopPropagation()}
                  />
                  <span className="text-sm text-slate-400">/ {t({ zh: '次', en: 'call' })}</span>
                </div>
                <p className="text-xs text-emerald-400 mt-2">{t({ zh: '系统建议', en: 'Recommended' })}</p>
              </div>

              <div 
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.pricingType === 'subscription' ? 'bg-blue-500/10 border-blue-500' : 'bg-slate-800 border-slate-700'
                }`}
                onClick={() => setFormData({ ...formData, pricingType: 'subscription' })}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-white">{t({ zh: '订阅制', en: 'Subscription' })}</span>
                  {formData.pricingType === 'subscription' && <div className="w-4 h-4 rounded-full bg-blue-500" />}
                </div>
                {formData.pricingType === 'subscription' ? (
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-bold text-white">$</span>
                    <input
                      type="number"
                      step="1"
                      className="w-20 bg-transparent border-b border-white/20 text-2xl font-bold text-white focus:border-blue-500 outline-none"
                      value={formData.subscriptionPrice}
                      onChange={e => setFormData({ ...formData, subscriptionPrice: parseFloat(e.target.value) })}
                      onClick={e => e.stopPropagation()}
                    />
                    <span className="text-sm text-slate-400">/ {t({ zh: '月', en: 'month' })}</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 mt-4">{t({ zh: '每月固定收费', en: 'Monthly fixed fee' })}</p>
                )}
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-800 rounded-xl flex items-start gap-3">
              <CreditCard className="text-slate-400 mt-0.5" size={16} />
              <div className="text-xs text-slate-400">
                <p className="font-bold text-slate-300 mb-1">{t({ zh: '平台服务费说明', en: 'Platform Fee' })}</p>
                <p>{t({ zh: '平台将收取 10% 服务费，用于结算与分发', en: 'Platform takes 10% service fee for settlement and distribution' })}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Scope & Compliance */}
      {step === 3 && (
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-400 mx-auto mb-6">
            <Target size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {t({ zh: '最后一步：发布范围与合规', en: 'Final Step: Scope & Compliance' })}
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            {t({ zh: '您的技能即将上线 AGENTRIX 市场，请确认以下信息', en: 'Your skill is about to go live on Agentrix Marketplace' })}
          </p>
          
          <div className="max-w-md mx-auto space-y-4 text-left">
            <label className="flex items-start gap-4 p-4 bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-700/80 transition-colors">
              <div className={`w-6 h-6 rounded border flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                formData.agreedToTerms ? 'bg-blue-600 border-blue-600' : 'border-slate-500'
              }`}>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={formData.agreedToTerms}
                  onChange={e => setFormData({ ...formData, agreedToTerms: e.target.checked })}
                />
                {formData.agreedToTerms && <Check size={16} className="text-white" />}
              </div>
              <div className="text-sm">
                <span className="text-white font-medium block mb-1">
                  {t({ zh: '我确认内容合法合规', en: 'I confirm content compliance' })}
                </span>
                <span className="text-slate-400 text-xs">
                  {t({ zh: '不包含非法、色情、暴力或侵犯版权的内容，且对输出结果负责。', en: 'No illegal, pornographic, violent or copyright infringing content.' })}
                </span>
              </div>
            </label>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                {t({ zh: '发布范围', en: 'Publish Scope' })}
              </h4>
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-blue-400" />
                <span className="text-white text-sm font-medium">{t({ zh: '公开市场 (Public Marketplace)', en: 'Public Marketplace' })}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      {step > 0 && (
        <div className="flex items-center justify-between pt-8 border-t border-white/5">
          <button
            onClick={() => setStep(step - 1)}
            className="px-6 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl font-medium transition-colors"
          >
            {t({ zh: '上一步', en: 'Previous' })}
          </button>
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="px-10 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95"
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                {t({ zh: '正在发布...', en: 'Publishing...' })}
              </>
            ) : (
              <>
                {step === 3 ? t({ zh: '立即发布', en: 'Publish Now' }) : t({ zh: '下一步', en: 'Next Step' })}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
