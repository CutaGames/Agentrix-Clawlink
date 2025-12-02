import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

interface TransactionDetail {
  id: string
  amount: number
  currency: string
  status: string
  paymentMethod: string
  description: string
  merchantId?: string
  merchantName?: string
  transactionHash?: string
  createdAt: string
  completedAt?: string
  metadata?: Record<string, any>
}

export default function UserTransactionDetail() {
  const router = useRouter()
  const { id } = router.query
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadTransaction(id as string)
    }
  }, [id])

  const loadTransaction = async (transactionId: string) => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      setTransaction({
        id: transactionId,
        amount: 299,
        currency: 'CNY',
        status: 'completed',
        paymentMethod: 'stripe',
        description: 'Premium会员订阅',
        merchantId: 'merchant_001',
        merchantName: '示例商户',
        transactionHash: '0x1234567890abcdef',
        createdAt: '2025-01-15T10:00:00Z',
        completedAt: '2025-01-15T10:01:00Z',
        metadata: {
          orderId: 'order_001',
          productId: 'prod_001',
        },
      })
    } catch (error) {
      console.error('加载交易详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadReceipt = () => {
    alert('下载交易凭证')
  }

  if (loading) {
    return (
      <DashboardLayout userType="user">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!transaction) {
    return (
      <DashboardLayout userType="user">
        <div className="text-center py-12">
          <p className="text-gray-600">交易不存在</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>交易详情 - 用户中心</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">交易详情</h1>
            <p className="text-gray-600 mt-1">交易ID: {transaction.id}</p>
          </div>
          <button
            onClick={downloadReceipt}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            下载凭证
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* 基本信息 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">金额</span>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  ¥{transaction.amount} {transaction.currency}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">状态</span>
                <p className="text-lg font-semibold text-green-600 mt-1 capitalize">
                  {transaction.status === 'completed' ? '已完成' : transaction.status}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">支付方式</span>
                <p className="text-lg font-medium text-gray-900 mt-1 capitalize">
                  {transaction.paymentMethod}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">创建时间</span>
                <p className="text-lg font-medium text-gray-900 mt-1">
                  {new Date(transaction.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
          </div>

          {/* 商户信息 */}
          {transaction.merchantName && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">商户信息</h2>
              <div>
                <span className="text-sm text-gray-600">商户名称</span>
                <p className="text-lg font-medium text-gray-900 mt-1">{transaction.merchantName}</p>
              </div>
            </div>
          )}

          {/* 交易信息 */}
          {transaction.transactionHash && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">交易信息</h2>
              <div>
                <span className="text-sm text-gray-600">交易哈希</span>
                <p className="text-sm font-mono text-gray-900 mt-1 break-all">{transaction.transactionHash}</p>
              </div>
            </div>
          )}

          {/* 元数据 */}
          {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">附加信息</h2>
              <div className="space-y-2">
                {Object.entries(transaction.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-sm text-gray-600">{key}</span>
                    <span className="text-sm font-medium text-gray-900">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
