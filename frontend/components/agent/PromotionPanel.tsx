import { useState, useEffect, useCallback } from 'react'
import { useLocalization } from '../../contexts/LocalizationContext'
import { useToast } from '../../contexts/ToastContext'
import { referralApi } from '../../lib/api/referral.api'
import Link from 'next/link'
import {
  Share2,
  Copy,
  Users,
  TrendingUp,
  DollarSign,
  ExternalLink,
  Award,
  Gift,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  Clock,
  Zap,
  FileText,
  Calculator,
  Info,
  ArrowRight,
  Percent,
  Wallet,
  Shield,
  Package,
  Server,
  Globe,
  Building,
} from 'lucide-react'

// 佣金规则配置 - 与智能合约保持一致
const COMMISSION_RULES = {
  // 资产类型对应的佣金规则
  assetTypes: [
    {
      type: 'physical',
      label: { zh: '实物商品', en: 'Physical Goods' },
      baseRate: 0.5,
      poolRate: 2.5,
      totalRate: 3.0,
      settlement: { zh: '签收后 T+7 天', en: 'T+7 after delivery' },
      icon: Package,
    },
    {
      type: 'service',
      label: { zh: '服务类', en: 'Services' },
      baseRate: 1.0,
      poolRate: 4.0,
      totalRate: 5.0,
      settlement: { zh: '完成后 T+3 天', en: 'T+3 after completion' },
      icon: Server,
    },
    {
      type: 'virtual',
      label: { zh: '虚拟资产', en: 'Virtual Goods' },
      baseRate: 1.0,
      poolRate: '2-4',
      totalRate: '3-5',
      settlement: { zh: '链上确认 T+1', en: 'T+1 after on-chain confirm' },
      icon: Globe,
    },
    {
      type: 'dev_tool',
      label: { zh: '开发者工具', en: 'Developer Tools' },
      baseRate: 5.0,
      poolRate: 15.0,
      totalRate: 20.0,
      settlement: { zh: '即时结算', en: 'Instant' },
      icon: Building,
      special: true,
    },
  ],
  // 场景分成规则
  scenarios: [
    {
      id: 'dual',
      title: { zh: '推荐+执行', en: 'Referral + Execution' },
      referralShare: 30,
      executionShare: 70,
      description: { zh: '推荐Agent获得30%，执行Agent获得70%', en: '30% to referral, 70% to execution agent' },
    },
    {
      id: 'execution',
      title: { zh: '仅执行', en: 'Execution Only' },
      referralShare: 0,
      executionShare: 100,
      description: { zh: '执行Agent获得佣金池100%', en: 'Execution agent gets 100% of pool' },
    },
    {
      id: 'none',
      title: { zh: '无Agent', en: 'No Agent' },
      referralShare: 0,
      executionShare: 0,
      description: { zh: '佣金池回归平台/商户', en: 'Pool reverts to platform/merchant' },
    },
  ],
  // 推广者分成
  promoterShare: 20, // 从平台基础收入中抽取20%
}

