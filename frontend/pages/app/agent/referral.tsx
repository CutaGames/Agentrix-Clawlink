import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { referralApi } from '../../../lib/api/referral.api'
import { useToast } from '../../../contexts/ToastContext'

export default function AgentReferralPage() {
  const [referrals, setReferrals] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [referralsData, statsData] = await Promise.all([
        referralApi.getMyReferrals(),
        referralApi.getReferralStats(),
      ])
      setReferrals(referralsData)
      setStats(statsData)
    } catch (error: any) {
      console.error('加载推广数据失败:', error)
      showToast('error', '加载推广数据失败')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout userType="agent">
      <Head>
        <title>推广分成 - Agent中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">推广分成</h1>
          <p className="text-gray-600 mt-1">查看您的推广关系和分成记录</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <>
            {/* 统计卡片 */}
            {stats && (
              <div className="grid gap-4 md:grid-cols-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">总推广数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalReferrals || 0}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">活跃推广</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeReferrals || 0}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">总分成</p>
                  <p className="text-2xl font-bold text-blue-600">${stats.totalCommissions?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-1">待结算</p>
                  <p className="text-2xl font-bold text-yellow-600">${stats.pendingCommissions?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            )}

            {/* 推广列表 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">推广关系</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {referrals.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">
                    暂无推广关系
                  </div>
                ) : (
                  referrals.map((referral) => (
                    <div key={referral.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">
                            商家: {referral.merchantId?.substring(0, 8)}...
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            创建时间: {new Date(referral.createdAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(referral.status)}`}>
                            {referral.status === 'active' ? '活跃' : referral.status === 'pending' ? '待审核' : '已拒绝'}
                          </span>
                          <button
                            onClick={() => {
                              // TODO: 查看详情
                              showToast('info', '查看详情功能开发中')
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            查看详情
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

