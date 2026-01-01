import { useState, useEffect, useCallback } from 'react'
import { useLocalization } from '../../contexts/LocalizationContext'
import { useToast } from '../../contexts/ToastContext'
import { referralApi } from '../../lib/api/referral.api'
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
} from 'lucide-react'

export function PromotionPanel() {
  const { t } = useLocalization()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(true)
  const [referralLink, setReferralLink] = useState('')
  const [stats, setStats] = useState<any>(null)
  const [copied, setCopied] = useState(false)

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
      // error(t({ zh: '加载推广数据失败', en: 'Failed to load promotion data' }))
    } finally {
      setLoading(false)
    }
  }, [t])

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
              zh: '分享您的专属链接，当好友注册并产生交易时，您将获得高达 20% 的佣金奖励。', 
              en: 'Share your exclusive link. When friends register and make transactions, you will receive up to 20% commission reward.' 
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

      {/* 推广规则 & 奖励 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-500" />
            {t({ zh: '奖励规则', en: 'Reward Rules' })}
          </h4>
          <ul className="space-y-4">
            {[
              { 
                zh: '直接推荐奖励：获得被推荐人交易额的 10%', 
                en: 'Direct Referral: Get 10% of the referred user\'s transaction volume' 
              },
              { 
                zh: '二级推荐奖励：获得二级被推荐人交易额的 5%', 
                en: 'Secondary Referral: Get 5% of the secondary referred user\'s transaction volume' 
              },
              { 
                zh: '结算周期：佣金将在交易完成后 24 小时内结算至您的账户', 
                en: 'Settlement: Commission will be settled to your account within 24 hours after transaction' 
              },
              { 
                zh: '提现门槛：累计佣金满 $10 即可申请提现', 
                en: 'Withdrawal: Minimum withdrawal amount is $10' 
              }
            ].map((rule, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                {t(rule)}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-500" />
            {t({ zh: '推广素材', en: 'Marketing Materials' })}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="aspect-video bg-slate-100 dark:bg-slate-700 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 group cursor-pointer hover:border-blue-400 transition-colors">
              <span className="text-xs text-slate-500 group-hover:text-blue-500">{t({ zh: '下载海报', en: 'Download Poster' })}</span>
            </div>
            <div className="aspect-video bg-slate-100 dark:bg-slate-700 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 group cursor-pointer hover:border-blue-400 transition-colors">
              <span className="text-xs text-slate-500 group-hover:text-blue-500">{t({ zh: '推广文案', en: 'Copywriting' })}</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400 italic">
            {t({ zh: '* 更多素材正在准备中...', en: '* More materials coming soon...' })}
          </p>
        </div>
      </div>
    </div>
  )
}