export function PromotionPanel() {
  const { t } = useLocalization()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [referralLink, setReferralLink] = useState('')
  const [stats, setStats] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [activeRuleTab, setActiveRuleTab] = useState<'overview' | 'assets' | 'scenarios' | 'settlement'>('overview')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [linkData, statsData] = await Promise.all([
        referralApi.getReferralLink(),
        referralApi.getReferralStats()
      ])
      setReferralLink(linkData.link)
      setStats(statsData)
    } catch (err: any) {
      console.error('加载推广数据失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCopyLink = () => {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    success(t({ zh: '推广链接已复制', en: 'Referral link copied' }))
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 顶部概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {t({ zh: '累计邀请', en: 'Total Referrals' })}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats?.totalReferrals || 0}
            </span>
            <span className="text-sm text-slate-500">{t({ zh: '人', en: 'Users' })}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {t({ zh: '转化率', en: 'Conversion Rate' })}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats?.conversionRate ? `${(stats.conversionRate * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
              <DollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {t({ zh: '累计佣金', en: 'Total Commission' })}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              ${stats?.totalCommission?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
      </div>

      {/* 推广链接卡片 */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Award className="w-7 h-7" />
            {t({ zh: '邀请好友，赚取佣金', en: 'Invite Friends, Earn Commission' })}
          </h3>
          <p className="text-blue-100 mb-8 max-w-md">
            {t({ 
              zh: '分享您的专属链接，当好友注册并产生交易时，您将获得丰厚的佣金奖励。', 
              en: 'Share your exclusive link. When friends register and make transactions, you will receive generous commission rewards.' 
            })}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 flex items-center justify-between group">
              <span className="text-sm font-mono truncate mr-4 opacity-90">
                {referralLink || t({ zh: '正在生成链接...', en: 'Generating link...' })}
              </span>
              <button 
                onClick={handleCopyLink}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors shrink-0"
                title={t({ zh: '复制链接', en: 'Copy Link' })}
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <button 
              className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-md"
              onClick={() => window.open(referralLink, '_blank')}
            >
              <ExternalLink className="w-5 h-5" />
              {t({ zh: '预览页面', en: 'Preview' })}
            </button>
          </div>
        </div>

        {/* 装饰背景 */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl" />
      </div>

      {/* 佣金规则详解 - 带标签切换 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-500" />
              {t({ zh: '佣金规则详解', en: 'Commission Rules' })}
            </h4>
            <Link
              href="/pay/commission-demo"
              className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 transition-colors"
            >
              <Zap className="w-4 h-4" />
              {t({ zh: '查看演示计算器', en: 'View Demo Calculator' })}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {/* 规则标签切换 */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { key: 'overview', label: { zh: '规则概览', en: 'Overview' }, icon: Info },
              { key: 'assets', label: { zh: '资产类型', en: 'Asset Types' }, icon: Package },
              { key: 'scenarios', label: { zh: '场景分成', en: 'Scenarios' }, icon: Users },
              { key: 'settlement', label: { zh: '结算周期', en: 'Settlement' }, icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveRuleTab(tab.key as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    activeRuleTab === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t(tab.label)}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          {/* 规则概览 */}
          {activeRuleTab === 'overview' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-4">
                <h5 className="font-semibold text-purple-600 dark:text-purple-400 mb-2">
                  {t({ zh: '三层分润架构', en: 'Three-tier Commission Structure' })}
                </h5>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t({ 
                    zh: 'Agentrix 采用"平台基础 + 佣金池"的两级分润模式，支持推荐Agent、执行Agent和推广者的多方分成。', 
                    en: 'Agentrix uses a two-level "base + pool" profit-sharing model, supporting multi-party splits between referral agents, execution agents, and promoters.' 
                  })}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Building className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">{t({ zh: '平台基础', en: 'Platform Base' })}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t({ zh: '0.5%-5% 固定收入，推广者可获得其中 20%', en: '0.5%-5% base revenue, promoters get 20% of it' })}
                  </p>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">{t({ zh: '佣金池', en: 'Commission Pool' })}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t({ zh: '1.5%-4% 用于推荐/执行 Agent 分成', en: '1.5%-4% for referral/execution agent splits' })}
                  </p>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                      <Percent className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">{t({ zh: '推广者奖励', en: 'Promoter Bonus' })}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t({ zh: '从平台基础收入抽取 20% 作为推广奖励', en: '20% of platform base as promotion reward' })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 资产类型费率 */}
          {activeRuleTab === 'assets' && (
            <div className="space-y-3">
              {COMMISSION_RULES.assetTypes.map((asset) => {
                const Icon = asset.icon
                return (
                  <div key={asset.type} className={`flex items-center justify-between p-4 rounded-lg border ${
                    asset.special ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        asset.special ? 'bg-amber-500/20' : 'bg-blue-500/20'
                      }`}>
                        <Icon className={`w-5 h-5 ${asset.special ? 'text-amber-500' : 'text-blue-500'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{t(asset.label)}</p>
                        <p className="text-xs text-slate-500">{t(asset.settlement)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {typeof asset.totalRate === 'string' ? asset.totalRate : asset.totalRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-slate-500">
                        {t({ zh: '基础', en: 'Base' })} {asset.baseRate}% + {t({ zh: '池', en: 'Pool' })} {asset.poolRate}%
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 场景分成 */}
          {activeRuleTab === 'scenarios' && (
            <div className="space-y-4">
              {COMMISSION_RULES.scenarios.map((scenario, idx) => (
                <div key={scenario.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-semibold text-slate-900 dark:text-white">
                      {t({ zh: `场景 ${String.fromCharCode(65 + idx)}`, en: `Scenario ${String.fromCharCode(65 + idx)}` })}: {t(scenario.title)}
                    </h5>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{t(scenario.description)}</p>
                  <div className="flex gap-4">
                    <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-purple-600">{scenario.referralShare}%</p>
                      <p className="text-xs text-slate-500">{t({ zh: '推荐 Agent', en: 'Referral Agent' })}</p>
                    </div>
                    <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">{scenario.executionShare}%</p>
                      <p className="text-xs text-slate-500">{t({ zh: '执行 Agent', en: 'Execution Agent' })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 结算周期 */}
          {activeRuleTab === 'settlement' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <Info className="w-4 h-4 inline mr-1" />
                  {t({ 
                    zh: '结算时间 (T) 指触发事件发生的时间点，如签收、服务完成、链上确认等。', 
                    en: 'Settlement time (T) refers to the trigger event, such as delivery confirmation, service completion, or on-chain confirmation.' 
                  })}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">{t({ zh: '资产类型', en: 'Asset Type' })}</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">{t({ zh: '触发事件', en: 'Trigger' })}</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">{t({ zh: '锁定期', en: 'Lock Period' })}</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">{t({ zh: '资金释放', en: 'Payout' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { asset: { zh: '实物商品', en: 'Physical' }, trigger: { zh: '签收/确认', en: 'Delivery' }, lock: '7天', payout: 'T+7' },
                      { asset: { zh: '服务类', en: 'Services' }, trigger: { zh: '服务完成', en: 'Completed' }, lock: '3天', payout: 'T+3' },
                      { asset: { zh: '虚拟资产', en: 'Virtual' }, trigger: { zh: '链上确认', en: 'On-chain' }, lock: '1天', payout: 'T+1' },
                      { asset: { zh: '开发者工具', en: 'Dev Tools' }, trigger: { zh: '支付成功', en: 'Payment' }, lock: '0天', payout: t({ zh: '即时', en: 'Instant' }) },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">{t(row.asset)}</td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{t(row.trigger)}</td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{row.lock}</td>
                        <td className="py-2 px-3 text-green-600 font-medium">{row.payout}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 快速入口和推广素材 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 佣金计算器入口 */}
        <Link
          href="/pay/commission-demo"
          className="group bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold mb-2 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                {t({ zh: '佣金计算器', en: 'Commission Calculator' })}
              </h4>
              <p className="text-purple-100 text-sm">
                {t({ zh: '模拟不同场景下的佣金分配，了解您的潜在收益', en: 'Simulate commission distribution in different scenarios' })}
              </p>
            </div>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 推广素材 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-500" />
            {t({ zh: '推广素材', en: 'Marketing Materials' })}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="aspect-video bg-slate-100 dark:bg-slate-700 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 group cursor-pointer hover:border-blue-400 transition-colors">
              <FileText className="w-6 h-6 text-slate-400 group-hover:text-blue-500 mb-1" />
              <span className="text-xs text-slate-500 group-hover:text-blue-500">{t({ zh: '下载海报', en: 'Download Poster' })}</span>
            </div>
            <div className="aspect-video bg-slate-100 dark:bg-slate-700 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 group cursor-pointer hover:border-blue-400 transition-colors">
              <Gift className="w-6 h-6 text-slate-400 group-hover:text-blue-500 mb-1" />
              <span className="text-xs text-slate-500 group-hover:text-blue-500">{t({ zh: '推广文案', en: 'Copywriting' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 推广者专属提示 */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Award className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold text-amber-700 dark:text-amber-300 mb-1">
              {t({ zh: '推广者专属权益', en: 'Promoter Benefits' })}
            </h5>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {t({ 
                zh: '作为推广者，您将从 Agentrix 平台基础收入中获得 20% 的分成。当您邀请的用户产生交易时，佣金将自动结算到您的账户。支持 Web3 钱包直接收款或 Web2 月结模式。', 
                en: 'As a promoter, you receive 20% of Agentrix platform base revenue. When your referred users make transactions, commission is automatically settled to your account. Supports Web3 wallet payouts or Web2 monthly settlements.' 
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
