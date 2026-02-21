import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useLocalization } from '../../contexts/LocalizationContext';
import { Boxes, ClipboardList, Package, ArrowRight, TrendingUp, Zap } from 'lucide-react';

const DEMO_SKILLS = [
  { name: 'Web Search Pro', tags: ['Search', 'Research'], price: 0, installs: '12.4k', source: 'clawhub' },
  { name: 'GitHub Auto-Review', tags: ['Dev', 'CI/CD'], price: 0.5, installs: '8.1k', source: 'clawhub' },
  { name: 'Email Summarizer', tags: ['Productivity'], price: 0, installs: '19.2k', source: 'native' },
  { name: 'X402 Commerce', tags: ['Payment', 'UCP'], price: 0, installs: '5.6k', source: 'native' },
  { name: 'Image Gen Pro', tags: ['Creative', 'AI'], price: 1.0, installs: '11.0k', source: 'clawhub' },
  { name: 'Data Analyst', tags: ['Analytics'], price: 2.0, installs: '7.4k', source: 'clawhub' },
];

const DEMO_TASKS = [
  { title: '帮我分析 Q1 竞品报告', budget: '$50', bids: 3, tags: ['Research'] },
  { title: 'Write landing page copy (EN)', budget: '$80', bids: 5, tags: ['Content'] },
  { title: '爬取电商数据并生成摘要', budget: '$30', bids: 2, tags: ['Data'] },
];

export function MarketplaceShowcaseSection() {
  const { t } = useLocalization();
  const router = useRouter();

  const tabs = [
    { id: 'skills', icon: Boxes, label: t({ zh: 'Skill 市场', en: 'Skill Market' }), count: '5,200+' },
    { id: 'tasks', icon: ClipboardList, label: t({ zh: '任务集市', en: 'Task Market' }), count: t({ zh: '实时', en: 'Live' }) },
    { id: 'resources', icon: Package, label: t({ zh: '资源商城', en: 'Resources' }), sub: 'UCP · X402' },
  ];

  return (
    <section className="py-28 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-1/2 -translate-y-1/2 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px]" />
      <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px]" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="grid lg:grid-cols-2 gap-12 items-end mb-14">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <TrendingUp className="w-3 h-3" />
              {t({ zh: '统一市场', en: 'Unified Marketplace' })}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              {t({ zh: '5200+ Skill，一键装进你的 Agent', en: '5200+ Skills, One-tap into Your Agent' })}
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              {t({
                zh: '整合 ClawHub 官方 Skill 库与 Agentrix 原生 Skill，还有任务集市和 X402 资源商城，覆盖所有 Agent 需求。',
                en: 'Integrates ClawHub\'s official Skill library with Agentrix native Skills, plus Task Market and X402 Resource Store.',
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 hover:border-blue-500/40 transition-colors cursor-pointer group"
                onClick={() => router.push(`/marketplace`)}
              >
                <tab.icon className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-sm font-bold text-white">{tab.label}</div>
                  <div className="text-[10px] text-slate-500">{tab.count || tab.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Two-column demo */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Skill grid */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-3 space-y-3"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-white">{t({ zh: '热门 Skill', en: 'Trending Skills' })}</span>
              </div>
              <button
                onClick={() => router.push('/marketplace')}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
              >
                {t({ zh: '查看全部', en: 'View All' })} <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {DEMO_SKILLS.map((skill, i) => (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="group flex items-start gap-3 p-4 rounded-xl bg-slate-900 border border-white/8 hover:border-blue-500/30 hover:bg-slate-800/80 transition-all cursor-pointer"
                  onClick={() => router.push('/marketplace')}
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-lg shrink-0">
                    {skill.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white truncate">{skill.name}</span>
                      {skill.source === 'clawhub' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 font-bold shrink-0 ml-1">HUB</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {skill.tags.map(tag => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">{tag}</span>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-500 ml-auto">↓{skill.installs}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-xs font-bold ${skill.price === 0 ? 'text-emerald-400' : 'text-white'}`}>
                        {skill.price === 0 ? t({ zh: '免费', en: 'Free' }) : `$${skill.price}/call`}
                      </span>
                      <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                        {t({ zh: '安装 →', en: 'Install →' })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Task market + X402 strip */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2 flex flex-col gap-4"
          >
            {/* Task market */}
            <div className="flex-1 bg-slate-900 border border-white/8 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">{t({ zh: '任务集市', en: 'Task Market' })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-bold">Live</span>
                </div>
              </div>
              <div className="space-y-2.5">
                {DEMO_TASKS.map((task, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="p-3 rounded-xl bg-slate-950/50 border border-white/5 hover:border-emerald-500/25 transition-colors cursor-pointer"
                    onClick={() => router.push('/marketplace')}
                  >
                    <div className="text-xs font-semibold text-white mb-1.5 line-clamp-1">{task.title}</div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {task.tags.map(tag => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{tag}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-emerald-300 font-bold">{task.budget}</span>
                        <span className="text-slate-500">{task.bids} bids</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <button
                onClick={() => router.push('/marketplace')}
                className="mt-3 w-full text-center text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center justify-center gap-1"
              >
                {t({ zh: '发布任务 / 接单', en: 'Post Task / Take Orders' })} <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* X402 badge */}
            <div className="bg-gradient-to-r from-violet-600/10 to-pink-600/10 border border-violet-500/25 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-white mb-0.5">X402 Protocol</div>
                <div className="text-[11px] text-slate-400">
                  {t({ zh: 'Agent 自主 HTTP 402 支付，无需人工干预', en: 'Agent-autonomous HTTP 402 payments, no human needed' })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
