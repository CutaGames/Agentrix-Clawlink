import Head from 'next/head'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { Navigation } from '../components/ui/Navigation'
import { Footer } from '../components/layout/Footer'
import { LoginModal } from '../components/auth/LoginModal'
import { useLocalization } from '../contexts/LocalizationContext'

// 五层架构可视化组件
function ArchitectureDiagram({ t }: { t: (obj: { zh: string; en: string }) => string }) {
  return (
    <div className="relative w-full max-w-5xl mx-auto py-12">
      <svg viewBox="0 0 800 600" className="w-full h-auto">
        <defs>
          <linearGradient id="layerGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="layerGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="layerGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="layerGradient4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="layerGradient5" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* 连接线 */}
        <line x1="400" y1="80" x2="400" y2="160" stroke="#6366f1" strokeWidth="2" opacity="0.5" />
        <line x1="400" y1="180" x2="400" y2="260" stroke="#6366f1" strokeWidth="2" opacity="0.5" />
        <line x1="400" y1="280" x2="400" y2="360" stroke="#6366f1" strokeWidth="2" opacity="0.5" />
        <line x1="400" y1="380" x2="400" y2="460" stroke="#6366f1" strokeWidth="2" opacity="0.5" />

        {/* 第1层 - 用户触达层 */}
        <rect x="200" y="20" width="400" height="80" rx="8" fill="url(#layerGradient1)" stroke="#6366f1" strokeWidth="2" />
        <text x="400" y="50" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
          {t({ zh: '1. 用户触达层', en: '1. User Interface Layer' })}
        </text>
        <text x="400" y="70" textAnchor="middle" fill="#a5b4fc" fontSize="11">
          Voice / Vision / Text
        </text>
        <text x="400" y="90" textAnchor="middle" fill="#cbd5e1" fontSize="10">
          Consumer / Merchant / Developer Agent
        </text>

        {/* 第2层 - 智能体编排层 */}
        <rect x="200" y="120" width="400" height="80" rx="8" fill="url(#layerGradient2)" stroke="#3b82f6" strokeWidth="2" />
        <text x="400" y="150" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
          {t({ zh: '2. 智能体编排层', en: '2. Agent Orchestration Layer' })}
        </text>
        <text x="400" y="170" textAnchor="middle" fill="#93c5fd" fontSize="11">
          Planning / Tooling / Guardrails
        </text>
        <text x="400" y="190" textAnchor="middle" fill="#cbd5e1" fontSize="10">
          CoT / Context Manager / AI Guardrails
        </text>

        {/* 第3层 - 交易大脑层 */}
        <rect x="200" y="220" width="400" height="80" rx="8" fill="url(#layerGradient3)" stroke="#8b5cf6" strokeWidth="2" />
        <text x="400" y="250" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
          {t({ zh: '3. 交易大脑层', en: '3. Transaction Intelligence' })}
        </text>
        <text x="400" y="270" textAnchor="middle" fill="#c4b5fd" fontSize="11">
          Agentrix-Brain (MoE) + Agentrix-Nano (SLM)
        </text>
        <text x="400" y="290" textAnchor="middle" fill="#cbd5e1" fontSize="10">
          Risk / Finance / Contract Experts
        </text>

        {/* 第4层 - 协议结算层 */}
        <rect x="200" y="320" width="400" height="80" rx="8" fill="url(#layerGradient4)" stroke="#10b981" strokeWidth="2" />
        <text x="400" y="350" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
          {t({ zh: '4. 协议结算层', en: '4. Settlement & Ledger Layer' })}
        </text>
        <text x="400" y="370" textAnchor="middle" fill="#6ee7b7" fontSize="11">
          X402 Protocol + Unified Ledger
        </text>
        <text x="400" y="390" textAnchor="middle" fill="#cbd5e1" fontSize="10">
          Atomic Splitting / Compliance Oracle
        </text>

        {/* 第5层 - 基础设施层 */}
        <rect x="200" y="420" width="400" height="80" rx="8" fill="url(#layerGradient5)" stroke="#f59e0b" strokeWidth="2" />
        <text x="400" y="450" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
          {t({ zh: '5. 基础设施层', en: '5. Infrastructure Layer' })}
        </text>
        <text x="400" y="470" textAnchor="middle" fill="#fcd34d" fontSize="11">
          POS DePIN + Multi-Chain
        </text>
        <text x="400" y="490" textAnchor="middle" fill="#cbd5e1" fontSize="10">
          Edge Nodes / Ethereum / Solana / Tron
        </text>
      </svg>
    </div>
  )
}

