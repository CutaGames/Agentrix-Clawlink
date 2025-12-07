import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

interface ApiKey {
  id: string
  name: string
  key: string
  permissions: string[]
  createdAt: string
  lastUsed?: string
  usageCount: number
}

export default function MerchantApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newKey, setNewKey] = useState({ name: '', permissions: [] as string[] })

  useEffect(() => {
    loadKeys()
  }, [])

  const loadKeys = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      setKeys([
        {
          id: 'key_001',
          name: '生产环境',
          key: 'pk_live_***',
          permissions: ['payments:read', 'payments:write', 'orders:read'],
          createdAt: '2025-01-01T00:00:00Z',
          lastUsed: '2025-01-15T10:00:00Z',
          usageCount: 1250,
        },
        {
          id: 'key_002',
          name: '测试环境',
          key: 'pk_test_***',
          permissions: ['payments:read', 'orders:read'],
          createdAt: '2025-01-10T00:00:00Z',
          usageCount: 45,
        },
      ])
    } catch (error) {
      console.error('加载API密钥失败:', error)
    }
  }

  const addKey = () => {
    const apiKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: newKey.name,
      key: 'pk_' + Math.random().toString(36).substr(2, 24),
      permissions: newKey.permissions,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    }
    setKeys([...keys, apiKey])
    setShowAddModal(false)
    setNewKey({ name: '', permissions: [] })
  }

  const deleteKey = (id: string) => {
    if (confirm('确定要删除这个API密钥吗？')) {
      setKeys(keys.filter(k => k.id !== id))
    }
  }

  return (
    <DashboardLayout userType="merchant">
      <Head>
        <title>API密钥管理 - 商户中心</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">API密钥管理</h1>
            <p className="text-gray-600 mt-1">管理您的API密钥和权限</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            创建密钥
          </button>
        </div>

        <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
          {keys.map((key) => (
            <div key={key.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{key.name}</h3>
                  </div>
                  <div className="text-sm text-gray-600 mb-2 font-mono bg-gray-50 p-2 rounded">
                    {key.key}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">权限:</span> {key.permissions.join(', ')}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">使用次数:</span> {key.usageCount}
                  </div>
                  {key.lastUsed && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">最后使用:</span>{' '}
                      {new Date(key.lastUsed).toLocaleString('zh-CN')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteKey(key.id)}
                  className="ml-4 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 添加密钥模态框 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">创建API密钥</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                  <input
                    type="text"
                    value={newKey.name}
                    onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="例如: 生产环境"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">权限</label>
                  <div className="space-y-2">
                    {['payments:read', 'payments:write', 'orders:read', 'orders:write', 'refunds:write'].map((perm) => (
                      <label key={perm} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newKey.permissions.includes(perm)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewKey({ ...newKey, permissions: [...newKey.permissions, perm] })
                            } else {
                              setNewKey({ ...newKey, permissions: newKey.permissions.filter(p => p !== perm) })
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{perm}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={addKey}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    创建
                  </button>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
