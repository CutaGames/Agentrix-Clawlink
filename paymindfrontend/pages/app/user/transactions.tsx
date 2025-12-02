import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { orderApi, Order } from '../../../lib/api/order.api'

type FilterStatus = 'all' | 'completed' | 'pending' | 'failed'
type NormalizedStatus = Exclude<FilterStatus, 'all'>

const statusLabel: Record<NormalizedStatus, string> = {
  completed: '已完成',
  pending: '处理中',
  failed: '失败',
}

const statusBadgeClass: Record<NormalizedStatus, string> = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
}

const assetIconMap: Record<string, string> = {
  physical: '📦',
  service: '🛠️',
  virtual: '💾',
  nft_rwa: '🖼️',
  dev_tool: '🧰',
  aggregated_web2: '🌐',
  aggregated_web3: '🔗',
}

const normalizeStatus = (status?: string): NormalizedStatus => {
  const value = (status || '').toLowerCase()
  if (['paid', 'completed', 'settled', 'shipped', 'delivered'].includes(value)) {
    return 'completed'
  }
  if (['refunded', 'cancelled', 'frozen', 'disputed'].includes(value)) {
    return 'failed'
  }

  return 'pending'
}

const currencySymbol = (currency?: string) => {
  switch ((currency || '').toUpperCase()) {
    case 'USD':
      return '$'
    case 'CNY':
      return '¥'
    case 'EUR':
      return '€'
    case 'GBP':
      return '£'
    case 'JPY':
      return '¥'
    default:
      return ''
  }
}

const getOrderTitle = (order: Order) => {
  return (
    order.metadata?.productName ||
    order.metadata?.description ||
    (order.metadata?.assetType ? `资产类型：${order.metadata.assetType}` : undefined) ||
    (order.productId ? `订单 ${order.productId}` : `订单 ${order.id.slice(0, 6)}`)
  )
}

const formatOrderAmount = (order: Order) => {
  const currency = (order.currency || 'CNY').toUpperCase()
  const value = typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount
  const safeValue = Number.isFinite(value) ? value : 0
  const decimals = currency === 'JPY' ? 0 : 2
  return `${currencySymbol(currency)}${safeValue.toFixed(decimals)} ${currency}`
}

export default function UserTransactions() {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await orderApi.getOrders()
      setOrders(data)
    } catch (err: any) {
      setError(err.message || '获取交易记录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const filteredOrders = useMemo(() => {
    if (filter === 'all') {
      return orders
    }
    return orders.filter((order) => normalizeStatus(order.status) === filter)
  }, [orders, filter])

  return (
    <>
      <Head>
        <title>交易记录 - PayMind</title>
      </Head>
      <DashboardLayout userType="user">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">交易记录</h1>
          <p className="text-gray-600">
            查看已创建订单与支付记录，实时了解状态与金额
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', name: '全部' },
              { id: 'completed', name: '已完成' },
              { id: 'pending', name: '处理中' },
              { id: 'failed', name: '失败/已取消' },
            ].map((filterOption) => (
              <button
                key={filterOption.id}
                onClick={() => setFilter(filterOption.id as FilterStatus)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filter === filterOption.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption.name}
              </button>
            ))}
            <button
              onClick={loadOrders}
              disabled={loading}
              className="ml-auto px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '同步中…' : '刷新数据'}
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                {error}
              </div>
            )}

            {loading && orders.length === 0 ? (
              <div className="text-center py-10 text-gray-500">正在加载交易记录…</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                暂无符合条件的记录，您可以尝试其他筛选条件或稍后刷新。
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const normalized = normalizeStatus(order.status)
                  const icon =
                    assetIconMap[(order.metadata?.assetType as string) || ''] || '🧾'
                  return (
                    <div
                      key={order.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="text-2xl">{icon}</div>
                      <div>
                          <p className="font-medium text-gray-900">{getOrderTitle(order)}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleString()}
                          </p>
                          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                            {order.metadata?.paymentId && <p>支付ID：{order.metadata.paymentId}</p>}
                            {order.transactionHash && <p>Tx：{order.transactionHash}</p>}
                            {order.metadata?.txHash && <p>Tx：{order.metadata.txHash}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="text-left md:text-right">
                        <p
                          className={`font-semibold ${
                            normalized === 'failed' ? 'text-red-600' : 'text-gray-900'
                          }`}
                        >
                          {formatOrderAmount(order)}
                      </p>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass[normalized]}`}
                        >
                          {statusLabel[normalized]}
                      </span>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Export Button */}
        <div className="mt-6 flex justify-end">
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
            导出交易记录
          </button>
        </div>
      </DashboardLayout>
    </>
  )
}
