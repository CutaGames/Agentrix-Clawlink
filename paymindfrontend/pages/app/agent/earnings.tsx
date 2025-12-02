import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState, useEffect } from 'react'

export default function AgentEarnings() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [earningsData, setEarningsData] = useState({
    totalEarnings: '¥0',
    pendingEarnings: '¥0',
    totalTransactions: 0,
    successRate: '0%'
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadEarningsData()
  }, [timeRange])

  const loadEarningsData = async () => {
    setIsLoading(true)
    try {
      const { commissionApi } = await import('../../../lib/api/commission.api')
      const commissions = await commissionApi.getCommissions()
      
      // 计算统计数据
      const totalEarnings = commissions
        .filter((c: any) => c.status === 'settled')
        .reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0)
      
      const pendingEarnings = commissions
        .filter((c: any) => c.status === 'pending')
        .reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0)

      setEarningsData({
        totalEarnings: `¥${totalEarnings.toFixed(2)}`,
        pendingEarnings: `¥${pendingEarnings.toFixed(2)}`,
        totalTransactions: commissions.length,
        successRate: '94.2%' // 需要从实际数据计算
      })
    } catch (error) {
      console.error('加载收益数据失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const dailyEarnings = [
    { date: '1月15日', earnings: '¥856.00', transactions: 8 },
    { date: '1月14日', earnings: '¥642.50', transactions: 6 },
    { date: '1月13日', earnings: '¥523.80', transactions: 5 },
    { date: '1月12日', earnings: '¥435.20', transactions: 4 },
    { date: '1月11日', earnings: '¥387.10', transactions: 4 }
  ]

  const topProducts = [
    { name: '联想 Yoga 笔记本电脑', earnings: '¥1,234.00', conversions: 12, commissionRate: '5%' },
    { name: '无线蓝牙耳机', earnings: '¥856.50', conversions: 23, commissionRate: '8%' },
    { name: '智能手表', earnings: '¥642.30', conversions: 8, commissionRate: '6%' },
    { name: '机械键盘', earnings: '¥435.80', conversions: 7, commissionRate: '7%' }
  ]

  return (
    <>
      <Head>
        <title>收益面板 - PayMind</title>
      </Head>
      <DashboardLayout userType="agent">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">收益面板</h1>
              <p className="text-gray-600">查看您的分润收益和交易数据</p>
            </div>
            <div className="flex space-x-2">
              {[
                { id: '7d', name: '7天' },
                { id: '30d', name: '30天' },
                { id: '90d', name: '90天' }
              ].map((range) => (
                <button
                  key={range.id}
                  onClick={() => setTimeRange(range.id as any)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    timeRange === range.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: '总收益', value: earningsData.totalEarnings, change: '+15.3%', icon: '💰' },
            { label: '待结算', value: earningsData.pendingEarnings, change: 'T+1结算', icon: '⏳' },
            { label: '交易数量', value: earningsData.totalTransactions.toString(), change: '+22.1%', icon: '📊' },
            { label: '成功率', value: earningsData.successRate, change: '+2.4%', icon: '🎯' }
          ].map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl">{stat.icon}</div>
                <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                  {stat.change}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Daily Earnings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">每日收益</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {dailyEarnings.map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <span className="text-gray-600 w-20">{day.date}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${(parseInt(day.earnings.replace('¥', '').replace(',', '')) / 1000) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right w-32">
                      <p className="font-semibold text-gray-900">{day.earnings}</p>
                      <p className="text-sm text-gray-500">{day.transactions} 笔交易</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">热门商品</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">佣金率: {product.commissionRate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{product.earnings}</p>
                      <p className="text-sm text-gray-500">{product.conversions} 次转化</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Withdrawal Section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">结算提现</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">可提现金额</p>
                <p className="text-2xl font-semibold text-gray-900">{earningsData.totalEarnings}</p>
                <p className="text-sm text-gray-500 mt-1">结算周期: T+1自动结算</p>
              </div>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                立即提现
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}

