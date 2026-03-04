import Head from 'next/head'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { Navigation } from '../components/ui/Navigation'
import { Footer } from '../components/layout/Footer'
import { useLocalization } from '../contexts/LocalizationContext'

const agentCapabilities = [
  {
    icon: '👤',
    title: { zh: '个人 Agent 能力', en: 'Personal Agent Capabilities' },
    description: { zh: '智能购物助手，通过 Agent 访问 Marketplace 和插件', en: 'Smart shopping assistant, access Marketplace and plugins through Agent' },
    features: [
      { zh: '商品搜索和比价', en: 'Product search and price comparison' },
      { zh: 'Marketplace 访问', en: 'Marketplace access' },
      { zh: '插件扩展功能', en: 'Plugin extension capabilities' },
      { zh: '一键下单支付', en: 'One-click order and payment' },
    ],
  },
  {
    icon: '🏪',
    title: { zh: '商户 Agent 能力', en: 'Merchant Agent Capabilities' },
    description: { zh: '智能商户助手，管理商品、订单，上架 Marketplace', en: 'Smart merchant assistant, manage products, orders, list on Marketplace' },
    features: [
      { zh: '商品和订单管理', en: 'Product and order management' },
      { zh: 'Marketplace 上架', en: 'Marketplace listing' },
      { zh: '插件扩展功能', en: 'Plugin extension capabilities' },
      { zh: '自动结算和分佣', en: 'Auto settlement and commission' },
    ],
  },
  {
    icon: '💻',
    title: { zh: '专业用户 Agent 能力', en: 'Professional User Agent Capabilities' },
    description: { zh: '智能专业助手，生成 SDK、开发插件，访问 Marketplace API', en: 'Smart professional assistant, generate SDK, develop plugins, access Marketplace API' },
    features: [
      { zh: 'SDK 和 API 生成', en: 'SDK and API generation' },
      { zh: '插件开发工具', en: 'Plugin development tools' },
      { zh: 'Marketplace API 访问', en: 'Marketplace API access' },
      { zh: '沙盒测试环境', en: 'Sandbox testing environment' },
    ],
  },
  {
    icon: '📢',
    title: { zh: '推广 Agent 能力', en: 'Promoter Agent Capabilities' },
    description: { zh: '智能推广助手，推广商户、Agent、Marketplace 和插件', en: 'Smart promotion assistant, promote merchants, Agents, Marketplace and plugins' },
    features: [
      { zh: '商户推广和分佣', en: 'Merchant promotion and commission' },
      { zh: 'Agent 推荐', en: 'Agent recommendation' },
      { zh: 'Marketplace 推广', en: 'Marketplace promotion' },
      { zh: '插件推荐', en: 'Plugin recommendation' },
    ],
  },
]

const paymentCapabilities = [
  {
    icon: '💳',
    title: { zh: '统一支付引擎', en: 'Unified Payment Engine' },
    description: { zh: '为 Agent 提供完整的支付能力，支持法币和数字货币', en: 'Provide complete payment capabilities for Agent, support fiat and digital currency' },
    metrics: { zh: '支付成功率 99.3% · 平均路由时间 420ms', en: 'Payment success rate 99.3% · Average routing time 420ms' },
  },
  {
    icon: '🌍',
    title: { zh: '全球支付能力', en: 'Global Payment Capabilities' },
    description: { zh: '一次集成，覆盖全球 50+ 国家，支持 10+ 货币', en: 'One integration, cover 50+ countries, support 10+ currencies' },
    metrics: { zh: '支持 8+ 支付方式', en: 'Support 8+ payment methods' },
  },
]

const ecosystemCapabilities = [
  {
    icon: '🛒',
    title: { zh: 'Marketplace', en: 'Marketplace' },
    description: { zh: '通过 Agent 访问 11,200+ 商品，支持 Token/NFT/RWA/Launchpad', en: 'Access 11,200+ products through Agent, support Token/NFT/RWA/Launchpad' },
    note: { zh: '通过 Agent 访问', en: 'Access through Agent' },
  },
  {
    icon: '🔌',
    title: { zh: '插件市场', en: 'Plugin Marketplace' },
    description: { zh: '50+ 插件可用，扩展 Agent 功能', en: '50+ plugins available, extend Agent capabilities' },
    note: { zh: '通过 Agent 使用', en: 'Use through Agent' },
  },
  {
    icon: '💰',
    title: { zh: '联盟分佣', en: 'Alliance Commission' },
    description: { zh: '通过 Agent 参与联盟，获得永久分佣收益', en: 'Participate in alliance through Agent, get permanent commission revenue' },
    note: { zh: '通过 Agent 参与', en: 'Participate through Agent' },
  },
]

