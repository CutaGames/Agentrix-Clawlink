import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { userAgentApi, type Subscription } from '../../../lib/api/user-agent.api'
import { useToast } from '../../../contexts/ToastContext'

export default function UserSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    loadSubscriptions()
  }, [])

  const loadSubscriptions = async () => {
    setLoading(true)
    try {
      const data = await userAgentApi.getSubscriptions()
      setSubscriptions(data)
    } catch (error: any) {
      console.error('加载订阅失败:', error)
      showToast('error', '加载订阅失败')
    } finally {
      setLoading(false)
    }
  }

  const cancelSubscription = async (id: string) => {
    if (confirm('确定要取消这个订阅吗？')) {
      try {
        // TODO: 添加取消订阅API调用
        // await userAgentApi.cancelSubscription(id)
        setSubscriptions(subscriptions.map(s => 
          s.id === id ? { ...s, status: 'cancelled' } : s
        ))
        showToast('success', '订阅已取消')
      } catch (error: any) {
        console.error('取消订阅失败:', error)
        showToast('error', '取消订阅失败')
      }
    }
  }

  const getIntervalLabel = (interval: string) => {
    const labels: Record<string, string> = {
      daily: '每日',
      weekly: '每周',
      monthly: '每月',
      yearly: '每年',
    }
    return labels[interval] || interval
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'text-green-600 bg-green-50',
      paused: 'text-yellow-600 bg-yellow-50',
      cancelled: 'text-gray-600 bg-gray-50',
    }
    return colors[status] || 'text-gray-600 bg-gray-50'
  }

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>订阅管理 - 用户中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">订阅管理</h1>
          <p className="text-gray-600 mt-1">管理您的订阅服务</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-4xl mb-4">🔄</div>
            <p className="text-gray-600">还没有任何订阅</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((subscription) => (
              <div key={subscription.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{(subscription as any).name || subscription.id}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(subscription.status)}`}>
                        {subscription.status === 'active' ? '活跃' :
                         subscription.status === 'paused' ? '已暂停' :
                         subscription.status === 'cancelled' ? '已取消' : subscription.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <span className="font-medium">价格:</span> {subscription.amount} {subscription.currency}/
                        {getIntervalLabel(subscription.interval)}
                      </div>
                      {subscription.nextBillingDate && (
                        <div>
                          <span className="font-medium">下次扣费:</span>{' '}
                          {new Date(subscription.nextBillingDate).toLocaleDateString('zh-CN')}
                        </div>
                      )}
                      {subscription.merchantId && (
                        <div>
                          <span className="font-medium">商家ID:</span> {subscription.merchantId}
                        </div>
                      )}
                    </div>
                  </div>
                  {subscription.status === 'active' && (
                    <button
                      onClick={() => cancelSubscription(subscription.id)}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      取消订阅
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
