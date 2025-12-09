import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { merchantApi } from '../../../lib/api/merchant.api'
import { useToast } from '../../../contexts/ToastContext'

export default function MerchantFulfillment() {
  const [fulfillments, setFulfillments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    loadFulfillments()
  }, [])

  const loadFulfillments = async () => {
    setLoading(true)
    try {
      const data = await merchantApi.getFulfillmentRecords()
      setFulfillments(data)
    } catch (error: any) {
      console.error('加载发货记录失败:', error)
      showToast('error', '加载发货记录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAutoFulfill = async (paymentId: string) => {
    try {
      await merchantApi.autoFulfill(paymentId)
      showToast('success', '自动发货成功')
      loadFulfillments()
    } catch (error: any) {
      console.error('自动发货失败:', error)
      showToast('error', '自动发货失败')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout userType="merchant">
      <Head>
        <title>发货管理 - 商家中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">发货管理</h1>
          <p className="text-gray-600 mt-1">查看和管理订单发货记录</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    订单ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    支付ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fulfillments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      暂无发货记录
                    </td>
                  </tr>
                ) : (
                  fulfillments.map((fulfillment) => (
                    <tr key={fulfillment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {fulfillment.orderId?.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {fulfillment.paymentId?.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {fulfillment.type === 'physical' ? '实物' : fulfillment.type === 'virtual' ? '虚拟' : '服务'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(fulfillment.status)}`}>
                          {fulfillment.status === 'completed' ? '已完成' : fulfillment.status === 'pending' ? '待处理' : '失败'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(fulfillment.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {fulfillment.status === 'pending' && (
                          <button
                            onClick={() => handleAutoFulfill(fulfillment.paymentId)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            自动发货
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

