import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { Navigation } from '../components/ui/Navigation'
import { Footer } from '../components/layout/Footer'
import { LoginModal } from '../components/auth/LoginModal'
import { AssetDiscovery } from '../components/marketplace/AssetDiscovery'
import { ProductServiceSection } from '../components/marketplace/ProductServiceSection'
import { AgentMarketplacePanel } from '../components/marketplace/AgentMarketplacePanel'
import { useLocalization } from '../contexts/LocalizationContext'

const assetTypes = [
  { icon: '🪙', title: 'Token Directory', detail: 'Solana · Ethereum · BSC · Polygon · Sui · TON', highlight: 'Token List → 即刻交易' },
  { icon: '⚖️', title: 'DEX 交易对', detail: 'Jupiter · Raydium · Uniswap · 1inch · OpenOcean', highlight: '市价 / 限价 / 定投 / 网格' },
  { icon: '🖼️', title: 'NFT Trending', detail: 'Magic Eden · OpenSea · Tensor', highlight: '一键扫货 / 出价 / 列表' },
  { icon: '🏦', title: '链上 RWA', detail: 'USYC · ONDO · MANTRA · Maple · Credix', highlight: '收益展示 / 分红监控' },
  { icon: '🚀', title: 'Launchpad / Presale', detail: 'Pump.fun · Raydium · TON Presale', highlight: '提醒 / 抢购 / 止盈 / 跟单' },
]


const experienceFlows = [
  {
    title: 'Auto-Earn 体验',
    description: '绑定钱包或法币后交给 Agent 自动套利 / DCA / 复投，收益实时播报。',
    steps: ['选择策略模板', '确认限额与托管方式', 'Agent 自动执行并回传收益'],
  },
  {
    title: 'Launchpad 抢购',
    description: '聚合 Pump.fun / Raydium / TON Presale，Agent 自动提醒并执行抢购、止盈。',
    steps: ['订阅项目或关键词', 'Agent 推送最优通道 + 成本', '一键抢购并设定止盈/跟单'],
  },
  {
    title: 'RWA / NFT 订阅',
    description: '展示收益、KYC 要求、风险标签，Agent 自动打款并跟踪回款 / 版税。',
    steps: ['浏览资产评级', 'Agent 检查资格与 KYC', '完成支付并监控收益'],
  },
]

const automationHighlights = [
  '自动聚合 Token / DEX / NFT / RWA / Launchpad 数据源，生成统一资产模型',
  '智能打标签，展示价格 / 流动性 / 波动率 / 风险 / 税费 / 合规信息',
  'Agent 可直接发起 swap / 限价 / 定投 / 扫地 / 抢购 / 订阅',
  '开放上架入口与返佣配置，激励项目方、Agent、推广Agent共建',
  'AI 生成介绍、策略、风险评级，并提供 Session Trace 与审计',
]

const statHighlights = [
  { label: '可用资产', value: '11,200+' },
  { label: '支持链', value: '6 主链 + 18 L2' },
  { label: '渠道返佣', value: '0.3% - 2.5%' },
  { label: '资产刷新', value: '~3 分钟' },
]