const architectureLayers = [
  {
    number: '1',
    title: { zh: '用户触达层', en: 'User Interface Layer' },
    subtitle: { zh: 'Omni-Channel + Multimodal', en: 'Omni-Channel + Multimodal' },
    description: {
      zh: 'Voice-Native（POS 语音指令）、Vision-Ready（客显屏/摄像头）、Text/Mobile/Web/IM。支持 Consumer Agent、Merchant Copilot、Developer Studio 三类智能体。',
      en: 'Voice-Native (POS voice commands), Vision-Ready (display/camera), Text/Mobile/Web/IM. Supports Consumer Agent, Merchant Copilot, Developer Studio.',
    },
    features: [
      { zh: '语音交互 < 500ms', en: 'Voice interaction < 500ms' },
      { zh: '跨端一致度 ≥ 95%', en: 'Cross-platform consistency ≥ 95%' },
      { zh: '多模态意图覆盖 90%', en: 'Multimodal intent coverage 90%' },
    ],
  },
  {
    number: '2',
    title: { zh: '智能体编排层', en: 'Agent Orchestration Layer' },
    subtitle: { zh: 'AI OS (Planning + Tooling)', en: 'AI OS (Planning + Tooling)' },
    description: {
      zh: 'CoT 任务规划、Context Manager、Tool & Plugin Bus。AI Guardrails：反幻觉校验、权限管控、合规触发器。',
      en: 'CoT task planning, Context Manager, Tool & Plugin Bus. AI Guardrails: anti-hallucination, permission control, compliance triggers.',
    },
    features: [
      { zh: '任务拆解准确率 ≥ 95%', en: 'Task decomposition accuracy ≥ 95%' },
      { zh: '高风险指令漏报 < 0.5%', en: 'High-risk command miss rate < 0.5%' },
      { zh: '端云协同延迟 < 200ms', en: 'Edge-cloud latency < 200ms' },
    ],
  },
  {
    number: '3',
    title: { zh: '交易大脑层', en: 'Transaction Intelligence' },
    subtitle: { zh: 'Cloud MoE + Edge SLM', en: 'Cloud MoE + Edge SLM' },
    description: {
      zh: 'Agentrix-Brain（云端混合专家）：风险专家、财务专家、合约专家。Agentrix-Nano（端侧小模型）：Qwen3 0.6B，负责意图前置、离线推理。',
      en: 'Agentrix-Brain (Cloud MoE): Risk, Finance, Contract experts. Agentrix-Nano (Edge SLM): Qwen3 0.6B for intent pre-processing and offline inference.',
    },
    features: [
      { zh: '风控识别率 > 99%', en: 'Risk detection rate > 99%' },
      { zh: '端侧推理 < 300ms', en: 'Edge inference < 300ms' },
      { zh: '模型更新周期 < 7 天', en: 'Model update cycle < 7 days' },
    ],
  },
  {
    number: '4',
    title: { zh: '协议结算层', en: 'Settlement & Ledger Layer' },
    subtitle: { zh: 'X402 + Unified Ledger', en: 'X402 + Unified Ledger' },
    description: {
      zh: 'X402 Protocol：原子分润、混合清算（Fiat + Crypto）。Unified Ledger：链上复式记账、不可篡改审计轨迹。Compliance Oracle：实时 KYC/AML 检查。',
      en: 'X402 Protocol: Atomic splitting, hybrid settlement (Fiat + Crypto). Unified Ledger: On-chain double-entry, immutable audit trail. Compliance Oracle: Real-time KYC/AML checks.',
    },
    features: [
      { zh: '分润确认 < 1s', en: 'Settlement confirmation < 1s' },
      { zh: 'Ledger 匹配率 100%', en: 'Ledger matching rate 100%' },
      { zh: '合规拦截准确率 ≥ 99.5%', en: 'Compliance accuracy ≥ 99.5%' },
    ],
  },
  {
    number: '5',
    title: { zh: '基础设施层', en: 'Infrastructure Layer' },
    subtitle: { zh: 'POS DePIN + Multi-Chain', en: 'POS DePIN + Multi-Chain' },
    description: {
      zh: 'POS Edge 节点网络：数百万 POS 作为算力/数据节点，贡献即获得 Token 激励。Multi-Chain：以太坊、Solana、Tron、Layer2 高可用节点。',
      en: 'POS Edge node network: Millions of POS devices as compute/data nodes with token incentives. Multi-Chain: Ethereum, Solana, Tron, Layer2 high-availability nodes.',
    },
    features: [
      { zh: '节点在线率 ≥ 99%', en: 'Node uptime ≥ 99%' },
      { zh: 'DePIN 激励及时率 100%', en: 'DePIN incentive rate 100%' },
      { zh: '多链交易成功率 ≥ 99.9%', en: 'Multi-chain success rate ≥ 99.9%' },
    ],
  },
]

