import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

interface UserAnalytics {
  totalUsers: number
  activeUsers: number
  newUsers: number
  retentionRate: number
  avgOrdersPerUser: number
  topUsers: Array<{
    userId: string
    orderCount: number
    totalSpent: number
  }>
}

export default function AgentUserAnalytics() {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      setAnalytics({
        totalUsers: 1250,
        activeUsers: 850,
        newUsers: 45,
        retentionRate: 68,
        avgOrdersPerUser: 2.5,
        topUsers: [
          { userId: 'user_001', orderCount: 15, totalSpent: 12500 },
          { userId: 'user_002', orderCount: 12, totalSpent: 9800 },
          { userId: 'user_003', orderCount: 10, totalSpent: 8500 },
        ],
      })
    } catch (error) {
      console.error('加载用户分析失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout userType="agent">
      <Head>
        <title>用户分析 - Agent中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">用户分析</h1>
          <p className="text-gray-600 mt-1">分析使用您Agent的用户数据</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : analytics && (
          <>
            <div className="grid md:grid-cols-5 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">总用户数</div>
                <div className="text-2xl font-bold text-gray-900">{analytics.totalUsers.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">活跃用户</div>
                <div className="text-2xl font-bold text-blue-600">{analytics.activeUsers.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">新用户</div>
                <div className="text-2xl font-bold text-green-600">{analytics.newUsers}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">留存率</div>
                <div className="text-2xl font-bold text-purple-600">{analytics.retentionRate}%</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 mb-1">人均订单</div>
                <div className="text-2xl font-bold text-gray-900">{analytics.avgOrdersPerUser}</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top用户</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单数</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">总消费</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analytics.topUsers.map((user) => (
                      <tr key={user.userId}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.userId}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{user.orderCount}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          ¥{user.totalSpent.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

