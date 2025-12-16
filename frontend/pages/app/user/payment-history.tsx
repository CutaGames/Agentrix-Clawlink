import Head from 'next/head'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { useLocalization } from '../../../contexts/LocalizationContext'

interface PaymentRecord {
  id: string
  amount: number
  currency: string
  paymentMethod: string
  status: string
  description: string
  merchantId?: string
  transactionHash?: string
  createdAt: string
}

export default function PaymentHistory() {
  const router = useRouter()
  const { t } = useLocalization()
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    status: 'all',
    method: 'all',
    search: '',
  })

  const loadPayments = useCallback(async () => {
    setLoading(true)
    try {
      // 这里应该调用真实API
      // const { paymentApi } = await import('../../../lib/api/payment.api')
      // const data = await paymentApi.getPaymentHistory(filter)
      
      // 模拟数据
      const mockPayments: PaymentRecord[] = [
        {
          id: 'pay_001',
          amount: 99.00,
          currency: 'CNY',
          paymentMethod: 'x402',
          status: 'completed',
          description: 'X402协议支付演示',
          transactionHash: '0x1234...5678',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'pay_002',
          amount: 299.00,
          currency: 'USD',
          paymentMethod: 'cross-border',
          status: 'completed',
          description: '跨境支付 - Premium Digital Service',
          merchantId: 'merchant_001',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ]
      
      // 应用筛选
      let filtered = mockPayments
      if (filter.status !== 'all') {
        filtered = filtered.filter(p => p.status === filter.status)
      }
      if (filter.method !== 'all') {
        filtered = filtered.filter(p => p.paymentMethod === filter.method)
      }
      if (filter.search) {
        filtered = filtered.filter(p => 
          p.description.toLowerCase().includes(filter.search.toLowerCase()) ||
          p.id.toLowerCase().includes(filter.search.toLowerCase())
        )
      }
      
      setPayments(filtered)
    } catch (error) {
      console.error('加载支付历史失败:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'text-green-600 bg-green-50',
      processing: 'text-blue-600 bg-blue-50',
      pending: 'text-yellow-600 bg-yellow-50',
      failed: 'text-red-600 bg-red-50',
      cancelled: 'text-gray-600 bg-gray-50',
    }
    return colors[status] || 'text-gray-600 bg-gray-50'
  }

  const getMethodIcon = (method: string) => {
    const icons: Record<string, string> = {
      stripe: '💳',
      wallet: '👛',
      x402: '⚡',
      'cross-border': '🌍',
      agent: '💼',
      multisig: '👥',
    }
    return icons[method] || '💳'
  }

  return (
    <>
      <Head>
        <title>{t('paymentHistory.pageTitle')}</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('paymentHistory.pageTitle')}</h1>
            <p className="text-gray-600">{t('paymentHistory.pageDescription')}</p>
          </div>

          {/* 筛选器 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('paymentHistory.statusLabel')}</label>
                <select
                  value={filter.status}
                  onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('paymentHistory.allOption')}</option>
                  <option value="completed">{t('paymentHistory.statusCompleted')}</option>
                  <option value="processing">{t('paymentHistory.statusProcessing')}</option>
                  <option value="pending">{t('paymentHistory.statusPending')}</option>
                  <option value="failed">{t('paymentHistory.statusFailed')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('paymentHistory.methodLabel')}</label>
                <select
                  value={filter.method}
                  onChange={(e) => setFilter({ ...filter, method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('paymentHistory.allOption')}</option>
                  <option value="stripe">Stripe</option>
                  <option value="wallet">{t('paymentHistory.methodWallet')}</option>
                  <option value="x402">X402协议</option>
                  <option value="cross-border">{t('paymentHistory.methodCrossBorder')}</option>
                  <option value="agent">{t('paymentHistory.methodAgent')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('paymentHistory.searchLabel')}</label>
                <input
                  type="text"
                  value={filter.search}
                  onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                  placeholder={t('paymentHistory.searchPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 支付列表 */}
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">{t('paymentHistory.loading')}</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-gray-600">{t('paymentHistory.noRecords')}</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('paymentHistory.orderHeader')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('paymentHistory.amountHeader')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('paymentHistory.methodHeader')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('paymentHistory.statusHeader')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('paymentHistory.timeHeader')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('paymentHistory.actionsHeader')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{payment.id}</div>
                            <div className="text-sm text-gray-500">{payment.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {payment.currency === 'CNY' ? '¥' : '$'}{payment.amount.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getMethodIcon(payment.paymentMethod)}</span>
                            <span className="text-sm text-gray-700 capitalize">{payment.paymentMethod}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                            {payment.status === 'completed' ? t('paymentHistory.statusCompleted') :
                             payment.status === 'processing' ? t('paymentHistory.statusProcessing') :
                             payment.status === 'pending' ? t('paymentHistory.statusPending') :
                             payment.status === 'failed' ? t('paymentHistory.statusFailed') : t('paymentHistory.statusCancelled')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(payment.createdAt).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => router.push(`/app/payment/${payment.id}`)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            查看详情
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

