import Head from 'next/head'
import { Navigation } from '../components/ui/Navigation'
import { Footer } from '../components/layout/Footer'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { useLocalization } from '../contexts/LocalizationContext'

const agentScenarios = [
  {
    icon: '👤',
    role: { zh: '个人 Agent', en: 'Personal Agent' },
    title: { zh: '智能购物助手场景', en: 'Smart Shopping Assistant Scenario' },
    description: { zh: '帮助用户搜索商品、比价、下单，通过 Agent 访问 Marketplace 和插件', en: 'Help users search products, compare prices, place orders, access Marketplace and plugins through Agent' },
    capabilities: [
      { zh: '商品搜索和比价', en: 'Product search and price comparison' },
      { zh: 'Marketplace 访问', en: 'Marketplace access' },
      { zh: '插件扩展功能', en: 'Plugin extension capabilities' },
      { zh: '一键下单支付', en: 'One-click order and payment' },
    ],
    example: {
      title: { zh: '典型场景', en: 'Typical Scenario' },
      steps: [
        { zh: '用户："帮我找最便宜的 iPhone 15"', en: 'User: "Find me the cheapest iPhone 15"' },
        { zh: 'Agent：搜索 Marketplace，比较价格，推荐最优方案', en: 'Agent: Search Marketplace, compare prices, recommend optimal solution' },
        { zh: '用户：确认购买', en: 'User: Confirm purchase' },
        { zh: 'Agent：处理支付，完成订单', en: 'Agent: Process payment, complete order' },
      ],
    },
    roi: {
      title: { zh: 'ROI 数据', en: 'ROI Data' },
      metrics: [
        { zh: '节省 30% 购物时间', en: 'Save 30% shopping time' },
        { zh: '降低 20% 购物成本', en: 'Reduce 20% shopping cost' },
        { zh: '提升 40% 购物满意度', en: 'Increase 40% shopping satisfaction' },
      ],
    },
    cta: { zh: '创建个人 Agent', en: 'Create Personal Agent' },
  },
  {
    icon: '🏪',
    role: { zh: '商户 Agent', en: 'Merchant Agent' },
    title: { zh: '智能商户助手场景', en: 'Smart Merchant Assistant Scenario' },
    description: { zh: '管理商品、处理订单、上架 Marketplace，通过插件扩展功能', en: 'Manage products, process orders, list on Marketplace, extend capabilities through plugins' },
    capabilities: [
      { zh: '商品和订单管理', en: 'Product and order management' },
      { zh: 'Marketplace 上架', en: 'Marketplace listing' },
      { zh: '插件扩展功能', en: 'Plugin extension capabilities' },
      { zh: '自动结算和分佣', en: 'Auto settlement and commission' },
    ],
    example: {
      title: { zh: '典型场景', en: 'Typical Scenario' },
      steps: [
        { zh: '商户："自动处理订单并结算"', en: 'Merchant: "Auto process orders and settle"' },
        { zh: 'Agent：处理订单，自动结算，上架 Marketplace', en: 'Agent: Process orders, auto settle, list on Marketplace' },
        { zh: 'Agent：监控销售数据，优化商品推荐', en: 'Agent: Monitor sales data, optimize product recommendations' },
        { zh: 'Agent：自动分佣给推广 Agent', en: 'Agent: Auto commission to Promoter Agents' },
      ],
    },
    roi: {
      title: { zh: 'ROI 数据', en: 'ROI Data' },
      metrics: [
        { zh: '降低 50% 运营成本', en: 'Reduce 50% operating cost' },
        { zh: '提升 35% 转化率', en: 'Increase 35% conversion rate' },
        { zh: '节省 60% 客服时间', en: 'Save 60% customer service time' },
      ],
    },
    cta: { zh: '创建商户 Agent', en: 'Create Merchant Agent' },
  },
  {
    icon: '💻',
    role: { zh: '开发者 Agent', en: 'Developer Agent' },
    title: { zh: '智能开发助手场景', en: 'Smart Development Assistant Scenario' },
    description: { zh: '生成 SDK、集成 API、开发插件，访问 Marketplace API', en: 'Generate SDK, integrate API, develop plugins, access Marketplace API' },
    capabilities: [
      { zh: 'SDK 和 API 生成', en: 'SDK and API generation' },
      { zh: '插件开发工具', en: 'Plugin development tools' },
      { zh: 'Marketplace API 访问', en: 'Marketplace API access' },
      { zh: '沙盒测试环境', en: 'Sandbox testing environment' },
    ],
    example: {
      title: { zh: '典型场景', en: 'Typical Scenario' },
      steps: [
        { zh: '开发者："生成支付集成代码"', en: 'Developer: "Generate payment integration code"' },
        { zh: 'Agent：生成 SDK 代码，提供 API 文档', en: 'Agent: Generate SDK code, provide API documentation' },
        { zh: '开发者：在沙盒中测试', en: 'Developer: Test in sandbox' },
        { zh: 'Agent：验证通过，提供生产环境配置', en: 'Agent: Verification passed, provide production config' },
      ],
    },
    roi: {
      title: { zh: 'ROI 数据', en: 'ROI Data' },
      metrics: [
        { zh: '5分钟完成集成', en: '5 min integration' },
        { zh: '节省 80% 开发时间', en: 'Save 80% development time' },
        { zh: '降低 70% 集成成本', en: 'Reduce 70% integration cost' },
      ],
    },
    cta: { zh: '创建开发者 Agent', en: 'Create Developer Agent' },
  },
  {
    icon: '📢',
    role: { zh: '推广 Agent', en: 'Promoter Agent' },
    title: { zh: '智能推广助手场景', en: 'Smart Promotion Assistant Scenario' },
    description: { zh: '推广商户、推荐 Agent、推广 Marketplace 和插件，获得永久分佣', en: 'Promote merchants, recommend Agents, promote Marketplace and plugins, get permanent commission' },
    capabilities: [
      { zh: '商户推广和分佣', en: 'Merchant promotion and commission' },
      { zh: 'Agent 推荐', en: 'Agent recommendation' },
      { zh: 'Marketplace 推广', en: 'Marketplace promotion' },
      { zh: '插件推荐', en: 'Plugin recommendation' },
    ],
    example: {
      title: { zh: '典型场景', en: 'Typical Scenario' },
      steps: [
        { zh: '推广者："推广商户获得永久分佣"', en: 'Promoter: "Promote merchants for permanent commission"' },
        { zh: 'Agent：生成推广链接，监控推广效果', en: 'Agent: Generate promotion links, monitor promotion effects' },
        { zh: 'Agent：自动计算分佣，实时显示收益', en: 'Agent: Auto calculate commission, display revenue in real-time' },
        { zh: 'Agent：永久分佣，持续收益', en: 'Agent: Permanent commission, continuous revenue' },
      ],
    },
    roi: {
      title: { zh: 'ROI 数据', en: 'ROI Data' },
      metrics: [
        { zh: '0.5% 永久分佣', en: '0.5% permanent commission' },
        { zh: '持续收益，无需维护', en: 'Continuous revenue, no maintenance' },
        { zh: '平台自动结算', en: 'Platform auto-settles' },
      ],
    },
    cta: { zh: '创建推广 Agent', en: 'Create Promoter Agent' },
  },
]

