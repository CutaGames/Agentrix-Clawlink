import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useLocalization } from '../../contexts/LocalizationContext';
import { Cloud, Laptop, Plug, CheckCircle, ArrowRight, Cpu, Zap, HardDrive } from 'lucide-react';

export function ClawSection() {
  const { t } = useLocalization();
  const router = useRouter();

  const deployModes = [
    {
      icon: Cloud,
      color: 'cyan',
      badge: t({ zh: '推荐', en: 'Recommended' }),
      title: t({ zh: '一键云端部署', en: 'One-tap Cloud Deploy' }),
      subtitle: t({ zh: '30 秒上线，永久在线，无需服务器知识', en: '30 seconds online, always-on, no server knowledge needed' }),
      features: [
        t({ zh: '平台托管，免运维', en: 'Platform-managed, zero ops' }),
        t({ zh: '多 LLM 选择（DeepSeek / OpenAI / Claude）', en: 'Multi-LLM choice (DeepSeek / OpenAI / Claude)' }),
        t({ zh: '10 GB 云端存储（活动期免费）', en: '10 GB cloud storage (free during early access)' }),
        t({ zh: '自动备份 & 高可用', en: 'Auto backup & high availability' }),
      ],
    },
    {
      icon: Laptop,
      color: 'emerald',
      badge: t({ zh: '隐私优先', en: 'Privacy First' }),
      title: t({ zh: '本地部署', en: 'Local Deploy' }),
      subtitle: t({ zh: '扫码连接你的 PC / NAS / HomeServer，数据本地化', en: 'Scan to connect your PC / NAS / HomeServer, data stays local' }),
      features: [
        t({ zh: '本地 LLM 支持（Ollama / LM Studio）', en: 'Local LLM support (Ollama / LM Studio)' }),
        t({ zh: '数据完全本地，隐私有保障', en: 'Data fully local, privacy guaranteed' }),
        t({ zh: 'Win / Mac / Linux 二进制 CLI', en: 'Win / Mac / Linux binary CLI' }),
        t({ zh: 'WebSocket Relay 穿透，无需公网 IP', en: 'WebSocket Relay, no public IP needed' }),
      ],
    },
    {
      icon: Plug,
      color: 'violet',
      badge: t({ zh: '专业用户', en: 'Advanced' }),
      title: t({ zh: '接入自有实例', en: 'Connect Your Own' }),
      subtitle: t({ zh: '已有 OpenClaw 服务？输入地址和 Token 直接接入', en: 'Already have OpenClaw? Enter URL and Token to connect' }),
      features: [
        t({ zh: '手动输入或 QR 扫码接入', en: 'Manual input or QR scan connect' }),
        t({ zh: '完全掌控实例配置', en: 'Full control over instance config' }),
        t({ zh: '多实例管理（切换主实例）', en: 'Multi-instance management (switch primary)' }),
        t({ zh: '企业 / 自有云环境适配', en: 'Enterprise / private cloud compatible' }),
      ],
    },
  ];

  const colorMap: Record<string, string> = {
    cyan: 'border-cyan-500/30 hover:border-cyan-400/60 group-hover:text-cyan-400',
    emerald: 'border-emerald-500/30 hover:border-emerald-400/60 group-hover:text-emerald-400',
    violet: 'border-violet-500/30 hover:border-violet-400/60 group-hover:text-violet-400',
  };
  const iconColorMap: Record<string, string> = {
    cyan: 'text-cyan-400 bg-cyan-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    violet: 'text-violet-400 bg-violet-500/10',
  };
  const badgeColorMap: Record<string, string> = {
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  };

  return (
    <section className="py-28 bg-slate-900 border-y border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold uppercase tracking-wider">
            <Cpu className="w-3 h-3" />
            Agentrix Claw
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            {t({ zh: '三种方式，拥有', en: 'Three Ways to Own' })}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
              {t({ zh: '你的 AI Agent', en: 'Your AI Agent' })}
            </span>
          </h2>
          <p className="text-slate-400 text-lg">
            {t({
              zh: '无论你是普通用户、开发者还是企业，Claw 都能以最适合你的方式让 Agent 跑起来。',
              en: 'Whether you\'re a regular user, developer, or enterprise — Claw gets your Agent running your way.',
            })}
          </p>
        </div>

        {/* Deploy mode cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {deployModes.map((mode, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.12 }}
              className={`group p-7 rounded-2xl border bg-slate-950/60 hover:bg-slate-950/90 transition-all ${colorMap[mode.color]}`}
            >
              <div className="flex items-start justify-between mb-5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColorMap[mode.color]}`}>
                  <mode.icon className="w-6 h-6" />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${badgeColorMap[mode.color]}`}>
                  {mode.badge}
                </span>
              </div>
              <h3 className={`text-lg font-bold text-white mb-1 transition-colors ${colorMap[mode.color].split(' ').pop()}`}>
                {mode.title}
              </h3>
              <p className="text-slate-400 text-sm mb-5 leading-relaxed">{mode.subtitle}</p>
              <ul className="space-y-2.5">
                {mode.features.map((f, fi) => (
                  <li key={fi} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${iconColorMap[mode.color].split(' ')[0]}`} />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Promo strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-2xl overflow-hidden border border-violet-500/25 bg-gradient-to-r from-violet-600/10 via-slate-900/60 to-cyan-600/10 p-8"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center">
                <HardDrive className="w-7 h-7 text-violet-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold text-white">
                    {t({ zh: '🎁 活动期专属礼包', en: '🎁 Early Access Bundle' })}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 font-bold uppercase tracking-wide">
                    {t({ zh: '限时', en: 'Limited' })}
                  </span>
                </div>
                <p className="text-slate-300 text-sm">
                  {t({
                    zh: '新用户免费获得 10 GB 云端存储 · 后续可升级至 40 GB / 100 GB 套餐',
                    en: 'New users get 10 GB cloud storage free · Upgrade to 40 GB / 100 GB plans later',
                  })}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  {[
                    { label: '10 GB', sub: t({ zh: '免费赠送', en: 'Free Gift' }), color: 'text-violet-400' },
                    { label: '→', sub: '', color: 'text-slate-500' },
                    { label: '40 GB', sub: t({ zh: '基础版', en: 'Starter' }), color: 'text-cyan-400' },
                    { label: '→', sub: '', color: 'text-slate-500' },
                    { label: '100 GB', sub: t({ zh: '专业版', en: 'Pro' }), color: 'text-emerald-400' },
                  ].map((tier, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <span className={`text-sm font-bold ${tier.color}`}>{tier.label}</span>
                      {tier.sub && <span className="text-[10px] text-slate-500">{tier.sub}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/claw#download')}
              className="shrink-0 flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-500/20 group"
            >
              <Zap className="w-4 h-4" />
              {t({ zh: '立即下载领取', en: 'Download to Claim' })}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
