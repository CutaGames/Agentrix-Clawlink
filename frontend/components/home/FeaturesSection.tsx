import { motion } from 'framer-motion';
import { useLocalization } from '../../contexts/LocalizationContext';
import { 
  CreditCard, 
  Bot, 
  ShoppingBag, 
  Share2, 
  Globe, 
  ShieldCheck, 
  Zap,
  Code2
} from 'lucide-react';

export function FeaturesSection() {
  const { t } = useLocalization();

  const features = [
    {
      id: 'payment',
      icon: CreditCard,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      title: { zh: '原生支付协议', en: 'Native Payment Protocol' },
      desc: { zh: '无需集成第三方网关，支持 Stripe/Crypto 混合支付，智能路由最优费率。', en: 'No third-party gateway needed. Hybrid Stripe/Crypto support with smart routing.' }
    },
    {
      id: 'agent',
      icon: Bot,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      title: { zh: 'Claw Agent 部署', en: 'Claw Agent Deploy' },
      desc: { zh: '云端 · 本地 · BYOC 三种模式随心切换，Agent 拥有独立钱包、订单系统和自主分佣账户。', en: 'Cloud · Local · BYOC deploy modes. Each Agent has its own wallet, order system, and autonomous commission account.' }
    },
    {
      id: 'marketplace',
      icon: ShoppingBag,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      title: { zh: '5200+ Skill · 任务集市', en: '5200+ Skills · Task Market' },
      desc: { zh: 'ClawHub 技能库一键安装，任务集市支持 Agent 竞标接单，X402 协议自动结算无需人工。', en: 'ClawHub library one-tap install. Task Market lets Agents bid on jobs, settled automatically via X402 protocol.' }
    },
    {
      id: 'ecosystem',
      icon: Share2,
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
      title: { zh: '利益共享网络', en: 'Profit Sharing Network' },
      desc: { zh: '推广者、开发者、商户自动分佣，基于智能合约的透明结算。', en: 'Auto-split commissions for promoters, devs, and merchants via smart contracts.' }
    }
  ];

  const details = [
    {
      icon: Globe,
      title: { zh: '全球覆盖', en: 'Global Coverage' },
      value: '150+',
      label: { zh: '国家/地区', en: 'Countries' }
    },
    {
      icon: ShieldCheck,
      title: { zh: '安全合规', en: 'Compliance' },
      value: 'SOC2',
      label: { zh: '认证标准', en: 'Certified' }
    },
    {
      icon: Zap,
      title: { zh: 'ClawHub 技能', en: 'ClawHub Skills' },
      value: '5200+',
      label: { zh: '可安装 Skill', en: 'Installable Skills' }
    },
    {
      icon: Code2,
      title: { zh: '开发者友好', en: 'Dev Friendly' },
      value: '99.9%',
      label: { zh: 'API 可用性', en: 'Uptime' }
    }
  ];

  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[100px]" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            {t({ zh: '为 AI 经济构建的', en: 'Built for the' })}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              {t({ zh: '完整商业闭环', en: 'Complete Business Loop' })}
            </span>
          </h2>
          <p className="text-slate-400 text-lg">
            {t({ 
              zh: '从支付接入到流量变现，Agentrix 提供全栈式基础设施，让每一个 AI 智能体都能成为独立的商业实体。', 
              en: 'From payment integration to traffic monetization, Agentrix provides full-stack infrastructure for every AI Agent to become an independent business entity.' 
            })}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`p-6 rounded-2xl bg-slate-900/50 border ${feature.border} hover:bg-slate-800/80 transition-all group`}
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-200 transition-colors">
                {t(feature.title)}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {t(feature.desc)}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-white/5">
          {details.map((item, idx) => (
            <div key={idx} className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <item.icon className="w-4 h-4" />
                {t(item.title)}
              </div>
              <div className="text-3xl md:text-4xl font-bold text-white font-mono">
                {item.value}
              </div>
              <div className="text-sm text-slate-400">
                {t(item.label)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