export default function UseCasesPage() {
  const router = useRouter()
  const { t } = useLocalization()

  return (
    <>
      <Head>
        <title>{t({ zh: 'Agentrix 使用场景 - 4 种 Agent 角色，覆盖所有商业场景', en: 'Agentrix Use Cases - 4 Agent Roles, Covering All Business Scenarios' })}</title>
        <meta
          name="description"
          content={t({
            zh: 'Agentrix 使用场景：个人 Agent、商户 Agent、开发者 Agent、推广 Agent 四大场景，覆盖所有商业需求。',
            en: 'Agentrix use cases: Personal Agent, Merchant Agent, Developer Agent, Promoter Agent - four major scenarios covering all business needs.',
          })}
        />
      </Head>

      <Navigation />

      <main className="min-h-screen bg-slate-950 text-white">
        {/* Hero Section */}
        <section className="border-b border-white/10 bg-gradient-to-br from-slate-900/90 to-blue-900/90 text-white py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">Use Cases</p>
              <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl">
                {t({ zh: 'Agentrix 使用场景', en: 'Agentrix Use Cases' })}
              </h1>
              <p className="text-lg text-slate-200 max-w-2xl mx-auto">
                {t({
                  zh: '4 种 Agent 角色，覆盖所有商业场景。每个角色都有完整的场景描述、ROI 数据和示例流程。',
                  en: '4 Agent roles, covering all business scenarios. Each role has complete scenario description, ROI data and example workflow.',
                })}
              </p>
            </div>
          </div>
        </section>

        {/* 场景展示 */}
        <section className="py-20 border-b border-white/10">
          <div className="container mx-auto px-6 space-y-16">
            {agentScenarios.map((scenario, idx) => (
              <div key={idx} className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="text-5xl">{scenario.icon}</div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-indigo-300">{t(scenario.role)}</p>
                    <h2 className="text-3xl font-bold">{t(scenario.title)}</h2>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  {/* 左侧：描述和能力 */}
                  <div className="space-y-6">
                    <p className="text-lg text-slate-200">{t(scenario.description)}</p>
                    <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4">
                      <p className="text-sm font-semibold text-slate-300 uppercase">{t({ zh: '核心能力', en: 'Core Capabilities' })}</p>
                      <div className="flex flex-wrap gap-2">
                        {scenario.capabilities.map((cap, capIdx) => (
                          <span key={capIdx} className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30">
                            {t(cap)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 rounded-3xl border border-emerald-500/30 p-6 space-y-3">
                      <p className="text-sm font-semibold text-emerald-300">{t(scenario.roi.title)}</p>
                      <ul className="space-y-2 text-sm text-slate-200">
                        {scenario.roi.metrics.map((metric, mIdx) => (
                          <li key={mIdx} className="flex items-center gap-2">
                            <span className="text-emerald-400">▹</span>
                            <span>{t(metric)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* 右侧：示例流程 */}
                  <div className="bg-slate-900/60 rounded-3xl border border-white/10 p-6 space-y-4">
                    <p className="text-sm font-semibold text-slate-300 uppercase">{t(scenario.example.title)}</p>
                    <div className="space-y-3">
                      {scenario.example.steps.map((step, sIdx) => (
                        <div key={sIdx} className="flex gap-3">
                          <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {sIdx + 1}
                          </span>
                          <p className="text-sm text-slate-200">{t(step)}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => router.push('/agent-builder')}
                      className="w-full bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-all mt-4"
                    >
                      {t(scenario.cta)}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 快速开始 */}
        <section className="border-b border-white/10 bg-slate-900 py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold">{t({ zh: '立即开始使用', en: 'Start Using Now' })}</h2>
              <p className="text-lg text-slate-300">
                {t({
                  zh: '选择适合你的 Agent 角色，5 分钟创建，立即拥有完整商业能力。',
                  en: 'Choose the Agent role that suits you, create in 5 minutes, immediately have complete business capabilities.',
                })}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => router.push('/agent-builder')}
                  className="bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-all"
                >
                  {t({ zh: '使用 Agent Builder 创建', en: 'Create with Agent Builder' })}
                </button>
                <button
                  onClick={() => router.push('/developers')}
                  className="bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/15 transition"
                >
                  {t({ zh: '查看开发者文档', en: 'View Developer Docs' })}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