const edgeFeatures = [
  {
    icon: '🎤',
    title: { zh: '语音收银', en: 'Voice Cashier' },
    description: {
      zh: '识别商品 + 调用云端价格/库存 + 推荐支付路径 + 完成支付/小票',
      en: 'Product recognition + cloud pricing/inventory + payment routing + payment/receipt',
    },
    details: {
      zh: '支持自然语言指令，如"我要买这个"、"这个多少钱"，端侧模型 <500ms 响应，云端智能路由推荐最优支付方式。',
      en: 'Supports natural language commands like "I want to buy this" or "How much is this", edge model responds in <500ms, cloud smart routing recommends optimal payment methods.',
    },
  },
  {
    icon: '🔄',
    title: { zh: '退换货处理', en: 'Returns & Exchanges' },
    description: {
      zh: '定位订单 → 校验规则 → 计算退款 → 提交支付逆向',
      en: 'Order lookup → rule validation → refund calculation → payment reversal',
    },
    details: {
      zh: '自动查询历史订单，判断退货政策，计算退款金额（含手续费），处理退款流程并更新库存。',
      en: 'Automatically queries order history, validates return policy, calculates refund amount (including fees), processes refund and updates inventory.',
    },
  },
  {
    icon: '📊',
    title: { zh: '经营快报', en: 'Business Reports' },
    description: {
      zh: '店长语音查询"今天营业额/毛利/热销/缺货"',
      en: 'Manager voice queries: daily revenue/profit/bestsellers/out-of-stock',
    },
    details: {
      zh: '实时查询销售数据，分析销售趋势，提供进货建议，创建营销活动（优惠券、满减等）。',
      en: 'Real-time sales data queries, trend analysis, inventory suggestions, marketing campaign creation (coupons, discounts, etc.).',
    },
  },
  {
    icon: '📱',
    title: { zh: '离线兜底', en: 'Offline Fallback' },
    description: {
      zh: '缓存商品+价格，离线出单，恢复网络后自动对账',
      en: 'Cache products + prices, offline orders, auto-reconciliation after network recovery',
    },
    details: {
      zh: '本地缓存 200+ SKU，支持 3 小时离线出单，网络恢复后自动同步订单并完成对账，成功率 100%。',
      en: 'Local cache of 200+ SKUs, supports 3-hour offline orders, auto-syncs and reconciles after network recovery with 100% success rate.',
    },
  },
]

const edgeScenarios = [
  {
    icon: '🏪',
    title: { zh: '零售门店', en: 'Retail Stores' },
    description: {
      zh: '连锁便利店、超市、专卖店，快速收银、库存管理、会员服务',
      en: 'Chain convenience stores, supermarkets, specialty stores, fast checkout, inventory management, member services',
    },
  },
  {
    icon: '🍽️',
    title: { zh: '餐饮行业', en: 'Restaurants' },
    description: {
      zh: '餐厅、咖啡厅、快餐店，语音点餐、桌台管理、经营分析',
      en: 'Restaurants, cafes, fast food, voice ordering, table management, business analytics',
    },
  },
  {
    icon: '💊',
    title: { zh: '药店诊所', en: 'Pharmacies & Clinics' },
    description: {
      zh: '药店、诊所、医院，处方管理、药品查询、会员积分',
      en: 'Pharmacies, clinics, hospitals, prescription management, drug queries, member points',
    },
  },
  {
    icon: '🎮',
    title: { zh: '娱乐场所', en: 'Entertainment Venues' },
    description: {
      zh: 'KTV、游戏厅、影院，会员充值、消费记录、优惠活动',
      en: 'KTV, arcades, cinemas, member top-up, consumption records, promotions',
    },
  },
]

