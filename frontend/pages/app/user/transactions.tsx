import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { orderApi, Order } from '../../../lib/api/order.api'
import { paymentApi, PaymentInfo } from '../../../lib/api/payment.api'

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
  // 支付记录的状态可能是 'completed', 'paid', 'settled' 等
  // 订单的状态可能是 'paid', 'completed', 'settled', 'shipped', 'delivered' 等
  if (['paid', 'completed', 'settled', 'shipped', 'delivered', 'success'].includes(value)) {
    return 'completed'
  }
  if (['refunded', 'cancelled', 'frozen', 'disputed', 'failed', 'rejected'].includes(value)) {
    return 'failed'
  }
  // 'processing', 'pending', 'pending_confirmation' 等都视为处理中
  if (['processing', 'pending', 'pending_confirmation', 'pending_verification'].includes(value)) {
    return 'pending'
  }

  // 默认返回 pending（处理中）
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

// 合并订单和支付记录的统一类型
interface TransactionItem {
  id: string
  type: 'order' | 'payment'
  amount: number
  currency: string
  status: string
  createdAt: string
  description?: string
  transactionHash?: string
  paymentId?: string
  metadata?: any
}

export default function UserTransactions() {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<PaymentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 同时加载订单和支付记录
      const [ordersData, paymentsData] = await Promise.all([
        orderApi.getOrders().catch((): Order[] => []),
        paymentApi.getUserPayments({ limit: 50 }).catch(() => ({ data: [] as PaymentInfo[], total: 0, limit: 50, offset: 0 })),
      ])
      
      setOrders(ordersData)
      setPayments(paymentsData.data || [])
      
      // 调试日志
      console.log('📊 加载的交易记录:', {
        ordersCount: ordersData.length,
        paymentsCount: paymentsData.data?.length || 0,
        orders: ordersData.map(o => ({ 
          id: o.id, 
          status: o.status, 
          amount: o.amount,
          currency: o.currency,
          paymentId: o.metadata?.paymentId,
        })),
        payments: paymentsData.data?.map(p => ({ 
          id: p.id, 
          status: p.status, 
          amount: p.amount,
          currency: p.currency,
          paymentMethod: p.paymentMethod,
          transactionHash: p.transactionHash,
          createdAt: p.createdAt,
          description: p.description,
        })) || [],
      })
    } catch (err: any) {
      setError(err.message || '获取交易记录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  // 合并订单和支付记录
  const transactions = useMemo<TransactionItem[]>(() => {
    const items: TransactionItem[] = []
    
    // 添加订单
    orders.forEach(order => {
      items.push({
        id: order.id,
        type: 'order',
        amount: typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount,
        currency: order.currency || 'CNY',
        status: order.status || 'pending',
        createdAt: order.createdAt,
        description: order.metadata?.productName || order.metadata?.description,
        transactionHash: order.transactionHash || order.metadata?.txHash,
        paymentId: order.metadata?.paymentId,
        metadata: order.metadata,
      })
    })
    
    // 添加支付记录
    // 策略：显示所有支付记录，即使有关联订单
    // 因为支付状态和订单状态可能不同步（支付已完成但订单还在处理中）
    payments.forEach(payment => {
      // 检查是否有关联的订单
      const relatedOrder = orders.find(o => o.metadata?.paymentId === payment.id)
      
      // 调试日志 - 详细记录每个支付记录
      console.log(`💳 处理支付记录: ${payment.id.slice(0, 8)}`, {
        status: payment.status,
        normalizedStatus: normalizeStatus(payment.status),
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        transactionHash: payment.transactionHash,
        hasRelatedOrder: !!relatedOrder,
        relatedOrderId: relatedOrder?.id.slice(0, 8),
        description: payment.description,
      })
      
      if (relatedOrder) {
        console.log(`🔗 支付记录 ${payment.id.slice(0, 8)} 关联订单 ${relatedOrder.id.slice(0, 8)}: 支付状态=${payment.status}, 订单状态=${relatedOrder.status}`)
      }
      
      // 如果支付记录已完成，无论订单状态如何，都显示支付记录
      // 这样可以确保用户能看到支付成功的记录
      if (normalizeStatus(payment.status) === 'completed') {
        console.log(`✅ 添加已完成的支付记录: ${payment.id.slice(0, 8)}, status=${payment.status}, amount=${payment.amount} ${payment.currency}`)
      } else {
        console.log(`⚠️ 支付记录状态不是已完成: ${payment.id.slice(0, 8)}, status=${payment.status}, normalized=${normalizeStatus(payment.status)}`)
      }
      
      items.push({
        id: payment.id,
        type: 'payment',
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
        description: payment.description || `支付 - ${payment.paymentMethod}`,
        transactionHash: payment.transactionHash,
        metadata: payment.metadata,
      })
    })
    
    // 按创建时间排序
    const sorted = items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    // 调试日志 - 详细记录合并结果
    console.log('📋 合并后的交易记录:', {
      total: sorted.length,
      byStatus: {
        completed: sorted.filter(t => normalizeStatus(t.status) === 'completed').length,
        pending: sorted.filter(t => normalizeStatus(t.status) === 'pending').length,
        failed: sorted.filter(t => normalizeStatus(t.status) === 'failed').length,
      },
      byType: {
        orders: sorted.filter(t => t.type === 'order').length,
        payments: sorted.filter(t => t.type === 'payment').length,
      },
      items: sorted.map(t => ({
        id: t.id.slice(0, 8),
        type: t.type,
        status: t.status,
        normalizedStatus: normalizeStatus(t.status),
        amount: t.amount,
        currency: t.currency,
        transactionHash: t.transactionHash ? `${t.transactionHash.slice(0, 10)}...` : null,
      })),
    })
    
    // 特别检查 USDT 支付记录
    const usdtPayments = sorted.filter(t => t.type === 'payment' && t.currency === 'USDT')
    if (usdtPayments.length > 0) {
      console.log('💰 USDT 支付记录详情:', usdtPayments.map(p => ({
        id: p.id.slice(0, 8),
        status: p.status,
        normalizedStatus: normalizeStatus(p.status),
        amount: p.amount,
        transactionHash: p.transactionHash,
      })))
    }
    
    return sorted
  }, [orders, payments])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const filteredTransactions = useMemo(() => {
    if (filter === 'all') {
      return transactions
    }
    return transactions.filter((item) => normalizeStatus(item.status) === filter)
  }, [transactions, filter])

  return (
    <>
      <Head>
        <title>交易记录 - Agentrix</title>
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
              onClick={loadTransactions}
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

            {loading && transactions.length === 0 ? (
              <div className="text-center py-10 text-gray-500">正在加载交易记录…</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                暂无符合条件的记录，您可以尝试其他筛选条件或稍后刷新。
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((item) => {
                  const normalized = normalizeStatus(item.status)
                  const icon = item.type === 'order' 
                    ? (assetIconMap[(item.metadata?.assetType as string) || ''] || '🧾')
                    : '💳'
                  const title = item.type === 'order'
                    ? (item.metadata?.productName || item.metadata?.description || `订单 ${item.id.slice(0, 6)}`)
                    : (item.description || `支付 ${item.id.slice(0, 6)}`)
                  
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="text-2xl">{icon}</div>
                        <div>
                          <p className="font-medium text-gray-900">{title}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                            {item.type === 'payment' && <p>支付方式：{item.metadata?.paymentMethod || '未知'}</p>}
                            {item.paymentId && <p>支付ID：{item.paymentId}</p>}
                            {item.transactionHash && <p>Tx：{item.transactionHash.slice(0, 10)}...{item.transactionHash.slice(-8)}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="text-left md:text-right">
                        <p
                          className={`font-semibold ${
                            normalized === 'failed' ? 'text-red-600' : 'text-gray-900'
                          }`}
                        >
                          {formatOrderAmount({ amount: item.amount, currency: item.currency } as Order)}
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
