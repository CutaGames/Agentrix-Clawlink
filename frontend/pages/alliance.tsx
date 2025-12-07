import Head from 'next/head'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { Navigation } from '../components/ui/Navigation'
import { Footer } from '../components/layout/Footer'
import { LoginModal } from '../components/auth/LoginModal'

const personas = [
  {
    icon: '🧑‍🚀',
    title: '个人用户 / Auto-Earn 玩家',
    description: '一键生成专属 Agent，选择喜欢的资产或任务，自动执行并获得联盟返佣。',
    highlights: ['1 分钟创建我的 Agent', '绑定钱包 / 法币账户', '分享就能获取终身 0.5% 分成'],
  },
  {
    icon: '🤖',
    title: 'Agent 开发者',
    description: '通过 SDK / API 将 Agentrix 的支付、资产与联盟能力嵌入自己的 Agent 或 App。',
    highlights: ['统一支付 + 智能路由', 'API / Webhook 完整文档', 'Agent 订单 2%~3% 自动分润'],
  },
  {
    icon: '🏪',
    title: '商户 / 品牌',
    description: '一次接入即可让 Agent 帮你找客、收款、结算。支持法币 / 稳定币混合支付。',
    highlights: ['统一收款 + 托管', '全渠道订单跟踪', '联盟推广按成交付费'],
  },
  {
    icon: '🧑‍💻',
    title: '普通开发者 / 插件作者',
    description: '推广商户，作为推广 Agent 获得 0.5% 永久分成与入驻奖励。',
    highlights: ['开放 SDK & CLI', 'Marketplace Listing 奖励', '可售卖订阅 / API Credit'],
  },
]

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

  return (
    <>
      <Head>
        <title>Agentrix 联盟 - 通过 Agent 参与，获得永久收益</title>
        <meta name="description" content="通过 Agent 参与 Agentrix 联盟，推广商户、推荐 Agent、推广 Marketplace 和插件，获得永久分佣收益。" />
      </Head>
      <Navigation onLoginClick={() => setShowLogin(true)} />
      <main className="bg-slate-950 text-white">
        {/* Hero */}
        <section className="border-b border-white/10 bg-gradient-to-br from-blue-600/90 via-indigo-600/90 to-purple-600/90 text-white py-20">
          <div className="container mx-auto px-6 text-center space-y-6">
            <p className="inline-flex items-center px-4 py-1 rounded-full bg-white/10 border border-white/20 text-sm tracking-wide">
              🤝 Agentrix 联盟
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              通过 Agent 参与联盟，获得永久收益
            </h1>
            <p className="text-lg text-blue-100 max-w-3xl mx-auto">
              推广商户获得 0.5% 永久分佣，推荐 Agent 获得持续收益，推广 Marketplace 和插件获得分成。所有收益通过 Agent 自动计算和结算。
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => router.push('/agent-builder')}
                className="bg-white text-indigo-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all"
              >
                立即创建推广 Agent
              </button>
              <button
                onClick={() => router.push('/developers')}
                className="bg-white/10 border border-white/40 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all"
              >
                查看 SDK & API
              </button>
              <button
                onClick={() => router.push('/pay/commission-demo')}
                className="bg-white/10 border border-white/40 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all"
              >
                佣金演示 Demo
              </button>
            </div>
          </div>
        </section>

        {/* 适合谁 */}
        <section className="py-16 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">加入联盟的四类角色</h2>
              <p className="text-lg text-slate-300">同一账户可同时扮演多个角色，收益自动累计</p>
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
              <h2 className="text-3xl font-bold text-white mb-4">统一分润结构，透明可追踪</h2>
              <p className="text-lg text-slate-300">参考最新推广方式与收益模型，直接体现在每一笔订单里</p>
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
              <h2 className="text-3xl font-bold text-white mb-4">4 个步骤加入</h2>
              <p className="text-lg text-slate-300">流程简单，立刻触发收益</p>
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
            <h2 className="text-4xl font-bold">一起共建 Agentrix AI 经济联盟</h2>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto">
              一键生成 Agent、开放 SDK、资产上架入口、推广返佣、Bounty 机制已经就绪。现在就加入，抢占早期席位。
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => router.push('/agent-builder')}
                className="bg-white text-indigo-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-all"
              >
                立即创建推广 Agent
              </button>
              <button
                onClick={() => router.push('/developers')}
                className="bg-white/10 border border-white/40 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all"
              >
                成为开发者伙伴
              </button>
              <button
                onClick={() => router.push('/pay/commission-demo')}
                className="bg-white/10 border border-white/40 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all"
              >
                佣金演示 Demo
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