const techSpecs = [
  {
    category: { zh: '模型规格', en: 'Model Specs' },
    items: [
      { label: { zh: '基础模型', en: 'Base Model' }, value: 'Qwen3 0.6B' },
      { label: { zh: '量化方式', en: 'Quantization' }, value: 'INT4/FP4' },
      { label: { zh: '模型体积', en: 'Model Size' }, value: '< 300MB' },
      { label: { zh: '推理延迟', en: 'Inference Latency' }, value: '< 300ms' },
    ],
  },
  {
    category: { zh: '硬件要求', en: 'Hardware Requirements' },
    items: [
      { label: { zh: 'CPU', en: 'CPU' }, value: '4核 ARM / x86' },
      { label: { zh: '内存', en: 'RAM' }, value: '≥ 2GB' },
      { label: { zh: '存储', en: 'Storage' }, value: '≥ 1GB 可用' },
      { label: { zh: 'NPU/GPU', en: 'NPU/GPU' }, value: '可选（推荐）' },
    ],
  },
  {
    category: { zh: '性能指标', en: 'Performance Metrics' },
    items: [
      { label: { zh: '语音响应', en: 'Voice Response' }, value: '< 500ms' },
      { label: { zh: '端云延迟', en: 'Edge-Cloud Latency' }, value: '< 200ms' },
      { label: { zh: '离线缓存', en: 'Offline Cache' }, value: '200+ SKU' },
      { label: { zh: '对账成功率', en: 'Reconciliation Rate' }, value: '100%' },
    ],
  },
]

const comparisonData = [
  {
    feature: { zh: '交互方式', en: 'Interaction' },
    traditional: { zh: '按钮/触摸屏', en: 'Buttons/Touchscreen' },
    edge: { zh: '语音 + 多模态', en: 'Voice + Multimodal' },
  },
  {
    feature: { zh: '培训成本', en: 'Training Cost' },
    traditional: { zh: '需要培训', en: 'Requires Training' },
    edge: { zh: '零培训', en: 'Zero Training' },
  },
  {
    feature: { zh: '离线能力', en: 'Offline Capability' },
    traditional: { zh: '无', en: 'None' },
    edge: { zh: '支持离线出单', en: 'Offline Orders Supported' },
  },
  {
    feature: { zh: '智能推荐', en: 'Smart Recommendations' },
    traditional: { zh: '无', en: 'None' },
    edge: { zh: 'AI 商品推荐', en: 'AI Product Recommendations' },
  },
  {
    feature: { zh: '数据分析', en: 'Data Analytics' },
    traditional: { zh: '基础报表', en: 'Basic Reports' },
    edge: { zh: '实时经营分析', en: 'Real-time Business Analytics' },
  },
]

