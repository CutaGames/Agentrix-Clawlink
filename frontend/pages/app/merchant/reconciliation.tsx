import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { merchantApi } from '../../../lib/api/merchant.api'
import { useToast } from '../../../contexts/ToastContext'

export default function MerchantReconciliation() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [performing, setPerforming] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    setLoading(true)
    try {
      const data = await merchantApi.getReconciliationRecords()
      setRecords(data)
    } catch (error: any) {
      console.error('加载对账记录失败:', error)
      showToast('error', '加载对账记录失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePerformReconciliation = async () => {
    if (!confirm('确定要执行对账吗？')) return

    setPerforming(true)
    try {
      await merchantApi.performReconciliation()
      showToast('success', '对账完成')
      loadRecords()
    } catch (error: any) {
      console.error('执行对账失败:', error)
      showToast('error', '执行对账失败')
    } finally {
      setPerforming(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'matched':
        return 'bg-green-100 text-green-800'
      case 'mismatched':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout userType="merchant">
      <Head>
        <title>自动对账 - 商家中心</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">自动对账</h1>
            <p className="text-gray-600 mt-1">查看和管理交易对账记录</p>
          </div>
          <button
            onClick={handlePerformReconciliation}
            disabled={performing}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {performing ? '对账中...' : '执行对账'}
          </button>
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
                    对账日期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    总交易数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    差异数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      暂无对账记录
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.startDate && record.endDate
                          ? `${new Date(record.startDate).toLocaleDateString('zh-CN')} - ${new Date(record.endDate).toLocaleDateString('zh-CN')}`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                          {record.status === 'matched' ? '匹配' : record.status === 'mismatched' ? '不匹配' : '待处理'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.totalTransactions || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.differences?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(record.createdAt).toLocaleString('zh-CN')}
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

