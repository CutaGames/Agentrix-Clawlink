import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState, useEffect, useCallback } from 'react'

export default function MerchantSettlements() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [settlementStats, setSettlementStats] = useState({
    totalRevenue: '¥0',
    pendingSettlement: '¥0',
    settledAmount: '¥0',
    aiCommission: '¥0',
    netRevenue: '¥0'
  })
  const [isLoading, setIsLoading] = useState(true)

  const loadSettlementData = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('agentrix_token')
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // 调用账本API获取分润信息
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/ledger/revenue-share?merchantId=${encodeURIComponent('')}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token || ''}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setSettlementStats({
          totalRevenue: `¥${data.totalRevenue?.toFixed(2) || '0'}`,
          pendingSettlement: `¥${(data.totalRevenue - data.merchantShare)?.toFixed(2) || '0'}`,
          settledAmount: `¥${data.merchantShare?.toFixed(2) || '0'}`,
          aiCommission: `¥${data.platformCommission?.toFixed(2) || '0'}`,
          netRevenue: `¥${data.merchantShare?.toFixed(2) || '0'}`,
        })
      }
    } catch (error) {
      console.error('加载结算数据失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    loadSettlementData()
  }, [loadSettlementData])

  const settlementHistory = [
    {
      id: 'STL-001',
      period: '2024年1月1日 - 2024年1月15日',
      totalSales: '¥23,456',
      aiCommission: '¥1,234',
      netAmount: '¥22,222',
      status: 'completed',
      settlementDate: '2024-01-16',
      transactionId: '0x742...d35e'
    },
    {
      id: 'STL-002',
      period: '2023年12月16日 - 2023年12月31日',
      totalSales: '¥22,222',
      aiCommission: '¥1,611',
      netAmount: '¥20,611',
      status: 'completed',
      settlementDate: '2024-01-01',
      transactionId: '0x8a3...f2b1'
    },
    {
      id: 'STL-003',
      period: '2023年12月1日 - 2023年12月15日',
      totalSales: '¥18,945',
      aiCommission: '¥1,245',
      netAmount: '¥17,700',
      status: 'completed',
      settlementDate: '2023-12-16',
      transactionId: '0x5b2...c89d'
    }
  ]

  const pendingSettlements = [
    {
      id: 'PEND-001',
      period: '2024年1月16日 - 2024年1月31日',
      estimatedSales: '¥22,222',
      estimatedCommission: '¥1,156',
      estimatedNet: '¥21,066',
      settlementDate: '2024-02-01'
    }
  ]

  return (
    <>
      <Head>
        <title>结算中心 - Agentrix</title>
      </Head>
      <DashboardLayout userType="merchant">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">结算中心</h1>
              <p className="text-gray-600">查看您的销售结算和收益明细</p>
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
        {/* Settlement Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {[
            { label: '总销售额', value: settlementStats.totalRevenue, icon: '💰', color: 'green' },
            { label: '待结算', value: settlementStats.pendingSettlement, icon: '⏳', color: 'yellow' },
            { label: '已结算', value: settlementStats.settledAmount, icon: '✅', color: 'blue' },
            { label: 'AI佣金', value: settlementStats.aiCommission, icon: '🤖', color: 'purple' },
            { label: '净收入', value: settlementStats.netRevenue, icon: '💵', color: 'green' }
          ].map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`text-2xl ${
                  stat.color === 'green' ? 'text-green-600' :
                  stat.color === 'yellow' ? 'text-yellow-600' :
                  stat.color === 'blue' ? 'text-blue-600' :
                  'text-purple-600'
                }`}>
                  {stat.icon}
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Pending Settlements */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">待结算周期</h2>
            </div>
            <div className="p-6">
              {pendingSettlements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">✅</div>
                  <p>暂无待结算款项</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingSettlements.map((settlement) => (
                    <div key={settlement.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900">{settlement.period}</h3>
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                          待结算
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">预估销售额</p>
                          <p className="font-semibold text-gray-900">{settlement.estimatedSales}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">预估佣金</p>
                          <p className="font-semibold text-purple-600">{settlement.estimatedCommission}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">预估净收入</p>
                          <p className="font-semibold text-green-600">{settlement.estimatedNet}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">结算日期</p>
                          <p className="font-semibold text-gray-900">{settlement.settlementDate}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Settlement History */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">结算历史</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {settlementHistory.map((settlement) => (
                  <div key={settlement.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900">{settlement.period}</h3>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        已结算
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-600">总销售额</p>
                        <p className="font-semibold text-gray-900">{settlement.totalSales}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">AI佣金</p>
                        <p className="font-semibold text-purple-600">{settlement.aiCommission}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">净收入</p>
                        <p className="font-semibold text-green-600">{settlement.netAmount}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">结算日期</p>
                        <p className="font-semibold text-gray-900">{settlement.settlementDate}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>交易ID: {settlement.transactionId}</span>
                      <button className="text-blue-600 hover:text-blue-700">
                        查看详情
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Settlement Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">结算说明</h3>
          <ul className="text-blue-700 space-y-2 text-sm">
            <li>• 结算周期: 每半个月结算一次（1-15日，16-月末）</li>
            <li>• 结算时间: 结算周期结束后T+1工作日自动结算</li>
            <li>• 结算方式: 自动转账至您绑定的收款钱包</li>
            <li>• 佣金计算: 总销售额 × 分润比例 - 平台服务费</li>
            <li>• 如有问题，请联系客服: support@agentrix.com</li>
          </ul>
        </div>
      </DashboardLayout>
    </>
  )
}

