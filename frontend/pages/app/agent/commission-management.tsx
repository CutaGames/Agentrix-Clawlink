import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

interface Commission {
  id: string
  orderId: string
  amount: number
  rate: number
  status: 'pending' | 'settled'
  settledAt?: string
  createdAt: string
}

export default function AgentCommissionManagement() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'settled'>('all')

  const loadCommissions = useCallback(async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      const allCommissions: Commission[] = [
        {
          id: 'comm_001',
          orderId: 'order_001',
          amount: 25,
          rate: 5,
          status: 'settled',
          settledAt: '2025-01-15T10:00:00Z',
          createdAt: '2025-01-15T09:00:00Z',
        },
        {
          id: 'comm_002',
          orderId: 'order_002',
          amount: 15,
          rate: 5,
          status: 'pending',
          createdAt: '2025-01-16T10:00:00Z',
        },
      ]
      setCommissions(
        filter === 'all' ? allCommissions : allCommissions.filter(c => c.status === filter)
      )
    } catch (error) {
      console.error('加载佣金列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadCommissions()
  }, [loadCommissions])

  const totalPending = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0)
  const totalSettled = commissions.filter(c => c.status === 'settled').reduce((sum, c) => sum + c.amount, 0)

  return (
    <DashboardLayout userType="agent">
      <Head>
        <title>佣金管理 - Agent中心</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">佣金管理</h1>
            <p className="text-gray-600 mt-1">查看和管理您的佣金收入</p>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">全部</option>
            <option value="pending">待结算</option>
            <option value="settled">已结算</option>
          </select>
        </div>

        {/* 统计卡片 */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">待结算佣金</div>
            <div className="text-2xl font-bold text-yellow-600">¥{totalPending.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">已结算佣金</div>
            <div className="text-2xl font-bold text-green-600">¥{totalSettled.toLocaleString()}</div>
          </div>
        </div>

        {/* 佣金列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">佣金金额</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">佣金率</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {commissions.map((commission) => (
                  <tr key={commission.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{commission.orderId}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">¥{commission.amount}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{commission.rate}%</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        commission.status === 'settled' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {commission.status === 'settled' ? '已结算' : '待结算'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(commission.createdAt).toLocaleString('zh-CN')}
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
