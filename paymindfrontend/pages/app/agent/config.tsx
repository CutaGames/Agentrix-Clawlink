import Head from 'next/head'
import { useState } from 'react'

export default function AgentConfig() {
  const [config, setConfig] = useState({
    name: 'AI购物助手',
    description: '智能购物推荐和支付助手',
    autoPayEnabled: true,
    dailyLimit: 100,
    singleLimit: 50,
    currency: 'USD',
    paymentMethods: ['x402', 'crypto', 'fiat'],
  })

  return (
    <>
      <Head>
        <title>Agent配置管理 - Agent控制台</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Agent配置管理</h1>
            <p className="text-gray-600">配置您的Agent支付能力</p>
          </div>

          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h3>
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
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* 自动支付设置 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">自动支付设置</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">启用自动支付</p>
                    <p className="text-xs text-gray-600">允许Agent在用户授权后自动支付</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoPayEnabled}
                      onChange={(e) => setConfig({ ...config, autoPayEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {config.autoPayEnabled && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">每日限额 (USD)</label>
                      <input
                        type="number"
                        value={config.dailyLimit}
                        onChange={(e) => setConfig({ ...config, dailyLimit: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">单笔限额 (USD)</label>
                      <input
                        type="number"
                        value={config.singleLimit}
                        onChange={(e) => setConfig({ ...config, singleLimit: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 支付方式 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">支持的支付方式</h3>
              <div className="space-y-2">
                {['x402', 'crypto', 'fiat'].map((method) => (
                  <label key={method} className="flex items-center space-x-2">
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
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 capitalize">{method}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                保存配置
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

