import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { statisticsApi } from '../../../lib/api/statistics.api'

interface RevenueStats {
  total: number
  commission: number
  recommendations: number
  period: string
  trend: Array<{ date: string; amount: number }>
}

export default function AgentRevenue() {
  const [stats, setStats] = useState<RevenueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      // 计算日期范围
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      // 调用真实API
      const [revenueData, trendData] = await Promise.all([
        statisticsApi.getDeveloperRevenue({ startDate, endDate }),
        statisticsApi.getRevenueTrend({ startDate, endDate, granularity: 'day' }),
      ])
      
      setStats({
        total: revenueData.totalRevenue || 0,
        commission: revenueData.commission || 0,
        recommendations: 0,
        period,
        trend: trendData.map((t: any) => ({
          date: t.date || t.label,
          amount: t.value || 0,
        })),
      })
    } catch (error) {
      console.error('加载收入统计失败:', error)
      // Fallback to empty state
      setStats({
        total: 0,
        commission: 0,
        recommendations: 0,
        period,
        trend: [],
      })
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return (
    <DashboardLayout userType="agent">
      <Head>
        <title>收入统计 - Agent中心</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">收入统计</h1>
            <p className="text-gray-600 mt-1">查看您的收入数据和趋势</p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
            <option value="90d">最近90天</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : stats && (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">总收入</div>
                <div className="text-2xl font-bold text-gray-900">¥{stats.total.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">佣金收入</div>
                <div className="text-2xl font-bold text-gray-900">¥{stats.commission.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">推荐商品数</div>
                <div className="text-2xl font-bold text-gray-900">{stats.recommendations}</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">收入趋势</h2>
              <div className="h-64 flex items-end justify-between space-x-1">
                {stats.trend.map((data, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-600 rounded-t transition-all hover:bg-blue-700"
                      style={{ height: `${(data.amount / 600) * 100}%` }}
                      title={`${data.date}: ¥${data.amount.toFixed(0)}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
