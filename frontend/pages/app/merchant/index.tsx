import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/router'
import { MerchantAutomationPanel } from '../../../components/merchant/MerchantAutomationPanel'
import { orderApi, Order } from '../../../lib/api/order.api'
import { useUser } from '../../../contexts/UserContext'
import { useLocalization } from '../../../contexts/LocalizationContext'

export default function MerchantDashboard() {
  const { user } = useUser()
  const { t } = useLocalization()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'profile' | 'kyc' | 'automation'>('overview')
  const [stats, setStats] = useState({
    totalSales: 0,
    aiChannelSales: 0,
    totalOrders: 0,
    aiAgents: 0,
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      // 使用新的API方法，后端会自动过滤当前商户的订单
      const orders = await orderApi.getMyMerchantOrders()
      
      // 计算统计数据
      const totalSales = orders.reduce((sum, o) => {
        const amount = typeof o.amount === 'number' ? o.amount : parseFloat(String(o.amount)) || 0
        return sum + amount
      }, 0)
      
      const aiOrders = orders.filter(o => o.metadata?.agentId || o.metadata?.channel?.includes('AI'))
      const aiChannelSales = aiOrders.reduce((sum, o) => {
        const amount = typeof o.amount === 'number' ? o.amount : parseFloat(String(o.amount)) || 0
        return sum + amount
      }, 0)
      
      // 获取最近的订单
      const sortedOrders = [...orders].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setRecentOrders(sortedOrders.slice(0, 5))
      
      // 统计AI Agent数量（从订单metadata中提取）
      const agentIds = new Set<string>()
      orders.forEach(o => {
        if (o.metadata?.agentId) {
          agentIds.add(o.metadata.agentId)
        }
      })
      
      setStats({
        totalSales,
        aiChannelSales,
        totalOrders: orders.length,
        aiAgents: agentIds.size,
      })
    } catch (error: any) {
      console.error('加载仪表板数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // 加载统计数据
  useEffect(() => {
    if (activeTab === 'overview') {
      loadDashboardData()
    }
  }, [activeTab, loadDashboardData])

  const displayStats = useMemo(() => [
    { name: t('merchantDashboard.stats.totalSales'), value: `¥${stats.totalSales.toLocaleString()}`, change: '' },
    { name: t('merchantDashboard.stats.aiChannelSales'), value: `¥${stats.aiChannelSales.toLocaleString()}`, change: '' },
    { name: t('merchantDashboard.stats.totalOrders'), value: stats.totalOrders.toString(), change: '' },
    { name: t('merchantDashboard.stats.aiAgents'), value: stats.aiAgents.toString(), change: '' }
  ], [stats, t])

  // 简化的销售数据（基于最近订单）
  const salesData = useMemo(() => {
    return recentOrders.slice(0, 4).map((order, index) => {
      const amount = typeof order.amount === 'number' ? order.amount : parseFloat(String(order.amount)) || 0
      const isAI = order.metadata?.agentId || order.metadata?.channel?.includes('AI')
      return {
        date: new Date(order.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
        direct: isAI ? 0 : amount,
        ai: isAI ? amount : 0,
      }
    })
  }, [recentOrders])

  // 简化的AI Agent排行（基于订单数据）
  const topAIAgents = useMemo(() => {
    const agentSales: Record<string, { sales: number; commission: number; conversions: number }> = {}
    recentOrders.forEach(order => {
      const agentId = order.metadata?.agentId
      if (agentId) {
        const amount = typeof order.amount === 'number' ? order.amount : parseFloat(String(order.amount)) || 0
        if (!agentSales[agentId]) {
          agentSales[agentId] = { sales: 0, commission: 0, conversions: 0 }
        }
        agentSales[agentId].sales += amount
        agentSales[agentId].conversions += 1
        // 假设佣金率为5%
        agentSales[agentId].commission += amount * 0.05
      }
    })
    return Object.entries(agentSales)
      .map(([id, data]) => ({
        name: `Agent ${id.substring(0, 8)}`,
        sales: `¥${data.sales.toLocaleString()}`,
        commission: `¥${data.commission.toLocaleString()}`,
        conversions: data.conversions.toString(),
      }))
      .sort((a, b) => parseFloat(b.sales.replace(/[¥,]/g, '')) - parseFloat(a.sales.replace(/[¥,]/g, '')))
      .slice(0, 3)
  }, [recentOrders])

  return (
    <>
      <Head>
        <title>{t('merchantDashboard.pageTitle')} - Agentrix</title>
      </Head>
      <DashboardLayout userType="merchant">
        {/* Header with Tabs */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{t('merchantDashboard.pageTitle')}</h1>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              {t('merchantDashboard.addProduct')}
            </button>
          </div>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: t('merchantDashboard.tabs.overview'), path: '/app/merchant' },
                { id: 'products', name: t('merchantDashboard.tabs.products'), path: '/app/merchant/products' },
                { id: 'orders', name: t('merchantDashboard.tabs.orders'), path: '/app/merchant/orders' },
                { id: 'withdrawals', name: t('merchantDashboard.tabs.withdrawals'), path: '/app/merchant/withdrawals' },
                { id: 'profile', name: t('merchantDashboard.tabs.profile'), path: '/app/merchant/profile' },
                { id: 'kyc', name: t('merchantDashboard.tabs.kyc'), path: '/app/merchant/kyc' },
                { id: 'automation', name: t('merchantDashboard.tabs.automation'), path: '/app/merchant/automation' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.path) {
                      router.push(tab.path)
                    } else {
                      setActiveTab(tab.id as any)
                    }
                  }}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id || router.pathname === tab.path
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">{t('common.loading')}</p>
              </div>
            ) : (
              <>
                {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {displayStats.map((stat, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">{stat.value}</p>
                    </div>
                    {stat.change && (
                    <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                      {stat.change}
                    </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Sales Chart */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">{t('merchantDashboard.charts.salesTrend')}</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {salesData.map((data, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{data.date}</span>
                          <span className="text-gray-900">¥{(data.direct + data.ai).toLocaleString()}</span>
                        </div>
                        <div className="flex space-x-2">
                          <div 
                            className="h-2 bg-blue-500 rounded" 
                            style={{ width: `${(data.direct / (data.direct + data.ai)) * 100}%` }}
                            title={`直接销售: ¥${data.direct}`}
                          ></div>
                          <div 
                            className="h-2 bg-green-500 rounded" 
                            style={{ width: `${(data.ai / (data.direct + data.ai)) * 100}%` }}
                            title={`AI渠道: ¥${data.ai}`}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>直接: ¥{data.direct.toLocaleString()}</span>
                          <span>AI渠道: ¥{data.ai.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Top AI Agents */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">{t('merchantDashboard.charts.topAIAgents')}</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {topAIAgents.map((agent, index) => (
                      <div key={index} className="flex justify-between items-center py-2">
                        <div>
                          <p className="font-medium text-gray-900">{agent.name}</p>
                          <p className="text-sm text-gray-500">{agent.conversions} {t('merchantDashboard.agentConversions')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{agent.sales}</p>
                          <p className="text-sm text-green-600">{t('merchantDashboard.commission')}: {agent.commission}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-4 text-center text-blue-600 hover:text-blue-700 font-medium">
                    {t('merchantDashboard.viewAllAgents')}
                  </button>
                </div>
              </div>
            </div>
            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">{t('merchantDashboard.recentOrders')}</h2>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-sm font-medium text-gray-600">{t('merchantDashboard.table.orderId')}</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-600">{t('merchantDashboard.table.product')}</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-600">{t('merchantDashboard.table.amount')}</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-600">{t('merchantDashboard.table.channel')}</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-600">{t('merchantDashboard.table.date')}</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-600">{t('merchantDashboard.table.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => {
                        const orderAmount = typeof order.amount === 'number' 
                          ? order.amount 
                          : parseFloat(String(order.amount)) || 0
                        const amountDisplay = order.currency === 'CNY' 
                          ? `¥${orderAmount.toLocaleString()}` 
                          : order.currency === 'USD' 
                            ? `$${orderAmount.toLocaleString()}`
                            : `${orderAmount.toLocaleString()} ${order.currency}`
                        const orderDate = new Date(order.createdAt).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                        const productName = order.metadata?.items?.[0]?.productName || 
                                           order.metadata?.description || 
                                           '未知商品'
                        const channel = order.metadata?.channel || 
                                      (order.metadata?.agentId ? 'AI Agent' : '直接购买')
                        const statusText = order.status === 'completed' ? t('merchantDashboard.status.completed') :
                                          order.status === 'shipped' ? t('merchantDashboard.status.shipped') :
                                          order.status === 'pending' ? t('merchantDashboard.status.pending') :
                                          order.status === 'cancelled' ? t('merchantDashboard.status.cancelled') :
                                          order.status
                        const statusColor = order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                           order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                           order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                           order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                           'bg-gray-100 text-gray-800'
                        
                        return (
                          <tr key={order.id} className="border-b border-gray-100 last:border-0">
                            <td className="py-3 text-sm font-medium text-gray-900">{order.id}</td>
                            <td className="py-3 text-sm text-gray-600">{productName}</td>
                            <td className="py-3 text-sm text-gray-900">{amountDisplay}</td>
                            <td className="py-3 text-sm text-gray-600">{channel}</td>
                            <td className="py-3 text-sm text-gray-600">{orderDate}</td>
                            <td className="py-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                {statusText}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <button 
                  onClick={() => setActiveTab('orders')}
                  className="w-full mt-4 text-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  {t('merchantDashboard.viewAllOrders')}
                </button>
              </div>
            </div>
              </>
            )}
          </>
        )}

        {activeTab === 'products' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">{t('merchantDashboard.tabs.products')}</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                {t('merchantDashboard.addProduct')}
              </button>
            </div>
            <div className="p-6">
              <div className="text-center py-8 text-gray-500">
                {t('merchantDashboard.productsComingSoon')}
                <div className="mt-4">
                  <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                    {t('merchantDashboard.viewProductDocs')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{t('merchantDashboard.tabs.orders')}</h2>
            </div>
            <div className="p-6">
              <div className="text-center py-8 text-gray-500">
                {t('merchantDashboard.ordersComingSoon')}
                <div className="mt-4">
                  <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                    {t('merchantDashboard.viewOrderDocs')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'automation' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{t('merchantDashboard.tabs.automation')}</h2>
            </div>
            <div className="p-6">
              <MerchantAutomationPanel />
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}
