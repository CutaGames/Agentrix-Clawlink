import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useLocalization } from '../../contexts/LocalizationContext';
import { useUser } from '../../contexts/UserContext';
import { ArrowRight, Zap, ShieldCheck, Globe, Smartphone, Cloud, Server, Download } from 'lucide-react';

export function HeroSection() {
  const { t } = useLocalization();
  const { isAuthenticated } = useUser();
  const router = useRouter();

  return (
    <section className="relative overflow-hidden min-h-[92vh] flex items-center pt-20">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-slate-950">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-violet-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 left-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      <div className="container mx-auto px-6 relative z-10 py-16">
        {/* Promo Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/15 to-cyan-500/15 border border-violet-500/30 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-violet-300">{t({ zh: '🎁 活动期免费赠送', en: '🎁 Free During Early Access' })}</span>
            <span className="text-slate-300">{t({ zh: '10 GB 云端存储空间 · 新用户专属', en: '10 GB Cloud Storage · New Users Only' })}</span>
            <button
              onClick={() => router.push('/claw#download')}
              className="ml-1 text-xs text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-2"
            >
              {t({ zh: '立即领取 →', en: 'Claim Now →' })}
            </button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold uppercase tracking-wider">
              <Smartphone className="w-3 h-3" />
              {t({ zh: 'AI Agent 操作系统', en: 'AI Agent Operating System' })}
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] text-white tracking-tight">
              {t({ zh: '部署你的', en: 'Deploy Your' })}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 block mt-1">
                {t({ zh: 'AI Agent', en: 'AI Agent' })}
              </span>
              <span className="text-3xl md:text-4xl lg:text-5xl font-semibold text-slate-300 block mt-2">
                {t({ zh: '随时随地', en: 'Anywhere, Anytime' })}
              </span>
            </h1>

            <p className="text-lg text-slate-300 max-w-xl leading-relaxed">
              {t({
                zh: 'Agentrix Claw 让你一键云端部署 AI Agent，随时从手机控制；内置 5000+ Skill 市场、任务集市与 X402 自主支付，打造真正属于你的 AI 商业体。',
                en: 'Agentrix Claw lets you deploy AI Agents to the cloud in one tap and control them from your phone. With 5000+ Skills, Task Market, and X402 autonomous payments — your Agent is a real business.'
              })}
            </p>

            {/* Three deploy modes */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Cloud, label: t({ zh: '☁️ 一键云端', en: '☁️ One-tap Cloud' }), color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
                { icon: Server, label: t({ zh: '💻 本地部署', en: '💻 Local Deploy' }), color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
                { icon: Zap, label: t({ zh: '⚙️ 接入自有实例', en: '⚙️ BYOC Connect' }), color: 'text-violet-400 border-violet-500/30 bg-violet-500/10' },
              ].map((m, i) => (
                <span key={i} className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 ${m.color}`}>
                  {m.label}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={() => router.push('/claw#download')}
                className="group relative px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                {t({ zh: '下载 Agentrix Claw', en: 'Download Agentrix Claw' })}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => router.push(isAuthenticated ? '/agent-enhanced' : '/auth/register')}
                className="px-8 py-4 bg-slate-800/60 hover:bg-slate-800 text-white font-bold rounded-xl border border-white/10 hover:border-white/20 transition-all backdrop-blur-sm"
              >
                {t({ zh: '体验 Web 工作台', en: 'Try Web Workspace' })}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/5">
              {[
                { icon: Zap, label: t({ zh: '5000+ 技能', en: '5000+ Skills' }), value: 'ClawHub' },
                { icon: ShieldCheck, label: t({ zh: 'UCP · X402', en: 'UCP · X402' }), value: 'Payments' },
                { icon: Globe, label: t({ zh: '任务集市', en: 'Task Market' }), value: 'Agent Economy' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                    <item.icon className="w-4 h-4 text-violet-400" />
                    {item.label}
                  </div>
                  <div className="text-white font-bold">{item.value}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Hero Visual — Phone + Cloud */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative flex justify-center"
          >
            {/* Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 to-cyan-500/20 rounded-3xl blur-xl" />

            <div className="relative w-full max-w-sm">
              {/* Phone mockup */}
              <div className="relative bg-slate-900 border border-white/15 rounded-[2.5rem] overflow-hidden shadow-2xl mx-auto w-72">
                {/* Status bar */}
                <div className="h-10 bg-slate-950 flex items-center justify-between px-6 text-[10px] text-slate-400">
                  <span>9:41</span>
                  <div className="flex gap-1 items-center">
                    <div className="w-3 h-1.5 border border-slate-400 rounded-sm"><div className="h-full w-2/3 bg-emerald-400 rounded-sm" /></div>
                  </div>
                </div>

                {/* App content */}
                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Agentrix Claw</div>
                      <div className="text-sm font-bold text-white">{t({ zh: '我的 Agent', en: 'My Agent' })}</div>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] text-emerald-400 font-bold">Online</span>
                    </div>
                  </div>

                  {/* Agent card */}
                  <div className="bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-violet-500/25 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm">🤖</div>
                      <div>
                        <div className="text-xs font-bold text-white">My Research Agent</div>
                        <div className="text-[10px] text-slate-400">DeepSeek-V3 · Cloud</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-300 bg-slate-950/50 rounded-xl px-3 py-2 font-mono">
                      &gt; {t({ zh: '正在分析竞品数据...', en: 'Analyzing competitor data...' })}
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{t({ zh: '已安装 Skill', en: 'Installed Skills' })}</div>
                    {[
                      { name: 'Web Search Pro', status: '✅' },
                      { name: 'GitHub Copilot', status: '✅' },
                      { name: 'X402 Pay', status: '🔵' },
                    ].map(s => (
                      <div key={s.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/5">
                        <span className="text-[10px] text-slate-300">{s.name}</span>
                        <span className="text-[10px]">{s.status}</span>
                      </div>
                    ))}
                  </div>

                  {/* Storage promo */}
                  <div className="bg-gradient-to-r from-violet-600/20 to-pink-600/20 border border-violet-500/25 rounded-xl px-3 py-2 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-violet-300">🎁 {t({ zh: '免费存储', en: 'Free Storage' })}</div>
                      <div className="text-[10px] text-slate-400">10 GB {t({ zh: '送给新用户', en: 'for new users' })}</div>
                    </div>
                    <div className="text-[10px] text-violet-300 font-bold">→</div>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-4 -right-4 bg-slate-900 border border-emerald-500/30 rounded-2xl px-3 py-2 shadow-xl"
              >
                <div className="text-xs text-emerald-400 font-bold">+$2.40</div>
                <div className="text-[10px] text-slate-400">X402 earned</div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-4 -left-4 bg-slate-900 border border-cyan-500/30 rounded-2xl px-3 py-2 shadow-xl"
              >
                <div className="text-xs text-cyan-400 font-bold">5,247</div>
                <div className="text-[10px] text-slate-400">Skills available</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