export default function EdgePage() {
  const [showLogin, setShowLogin] = useState(false)
  const router = useRouter()
  const { t } = useLocalization()

  return (
    <>
      <Head>
        <title>Agentrix Edge - AI 驱动的 POS 智能助手</title>
        <meta name="description" content="Agentrix Edge：基于 Qwen3 0.6B 端侧模型的 POS AI Agent，支持语音收银、智能推荐、离线处理。" />
      </Head>
      <Navigation onLoginClick={() => setShowLogin(true)} />
      <main className="bg-slate-950 text-white">
        {/* Hero */}
        <section className="border-b border-white/10 bg-gradient-to-br from-blue-600/90 via-indigo-600/90 to-purple-600/90 text-white py-20">
          <div className="container mx-auto px-6 text-center space-y-6">
            <p className="inline-flex items-center px-4 py-1 rounded-full bg-white/10 border border-white/20 text-sm tracking-wide">
              📱 Agentrix Edge
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              {t({ zh: 'AI 驱动的 POS 智能助手', en: 'AI-Powered POS Smart Assistant' })}
            </h1>
            <p className="text-lg text-blue-100 max-w-3xl mx-auto">
              {t({
                zh: '基于 Qwen3 0.6B 端侧模型，将传统 POS 升级为智能门店助手。支持语音收银、自动退换货、实时经营分析，<300MB 模型体积，适配主流 POS 硬件。',
                en: 'Based on Qwen3 0.6B edge model, upgrade traditional POS to smart store assistant. Supports voice cashier, auto returns, real-time business analytics, <300MB model size, compatible with mainstream POS hardware.',
              })}
            </p>
          </div>
        </section>

        {/* 五层架构 - 可视化图表 */}
        <section className="py-16 border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t({ zh: 'Agentrix 五层架构', en: 'Agentrix Pentagonal Architecture' })}
              </h2>
              <p className="text-lg text-slate-300 mb-2">
                {t({
                  zh: 'Fat Edge, Thin Cloud / Code is Law / AI First',
                  en: 'Fat Edge, Thin Cloud / Code is Law / AI First',
                })}
              </p>
              <p className="text-sm text-slate-400">
                {t({
                  zh: '构建面向 Agent 时代的支付与商业基础设施',
                  en: 'Building payment and commerce infrastructure for the Agent era',
                })}
              </p>
            </div>

            {/* 可视化架构图 */}
            <div className="mb-12">
              <ArchitectureDiagram t={t} />
            </div>

            {/* 架构层详细说明 */}
            <div className="space-y-6">
              {architectureLayers.map((layer) => (
                <div
                  key={layer.number}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start space-x-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      {layer.number}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-2xl font-semibold text-white">{t(layer.title)}</h3>
                        <span className="text-sm text-slate-400">{t(layer.subtitle)}</span>
                      </div>
                      <p className="text-slate-300 mb-4">{t(layer.description)}</p>
                      <div className="flex flex-wrap gap-3">
                        {layer.features.map((feature, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm"
                          >
                            {t(feature)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Edge 核心功能 */}
        <section className="py-16 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t({ zh: 'Edge 核心功能', en: 'Edge Core Features' })}
              </h2>
              <p className="text-lg text-slate-300">
                {t({
                  zh: '端侧 AI 推理，云端协同，离线可用',
                  en: 'Edge AI inference, cloud collaboration, offline capable',
                })}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {edgeFeatures.map((feature) => (
                <div
                  key={feature.title.zh}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start space-x-4">
                    <span className="text-3xl">{feature.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">{t(feature.title)}</h3>
                      <p className="text-slate-300 text-sm mb-3">{t(feature.description)}</p>
                      <p className="text-slate-400 text-xs leading-relaxed">{t(feature.details)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 技术规格 */}
        <section className="py-16 border-b border-white/10 bg-gradient-to-b from-slate-950 to-slate-900">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t({ zh: '技术规格', en: 'Technical Specifications' })}
              </h2>
              <p className="text-lg text-slate-300">
                {t({
                  zh: '轻量级模型，适配主流 POS 硬件',
                  en: 'Lightweight model, compatible with mainstream POS hardware',
                })}
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {techSpecs.map((spec) => (
                <div
                  key={spec.category.zh}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-4">{t(spec.category)}</h3>
                  <div className="space-y-3">
                    {spec.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">{t(item.label)}</span>
                        <span className="text-white font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 使用场景 */}
        <section className="py-16 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t({ zh: '适用场景', en: 'Use Cases' })}
              </h2>
              <p className="text-lg text-slate-300">
                {t({
                  zh: '覆盖零售、餐饮、医疗、娱乐等多个行业',
                  en: 'Covers retail, catering, healthcare, entertainment and more',
                })}
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {edgeScenarios.map((scenario) => (
                <div
                  key={scenario.title.zh}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center hover:bg-white/10 transition-colors"
                >
                  <span className="text-4xl mb-4 block">{scenario.icon}</span>
                  <h3 className="text-lg font-semibold text-white mb-2">{t(scenario.title)}</h3>
                  <p className="text-slate-300 text-sm">{t(scenario.description)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 传统 POS vs Edge POS 对比 */}
        <section className="py-16 border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t({ zh: '传统 POS vs Edge POS', en: 'Traditional POS vs Edge POS' })}
              </h2>
              <p className="text-lg text-slate-300">
                {t({
                  zh: 'AI 驱动的智能升级，提升效率与体验',
                  en: 'AI-driven intelligent upgrade, improving efficiency and experience',
                })}
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                <div className="grid grid-cols-3 gap-4 p-4 bg-white/5 border-b border-white/10">
                  <div className="font-semibold text-white">
                    {t({ zh: '功能特性', en: 'Feature' })}
                  </div>
                  <div className="font-semibold text-slate-400 text-center">
                    {t({ zh: '传统 POS', en: 'Traditional POS' })}
                  </div>
                  <div className="font-semibold text-indigo-400 text-center">
                    {t({ zh: 'Edge POS', en: 'Edge POS' })}
                  </div>
                </div>
                {comparisonData.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-3 gap-4 p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                  >
                    <div className="text-slate-300">{t(item.feature)}</div>
                    <div className="text-slate-400 text-center">{t(item.traditional)}</div>
                    <div className="text-indigo-300 text-center font-medium">{t(item.edge)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 部署方式 */}
        <section className="py-16 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t({ zh: '部署方式', en: 'Deployment Options' })}
              </h2>
              <p className="text-lg text-slate-300">
                {t({
                  zh: '支持厂家预装和老旧 POS 升级',
                  en: 'Supports OEM pre-installation and legacy POS upgrades',
                })}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
                <div className="text-4xl mb-4">🏭</div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {t({ zh: '厂家预装（OEM）', en: 'OEM Pre-installation' })}
                </h3>
                <p className="text-slate-300 text-sm mb-4">
                  {t({
                    zh: '与 POS 厂家合作，在新出货设备中预装 Agentrix Edge runtime + Qwen 0.6B 模型。硬件统一、NPU/NFC/外设适配一次性完成。',
                    en: 'Partner with POS manufacturers to pre-install Agentrix Edge runtime + Qwen 0.6B model in new devices. Unified hardware, one-time NPU/NFC/peripheral adaptation.',
                  })}
                </p>
                <ul className="space-y-2 text-slate-400 text-sm">
                  <li>• {t({ zh: '硬件统一，适配完善', en: 'Unified hardware, perfect adaptation' })}</li>
                  <li>• {t({ zh: '便于规模 OTA 与维护', en: 'Easy OTA and maintenance at scale' })}</li>
                  <li>• {t({ zh: '开箱即用', en: 'Ready to use out of the box' })}</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
                <div className="text-4xl mb-4">🔧</div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {t({ zh: '老旧 POS 升级（Retrofit）', en: 'Legacy POS Upgrade (Retrofit)' })}
                </h3>
                <p className="text-slate-300 text-sm mb-4">
                  {t({
                    zh: '通过 OTA/SD 卡/运维工具包，把 Edge runtime、模型、意图表下发到现有存量 POS。支持 Lite 模式（无 NPU 时降级部分推理到云端）。',
                    en: 'Deploy Edge runtime, model, and intent tables to existing POS via OTA/SD card/maintenance toolkit. Supports Lite mode (degrade some inference to cloud when no NPU).',
                  })}
                </p>
                <ul className="space-y-2 text-slate-400 text-sm">
                  <li>• {t({ zh: '低成本升级', en: 'Low-cost upgrade' })}</li>
                  <li>• {t({ zh: '兼容现有硬件', en: 'Compatible with existing hardware' })}</li>
                  <li>• {t({ zh: '渐进式部署', en: 'Gradual deployment' })}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-700 py-20 text-white text-center">
          <div className="container mx-auto px-6 space-y-6">
            <h2 className="text-4xl font-bold">
              {t({ zh: '升级您的 POS 为 AI 智能助手', en: 'Upgrade Your POS to AI Smart Assistant' })}
            </h2>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto">
              {t({
                zh: '支持厂家预装和老旧 POS 升级，Qwen3 0.6B 模型 <300MB，适配主流硬件。',
                en: 'Supports OEM pre-installation and legacy POS upgrades, Qwen3 0.6B model <300MB, compatible with mainstream hardware.',
              })}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => router.push('/developers')}
                className="bg-white text-indigo-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all"
              >
                {t({ zh: '查看技术文档', en: 'View Documentation' })}
              </button>
              <button
                onClick={() => setShowLogin(true)}
                className="bg-white/10 border border-white/40 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all"
              >
                {t({ zh: '联系商务', en: 'Contact Sales' })}
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  )
}

