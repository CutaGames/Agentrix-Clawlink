import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

interface PaymentMethod {
  id: string
  type: 'card' | 'apple_pay' | 'google_pay' | 'crypto'
  name: string
  details: string
  isDefault: boolean
  lastUsed?: string
}

export default function UserPaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMethods()
  }, [])

  const loadMethods = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      setMethods([
        {
          id: 'pm_001',
          type: 'card',
          name: 'Visa •••• 1234',
          details: '到期: 12/25',
          isDefault: true,
          lastUsed: '2025-01-15T10:00:00Z',
        },
        {
          id: 'pm_002',
          type: 'apple_pay',
          name: 'Apple Pay',
          details: 'iPhone 15 Pro',
          isDefault: false,
          lastUsed: '2025-01-14T15:00:00Z',
        },
      ])
    } catch (error) {
      console.error('加载支付方式失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const setDefault = (id: string) => {
    setMethods(methods.map(m => ({ ...m, isDefault: m.id === id })))
  }

  const deleteMethod = (id: string) => {
    if (confirm('确定要删除这个支付方式吗？')) {
      setMethods(methods.filter(m => m.id !== id))
    }
  }

  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      card: '💳',
      apple_pay: '🍎',
      google_pay: '📱',
      crypto: '₿',
    }
    return icons[type] || '💳'
  }

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>支付方式管理 - 用户中心</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">支付方式管理</h1>
            <p className="text-gray-600 mt-1">管理您保存的支付方式</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            添加支付方式
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : methods.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-4xl mb-4">💳</div>
            <p className="text-gray-600 mb-4">还没有保存任何支付方式</p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
              添加支付方式
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {methods.map((method) => (
              <div key={method.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">{getIcon(method.type)}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{method.name}</h3>
                      <p className="text-sm text-gray-500">{method.details}</p>
                      {method.lastUsed && (
                        <p className="text-xs text-gray-400 mt-1">
                          最后使用: {new Date(method.lastUsed).toLocaleDateString('zh-CN')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {method.isDefault ? (
                      <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">默认</span>
                    ) : (
                      <button
                        onClick={() => setDefault(method.id)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        设为默认
                      </button>
                    )}
                    <button
                      onClick={() => deleteMethod(method.id)}
                      className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