export default function Features() {
  const router = useRouter()
  const { t } = useLocalization()

  return (
    <>
      <Head>
        <title>{t({ zh: 'Agentrix 核心能力 - 所有能力都通过 Agent 提供', en: 'Agentrix Core Capabilities - All Capabilities Provided Through Agent' })}</title>
        <meta
          name="description"
          content={t({
            zh: 'Agentrix 核心能力：Agent 能力、支付能力、生态能力。所有能力都通过 Agent 提供。',
            en: 'Agentrix core capabilities: Agent capabilities, payment capabilities, ecosystem capabilities. All capabilities are provided through Agent.',
          })}
        />
      </Head>

      <Navigation />

      <main className="min-h-screen bg-slate-950 text-white">
        {/* Hero 区域 */}
        <section className="border-b border-white/10 bg-gradient-to-br from-slate-900/90 to-blue-900/90 py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">Agentrix Capabilities</p>
              <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl">
                {t({ zh: 'Agentrix 核心能力', en: 'Agentrix Core Capabilities' })}
              </h1>
              <p className="text-lg text-slate-200 max-w-2xl mx-auto">
                {t({
                  zh: '所有能力都通过 Agent 提供。让 Agent 拥有完整商业能力：支付、订单、结算、推广一体化。',
                  en: 'All capabilities are provided through Agent. Enable Agent with complete business capabilities: Payment, Order, Settlement, Promotion - All in One.',
                })}
              </p>
            </div>
          </div>
        </section>

        {/* Agent 能力（重点） */}
        <section className="border-b border-white/10 py-20">
          <div className="container mx-auto px-6 space-y-10">
            <div className="text-center space-y-4">
              <p className="text-indigo-400 uppercase text-xs tracking-[0.4em]">{t({ zh: 'Agent 能力', en: 'Agent Capabilities' })}</p>
              <h2 className="text-3xl md:text-4xl font-bold">{t({ zh: '4 种 Agent 角色，覆盖所有商业场景', en: '4 Agent Roles, Covering All Business Scenarios' })}</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {agentCapabilities.map((capability, idx) => (
                <div key={idx} className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-indigo-500/50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{capability.icon}</div>
                    <h3 className="text-xl font-semibold">{t(capability.title)}</h3>
                  </div>
                  <p className="text-sm text-slate-300">{t(capability.description)}</p>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 uppercase">{t({ zh: '核心功能', en: 'Core Features' })}:</p>
                    <ul className="space-y-2 text-sm text-slate-300">
                      {capability.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-2">
                          <span className="text-emerald-400">▹</span>
                          <span>{t(feature)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <button
                onClick={() => router.push('/agent-builder')}
                className="bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-all"
              >
                {t({ zh: '立即创建 Agent', en: 'Create Your Agent Now' })}
              </button>
            </div>
          </div>
        </section>

        {/* 支付能力（基础设施） */}
        <section className="border-b border-white/10 bg-slate-900 py-20">
          <div className="container mx-auto px-6 space-y-10">
            <div className="text-center space-y-4">
              <p className="text-cyan-400 uppercase text-xs tracking-[0.4em]">{t({ zh: '支付能力', en: 'Payment Capabilities' })}</p>
              <h2 className="text-3xl md:text-4xl font-bold">{t({ zh: '为 Agent 提供支付能力', en: 'Provide Payment Capabilities for Agent' })}</h2>
              <p className="text-slate-300 max-w-2xl mx-auto">
                {t({
                  zh: '支付是基础设施，为 Agent 提供完整的支付能力，支持法币和数字货币。',
                  en: 'Payment is infrastructure, providing complete payment capabilities for Agent, supporting fiat and digital currency.',
                })}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {paymentCapabilities.map((capability, idx) => (
                <div key={idx} className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4">
                  <div className="text-4xl">{capability.icon}</div>
                  <h3 className="text-xl font-semibold">{t(capability.title)}</h3>
                  <p className="text-sm text-slate-300">{t(capability.description)}</p>
                  <p className="text-xs text-emerald-400 font-semibold">{t(capability.metrics)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 生态能力 */}
        <section className="border-b border-white/10 py-20">
          <div className="container mx-auto px-6 space-y-10">
            <div className="text-center space-y-4">
              <p className="text-pink-300 uppercase text-xs tracking-[0.4em]">{t({ zh: '生态能力', en: 'Ecosystem Capabilities' })}</p>
              <h2 className="text-3xl md:text-4xl font-bold">{t({ zh: 'Marketplace、插件和联盟', en: 'Marketplace, Plugins and Alliance' })}</h2>
              <p className="text-slate-300 max-w-2xl mx-auto">
                {t({
                  zh: '所有生态能力都通过 Agent 访问，让 Agent 拥有完整商业生态。',
                  en: 'All ecosystem capabilities are accessed through Agent, enabling Agent with complete business ecosystem.',
                })}
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {ecosystemCapabilities.map((capability, idx) => (
                <div key={idx} className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-pink-500/50 transition-all">
                  <div className="text-4xl">{capability.icon}</div>
                  <h3 className="text-xl font-semibold">{t(capability.title)}</h3>
                  <p className="text-sm text-slate-300">{t(capability.description)}</p>
                  <p className="text-xs text-pink-300 font-semibold">{t(capability.note)}</p>
                  <button
                    onClick={() => {
                      if (capability.title.zh === 'Marketplace') {
                        router.push('/marketplace')
                      } else if (capability.title.zh === '插件市场') {
                        router.push('/plugins')
                      } else {
                        router.push('/alliance')
                      }
                    }}
                    className="w-full bg-white/10 border border-white/20 text-white font-semibold px-4 py-2 rounded-lg hover:bg-white/15 transition text-sm"
                  >
                    {t({ zh: '了解更多', en: 'Learn More' })}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 技术能力 */}
        <section className="border-b border-white/10 bg-slate-900 py-20">
          <div className="container mx-auto px-6 space-y-10">
            <div className="text-center space-y-4">
              <p className="text-cyan-300 uppercase text-xs tracking-[0.4em]">{t({ zh: '技术能力', en: 'Technical Capabilities' })}</p>
              <h2 className="text-3xl md:text-4xl font-bold">{t({ zh: 'API、SDK 和完整文档', en: 'API, SDK and Complete Documentation' })}</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4">
                <h3 className="text-xl font-semibold">{t({ zh: 'API & SDK', en: 'API & SDK' })}</h3>
                <p className="text-sm text-slate-300">{t({ zh: '支持 JavaScript/TypeScript、Python、React 等多种语言和框架', en: 'Support JavaScript/TypeScript, Python, React and more languages and frameworks' })}</p>
                <button
                  onClick={() => router.push('/developers')}
                  className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold"
                >
                  {t({ zh: '查看文档 →', en: 'View Docs →' })}
                </button>
              </div>
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4">
                <h3 className="text-xl font-semibold">{t({ zh: 'Sandbox 测试', en: 'Sandbox Testing' })}</h3>
                <p className="text-sm text-slate-300">{t({ zh: '提供完整的沙盒环境，支持本地调试和测试', en: 'Complete sandbox environment for local debugging and testing' })}</p>
                <button
                  onClick={() => router.push('/developers')}
                  className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold"
                >
                  {t({ zh: '查看文档 →', en: 'View Docs →' })}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA 区域 */}
        <section className="bg-gradient-to-r from-emerald-500 to-indigo-600 px-6 py-20 text-center text-white">
          <div className="container mx-auto space-y-6">
            <h2 className="text-4xl font-bold">{t({ zh: '立即创建你的 Agent', en: 'Create Your Agent Now' })}</h2>
            <p className="mx-auto max-w-2xl text-white/90">
              {t({
                zh: '5 分钟创建 Agent，无需编写代码，立即拥有完整商业能力。',
                en: 'Create Agent in 5 minutes, no coding required, immediately have complete business capabilities.',
              })}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => router.push('/agent-builder')}
                className="bg-white text-emerald-600 font-semibold px-8 py-4 rounded-xl hover:bg-gray-100 transition"
              >
                {t({ zh: '立即创建 Agent', en: 'Create Your Agent' })}
              </button>
              <button
                onClick={() => router.push('/developers')}
                className="bg-white/10 border border-white/40 px-8 py-4 font-semibold text-white rounded-xl hover:bg-white/20 transition"
              >
                {t({ zh: '查看文档', en: 'View Docs' })}
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
