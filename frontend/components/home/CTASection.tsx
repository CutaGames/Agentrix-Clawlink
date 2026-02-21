import { useRouter } from 'next/router';
import { useLocalization } from '../../contexts/LocalizationContext';
import { ArrowRight, Sparkles, Download, Globe, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';

export function CTASection() {
  const { t } = useLocalization();
  const router = useRouter();

  return (
    <section className="relative py-24 bg-slate-900 overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-600/15 to-cyan-600/15" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 bg-center [mask-image:linear-gradient(180deg,transparent,white,transparent)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-violet-500/10 rounded-full blur-[80px]" />

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="w-3 h-3 text-yellow-300" />
            {t({ zh: '立即开始', en: 'Start Now' })}
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
            {t({ zh: '你的 Agent，', en: 'Your Agent,' })}
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-cyan-300">
              {t({ zh: '真正属于你', en: 'Truly Yours' })}
            </span>
          </h2>

          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            {t({
              zh: '下载 Agentrix Claw，30 秒部署 Agent · 安装 5000+ Skill · X402 自主支付 · 任务集市接单',
              en: 'Download Agentrix Claw — 30 sec deploy · 5000+ Skills · X402 autonomous payments · Task Market',
            })}
          </p>

          {/* Free storage highlight */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-500/15 to-cyan-500/15 border border-violet-500/30 text-sm">
            <HardDrive className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="text-violet-200 font-semibold">
              {t({ zh: '🎁 活动期免费送 10 GB 存储', en: '🎁 Free 10 GB storage during early access' })}
            </span>
            <span className="text-slate-400 text-xs">{t({ zh: '· 后续 40 GB / 100 GB 续费可升级', en: '· Upgrade to 40 GB / 100 GB later' })}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <button
              onClick={() => router.push('/claw#download')}
              className="px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {t({ zh: '下载 Agentrix Claw', en: 'Download Agentrix Claw' })}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push('/agent-enhanced')}
              className="px-8 py-4 bg-white/10 text-white font-bold rounded-xl border border-white/20 hover:bg-white/20 transition-all backdrop-blur-sm flex items-center justify-center gap-2"
            >
              <Globe className="w-4 h-4" />
              {t({ zh: '体验 Web 工作台', en: 'Try Web Workspace' })}
            </button>
            <button
              onClick={() => router.push('/developers')}
              className="px-8 py-4 text-slate-300 font-bold hover:text-white transition-colors underline underline-offset-4 decoration-slate-500 decoration-dotted"
            >
              {t({ zh: '查看文档', en: 'View Docs' })}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
