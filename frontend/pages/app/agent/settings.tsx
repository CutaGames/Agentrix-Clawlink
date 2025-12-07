import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

interface AgentConfig {
  name: string
  description: string
  autoPayEnabled: boolean
  dailyLimit: number
  singleLimit: number
  paymentMethods: string[]
}

export default function AgentSettings() {
  const [config, setConfig] = useState<AgentConfig>({
    name: '我的AI助手',
    description: '智能购物助手',
    autoPayEnabled: true,
    dailyLimit: 500,
    singleLimit: 100,
    paymentMethods: ['x402', 'crypto'],
  })
  const [saving, setSaving] = useState(false)

  const saveConfig = async () => {
    setSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      alert('配置已保存')
    } catch (error) {
      console.error('保存配置失败:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout userType="agent">
      <Head>
        <title>Agent配置管理 - Agent中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agent配置管理</h1>
          <p className="text-gray-600 mt-1">配置您的Agent支付能力和设置</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* 基本信息 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agent名称</label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
                <textarea
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* 支付能力配置 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">支付能力配置</h2>
            <div className="space-y-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoPayEnabled}
                  onChange={(e) => setConfig({ ...config, autoPayEnabled: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">启用自动支付</span>
              </label>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">每日限额 (¥)</label>
                  <input
                    type="number"
                    value={config.dailyLimit}
                    onChange={(e) => setConfig({ ...config, dailyLimit: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">单笔限额 (¥)</label>
                  <input
                    type="number"
                    value={config.singleLimit}
                    onChange={(e) => setConfig({ ...config, singleLimit: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 支付方式 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">支持的支付方式</h2>
            <div className="space-y-2">
              {['x402', 'crypto', 'fiat'].map((method) => (
                <label key={method} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.paymentMethods.includes(method)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setConfig({ ...config, paymentMethods: [...config.paymentMethods, method] })
                      } else {
                        setConfig({ ...config, paymentMethods: config.paymentMethods.filter(m => m !== method) })
                      }
                    }}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700 capitalize">{method}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={saveConfig}
            disabled={saving}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}

