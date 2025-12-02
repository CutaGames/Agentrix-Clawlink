import Head from 'next/head'
import { useEffect, useState } from 'react'

interface PaymentStats {
  totalPayments: number
  totalAmount: number
  totalSaved: {
    gas: number
    fees: number
    time: number // 秒
  }
  byMethod: {
    method: string
    count: number
    amount: number
  }[]
  recentActivity: {
    date: string
    count: number
    amount: number
  }[]
}

export default function PaymentStats() {
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      // 这里应该调用真实API
      // const { paymentApi } = await import('../../../lib/api/payment.api')
      // const data = await paymentApi.getPaymentStats()
      
      // 模拟数据
      const mockStats: PaymentStats = {
        totalPayments: 42,
        totalAmount: 12580.50,
        totalSaved: {
          gas: 125.80,
          fees: 89.50,
          time: 3600, // 1小时
        },
        byMethod: [
          { method: 'x402', count: 15, amount: 1250.00 },
          { method: 'cross-border', count: 8, amount: 3200.00 },
          { method: 'wallet', count: 12, amount: 5600.00 },
          { method: 'stripe', count: 7, amount: 2530.50 },
        ],
        recentActivity: [
          { date: '今天', count: 3, amount: 299.00 },
          { date: '昨天', count: 5, amount: 1250.00 },
          { date: '本周', count: 12, amount: 3200.00 },
          { date: '本月', count: 22, amount: 7831.50 },
        ],
      }
      
      setStats(mockStats)
    } catch (error) {
      console.error('加载统计失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    }
    return `${minutes}分钟`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <>
      <Head>
        <title>支付统计 - PayMind</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">支付统计</h1>
            <p className="text-gray-600">查看您的支付数据和节省的成本</p>
          </div>

          {/* 总览卡片 */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-2xl font-bold text-gray-900">¥{stats.totalAmount.toFixed(2)}</div>
              <div className="text-sm text-gray-600 mt-1">总支付金额</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalPayments}</div>
              <div className="text-sm text-gray-600 mt-1">总支付次数</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-3xl mb-2">⚡</div>
              <div className="text-2xl font-bold text-green-600">¥{stats.totalSaved.gas.toFixed(2)}</div>
              <div className="text-sm text-gray-600 mt-1">节省Gas费</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-3xl mb-2">⏱️</div>
              <div className="text-2xl font-bold text-blue-600">{formatTime(stats.totalSaved.time)}</div>
              <div className="text-sm text-gray-600 mt-1">节省时间</div>
            </div>
          </div>

          {/* 按支付方式统计 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">按支付方式统计</h2>
            <div className="space-y-4">
              {stats.byMethod.map((item) => {
                const methodIcons: Record<string, string> = {
                  x402: '⚡',
                  'cross-border': '🌍',
                  wallet: '👛',
                  stripe: '💳',
                }
                const methodNames: Record<string, string> = {
                  x402: 'X402协议',
                  'cross-border': '跨境支付',
                  wallet: '钱包支付',
                  stripe: 'Stripe',
                }
                
                return (
                  <div key={item.method} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{methodIcons[item.method] || '💳'}</span>
                      <div>
                        <div className="font-semibold text-gray-900">{methodNames[item.method] || item.method}</div>
                        <div className="text-sm text-gray-600">{item.count} 笔交易</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">¥{item.amount.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">
                        {((item.amount / stats.totalAmount) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 最近活动 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">最近活动</h2>
            <div className="space-y-3">
              {stats.recentActivity.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-semibold text-gray-900">{item.date}</div>
                    <div className="text-sm text-gray-600">{item.count} 笔交易</div>
                  </div>
                  <div className="text-lg font-bold text-gray-900">¥{item.amount.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

