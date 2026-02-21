import Head from 'next/head'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { Navigation } from '../components/ui/Navigation'
import { Footer } from '../components/layout/Footer'
import { useLocalization } from '../contexts/LocalizationContext'
import {
  Cloud, Laptop, Plug, Download, Smartphone, Terminal,
  CheckCircle, ArrowRight, Zap, HardDrive, Bot, ShoppingBag,
  ClipboardList, Shield, Star, ChevronDown, CreditCard
} from 'lucide-react'

// ── Feature rows ──────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Cloud,
    color: 'violet',
    title: { zh: '一键云端部署 · 30 秒上线', en: 'One-tap Cloud Deploy · Live in 30s' },
    desc: {
      zh: '无需服务器知识。点击"云端部署"，Agentrix 自动分配容器、配置 LLM、设置 API，你的 Agent 立即在线。',
      en: 'No server knowledge needed. Tap "Cloud Deploy" and Agentrix auto-provisions a container, configures LLM, and sets up API. Your Agent is live instantly.',
    },
    points: [
      { zh: '支持 DeepSeek / OpenAI / Claude / Gemini', en: 'DeepSeek / OpenAI / Claude / Gemini support' },
      { zh: '平台托管，免运维', en: 'Platform-managed, zero ops' },
      { zh: '活动期赠 10 GB 云端存储', en: '10 GB cloud storage gifted during early access' },
      { zh: '高可用 + 自动重启', en: 'High availability + auto-restart' },
    ],
  },
  {
    icon: Laptop,
    color: 'cyan',
    title: { zh: '本地部署 · 数据不离机', en: 'Local Deploy · Data Stays Local' },
    desc: {
      zh: 'App 内扫码即可将你的 PC / NAS / HomeLab 变成 Agent 服务器。通过 WebSocket Relay 中继穿透，无需公网 IP。',
      en: 'Scan QR in-app to turn your PC / NAS / HomeLab into an Agent server. WebSocket Relay tunneling — no public IP required.',
    },
    points: [
      { zh: '本地 LLM（Ollama / LM Studio）', en: 'Local LLM (Ollama / LM Studio)' },
      { zh: 'Win / Mac / Linux 二进制 CLI', en: 'Win / Mac / Linux binary CLI' },
      { zh: '数据完全本地，隐私有保障', en: 'Data stays local, privacy guaranteed' },
      { zh: 'WebSocket Relay，无需端口转发', en: 'WebSocket Relay, no port forwarding' },
    ],
  },
  {
    icon: Plug,
    color: 'emerald',
    title: { zh: '接入自有实例 · BYOC', en: 'Bring Your Own Instance · BYOC' },
    desc: {
      zh: '已有 OpenClaw 实例或企业私有云？输入地址和 Token，或扫码即接入，统一在 Claw 内管理。',
      en: 'Already have an OpenClaw instance or enterprise private cloud? Enter URL and Token, or scan QR — managed unified in Claw.',
    },
    points: [
      { zh: '手动输入或 QR 扫码', en: 'Manual input or QR scan' },
      { zh: '多实例管理 & 主实例切换', en: 'Multi-instance + primary switch' },
      { zh: '企业 / 自有云环境适配', en: 'Enterprise / private cloud ready' },
      { zh: '同一账号多端切换', en: 'Same account, multi-device switch' },
    ],
  },
]

