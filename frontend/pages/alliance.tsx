import Head from 'next/head'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { Navigation } from '../components/ui/Navigation'
import { Footer } from '../components/layout/Footer'
import { LoginModal } from '../components/auth/LoginModal'
import { useLocalization } from '../contexts/LocalizationContext'

const incentiveCards = [
  { title: 'Agent 分润', detail: '2%（实体）/3%（服务&数字资产），即时到账，可再分成给你的用户。' },
  { title: 'Agentrix 平台分润', detail: '平台从每笔交易中抽取 0.5%（实体）/1%（其他），用于平台运营和生态建设。' },
  { title: '联盟其他成员返佣', detail: '推广商户、推荐 Agent、推广 Marketplace 和插件，可获得 0.5% 永久分佣。' },
  { title: '任务 / Bounty', detail: '资产上架、数据接入、策略模板、SDK 示例等都可领取任务奖励。' },
]

const joinSteps = [
  '注册 Agentrix 账号并完成基础 KYC',
  '选择角色（个人 / Agent / 商户 / 开发者）并开通一键 Agent',
  '配置收款方式、推广链接或 SDK',
  '开始执行任务 / 分享链接 / 上架资产，实时查看收益',
]

export default function AlliancePage() {
  const [showLogin, setShowLogin] = useState(false)
  const router = useRouter()
  const { t } = useLocalization()

  const personas = [
    {
      icon: '🧑‍🚀',
      title: t({ zh: '个人用户 / Auto-Earn 玩家', en: 'Individual User / Auto-Earn Player' }),
      description: t({ zh: '一键生成专属 Agent，选择喜欢的资产或任务，自动执行并获得联盟返佣。', en: 'Generate exclusive Agent with one click, select favorite assets or tasks, execute automatically and get alliance commissions.' }),
      highlights: [t({ zh: '1 分钟创建我的 Agent', en: 'Create my Agent in 1 minute' }), t({ zh: '绑定钱包 / 法币账户', en: 'Bind wallet / fiat account' }), t({ zh: '分享就能获取终身 0.5% 分成', en: 'Share to get lifetime 0.5% commission' })],
    },
    {
      icon: '🤖',
      title: t({ zh: 'Agent 开发者', en: 'Agent Developer' }),
      description: t({ zh: '通过 SDK / API 将 Agentrix 的支付、资产与联盟能力嵌入自己的 Agent 或 App。', en: 'Embed Agentrix payment, asset and alliance capabilities into your own Agent or App through SDK/API.' }),
      highlights: [t({ zh: '统一支付 + 智能路由', en: 'Unified payment + smart routing' }), t({ zh: 'API / Webhook 完整文档', en: 'Complete API/Webhook documentation' }), t({ zh: 'Agent 订单 2%~3% 自动分润', en: 'Agent orders 2%~3% automatic profit sharing' })],
    },
    {
      icon: '🏪',
      title: t({ zh: '商户 / 品牌', en: 'Merchant / Brand' }),
      description: t({ zh: '一次接入即可让 Agent 帮你找客、收款、结算。支持法币 / 稳定币混合支付。', en: 'One-time integration allows Agent to help you find customers, collect payments, and settle. Supports fiat/stablecoin hybrid payment.' }),
      highlights: [t({ zh: '统一收款 + 托管', en: 'Unified collection + escrow' }), t({ zh: '全渠道订单跟踪', en: 'Full-channel order tracking' }), t({ zh: '联盟推广按成交付费', en: 'Alliance promotion pay-per-transaction' })],
    },
    {
      icon: '🧑‍💻',
      title: t({ zh: '普通开发者 / 插件作者', en: 'General Developer / Plugin Author' }),
      description: t({ zh: '推广商户，作为推广 Agent 获得 0.5% 永久分成与入驻奖励。', en: 'Promote merchants, get 0.5% permanent commission and listing rewards as promotion Agent.' }),
      highlights: [t({ zh: '开放 SDK & CLI', en: 'Open SDK & CLI' }), t({ zh: 'Marketplace Listing 奖励', en: 'Marketplace Listing rewards' }), t({ zh: '可售卖订阅 / API Credit', en: 'Sellable subscriptions / API Credit' })],
    },
  ]

  const incentiveCards = [
    { title: t({ zh: 'Agent 分润', en: 'Agent Profit Sharing' }), detail: t({ zh: '2%（实体）/3%（服务&数字资产），即时到账，可再分成给你的用户。', en: '2% (physical)/3% (services & digital assets), instant settlement, can be shared with your users.' }) },
    { title: t({ zh: 'Agentrix 平台分润', en: 'Agentrix Platform Profit Sharing' }), detail: t({ zh: '平台从每笔交易中抽取 0.5%（实体）/1%（其他），用于平台运营和生态建设。', en: 'Platform takes 0.5% (physical)/1% (others) from each transaction for platform operation and ecosystem construction.' }) },
    { title: t({ zh: '联盟其他成员返佣', en: 'Alliance Member Commissions' }), detail: t({ zh: '推广商户、推荐 Agent、推广 Marketplace 和插件，可获得 0.5% 永久分佣。', en: 'Promote merchants, recommend agents, promote Marketplace and plugins, get 0.5% permanent commission.' }) },
    { title: t({ zh: '任务 / Bounty', en: 'Tasks / Bounty' }), detail: t({ zh: '资产上架、数据接入、策略模板、SDK 示例等都可领取任务奖励。', en: 'Asset listing, data integration, strategy templates, SDK examples can all claim task rewards.' }) },
  ]

  const joinSteps = [
    t({ zh: '注册 Agentrix 账号并完成基础 KYC', en: 'Register Agentrix account and complete basic KYC' }),
    t({ zh: '选择角色（个人 / Agent / 商户 / 开发者）并开通一键 Agent', en: 'Select role (individual / Agent / merchant / developer) and enable one-click Agent' }),
    t({ zh: '配置收款方式、推广链接或 SDK', en: 'Configure payment methods, promotion links or SDK' }),
    t({ zh: '开始执行任务 / 分享链接 / 上架资产，实时查看收益', en: 'Start executing tasks / sharing links / listing assets, view revenue in real-time' }),
  ]

  return (
    <>
      <Head>
        <title>{t({ zh: 'Agentrix 联盟 - 通过 Agent 参与，获得永久收益', en: 'Agentrix Alliance - Participate through Agent, get permanent revenue' })}</title>
        <meta name="description" content={t({ zh: '通过 Agent 参与 Agentrix 联盟，推广商户、推荐 Agent、推广 Marketplace 和插件，获得永久分佣收益。', en: 'Participate in Agentrix Alliance through Agent, promote merchants, recommend agents, promote Marketplace and plugins, get permanent commission revenue.' })} />
      </Head>
      <Navigation onLoginClick={() => setShowLogin(true)} />
      <main className="bg-slate-950 text-white">
        {/* Hero */}
        <section className="border-b border-white/10 bg-gradient-to-br from-blue-600/90 via-indigo-600/90 to-purple-600/90 text-white py-20">
          <div className="container mx-auto px-6 text-center space-y-6">
            <p className="inline-flex items-center px-4 py-1 rounded-full bg-white/10 border border-white/20 text-sm tracking-wide">
              🤝 {t({ zh: 'Agentrix 联盟', en: 'Agentrix Alliance' })}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              {t({ zh: '通过 Agent 参与联盟，获得永久收益', en: 'Participate in alliance through Agent, get permanent revenue' })}
            </h1>
            <p className="text-lg text-blue-100 max-w-3xl mx-auto">
              {t({ zh: '推广商户获得 0.5% 永久分佣，推荐 Agent 获得持续收益，推广 Marketplace 和插件获得分成。所有收益通过 Agent 自动计算和结算。', en: 'Promote merchants to get 0.5% permanent commission, recommend Agent to get continuous revenue, promote Marketplace and plugins to get share. All revenue is automatically calculated and settled through Agent.' })}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => router.push('/agent-builder')}
                className="bg-white text-indigo-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all"
              >
                {t({ zh: '立即创建推广 Agent', en: 'Create Promotion Agent Now' })}
              </button>
              <button
                onClick={() => router.push('/developers')}
                className="bg-white/10 border border-white/40 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all"
              >
                {t({ zh: '查看 SDK & API', en: 'View SDK & API' })}
              </button>
              <button
                onClick={() => router.push('/pay/commission-demo')}
                className="bg-white/10 border border-white/40 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all"
              >
                {t({ zh: '佣金演示 Demo', en: 'Commission Demo' })}
              </button>
            </div>
          </div>
        </section>

        {/* 适合谁 */}
        <section className="py-16 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t({ zh: '加入联盟的四类角色', en: 'Four Types of Roles to Join Alliance' })}</h2>
              <p className="text-lg text-slate-300">{t({ zh: '同一账户可同时扮演多个角色，收益自动累计', en: 'Same account can play multiple roles simultaneously, revenue automatically accumulates' })}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {personas.map((persona) => (
                <div key={persona.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="flex items-start space-x-4 mb-4">
                    <span className="text-3xl">{persona.icon}</span>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{persona.title}</h3>
                      <p className="text-slate-300 text-sm mt-1">{persona.description}</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {persona.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-start space-x-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 分润结构 */}
        <section className="py-16 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-4">{t({ zh: '统一分润结构，透明可追踪', en: 'Unified Profit Sharing Structure, Transparent and Trackable' })}</h2>
              <p className="text-lg text-slate-300">{t({ zh: '参考最新推广方式与收益模型，直接体现在每一笔订单里', en: 'Refer to the latest promotion methods and revenue models, directly reflected in each order' })}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {incentiveCards.map((card) => (
                <div key={card.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">{card.title}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{card.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 加入步骤 */}
        <section className="py-16 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">{t({ zh: '4 个步骤加入', en: '4 Steps to Join' })}</h2>
              <p className="text-lg text-slate-300">{t({ zh: '流程简单，立刻触发收益', en: 'Simple process, instantly trigger revenue' })}</p>
            </div>
            <div className="max-w-3xl mx-auto grid md:grid-cols-4 gap-4">
              {joinSteps.map((step, index) => (
                <div key={step} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-semibold">
                    {index + 1}
                  </div>
                  <p className="text-sm text-slate-300">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-700 py-20 text-white text-center">
          <div className="container mx-auto px-6 space-y-6">
            <h2 className="text-4xl font-bold">{t({ zh: '一起共建 Agentrix AI 经济联盟', en: 'Build Agentrix AI Economic Alliance Together' })}</h2>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto">
              {t({ zh: '一键生成 Agent、开放 SDK、资产上架入口、推广返佣、Bounty 机制已经就绪。现在就加入，抢占早期席位。', en: 'One-click Agent generation, open SDK, asset listing portal, promotion commissions, Bounty mechanism are ready. Join now and seize early positions.' })}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => router.push('/agent-builder')}
                className="bg-white text-indigo-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all"
              >
                {t({ zh: '立即创建推广 Agent', en: 'Create Promotion Agent Now' })}
              </button>
              <button
                onClick={() => router.push('/developers')}
                className="bg-white/10 border border-white/40 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all"
              >
                {t({ zh: '成为开发者伙伴', en: 'Become Developer Partner' })}
              </button>
              <button
                onClick={() => router.push('/pay/commission-demo')}
                className="bg-white/10 border border-white/40 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all"
              >
                {t({ zh: '佣金演示 Demo', en: 'Commission Demo' })}
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

