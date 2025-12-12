import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { merchantApi, MerchantRefund } from '../../../lib/api/merchant.api'

export default function MerchantRefunds() {
  const [refunds, setRefunds] = useState<MerchantRefund[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('all')

  const loadRefunds = useCallback(async () => {
    setLoading(true)
    try {
      const data = await merchantApi.getRefunds(filter)
      setRefunds(data)
    } catch (error) {
      console.error('加载退款列表失败:', error)
      setRefunds([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadRefunds()
  }, [loadRefunds])

  const handleApprove = async (refundId: string) => {
    try {
      await merchantApi.processRefund(refundId, 'approve')
      loadRefunds()
    } catch (error) {
      console.error('批准退款失败:', error)
      alert('批准退款失败，请重试')
    }
  }

  const handleReject = async (refundId: string) => {
    const reason = prompt('请输入拒绝原因（可选）')
    try {
      await merchantApi.processRefund(refundId, 'reject', reason || undefined)
      loadRefunds()
    } catch (error) {
      console.error('拒绝退款失败:', error)
      alert('拒绝退款失败，请重试')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'text-yellow-600 bg-yellow-50',
      approved: 'text-blue-600 bg-blue-50',
      rejected: 'text-red-600 bg-red-50',
      completed: 'text-green-600 bg-green-50',
    }
    return colors[status] || 'text-gray-600 bg-gray-50'
  }

  return (
    <DashboardLayout userType="merchant">
      <Head>
        <title>退款管理 - 商户中心</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">退款管理</h1>
            <p className="text-gray-600 mt-1">处理退款申请和查看退款记录</p>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">全部</option>
            <option value="pending">待处理</option>
            <option value="approved">已批准</option>
            <option value="rejected">已拒绝</option>
            <option value="completed">已完成</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">退款ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金额</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">原因</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">申请时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {refunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{refund.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{refund.orderId}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ¥{refund.amount}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{refund.reason}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(refund.status)}`}>
                        {refund.status === 'pending' ? '待处理' :
                         refund.status === 'approved' ? '已批准' :
                         refund.status === 'rejected' ? '已拒绝' : '已完成'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(refund.requestedAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4">
                      {refund.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(refund.id)}
                            className="text-green-600 hover:text-green-700 text-sm font-medium"
                          >
                            批准
                          </button>
                          <button
                            onClick={() => handleReject(refund.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            拒绝
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
