import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { quickPayGrantApi, type QuickPayGrant } from '../../../lib/api/quick-pay-grant.api'
import { useToast } from '../../../contexts/ToastContext'

export default function QuickPayPage() {
  const [grants, setGrants] = useState<QuickPayGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    loadGrants()
  }, [])

  const loadGrants = async () => {
    setLoading(true)
    try {
      const data = await quickPayGrantApi.getMyGrants()
      setGrants(data)
    } catch (error: any) {
      console.error('加载QuickPay授权失败:', error)
      showToast('error', '加载QuickPay授权失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (grantId: string) => {
    if (!confirm('确定要撤销这个授权吗？')) return

    try {
      await quickPayGrantApi.revoke(grantId)
      showToast('success', '授权已撤销')
      loadGrants()
    } catch (error: any) {
      console.error('撤销授权失败:', error)
      showToast('error', '撤销授权失败')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'revoked':
        return 'bg-red-100 text-red-800'
      case 'expired':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>QuickPay授权管理 - 用户中心</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">QuickPay授权管理</h1>
            <p className="text-gray-600 mt-1">管理您的快速支付授权</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            创建授权
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {grants.length === 0 ? (
              <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500 mb-4">暂无QuickPay授权</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  创建第一个授权
                </button>
              </div>
            ) : (
              grants.map((grant) => (
                <div key={grant.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{grant.description || 'QuickPay授权'}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {grant.paymentMethod.type === 'x402' ? 'X402协议' : grant.paymentMethod.type}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(grant.status)}`}>
                      {grant.status === 'active' ? '活跃' : grant.status === 'revoked' ? '已撤销' : '已过期'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">单笔限额</span>
                      <span className="font-medium">
                        {grant.permissions.maxAmount ? `$${grant.permissions.maxAmount}` : '无限制'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">每日限额</span>
                      <span className="font-medium">
                        {grant.permissions.maxDailyAmount ? `$${grant.permissions.maxDailyAmount}` : '无限制'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">已使用</span>
                      <span className="font-medium">
                        ${grant.usage.totalAmount.toFixed(2)} / {grant.usage.transactionCount} 笔
                      </span>
                    </div>
                    {grant.expiresAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">过期时间</span>
                        <span className="font-medium">
                          {new Date(grant.expiresAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    )}
                  </div>

                  {grant.status === 'active' && (
                    <button
                      onClick={() => handleRevoke(grant.id)}
                      className="mt-4 w-full text-red-600 hover:text-red-800 text-sm"
                    >
                      撤销授权
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4">创建QuickPay授权</h2>
              <p className="text-gray-600 mb-4">
                创建QuickPay授权后，您可以在支持的商家处快速完成支付，无需每次输入支付信息。
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    // TODO: 实现创建授权逻辑
                    showToast('info', '创建授权功能开发中')
                    setShowCreateModal(false)
                  }}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