export default function MarketplacePage() {
  const [showLogin, setShowLogin] = useState(false)
  const router = useRouter()
  const { t } = useLocalization()

  return (
    <>
      <Head>
        <title>PayMind Marketplace｜AI 聚合资产与策略</title>
        <meta
          name="description"
          content="无需等待商户入驻，直接获得 Token、DEX、NFT、RWA、Launchpad 可交易资产，Agent 即刻执行。"
        />
      </Head>

      <Navigation onLoginClick={() => setShowLogin(true)} />

      <main className="min-h-screen bg-slate-950 text-white">
        {/* 通过 Agent 访问提示 */}
        <section className="border-b border-white/10 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-300">
                    {t({ zh: '通过 Agent 访问 Marketplace', en: 'Access Marketplace through Agent' })}
                  </p>
                  <p className="text-xs text-slate-300">
                    {t({ zh: '在 Agent 工作台中直接搜索和购买商品，或创建 Agent 时配置 Marketplace 能力', en: 'Search and buy products directly in Agent workspace, or configure Marketplace capability when creating Agent' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/agent-builder')}
                className="bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-all"
              >
                {t({ zh: '创建 Agent', en: 'Create Agent' })}
              </button>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900">
          <div className="container mx-auto px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">Marketplace</p>
              <h1 className="text-4xl md:text-5xl font-bold">让 Agent 一出生就拥有可执行资产池。</h1>
              <p className="text-slate-200">
                聚合六大公链 Token、主流 DEX、NFT、RWA、Launchpad，自动完成定价、支付、风控、分佣。
                Agent 与商户只需配置资产和返佣，PayMind Marketplace 立即执行。
              </p>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-sm text-emerald-300 font-semibold mb-2">
                  {t({ zh: '💡 提示：通过 Agent 访问 Marketplace', en: '💡 Tip: Access Marketplace through Agent' })}
                </p>
                <p className="text-xs text-slate-300">
                  {t({ zh: '在 Agent 工作台中，您可以直接搜索 Marketplace 中的商品。创建 Agent 时，选择"Marketplace 访问"能力即可。', en: 'In Agent workspace, you can directly search products in Marketplace. When creating Agent, select "Marketplace Access" capability.' })}
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setShowLogin(true)}
                  className="bg-white text-slate-900 font-semibold px-6 py-3 rounded-xl shadow hover:-translate-y-0.5 transition"
                >
                  立即体验 Auto-Earn
                </button>
                <button
                  onClick={() => router.push('/agent-enhanced')}
                  className="border border-white/30 px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition"
                >
                  打开 PayMind Agent
                </button>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="text-sm text-slate-300 flex items-center justify-between">
                <span>Session</span>
                <span>MKP-SR-78124</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {statHighlights.map((stat) => (
                  <div key={stat.label} className="bg-slate-900/60 border border-white/10 rounded-2xl p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{stat.label}</p>
                    <p className="text-2xl font-semibold">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="text-sm text-slate-300 space-y-2">
                <div className="flex justify-between">
                  <span>默认策略</span>
                  <span className="text-emerald-300">Smart Routing · QuickPay 优先</span>
                </div>
                <div className="flex justify-between">
                  <span>返佣模型</span>
                  <span>Agent 0.5% · 推广 Agent 0.5% · PayMind 0.5%</span>
                </div>
                <div className="flex justify-between">
                  <span>运营状态</span>
                  <span>资产刷新 2 分钟前 · 执行 Agent 24x7</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-slate-900">
          <div className="container mx-auto px-6 py-16 space-y-10">
            <div className="text-center space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">Unified Asset Pool</p>
              <h2 className="text-3xl md:text-4xl font-bold">同步链上资产，直接映射为 Agent 商品。</h2>
              <p className="text-slate-300 max-w-3xl mx-auto">
                Token、DEX 交易对、NFT、RWA、Launchpad 一次接入，并附带 Session Trace、智能路由、返佣与风控标签。
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assetTypes.map((asset) => (
                <div key={asset.title} className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-3">
                  <div className="text-4xl">{asset.icon}</div>
                  <h3 className="text-xl font-semibold">{asset.title}</h3>
                  <p className="text-sm text-slate-300">{asset.detail}</p>
                  <span className="inline-flex text-xs font-semibold text-cyan-200 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1">
                    {asset.highlight}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-slate-950">
          <div className="container mx-auto px-6 py-16 space-y-8">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-indigo-300">User Flows</p>
              <h2 className="text-3xl md:text-4xl font-bold">收益、抢购、订阅一次搞定。</h2>
              <p className="text-slate-300 max-w-3xl mx-auto">
                Agent 面向用户展示完整流程，PayMind 负责支付、合规、分润与托管。项目方只需配置资产与返佣。
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {experienceFlows.map((flow) => (
                <div key={flow.title} className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-3">
                  <h3 className="text-xl font-semibold">{flow.title}</h3>
                  <p className="text-sm text-slate-300">{flow.description}</p>
                  <ol className="space-y-3 text-sm text-slate-200">
                    {flow.steps.map((step, index) => (
                      <li key={step} className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-full bg-white/10 text-xs flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-slate-900">
          <div className="container mx-auto px-6 py-16 space-y-12">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h3 className="text-2xl font-semibold mb-4">{t({ zh: 'AI 自动化亮点', en: 'AI Automation Highlights' })}</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {automationHighlights.map((highlight) => (
                  <div key={highlight} className="flex gap-3 text-sm text-slate-200">
                    <span className="text-emerald-300">✓</span>
                    {highlight}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 rounded-3xl border border-emerald-500/30 p-6">
              <h3 className="text-xl font-semibold mb-4">{t({ zh: '在 Agent 中如何使用 Marketplace', en: 'How to Use Marketplace in Agent' })}</h3>
              <div className="space-y-3 text-sm text-slate-200">
                <p>{t({ zh: '1. 创建或打开你的 Agent', en: '1. Create or open your Agent' })}</p>
                <p>{t({ zh: '2. 在 Agent 对话中搜索商品或资产', en: '2. Search for products or assets in Agent conversation' })}</p>
                <p>{t({ zh: '3. Agent 自动从 Marketplace 获取商品信息', en: '3. Agent automatically fetches product information from Marketplace' })}</p>
                <p>{t({ zh: '4. 通过 Agent 完成下单和支付', en: '4. Complete order and payment through Agent' })}</p>
              </div>
              <button
                onClick={() => router.push('/agent-builder')}
                className="mt-4 bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-all"
              >
                {t({ zh: '立即创建 Agent', en: 'Create Agent Now' })}
              </button>
            </div>
          </div>
        </section>

        <section className="border-b border-white/5 bg-slate-950">
          <ProductServiceSection />
        </section>

        <section className="border-b border-white/5 bg-slate-900">
          <div className="container mx-auto px-6 py-16 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">Live Assets</p>
                <h2 className="text-3xl font-bold">实时聚合链上资产</h2>
              </div>
              <button
                onClick={() => router.push('/agent')}
                className="self-start md:self-auto border border-white/20 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-white/10"
              >
                让 Agent 帮你下单 →
              </button>
            </div>
            <AssetDiscovery />
          </div>
        </section>

        <section className="border-b border-white/5 bg-slate-950 py-16">
          <div className="container mx-auto px-6 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-indigo-300">Agent Marketplace</p>
              <h2 className="text-3xl font-bold">发现、组合、复用其他 Agent</h2>
              <p className="text-slate-300 mt-2">
                搜索、浏览、调用其他用户创建的 Agent，共享 Auto-Earn、客服、套利、推荐、物流等能力。
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <AgentMarketplacePanel />
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-cyan-500 to-blue-600 py-20 text-center space-y-6">
          <div className="container mx-auto px-6 space-y-4">
            <h2 className="text-4xl font-bold">5 分钟接入，立即拥有可执行资产池。</h2>
            <p className="text-white/90 max-w-3xl mx-auto">
              连接 PayMind Agent、统一支付、联盟分佣、资产聚合，让产品、策略、AI 智能体同步变现。
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => setShowLogin(true)}
                className="bg-white text-cyan-600 font-semibold px-8 py-4 rounded-xl shadow hover:-translate-y-0.5 transition"
              >
                免费创建我的 Agent
              </button>
              <button
                onClick={() => router.push('/alliance')}
                className="bg-white/10 border border-white/30 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition"
              >
                加入 PayMind 联盟
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

