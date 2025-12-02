import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { LoginModal } from '../components/auth/LoginModal'
import { Navigation } from '../components/ui/Navigation'
import { Footer } from '../components/layout/Footer'
import { useUser } from '../contexts/UserContext'
import { useLocalization } from '../contexts/LocalizationContext'

export default function Home() {
  const [showLogin, setShowLogin] = useState(false)
  const router = useRouter()
  const { isAuthenticated } = useUser()
  const { t } = useLocalization()

  const paymentStages = [
    { zh: '支付请求', en: 'Payment Request' },
    { zh: '价格 & 税费', en: 'Price & Tax' },
    { zh: '智能路由', en: 'Smart Routing' },
    { zh: '执行 & 风控', en: 'Execution & Risk' },
    { zh: '分佣计算', en: 'Commission' },
    { zh: '托管 & 释放', en: 'Escrow & Release' },
    { zh: '结算 & 对账', en: 'Settlement & Reconciliation' },
  ]

  const paymentChannels = [
    'Stripe',
    'Apple Pay',
    'Google Pay',
    'X402',
    'Wallet / MetaMask',
    'Aggregator',
    'Fiat → Crypto',
    'QuickPay',
  ]

  const autoEarnHighlights = [
    {
      title: { zh: 'Auto-Earn 策略面板', en: 'Auto-Earn Strategy Panel' },
      detail: { zh: '空投 / 套利 / Launchpad / 策略执行，一键启动、实时收益。', en: 'Airdrop / Arbitrage / Launchpad / Strategy execution, one-click start, real-time returns.' },
    },
    {
      title: { zh: '混合资产聚合', en: 'Hybrid Asset Aggregation' },
      detail: { zh: 'Token / NFT / RWA / Launchpad 全部接入，API + 链上双通道。', en: 'Token / NFT / RWA / Launchpad all integrated, API + on-chain dual channels.' },
    },
    {
      title: { zh: '收益透明', en: 'Transparent Returns' },
      detail: { zh: 'GMV、返佣、资金流图实时可视化，方便推广 & 结算。', en: 'GMV, rebates, cash flow charts in real-time visualization for promotion & settlement.' },
    },
  ]

  const allianceStats = [
    {
      label: { zh: '固定佣金', en: 'Fixed Commission' },
      value: { zh: '实物 3% / 服务 5% / 链上 2.5%', en: 'Physical 3% / Service 5% / On-chain 2.5%' },
      sub: { zh: '执行 Agent、推荐 Agent、PayMind 拆分清晰', en: 'Execution Agent, Referral Agent, PayMind split clearly' },
    },
    {
      label: { zh: '推广收益', en: 'Promotion Revenue' },
      value: { zh: '0.5% 永久分成', en: '0.5% Permanent Share' },
      sub: { zh: '只要商户在平台，推广 Agent 就把收益带回家', en: 'As long as merchants are on the platform, promotion Agent brings revenue home' },
    },
    {
      label: { zh: '推广奖励', en: 'Promotion Rewards' },
      value: { zh: '一次性 + 永久分成', en: 'One-time + Permanent Share' },
      sub: { zh: '推广商户获得入驻奖励，后续所有交易永久分成', en: 'Get merchant onboarding rewards, permanent share from all future transactions' },
    },
  ]

  const techPoints = [
    { zh: '多链兼容：EVM / Solana / Tron / Base / TON', en: 'Multi-chain: EVM / Solana / Tron / Base / TON' },
    { zh: 'Session ID 全链路追踪，实时 SLA 监控', en: 'Session ID full-chain tracking, real-time SLA monitoring' },
    { zh: 'ERC 8004 / DID 计划，Agent ID 链上可验证', en: 'ERC 8004 / DID plan, Agent ID on-chain verifiable' },
    { zh: 'KYC / AML / Risk Engine 全流程合规', en: 'KYC / AML / Risk Engine full-process compliance' },
    { zh: '开放 API & SDK，配套测试脚本一键运行', en: 'Open API & SDK, test scripts one-click run' },
  ]

  return (
    <>
      <Head>
        <title>{t({ zh: '从对话到交易，从智能体到商业体｜PayMind', en: 'From Conversation to Transaction, from Agent to Business | PayMind' })}</title>
        <meta name="description" content={t({ zh: 'PayMind 让任何 Agent 拥有支付、订单、结算、资产与推广能力，统一支付引擎 × Agent × Marketplace × Auto-Earn × 联盟生态。', en: 'PayMind enables any Agent with payment, order, settlement, asset and promotion capabilities, unified payment engine × Agent × Marketplace × Auto-Earn × Alliance ecosystem.' })} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Navigation onLoginClick={() => setShowLogin(true)} />

      <main className="min-h-screen bg-slate-950 text-white">
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="container mx-auto px-6 py-24 lg:py-28">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <p className="text-cyan-400 font-semibold uppercase tracking-[0.3em] text-xs">
                  {t({ zh: 'PAYMIND 统一支付 × Agent 商业能力', en: 'PAYMIND Unified Payment × Agent Business Capabilities' })}
                </p>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                  {t({ zh: '让 AI Agent 成为独立商业体', en: 'Turn AI Agents into Independent Business Entities' })}
                </h1>
                <p className="text-lg text-slate-200">
                  {t({ zh: '支付、订单、结算、推广一体化。从对话到交易，从流量到收益。', en: 'Payment, Order, Settlement, Promotion - All in One. From Conversation to Transaction, from Traffic to Revenue.' })}
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-emerald-400">⚡</span>
                    <span className="text-slate-300">{t({ zh: '5分钟集成', en: '5 Min Integration' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-emerald-400">💰</span>
                    <span className="text-slate-300">{t({ zh: '0成本启动', en: '0 Cost Startup' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-emerald-400">📈</span>
                    <span className="text-slate-300">{t({ zh: '永久分佣', en: 'Permanent Commission' })}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => router.push('/payment-demo')}
                    className="bg-white text-slate-900 font-semibold px-8 py-4 rounded-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-white/20"
                  >
                    {t({ zh: '体验统一支付', en: 'Try Unified Payment' })}
                  </button>
                  <button
                    onClick={() => router.push(isAuthenticated ? '/agent-enhanced' : '/agent-builder')}
                    className="bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-all shadow-lg"
                  >
                    {t({ zh: '立即创建 Agent', en: 'Create Your Agent' })}
                  </button>
                  <button
                    onClick={() => router.push('/developers')}
                    className="text-slate-300 underline underline-offset-4 decoration-dotted hover:text-white transition"
                  >
                    {t({ zh: '申请商户接入', en: 'Apply Merchant Access' })}
                  </button>
                </div>
              </div>
              <div className="bg-slate-900/70 border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl shadow-black/40">
                <div className="text-sm text-cyan-400 uppercase tracking-[0.4em]">
                  {t({ zh: '实时对话示例', en: 'Live Conversation Example' })}
                </div>
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-2xl p-4">
                    <p className="text-xs text-slate-400 mb-1">{t({ zh: '用户', en: 'User' })}</p>
                    <p className="text-base">{t({ zh: '"帮我买一台适合视频剪辑的 MacBook Pro，预算 18,000 元以内。"', en: '"Help me buy a MacBook Pro suitable for video editing, budget within 18,000 yuan."' })}</p>
                  </div>
                  <div className="bg-cyan-400/10 border border-cyan-400/30 rounded-2xl p-4">
                    <p className="text-xs text-cyan-300 mb-1">PayMind Agent</p>
                    <p className="text-sm">
                      {t({ zh: '已筛选 4 个商户，推荐「旗舰店」￥17,899，通道：Apple Pay（1.2%）+ QuickPay，预计 2 秒到账。', en: 'Screened 4 merchants, recommended "Flagship Store" ¥17,899, channel: Apple Pay (1.2%) + QuickPay, estimated 2 seconds to account.' })}
                    </p>
                  </div>
                  <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-2xl p-4">
                    <p className="text-xs text-emerald-300 mb-1">{t({ zh: '支付结果', en: 'Payment Result' })}</p>
                    <p className="text-sm">{t({ zh: '支付成功 · Session #PM-5F8D · 商户到账 ¥17,372 · Agent 分成 3%', en: 'Payment successful · Session #PM-5F8D · Merchant received ¥17,372 · Agent commission 3%' })}</p>
                  </div>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {t({ zh: '智能路由成功率 99.2% · 平均 3.4 秒完成整条链路', en: 'Smart routing success rate 99.2% · Average 3.4 seconds to complete the entire chain' })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 价值主张区域 */}
        <section className="border-b border-white/5 bg-gradient-to-b from-slate-950 to-slate-900">
          <div className="container mx-auto px-6 py-16 space-y-10">
            <div className="text-center space-y-4 mb-12">
              <p className="text-cyan-400 uppercase text-xs tracking-[0.4em]">{t({ zh: '为什么选择 PayMind？', en: 'Why PayMind?' })}</p>
              <h2 className="text-3xl md:text-4xl font-bold">{t({ zh: '让 Agent 拥有完整商业能力', en: 'Complete Business Capabilities for Agents' })}</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* 价值点 1: Agent 即商业体 */}
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-emerald-500/50 transition-all">
                <div className="text-4xl">🚀</div>
                <h3 className="text-xl font-semibold">{t({ zh: '让 Agent 成为独立商业体', en: 'Turn Agent into Business Entity' })}</h3>
                <p className="text-sm text-slate-300">{t({ zh: '无需开发支付系统，Agent 直接处理交易、订单、结算', en: 'No need to develop payment system, Agent directly handles transactions, orders, settlement' })}</p>
                <div className="text-xs text-emerald-400 font-semibold">{t({ zh: '5分钟集成，支持 8+ 支付方式', en: '5 min integration, 8+ payment methods' })}</div>
                <div className="text-xs text-slate-400">{t({ zh: '相比自建支付系统，节省 90% 开发时间', en: 'Save 90% development time vs building from scratch' })}</div>
              </div>
              
              {/* 价值点 2: 生态收益共享 */}
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-emerald-500/50 transition-all">
                <div className="text-4xl">💰</div>
                <h3 className="text-xl font-semibold">{t({ zh: '参与生态，获得永久收益', en: 'Join Ecosystem, Get Permanent Revenue' })}</h3>
                <p className="text-sm text-slate-300">{t({ zh: '推广商户获得 0.5% 永久分佣，推荐 Agent 获得持续收益', en: 'Promote merchants get 0.5% permanent commission, recommend Agents get continuous revenue' })}</p>
                <div className="text-xs text-emerald-400 font-semibold">{t({ zh: '无需推广成本，平台自动结算', en: 'No promotion cost, platform auto-settles' })}</div>
              </div>
              
              {/* 价值点 3: 全球支付能力 */}
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-emerald-500/50 transition-all">
                <div className="text-4xl">🌍</div>
                <h3 className="text-xl font-semibold">{t({ zh: '一次集成，全球可用', en: 'One Integration, Global Access' })}</h3>
                <p className="text-sm text-slate-300">{t({ zh: '智能路由自动选择最优支付方式，支持法币和数字货币', en: 'Smart routing auto-selects optimal payment method, supports fiat and crypto' })}</p>
                <div className="text-xs text-emerald-400 font-semibold">{t({ zh: '覆盖 50+ 国家，支持 10+ 货币', en: '50+ countries, 10+ currencies' })}</div>
                <div className="text-xs text-slate-400">{t({ zh: '支付成功率 99.5%，平均处理时间 < 3 秒', en: '99.5% success rate, < 3s avg processing time' })}</div>
              </div>
              
              {/* 价值点 4: Marketplace 和插件生态 */}
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-emerald-500/50 transition-all">
                <div className="text-4xl">🛒</div>
                <h3 className="text-xl font-semibold">{t({ zh: '完整的 Marketplace 和插件生态', en: 'Complete Marketplace & Plugin Ecosystem' })}</h3>
                <p className="text-sm text-slate-300">{t({ zh: 'Agent 可以直接访问 11,200+ 商品，安装插件扩展能力', en: 'Agent can directly access 11,200+ products, install plugins to extend capabilities' })}</p>
                <div className="text-xs text-emerald-400 font-semibold">{t({ zh: '支持 Token/NFT/RWA/Launchpad，50+ 插件可用', en: 'Token/NFT/RWA/Launchpad support, 50+ plugins available' })}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Agent 能力展示区域 */}
        <section className="border-b border-white/5 bg-slate-900">
          <div className="container mx-auto px-6 py-16 space-y-10">
            <div className="text-center space-y-4">
              <p className="text-indigo-400 uppercase text-xs tracking-[0.4em]">{t({ zh: 'Agent 能做什么？', en: 'What Can Agents Do?' })}</p>
              <h2 className="text-3xl md:text-4xl font-bold">{t({ zh: '4 种 Agent 角色，覆盖所有商业场景', en: '4 Agent Roles, Covering All Business Scenarios' })}</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {/* 个人 Agent */}
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-indigo-500/50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">👤</div>
                  <h3 className="text-xl font-semibold">{t({ zh: '个人 Agent', en: 'Personal Agent' })}</h3>
                </div>
                <p className="text-sm text-slate-300 font-medium">{t({ zh: '智能购物助手', en: 'Smart Shopping Assistant' })}</p>
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">{t({ zh: '核心能力', en: 'Core Capabilities' })}:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { zh: '商品搜索', en: 'Product Search' },
                      { zh: '比价下单', en: 'Price Compare' },
                      { zh: 'Marketplace 访问', en: 'Marketplace Access' },
                      { zh: '插件扩展', en: 'Plugin Extension' },
                    ].map((cap) => (
                      <span key={cap.zh} className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30">
                        {t(cap)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-950/60 rounded-xl p-3 text-xs text-slate-300">
                  <p className="text-slate-400 mb-1">{t({ zh: '示例', en: 'Example' })}:</p>
                  <p>&quot;{t({ zh: '帮我找最便宜的 iPhone 15', en: 'Find me the cheapest iPhone 15' })}&quot;</p>
                </div>
                <div className="text-xs text-emerald-400 font-semibold">{t({ zh: '节省 30% 购物时间', en: 'Save 30% shopping time' })}</div>
              </div>

              {/* 商户 Agent */}
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-indigo-500/50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🏪</div>
                  <h3 className="text-xl font-semibold">{t({ zh: '商户 Agent', en: 'Merchant Agent' })}</h3>
                </div>
                <p className="text-sm text-slate-300 font-medium">{t({ zh: '智能商户助手', en: 'Smart Merchant Assistant' })}</p>
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">{t({ zh: '核心能力', en: 'Core Capabilities' })}:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { zh: '商品管理', en: 'Product Management' },
                      { zh: '订单处理', en: 'Order Processing' },
                      { zh: 'Marketplace 上架', en: 'Marketplace Listing' },
                      { zh: '插件扩展', en: 'Plugin Extension' },
                    ].map((cap) => (
                      <span key={cap.zh} className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30">
                        {t(cap)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-950/60 rounded-xl p-3 text-xs text-slate-300">
                  <p className="text-slate-400 mb-1">{t({ zh: '示例', en: 'Example' })}:</p>
                  <p>&quot;{t({ zh: '自动处理订单并结算', en: 'Auto process orders and settle' })}&quot;</p>
                </div>
                <div className="text-xs text-emerald-400 font-semibold">{t({ zh: '降低 50% 运营成本', en: 'Reduce 50% operating cost' })}</div>
              </div>

              {/* 开发者 Agent */}
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-indigo-500/50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">💻</div>
                  <h3 className="text-xl font-semibold">{t({ zh: '开发者 Agent', en: 'Developer Agent' })}</h3>
                </div>
                <p className="text-sm text-slate-300 font-medium">{t({ zh: '智能开发助手', en: 'Smart Development Assistant' })}</p>
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">{t({ zh: '核心能力', en: 'Core Capabilities' })}:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { zh: 'SDK 生成', en: 'SDK Generation' },
                      { zh: 'API 集成', en: 'API Integration' },
                      { zh: '插件开发', en: 'Plugin Development' },
                      { zh: 'Marketplace API', en: 'Marketplace API' },
                    ].map((cap) => (
                      <span key={cap.zh} className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30">
                        {t(cap)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-950/60 rounded-xl p-3 text-xs text-slate-300">
                  <p className="text-slate-400 mb-1">{t({ zh: '示例', en: 'Example' })}:</p>
                  <p>&quot;{t({ zh: '生成支付集成代码', en: 'Generate payment integration code' })}&quot;</p>
                </div>
                <div className="text-xs text-emerald-400 font-semibold">{t({ zh: '5分钟完成集成', en: '5 min integration' })}</div>
              </div>

              {/* 推广 Agent */}
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-indigo-500/50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📢</div>
                  <h3 className="text-xl font-semibold">{t({ zh: '推广 Agent', en: 'Promoter Agent' })}</h3>
                </div>
                <p className="text-sm text-slate-300 font-medium">{t({ zh: '智能推广助手', en: 'Smart Promotion Assistant' })}</p>
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">{t({ zh: '核心能力', en: 'Core Capabilities' })}:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { zh: '商户推广', en: 'Merchant Promotion' },
                      { zh: 'Agent 推荐', en: 'Agent Recommendation' },
                      { zh: 'Marketplace 推广', en: 'Marketplace Promotion' },
                      { zh: '插件推荐', en: 'Plugin Recommendation' },
                    ].map((cap) => (
                      <span key={cap.zh} className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30">
                        {t(cap)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-950/60 rounded-xl p-3 text-xs text-slate-300">
                  <p className="text-slate-400 mb-1">{t({ zh: '示例', en: 'Example' })}:</p>
                  <p>&quot;{t({ zh: '推广商户获得永久分佣', en: 'Promote merchants for permanent commission' })}&quot;</p>
                </div>
                <div className="text-xs text-emerald-400 font-semibold">{t({ zh: '0.5% 永久分佣，持续收益', en: '0.5% permanent commission, continuous revenue' })}</div>
              </div>
            </div>
            <div className="text-center pt-4">
              <button
                onClick={() => router.push('/agent-builder')}
                className="bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-all"
              >
                {t({ zh: '立即创建 Agent', en: 'Create Your Agent Now' })}
              </button>
            </div>
          </div>
        </section>

        {/* 快速开始区域 */}
        <section className="border-b border-white/5 bg-gradient-to-b from-slate-950 to-slate-900">
          <div className="container mx-auto px-6 py-16 space-y-10">
            <div className="text-center space-y-4">
              <p className="text-emerald-400 uppercase text-xs tracking-[0.4em]">{t({ zh: '快速开始', en: 'Quick Start' })}</p>
              <h2 className="text-3xl md:text-4xl font-bold">{t({ zh: '3 个入口，立即开始使用 PayMind', en: '3 Entry Points, Start Using PayMind Now' })}</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/5 rounded-3xl border border-white/10 p-8 space-y-4 hover:border-emerald-500/50 transition-all">
                <div className="text-4xl">🚀</div>
                <h3 className="text-xl font-semibold">{t({ zh: '创建 Agent', en: 'Create Agent' })}</h3>
                <p className="text-sm text-slate-300">{t({ zh: '5 分钟创建你的 AI 商业智能体，无需编写代码', en: 'Create your AI business agent in 5 minutes, no coding required' })}</p>
                <button
                  onClick={() => router.push('/agent-builder')}
                  className="w-full bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-all"
                >
                  {t({ zh: '立即创建', en: 'Create Now' })}
                </button>
              </div>
              <div className="bg-white/5 rounded-3xl border border-white/10 p-8 space-y-4 hover:border-emerald-500/50 transition-all">
                <div className="text-4xl">📚</div>
                <h3 className="text-xl font-semibold">{t({ zh: '查看文档', en: 'View Docs' })}</h3>
                <p className="text-sm text-slate-300">{t({ zh: '完整的 API 文档、SDK 指南和集成教程', en: 'Complete API docs, SDK guides and integration tutorials' })}</p>
                <button
                  onClick={() => router.push('/developers')}
                  className="w-full bg-white/10 border border-white/20 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/15 transition-all"
                >
                  {t({ zh: '查看文档', en: 'View Docs' })}
                </button>
              </div>
              <div className="bg-white/5 rounded-3xl border border-white/10 p-8 space-y-4 hover:border-emerald-500/50 transition-all">
                <div className="text-4xl">🎮</div>
                <h3 className="text-xl font-semibold">{t({ zh: '体验演示', en: 'Try Demo' })}</h3>
                <p className="text-sm text-slate-300">{t({ zh: '在线体验 Agent 工作台和支付流程', en: 'Experience Agent workspace and payment flow online' })}</p>
                <button
                  onClick={() => router.push('/agent-enhanced')}
                  className="w-full bg-white/10 border border-white/20 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/15 transition-all"
                >
                  {t({ zh: '体验演示', en: 'Try Demo' })}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 后台功能入口（登录后显示） */}
        {isAuthenticated && (
          <section className="border-b border-white/5 bg-slate-900">
            <div className="container mx-auto px-6 py-16 space-y-10">
              <div className="text-center space-y-4">
                <p className="text-indigo-400 uppercase text-xs tracking-[0.4em]">{t({ zh: '后台功能', en: 'Dashboard Features' })}</p>
                <h2 className="text-3xl md:text-4xl font-bold">{t({ zh: '管理你的账户和业务', en: 'Manage Your Account and Business' })}</h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <button
                  onClick={() => router.push('/app/dashboard')}
                  className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-indigo-500/50 transition-all text-left"
                >
                  <div className="text-4xl">🎯</div>
                  <h3 className="text-lg font-semibold">{t({ zh: '选择角色', en: 'Select Role' })}</h3>
                  <p className="text-sm text-slate-300">{t({ zh: '选择用户、Agent 或商户角色', en: 'Choose user, Agent or merchant role' })}</p>
                </button>
                <button
                  onClick={() => router.push('/agent-enhanced')}
                  className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-indigo-500/50 transition-all text-left"
                >
                  <div className="text-4xl">🤖</div>
                  <h3 className="text-lg font-semibold">{t({ zh: 'Agent 工作台', en: 'Agent Workspace' })}</h3>
                  <p className="text-sm text-slate-300">{t({ zh: '统一工作台，对话式操作', en: 'Unified workspace, conversational operations' })}</p>
                </button>
                <button
                  onClick={() => router.push('/app/user')}
                  className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-indigo-500/50 transition-all text-left"
                >
                  <div className="text-4xl">👤</div>
                  <h3 className="text-lg font-semibold">{t({ zh: '用户后台', en: 'User Dashboard' })}</h3>
                  <p className="text-sm text-slate-300">{t({ zh: '支付记录、钱包、授权管理', en: 'Payment history, wallets, authorization' })}</p>
                </button>
                <button
                  onClick={() => router.push('/app/agent')}
                  className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-indigo-500/50 transition-all text-left"
                >
                  <div className="text-4xl">💼</div>
                  <h3 className="text-lg font-semibold">{t({ zh: 'Agent 后台', en: 'Agent Dashboard' })}</h3>
                  <p className="text-sm text-slate-300">{t({ zh: '收益统计、商品推荐、数据分析', en: 'Revenue stats, product recommendations, analytics' })}</p>
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <button
                  onClick={() => router.push('/app/merchant')}
                  className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-indigo-500/50 transition-all text-left"
                >
                  <div className="text-4xl">🏪</div>
                  <h3 className="text-lg font-semibold">{t({ zh: '商户后台', en: 'Merchant Dashboard' })}</h3>
                  <p className="text-sm text-slate-300">{t({ zh: '商品管理、订单处理、结算中心', en: 'Product management, orders, settlements' })}</p>
                </button>
                <button
                  onClick={() => router.push('/plugins')}
                  className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-4 hover:border-indigo-500/50 transition-all text-left"
                >
                  <div className="text-4xl">🔌</div>
                  <h3 className="text-lg font-semibold">{t({ zh: '插件市场', en: 'Plugin Marketplace' })}</h3>
                  <p className="text-sm text-slate-300">{t({ zh: '浏览和安装插件，扩展功能', en: 'Browse and install plugins, extend capabilities' })}</p>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 技术能力（简化版） */}
        <section className="border-b border-white/5 bg-slate-900">
          <div className="container mx-auto px-6 py-16 space-y-8">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              <div className="flex-1 space-y-4">
                <p className="text-cyan-300 uppercase text-xs tracking-[0.4em]">Tech & Compliance</p>
                <h2 className="text-3xl md:text-4xl font-bold">{t({ zh: '底层架构为毫秒级响应、全球合规而生。', en: 'Infrastructure built for millisecond response and global compliance.' })}</h2>
                <p className="text-slate-300 max-w-2xl">
                  {t({ zh: 'PayMind 架构遵循「实时 Session 追踪 + 多链兼容 + 可审计分佣」原则，所有功能均可在 Sandbox 与脚本中直接验证。', en: 'PayMind architecture follows "real-time Session tracking + multi-chain compatibility + auditable commission" principles, all features can be verified directly in Sandbox and scripts.' })}
                </p>
              </div>
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-3 text-sm text-slate-200 flex-1">
                {techPoints.map((point, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className="text-cyan-300">▹</span>
                    <p>{t(point)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6">
                <h3 className="text-xl font-semibold mb-4">{t({ zh: '支付能力', en: 'Payment Capabilities' })}</h3>
                <div className="flex flex-wrap gap-3">
                  {paymentChannels.map((channel) => (
                    <span key={channel} className="px-4 py-2 rounded-full bg-white/5 text-sm border border-white/10">
                      {channel}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-4">{t({ zh: '支付成功率 99.3% · 平均路由时间 420ms', en: 'Payment success rate 99.3% · Average routing time 420ms' })}</p>
              </div>
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6">
                <h3 className="text-xl font-semibold mb-4">{t({ zh: '核心流程', en: 'Core Process' })}</h3>
                <p className="text-sm text-slate-300 mb-4">{t({ zh: '7 段流程自动编排：支付请求 → 价格税费 → 智能路由 → 执行风控 → 分佣计算 → 托管释放 → 结算对账', en: '7-stage auto-orchestration: Payment Request → Price & Tax → Smart Routing → Execution & Risk → Commission → Escrow & Release → Settlement & Reconciliation' })}</p>
                <p className="text-xs text-slate-400">{t({ zh: '支持法币 / 数字货币 / 混合支付', en: 'Supports fiat / digital currency / hybrid payment' })}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 生态参与者展示区域 */}
        <section className="border-b border-white/5 bg-slate-900">
          <div className="container mx-auto px-6 py-16 space-y-10">
            <div className="text-center space-y-4">
              <p className="text-pink-300 uppercase text-xs tracking-[0.4em]">{t({ zh: '加入 PayMind 生态', en: 'Join PayMind Ecosystem' })}</p>
              <h2 className="text-3xl md:text-4xl font-bold">{t({ zh: '5 类参与者，共同构建 AI 商业生态', en: '5 Types of Participants, Building AI Business Ecosystem Together' })}</h2>
            </div>
            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
              {/* Agent 开发者 */}
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-3 hover:border-pink-500/50 transition-all">
                <div className="text-3xl">👨‍💻</div>
                <h3 className="text-lg font-semibold">{t({ zh: 'Agent 开发者', en: 'Agent Developer' })}</h3>
                <p className="text-sm text-slate-300">{t({ zh: '5分钟让 Agent 具备支付能力', en: '5 min to enable payment for Agent' })}</p>
                <p className="text-xs text-emerald-400">{t({ zh: '推广商户获得永久分佣', en: 'Promote merchants for permanent commission' })}</p>
                <p className="text-xs text-slate-400">{t({ zh: '免费使用，按交易收费', en: 'Free to use, pay per transaction' })}</p>
                <button
                  onClick={() => router.push('/agent-builder')}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-lg text-sm hover:bg-emerald-500/30 transition"
                >
                  {t({ zh: '开始开发', en: 'Start Building' })}
                </button>
              </div>

              {/* 商户 */}
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-3 hover:border-pink-500/50 transition-all">
                <div className="text-3xl">🏪</div>
                <h3 className="text-lg font-semibold">{t({ zh: '商户', en: 'Merchant' })}</h3>
                <p className="text-sm text-slate-300">{t({ zh: 'AI 驱动的销售和客服', en: 'AI-powered sales and customer service' })}</p>
                <p className="text-xs text-emerald-400">{t({ zh: '降低运营成本，提升转化率', en: 'Reduce operating costs, increase conversion' })}</p>
                <p className="text-xs text-slate-400">{t({ zh: '0 入驻费用，快速上线', en: '0 onboarding fee, quick launch' })}</p>
                <button
                  onClick={() => router.push('/developers')}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-lg text-sm hover:bg-emerald-500/30 transition"
                >
                  {t({ zh: '入驻平台', en: 'Join as Merchant' })}
                </button>
              </div>

              {/* 推广者 */}
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-3 hover:border-pink-500/50 transition-all">
                <div className="text-3xl">📢</div>
                <h3 className="text-lg font-semibold">{t({ zh: '推广者', en: 'Promoter' })}</h3>
                <p className="text-sm text-slate-300">{t({ zh: '推广商户和 Agent 获得收益', en: 'Promote merchants and Agents for revenue' })}</p>
                <p className="text-xs text-emerald-400">{t({ zh: '0.5% 永久分佣 + 一次性奖励', en: '0.5% permanent commission + one-time reward' })}</p>
                <p className="text-xs text-slate-400">{t({ zh: '无需成本，平台自动结算', en: 'No cost, platform auto-settles' })}</p>
                <button
                  onClick={() => router.push('/agent-builder')}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-lg text-sm hover:bg-emerald-500/30 transition"
                >
                  {t({ zh: '开始推广', en: 'Start Promoting' })}
                </button>
              </div>

              {/* 用户 */}
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-3 hover:border-pink-500/50 transition-all">
                <div className="text-3xl">👤</div>
                <h3 className="text-lg font-semibold">{t({ zh: '用户', en: 'User' })}</h3>
                <p className="text-sm text-slate-300">{t({ zh: '通过 Agent 完成所有交易', en: 'Complete all transactions through Agent' })}</p>
                <p className="text-xs text-emerald-400">{t({ zh: '更智能、更便捷的购物体验', en: 'Smarter, more convenient shopping experience' })}</p>
                <p className="text-xs text-slate-400">{t({ zh: '免费使用，无隐藏费用', en: 'Free to use, no hidden fees' })}</p>
                <button
                  onClick={() => router.push('/agent-enhanced')}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-lg text-sm hover:bg-emerald-500/30 transition"
                >
                  {t({ zh: '体验 Agent', en: 'Try Agent' })}
                </button>
              </div>

              {/* 合作伙伴 */}
              <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-3 hover:border-pink-500/50 transition-all">
                <div className="text-3xl">🤝</div>
                <h3 className="text-lg font-semibold">{t({ zh: '合作伙伴', en: 'Partner' })}</h3>
                <p className="text-sm text-slate-300">{t({ zh: '接入 PayMind 生态，共同发展', en: 'Join PayMind ecosystem, grow together' })}</p>
                <p className="text-xs text-emerald-400">{t({ zh: '获得生态流量和收益分成', en: 'Get ecosystem traffic and revenue share' })}</p>
                <p className="text-xs text-slate-400">{t({ zh: '开放 API，灵活集成', en: 'Open API, flexible integration' })}</p>
                <button
                  onClick={() => router.push('/developers')}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-lg text-sm hover:bg-emerald-500/30 transition"
                >
                  {t({ zh: '成为合作伙伴', en: 'Become a Partner' })}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 联盟分佣（简化版） */}
        <section className="border-b border-white/5 bg-slate-900">
          <div className="container mx-auto px-6 py-16 space-y-10">
            <div className="text-center space-y-4">
              <p className="text-pink-300 uppercase text-xs tracking-[0.4em]">Alliance & Commission</p>
              <h2 className="text-3xl md:text-4xl font-bold">{t({ zh: '分佣透明，网络驱动增长', en: 'Transparent Commission, Network-Driven Growth' })}</h2>
              <p className="text-slate-300 max-w-2xl mx-auto">
                {t({ zh: '固定佣金 + 推广 Agent 永久分成，打造多赢生态。所有分佣自动计算、自动结算。', en: 'Fixed commission + permanent Promoter Agent share, building a win-win ecosystem. All commissions are automatically calculated and settled.' })}
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {allianceStats.map((stat, idx) => (
                <div key={idx} className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-3">
                  <p className="text-sm text-slate-400 uppercase tracking-[0.3em]">{t(stat.label)}</p>
                  <p className="text-2xl font-semibold">{t(stat.value)}</p>
                  <p className="text-sm text-slate-300">{t(stat.sub)}</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <button
                onClick={() => router.push('/alliance')}
                className="text-sm underline underline-offset-4 decoration-dotted text-slate-400 hover:text-white transition"
              >
                {t({ zh: '查看分佣设计详情 →', en: 'View Commission Details →' })}
              </button>
            </div>
          </div>
        </section>


        {/* CTA 区域 */}
        <section className="relative overflow-hidden bg-gradient-to-r from-emerald-500 to-indigo-600 py-20 border-b border-white/5">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.6),_transparent_50%)]" />
          <div className="container mx-auto px-6 text-center relative z-10 space-y-6">
            <p className="uppercase text-xs tracking-[0.5em] text-white/80">{t({ zh: '立即开始', en: 'Start Now' })}</p>
            <h2 className="text-4xl font-bold">{t({ zh: '让 AI Agent 成为独立商业体', en: 'Turn AI Agents into Independent Business Entities' })}</h2>
            <p className="text-lg text-white/90 max-w-2xl mx-auto">
              {t({ zh: '5 分钟创建 Agent · 立即体验工作台 · 查看完整文档', en: 'Create Agent in 5 min · Experience Workspace · View Full Docs' })}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/agent-builder')}
                className="bg-white text-emerald-600 font-semibold px-8 py-4 rounded-xl shadow-lg hover:-translate-y-0.5 transition"
              >
                {t({ zh: '立即创建 Agent', en: 'Create Agent Now' })}
              </button>
              <button
                onClick={() => router.push('/agent-enhanced')}
                className="bg-white/10 border border-white/30 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition"
              >
                {t({ zh: '体验工作台', en: 'Try Workspace' })}
              </button>
              <button
                onClick={() => router.push('/developers')}
                className="text-white underline underline-offset-4 decoration-dotted font-semibold"
              >
                {t({ zh: '查看文档', en: 'View Docs' })}
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} />
      )}
    </>
  )
}