// ── App capability highlights ─────────────────────────────────────────────────
const CAPS = [
  { icon: Bot, color: 'violet', title: { zh: 'Agent 控制台', en: 'Agent Console' }, desc: { zh: '实例状态、Skill 开关、模型切换、一键重启', en: 'Instance status, Skill toggle, model switch, one-tap restart' } },
  { icon: ShoppingBag, color: 'blue', title: { zh: '5200+ Skill 市场', en: '5200+ Skill Market' }, desc: { zh: 'ClawHub 技能库一键安装，免费/付费均支持', en: 'ClawHub library one-tap install, free & paid' } },
  { icon: ClipboardList, color: 'emerald', title: { zh: '任务集市', en: 'Task Market' }, desc: { zh: '发布任务让 Agent 竞标接单，X402 自动结算', en: 'Post tasks for Agent bidding, X402 auto-settle' } },
  { icon: Zap, color: 'yellow', title: { zh: 'Agent 对话', en: 'Agent Chat' }, desc: { zh: 'SSE 流式对话 + Thought Chain 思维链可视化', en: 'SSE streaming chat + Thought Chain visualization' } },
  { icon: CreditCard, color: 'pink', title: { zh: 'X402 自主支付', en: 'X402 Autonomous Pay' }, desc: { zh: 'Agent 自动 HTTP 402 协议支付，无需人工', en: 'Agent auto HTTP 402 protocol payments, no human' } },
  { icon: Shield, color: 'cyan', title: { zh: '安全 & 钱包', en: 'Security & Wallet' }, desc: { zh: 'EVM / Solana 钱包登录，MPC 托管钱包', en: 'EVM / Solana wallet login, MPC managed wallet' } },
]

// ── Storage plans ─────────────────────────────────────────────────────────────
interface StoragePlan {
  tierZh: string
  tierEn: string
  storage: string
  highlight: boolean
  badgeZh: string | null
  badgeEn: string | null
  price: string
  subZh: string
  subEn: string
  perks: Array<{ zh: string; en: string }>
}

const PLANS: StoragePlan[] = [
  {
    tierZh: '活动期免费',
    tierEn: 'Early Access Free',
    storage: '10 GB',
    highlight: false,
    badgeZh: null,
    badgeEn: null,
    price: '免费 / Free',
    subZh: '活动期限时赠送',
    subEn: 'Limited time gift',
    perks: [
      { zh: '10 GB 云端存储', en: '10 GB cloud storage' },
      { zh: '1 个云端 Agent 实例', en: '1 cloud Agent instance' },
      { zh: '本地 & BYOC 无限接入', en: 'Unlimited local & BYOC' },
      { zh: '5200+ Skill 市场', en: '5200+ Skill Market' },
    ],
  },
  {
    tierZh: '基础版',
    tierEn: 'Starter',
    storage: '40 GB',
    highlight: true,
    badgeZh: '最受欢迎',
    badgeEn: 'Most Popular',
    price: '$4.9',
    subZh: '/月',
    subEn: '/mo',
    perks: [
      { zh: '40 GB 云端存储', en: '40 GB cloud storage' },
      { zh: '3 个云端 Agent 实例', en: '3 cloud Agent instances' },
      { zh: '优先 LLM 队列', en: 'Priority LLM queue' },
      { zh: 'Skill 付费调用额度', en: 'Paid Skill call credits' },
    ],
  },
  {
    tierZh: '专业版',
    tierEn: 'Pro',
    storage: '100 GB',
    highlight: false,
    badgeZh: null,
    badgeEn: null,
    price: '$12',
    subZh: '/月',
    subEn: '/mo',
    perks: [
      { zh: '100 GB 云端存储', en: '100 GB cloud storage' },
      { zh: '10 个云端 Agent 实例', en: '10 cloud Agent instances' },
      { zh: '团队协作（5 成员）', en: 'Team collaboration (5 members)' },
      { zh: '高级分析 & 日志', en: 'Advanced analytics & logs' },
    ],
  },
]

const colorMap: Record<string, string> = {
  violet: 'text-violet-400 bg-violet-500/10 border-violet-500/25',
  cyan:   'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
  emerald:'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  blue:   'text-blue-400 bg-blue-500/10 border-blue-500/25',
  yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
  pink:   'text-pink-400 bg-pink-500/10 border-pink-500/25',
}

