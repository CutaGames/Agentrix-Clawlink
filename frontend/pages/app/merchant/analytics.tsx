import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

interface PaymentStats {
  today: { amount: number; count: number }
  week: { amount: number; count: number }
  month: { amount: number; count: number }
  total: { amount: number; count: number }
}

interface PaymentMethodDistribution {
  method: string
  amount: number
  count: number
  percentage: number
}

interface TrendData {
  date: string
  amount: number
  count: number
}

export default function MerchantAnalytics() {
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [methodDistribution, setMethodDistribution] = useState<PaymentMethodDistribution[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      // 模拟数据
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setStats({
        today: { amount: 12500, count: 45 },
        week: { amount: 87500, count: 320 },
        month: { amount: 325000, count: 1200 },
        total: { amount: 1250000, count: 4500 },
      })

      setMethodDistribution([
        { method: 'Stripe', amount: 150000, count: 600, percentage: 45 },
        { method: 'Apple Pay', amount: 80000, count: 350, percentage: 24 },
        { method: 'Google Pay', amount: 50000, count: 200, percentage: 15 },
        { method: 'Crypto', amount: 30000, count: 100, percentage: 9 },
        { method: 'X402', amount: 15000, count: 50, percentage: 5 },
      ])

      // 生成趋势数据
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      const trend: TrendData[] = []
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        trend.push({
          date: date.toISOString().split('T')[0],
          amount: Math.random() * 20000 + 5000,
          count: Math.floor(Math.random() * 50 + 10),
        })
      }
      setTrendData(trend)
    } catch (error) {
      console.error('加载统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  return (
    <DashboardLayout userType="merchant">
      <Head>
        <title>支付统计与分析 - 商户中心</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">支付统计与分析</h1>
            <p className="text-gray-600 mt-1">实时查看您的支付数据和趋势</p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
            <option value="90d">最近90天</option>
          </select>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">今日收入</div>
            <div className="text-2xl font-bold text-gray-900">¥{stats?.today.amount.toLocaleString() || '0'}</div>
            <div className="text-sm text-gray-500 mt-1">{stats?.today.count || 0} 笔交易</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">本周收入</div>
            <div className="text-2xl font-bold text-gray-900">¥{stats?.week.amount.toLocaleString() || '0'}</div>
            <div className="text-sm text-gray-500 mt-1">{stats?.week.count || 0} 笔交易</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">本月收入</div>
            <div className="text-2xl font-bold text-gray-900">¥{stats?.month.amount.toLocaleString() || '0'}</div>
            <div className="text-sm text-gray-500 mt-1">{stats?.month.count || 0} 笔交易</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">累计收入</div>
            <div className="text-2xl font-bold text-gray-900">¥{stats?.total.amount.toLocaleString() || '0'}</div>
            <div className="text-sm text-gray-500 mt-1">{stats?.total.count || 0} 笔交易</div>
          </div>
        </div>

        {/* 支付方式分布 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">支付方式分布</h2>
          <div className="space-y-4">
            {methodDistribution.map((item) => (
              <div key={item.method}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{item.method}</span>
                  <span className="text-sm text-gray-600">
                    ¥{item.amount.toLocaleString()} ({item.count} 笔)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 趋势图表 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">收入趋势</h2>
          <div className="h-64 flex items-end justify-between space-x-2">
            {trendData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-600 rounded-t transition-all hover:bg-blue-700"
                  style={{ height: `${(data.amount / 25000) * 100}%` }}
                  title={`${data.date}: ¥${data.amount.toFixed(0)}`}
                />
                {index % Math.ceil(trendData.length / 7) === 0 && (
                  <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                    {new Date(data.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
