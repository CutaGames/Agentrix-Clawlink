import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useLocalization } from '../../contexts/LocalizationContext';
import { Smartphone, Monitor, Terminal, Download, ArrowRight, HardDrive, Star } from 'lucide-react';

export function DownloadSection() {
  const { t } = useLocalization();
  const router = useRouter();

  const platforms = [
    {
      icon: Smartphone,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/25 hover:border-violet-400/50',
      platform: 'Android',
      subtitle: t({ zh: 'Android 7.0+', en: 'Android 7.0+' }),
      cta: t({ zh: '下载 APK', en: 'Download APK' }),
      href: '/claw/download?platform=android',
      badge: t({ zh: '推荐', en: 'Recommended' }),
    },
    {
      icon: Smartphone,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/25 hover:border-cyan-400/50',
      platform: 'iOS',
      subtitle: 'TestFlight · iOS 15+',
      cta: t({ zh: '加入 TestFlight', en: 'Join TestFlight' }),
      href: '/claw/download?platform=ios',
      badge: 'Beta',
    },
    {
      icon: Terminal,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/25 hover:border-emerald-400/50',
      platform: 'Desktop CLI',
      subtitle: 'Win / Mac / Linux',
      cta: t({ zh: '下载 CLI', en: 'Download CLI' }),
      href: '/claw/download?platform=cli',
      badge: null,
    },
  ];

  return (
    <section id="download" className="py-28 bg-slate-900 border-t border-white/5 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-violet-900/10 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-cyan-500/8 rounded-full blur-[80px]" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold uppercase tracking-wider">
            <Download className="w-3 h-3" />
            {t({ zh: '立即下载', en: 'Download Now' })}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            {t({ zh: '下载 Agentrix Claw', en: 'Get Agentrix Claw' })}
          </h2>
          <p className="text-slate-400 text-lg">
            {t({
              zh: '支持 Android、iOS 和 Desktop CLI，一套账号统一管理所有 Agent。',
              en: 'Available on Android, iOS, and Desktop CLI. One account, all your Agents.',
            })}
          </p>

          {/* Free storage promo pill */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600/15 to-cyan-600/15 border border-violet-500/25 text-sm"
          >
            <HardDrive className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="text-white font-semibold">
              {t({ zh: '🎁 活动期新用户免费获得 ', en: '🎁 Early access: New users get ' })}
              <span className="text-violet-300 font-bold">10 GB</span>
              {t({ zh: ' 云端存储', en: ' cloud storage free' })}
            </span>
            <span className="text-slate-400 text-xs">|</span>
            <span className="text-slate-400 text-xs">
              {t({ zh: '后续可升级至 40 GB / 100 GB', en: 'Upgradeable to 40 GB / 100 GB' })}
            </span>
          </motion.div>
        </div>

        {/* Platform cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
          {platforms.map((p, i) => (
            <motion.div
              key={p.platform}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`group relative flex flex-col items-center text-center p-7 rounded-2xl bg-slate-950/70 border transition-all cursor-pointer ${p.border}`}
              onClick={() => router.push(p.href)}
            >
              {p.badge && (
                <div className="absolute -top-2.5 right-4 text-[10px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-bold uppercase tracking-wide">
                  {p.badge}
                </div>
              )}
              <div className={`w-14 h-14 rounded-2xl ${p.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <p.icon className={`w-7 h-7 ${p.color}`} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{p.platform}</h3>
              <p className="text-xs text-slate-500 mb-5">{p.subtitle}</p>
              <button className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${p.bg} ${p.color} border ${p.border.split(' ')[0]} group-hover:scale-105`}>
                <Download className="w-4 h-4" />
                {p.cta}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <p className="text-sm text-slate-500 mb-4">
            {t({ zh: '已有账号？直接登录 Web 版工作台', en: 'Already have an account? Use the Web Workspace' })}
          </p>
          <button
            onClick={() => router.push('/agent-enhanced')}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white font-semibold transition-colors text-sm group underline underline-offset-4 decoration-slate-600"
          >
            {t({ zh: '前往 Web 工作台', en: 'Go to Web Workspace' })}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}