export default function ClawPage() {
  const { t } = useLocalization()
  const router = useRouter()

  return (
    <>
      <Head>
        <title>{t({ zh: 'Agentrix Claw — 你的 AI Agent，随时随地', en: 'Agentrix Claw — Your AI Agent, Anywhere' })}</title>
        <meta name="description" content={t({ zh: '一键云端部署 AI Agent，内置 5200+ Skill、任务集市与 X402 支付。活动期新用户免费赠送 10 GB 云端存储。', en: 'Deploy AI Agents in one tap. 5200+ Skills, Task Market, X402 payments. New users get 10 GB free cloud storage.' })} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navigation />

      <main className="bg-slate-950 text-white min-h-screen">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="relative min-h-[88vh] flex items-center pt-20 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-2/3 h-2/3 bg-violet-600/8 rounded-full blur-[140px]" />
            <div className="absolute bottom-0 right-0 w-2/3 h-2/3 bg-cyan-600/8 rounded-full blur-[140px]" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-8 bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
          </div>

          <div className="container mx-auto px-6 relative z-10 py-20">
            <div className="max-w-4xl mx-auto text-center space-y-8">

              {/* Promo banner */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/15 to-cyan-500/15 border border-violet-500/25 text-sm"
              >
                <HardDrive className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="text-violet-200 font-semibold">
                  {t({ zh: '🎁 活动期限时赠送 ', en: '🎁 Early Access: Free ' })}
                  <span className="font-bold text-white">10 GB</span>
                  {t({ zh: ' 云端存储 · 新用户专属', en: ' Cloud Storage · New Users Only' })}
                </span>
                <a
                  href="#download"
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-2 shrink-0"
                >
                  {t({ zh: '立即领取 →', en: 'Claim →' })}
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-5"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold uppercase tracking-wider">
                  <Smartphone className="w-3 h-3" />
                  Agentrix Claw
                </div>

                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.06] tracking-tight text-white">
                  {t({ zh: '你的 AI Agent，', en: 'Your AI Agent,' })}
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-300 to-emerald-400 mt-1">
                    {t({ zh: '随时随地', en: 'Anywhere, Anytime' })}
                  </span>
                </h1>

                <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                  {t({
                    zh: 'Agentrix Claw 是让你部署、控制、赚钱的 AI Agent 移动端操作系统。一键云端 · 本地私有 · 自有实例，三种模式随心切换。',
                    en: 'Agentrix Claw is the mobile AI Agent OS for deploying, controlling, and monetizing. Cloud · Local · BYOC — three modes, one app.',
                  })}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <a
                  href="#download"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-violet-500/20 transition-all group"
                >
                  <Download className="w-5 h-5" />
                  {t({ zh: '立即下载', en: 'Download Now' })}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <button
                  onClick={() => router.push('/agent-enhanced')}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-800/60 hover:bg-slate-800 text-white font-bold rounded-xl border border-white/10 hover:border-white/20 transition-all"
                >
                  {t({ zh: '体验 Web 版', en: 'Try Web Version' })}
                </button>
              </motion.div>

              {/* Stat row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-3 gap-6 pt-10 border-t border-white/5 max-w-lg mx-auto"
              >
                {[
                  { value: '5200+', label: t({ zh: 'Skill 可安装', en: 'Skills Available' }) },
                  { value: '30s', label: t({ zh: '云端部署', en: 'Cloud Deploy' }) },
                  { value: 'X402', label: t({ zh: '自主支付', en: 'Autonomous Pay' }) },
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl font-bold text-white">{s.value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── THREE DEPLOY MODES ───────────────────────────────────────────── */}
        <section className="py-28 bg-slate-900 border-y border-white/5">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <p className="text-violet-400 uppercase text-xs tracking-[0.4em] font-bold">
                {t({ zh: '部署方式', en: 'Deploy Modes' })}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                {t({ zh: '三种方式，让 Agent 跑起来', en: 'Three Ways to Get Your Agent Running' })}
              </h2>
            </div>

            <div className="space-y-24">
              {FEATURES.map((f, idx) => {
                const c = colorMap[f.color] || colorMap.violet
                const textColor = c.split(' ')[0]
                const bgColor   = c.split(' ')[1]
                const borderColor = c.split(' ')[2]
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className={`grid lg:grid-cols-2 gap-12 items-center ${idx % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
                  >
                    <div className={`space-y-6 ${idx % 2 === 1 ? 'lg:order-2' : ''}`}>
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${bgColor} ${textColor} ${borderColor}`}>
                        <f.icon className="w-3.5 h-3.5" />
                        {t({ zh: `方式 ${idx + 1}`, en: `Mode ${idx + 1}` })}
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-white">{t(f.title)}</h3>
                      <p className="text-slate-400 text-lg leading-relaxed">{t(f.desc)}</p>
                      <ul className="space-y-3">
                        {f.points.map((p, pi) => (
                          <li key={pi} className="flex items-center gap-3 text-slate-300">
                            <CheckCircle className={`w-5 h-5 ${textColor} shrink-0`} />
                            <span>{t(p)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className={`${idx % 2 === 1 ? 'lg:order-1' : ''}`}>
                      <div className={`relative p-8 rounded-3xl border ${borderColor} bg-gradient-to-br from-slate-900 to-slate-950 shadow-2xl`}>
                        <div className={`absolute -inset-px rounded-3xl border ${borderColor} opacity-50`} />
                        <div className={`w-16 h-16 rounded-2xl ${bgColor} border ${borderColor} flex items-center justify-center mb-6`}>
                          <f.icon className={`w-8 h-8 ${textColor}`} />
                        </div>
                        <div className="space-y-3">
                          {f.points.map((p, pi) => (
                            <div key={pi} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                              <div className={`w-2 h-2 rounded-full ${bgColor} border ${borderColor}`} />
                              <span className="text-sm text-slate-300">{t(p)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── APP CAPABILITIES ─────────────────────────────────────────────── */}
        <section className="py-28 bg-slate-950">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <p className="text-cyan-400 uppercase text-xs tracking-[0.4em] font-bold">
                {t({ zh: 'App 功能', en: 'App Capabilities' })}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                {t({ zh: 'Agent 控制中心，全在你手中', en: 'Agent Control Center, All in Your Hand' })}
              </h2>
              <p className="text-slate-400 text-lg">
                {t({ zh: '从部署到盈利，一个 App 搞定一切', en: 'From deployment to earning — one app handles everything' })}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {CAPS.map((cap, i) => {
                const c = colorMap[cap.color] || colorMap.violet
                const textColor = c.split(' ')[0]
                const bgColor   = c.split(' ')[1]
                const borderColor = c.split(' ')[2]
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    className={`group p-6 rounded-2xl border bg-slate-900/60 hover:bg-slate-900 transition-all ${borderColor} hover:border-opacity-80`}
                  >
                    <div className={`w-12 h-12 rounded-xl ${bgColor} border ${borderColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <cap.icon className={`w-6 h-6 ${textColor}`} />
                    </div>
                    <h3 className={`text-lg font-bold text-white mb-1.5 group-hover:${textColor} transition-colors`}>
                      {t(cap.title)}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{t(cap.desc)}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── PRICING / STORAGE ────────────────────────────────────────────── */}
        <section className="py-28 bg-slate-900 border-t border-white/5">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold uppercase tracking-wider">
                <HardDrive className="w-3 h-3" />
                {t({ zh: '存储套餐', en: 'Storage Plans' })}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                {t({ zh: '从免费开始，按需升级', en: 'Start Free, Upgrade as You Grow' })}
              </h2>
              <p className="text-slate-400 text-lg">
                {t({ zh: '活动期新用户免费获得 10 GB 存储，后续续费轻松扩容', en: 'Early access users get 10 GB free, easy storage upgrades available' })}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {PLANS.map((plan, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative flex flex-col rounded-2xl border p-7 transition-all ${
                    plan.highlight
                      ? 'border-violet-500/50 bg-gradient-to-b from-violet-600/10 to-slate-950 shadow-2xl shadow-violet-500/10'
                      : 'border-white/10 bg-slate-950/60 hover:border-white/20'
                  }`}
                >
                  {(plan.badgeZh || plan.badgeEn) && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-xs font-bold whitespace-nowrap">
                      {t({ zh: plan.badgeZh ?? '', en: plan.badgeEn ?? '' })}
                    </div>
                  )}
                  <div className="text-4xl font-bold text-white mb-1">{plan.storage}</div>
                  <div className="text-sm text-slate-400 font-medium mb-5">
                    {t({ zh: plan.tierZh, en: plan.tierEn })}
                  </div>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className={`text-3xl font-bold ${plan.highlight ? 'text-violet-300' : 'text-white'}`}>
                      {plan.price}
                    </span>
                    <span className="text-slate-500 text-sm">
                      {t({ zh: plan.subZh, en: plan.subEn })}
                    </span>
                  </div>
                  <ul className="space-y-3 flex-1">
                    {plan.perks.map((perk, pi) => (
                      <li key={pi} className="flex items-start gap-2.5 text-sm text-slate-300">
                        <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlight ? 'text-violet-400' : 'text-emerald-400'}`} />
                        {t(perk)}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#download"
                    className={`mt-7 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                      plan.highlight
                        ? 'bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-500/20'
                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {i === 0
                      ? t({ zh: '免费领取', en: 'Claim Free' })
                      : t({ zh: '下载后升级', en: 'Download & Upgrade' })}
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DOWNLOAD ─────────────────────────────────────────────────────── */}
        <section id="download" className="py-28 bg-slate-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-900/10 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-cyan-500/8 rounded-full blur-[80px]" />

          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-14 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold uppercase tracking-wider">
                <Download className="w-3 h-3" />
                {t({ zh: '下载', en: 'Download' })}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                {t({ zh: '选择你的平台', en: 'Choose Your Platform' })}
              </h2>
              <p className="text-slate-400 text-lg">
                {t({ zh: '同一账号，多端统一管理所有 Agent', en: 'One account, manage all Agents across devices' })}
              </p>
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600/15 to-cyan-600/15 border border-violet-500/25 text-sm">
                <HardDrive className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="text-white font-semibold">
                  {t({ zh: '🎁 现在下载，免费领取 10 GB 存储', en: '🎁 Download now, claim 10 GB free storage' })}
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
              {[
                {
                  icon: Smartphone,
                  platform: 'Android',
                  sub: 'Android 7.0+',
                  cta: t({ zh: '下载 APK', en: 'Download APK' }),
                  href: 'https://api.agentrix.top/downloads/clawlink-agent.apk',
                  badge: t({ zh: '推荐', en: 'Recommended' }),
                  color: 'violet',
                },
                {
                  icon: Smartphone,
                  platform: 'iOS',
                  sub: 'TestFlight · iOS 15+',
                  cta: t({ zh: '加入 TestFlight', en: 'Join TestFlight' }),
                  href: 'https://testflight.apple.com',
                  badge: 'Beta',
                  color: 'cyan',
                },
                {
                  icon: Terminal,
                  platform: 'Desktop CLI',
                  sub: 'Win / Mac / Linux',
                  cta: t({ zh: '下载 CLI', en: 'Download CLI' }),
                  href: '/claw/download?platform=cli',
                  badge: null,
                  color: 'emerald',
                },
              ].map((p, i) => {
                const c = colorMap[p.color] || colorMap.violet
                const textColor = c.split(' ')[0]
                const bgColor   = c.split(' ')[1]
                const borderColor = c.split(' ')[2]
                return (
                  <motion.a
                    key={i}
                    href={p.href}
                    target={p.href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className={`group relative flex flex-col items-center text-center p-7 rounded-2xl bg-slate-900/70 border transition-all hover:-translate-y-1 hover:shadow-xl ${borderColor} hover:border-opacity-70`}
                  >
                    {p.badge && (
                      <div className="absolute -top-2.5 right-4 text-[10px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-bold uppercase tracking-wide">
                        {p.badge}
                      </div>
                    )}
                    <div className={`w-14 h-14 rounded-2xl ${bgColor} border ${borderColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <p.icon className={`w-7 h-7 ${textColor}`} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{p.platform}</h3>
                    <p className="text-xs text-slate-500 mb-5">{p.sub}</p>
                    <div className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border ${bgColor} ${textColor} ${borderColor}`}>
                      <Download className="w-4 h-4" />
                      {p.cta}
                    </div>
                  </motion.a>
                )
              })}
            </div>

            <div className="text-center text-sm text-slate-500">
              {t({ zh: '也可以', en: 'Or' })}{' '}
              <button
                onClick={() => router.push('/agent-enhanced')}
                className="text-violet-400 hover:text-violet-300 underline underline-offset-2 font-semibold"
              >
                {t({ zh: '在浏览器中使用 Web 版工作台', en: 'use the Web Workspace in your browser' })}
              </button>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
