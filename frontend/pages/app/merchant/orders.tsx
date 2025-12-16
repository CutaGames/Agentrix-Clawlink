import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState, useEffect } from 'react'
import { orderApi, Order } from '../../../lib/api/order.api'
import { OrderDetailModal } from '../../../components/merchant/OrderDetailModal'
import { useUser } from '../../../contexts/UserContext'
import { useLocalization } from '../../../contexts/LocalizationContext'

export default function MerchantOrders() {
  const { user } = useUser()
  const { t } = useLocalization()
  const [filter, setFilter] = useState<'all' | 'pending' | 'shipped' | 'completed' | 'cancelled'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalOrders: 0,
    todayOrders: 0,
    totalGMV: 0,
    todayGMV: 0,
  })
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // 加载订单列表
  useEffect(() => {
    loadOrders()
  }, [filter, user?.id])

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 使用新的API方法，后端会自动过滤当前商户的订单
      // 如果用户是商户，后端会自动使用user.id作为merchantId
      // 默认只显示已支付的订单（paid, completed, settled），不显示pending
      const params: any = {}
      if (filter !== 'all') {
        params.status = filter
      }
      
      // 获取所有订单
      const allOrders = await orderApi.getMyMerchantOrders(params)
      
      // 如果没有指定状态过滤，默认只显示已支付的订单（排除pending）
      let data = allOrders
      if (filter === 'all') {
        // 显示所有订单，不需要过滤
        data = allOrders
      }
      
      setOrders(data)
      
      // 计算统计数据
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayOrders = data.filter(o => new Date(o.createdAt) >= todayStart)
      const totalGMV = data.reduce((sum, o) => sum + (typeof o.amount === 'number' ? o.amount : parseFloat(String(o.amount)) || 0), 0)
      const todayGMV = todayOrders.reduce((sum, o) => sum + (typeof o.amount === 'number' ? o.amount : parseFloat(String(o.amount)) || 0), 0)
      
      setStats({
        totalOrders: data.length,
        todayOrders: todayOrders.length,
        totalGMV,
        todayGMV,
      })
    } catch (err: any) {
      console.error('加载订单失败:', err)
      setError(err.message || '加载订单失败，请稍后重试')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || order.status === filter
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.metadata?.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.metadata?.items?.[0]?.productName || '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'shipped': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成'
      case 'shipped': return '已发货'
      case 'pending': return '待处理'
      case 'cancelled': return '已取消'
      default: return status
    }
  }

  const displayStats = [
    { label: t('merchantOrders.stats.totalOrders'), value: stats.totalOrders.toString(), change: '' },
    { label: t('merchantOrders.stats.todayOrders'), value: stats.todayOrders.toString(), change: '' },
    { label: t('merchantOrders.stats.pendingOrders'), value: orders.filter(o => o.status === 'pending').length.toString(), change: '' },
    { label: t('merchantOrders.stats.todaySales'), value: `¥${stats.todayGMV.toLocaleString()}`, change: '' },
  ];

  return (
    <>
      <Head>
        <title>{t('merchantOrders.pageTitle')} - Agentrix</title>
      </Head>
      <DashboardLayout userType="merchant">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('merchantOrders.pageTitle')}</h1>
              <p className="text-gray-600">{t('merchantOrders.pageDescription')}</p>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              {t('merchantOrders.exportOrders')}
            </button>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {displayStats.map((stat, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <div className="flex items-baseline justify-between mt-2">
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                    {stat.change && <span className="text-sm text-green-600">{stat.change}</span>}
                </div>
              </div>
            ))}
          </div>
          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', name: t('merchantOrders.filters.all') },
                  { id: 'pending', name: t('merchantOrders.filters.pending') },
                  { id: 'shipped', name: t('merchantOrders.filters.shipped') },
                  { id: 'completed', name: t('merchantOrders.filters.completed') },
                  { id: 'cancelled', name: t('merchantOrders.filters.cancelled') }
                ].map((filterOption) => (
                  <button
                    key={filterOption.id}
                    onClick={() => setFilter(filterOption.id as any)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      filter === filterOption.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filterOption.name}
                  </button>
                ))}
              </div>
              
              <div className="relative lg:w-64">
                <input
                  type="text"
                  placeholder="搜索订单号、客户、商品..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  🔍
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">订单列表</h2>
          </div>
          <div className="p-6">
            {loading && (
              <div className="text-center py-8 text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2">加载中...</p>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">{error}</p>
                <button
                  onClick={loadOrders}
                  className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  重试
                </button>
              </div>
            )}
            {!loading && !error && filteredOrders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">📦</div>
                <p>{t('merchantOrders.noOrdersFound')}</p>
              </div>
            )}
            {!loading && !error && filteredOrders.length > 0 && (() => {
              // 按品类分组订单
              const ordersByCategory = filteredOrders.reduce((acc, order) => {
                const category = order.metadata?.items?.[0]?.category || 
                                 order.metadata?.category || 
                                 t('merchantOrders.uncategorized');
                if (!acc[category]) {
                  acc[category] = [];
                }
                acc[category].push(order);
                return acc;
              }, {} as Record<string, typeof filteredOrders>);
              
              const categories = Object.keys(ordersByCategory);
              
              return (
                <div className="space-y-6">
                  {categories.map((category) => (
                    <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                        <p className="text-sm text-gray-600">{ordersByCategory[category].length} {t('merchantOrders.orderCount')}</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-sm font-medium text-gray-600">{t('merchantOrders.table.orderId')}</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">{t('merchantOrders.table.customer')}</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">{t('merchantOrders.table.product')}</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">{t('merchantOrders.table.amount')}</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">{t('merchantOrders.table.channel')}</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">{t('merchantOrders.table.date')}</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">{t('merchantOrders.table.status')}</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">{t('merchantOrders.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersByCategory[category].map((order) => {
                      const orderAmount = typeof order.amount === 'number' 
                        ? order.amount 
                        : parseFloat(String(order.amount)) || 0;
                      const amountDisplay = order.currency === 'CNY' 
                        ? `¥${orderAmount.toLocaleString()}` 
                        : order.currency === 'USD' 
                          ? `$${orderAmount.toLocaleString()}`
                          : `${orderAmount.toLocaleString()} ${order.currency}`;
                      const orderDate = new Date(order.createdAt).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const productName = order.metadata?.items?.[0]?.productName || 
                                         order.metadata?.description || 
                                         '未知商品';
                      const customerName = order.metadata?.customerName || 
                                         order.userId || 
                                         '未知客户';
                      const channel = order.metadata?.channel || 
                                    (order.metadata?.agentId ? 'AI Agent' : '直接购买');
                      
                      return (
                      <tr key={order.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="py-4">
                          <p className="font-medium text-gray-900">{order.id}</p>
                        </td>
                          <td className="py-4 text-gray-900">{customerName}</td>
                        <td className="py-4">
                            <p className="text-gray-900">{productName}</p>
                        </td>
                          <td className="py-4 text-gray-900 font-semibold">{amountDisplay}</td>
                        <td className="py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              channel.includes('AI') ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                              {channel}
                          </span>
                        </td>
                          <td className="py-4 text-gray-600 text-sm">{orderDate}</td>
                        <td className="py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex space-x-2">
                              <button 
                                onClick={() => setSelectedOrder(order)}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                              {t('merchantOrders.actions.details')}
                            </button>
                            {order.status === 'pending' && (
                                <button 
                                  onClick={async () => {
                                    try {
                                      await orderApi.updateOrderStatus(order.id, 'shipped');
                                      await loadOrders();
                                    } catch (err: any) {
                                      alert(err.message || t('merchantOrders.errors.shipFailed'));
                                    }
                                  }}
                                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                                >
                                {t('merchantOrders.actions.ship')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
        
        {/* Order Detail Modal */}
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onShip={async (orderId) => {
              try {
                await orderApi.updateOrderStatus(orderId, 'shipped')
                await loadOrders()
                setSelectedOrder(null)
              } catch (err: any) {
                alert(err.message || '发货失败，请稍后重试')
              }
            }}
            onRefund={async (orderId, reason) => {
              try {
                await orderApi.refundOrder(orderId, reason)
                await loadOrders()
                setSelectedOrder(null)
              } catch (err: any) {
                alert(err.message || t('merchantOrders.errors.refundFailed'))
              }
            }}
          />
        )}
        
        {/* Pagination */}
        <div className="mt-6 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {t('merchantOrders.pagination.showing', { start: 1, end: filteredOrders.length, total: orders.length })}
          </p>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">
              {t('merchantOrders.pagination.previous')}
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              1
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">
              2
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">
              {t('merchantOrders.pagination.next')}
            </button>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}

