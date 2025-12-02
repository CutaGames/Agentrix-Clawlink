import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState } from 'react'

export default function MerchantCommissions() {
  const [commissionSettings, setCommissionSettings] = useState({
    defaultRate: '5',
    aiAgentRates: [
      { id: '1', name: 'AI购物助手', rate: '5', totalSales: '¥8,456', totalCommission: '¥423' },
      { id: '2', name: '智能推荐引擎', rate: '8', totalSales: '¥6,234', totalCommission: '¥499' },
      { id: '3', name: '个人购物顾问', rate: '6', totalSales: '¥4,567', totalCommission: '¥274' }
    ],
    productRates: [
      { id: '1', name: '联想 Yoga 笔记本电脑', rate: '5', basePrice: '¥7,999' },
      { id: '2', name: '无线蓝牙耳机', rate: '8', basePrice: '¥299' },
      { id: '3', name: '智能手表', rate: '6', basePrice: '¥1,299' },
      { id: '4', name: '机械键盘', rate: '7', basePrice: '¥599' }
    ]
  })

  const [newAIAgent, setNewAIAgent] = useState({ name: '', rate: '' })
  const [showAddAIAgent, setShowAddAIAgent] = useState(false)

  const handleDefaultRateChange = (newRate: string) => {
    setCommissionSettings(prev => ({
      ...prev,
      defaultRate: newRate,
      productRates: prev.productRates.map(product => 
        product.rate === prev.defaultRate ? { ...product, rate: newRate } : product
      )
    }))
  }

  const handleAIAgentRateChange = (agentId: string, newRate: string) => {
    setCommissionSettings(prev => ({
      ...prev,
      aiAgentRates: prev.aiAgentRates.map(agent =>
        agent.id === agentId ? { ...agent, rate: newRate } : agent
      )
    }))
  }

  const handleProductRateChange = (productId: string, newRate: string) => {
    setCommissionSettings(prev => ({
      ...prev,
      productRates: prev.productRates.map(product =>
        product.id === productId ? { ...product, rate: newRate } : product
      )
    }))
  }

  const handleAddAIAgent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAIAgent.name || !newAIAgent.rate) return

    const newAgent = {
      id: Date.now().toString(),
      name: newAIAgent.name,
      rate: newAIAgent.rate,
      totalSales: '¥0',
      totalCommission: '¥0'
    }

    setCommissionSettings(prev => ({
      ...prev,
      aiAgentRates: [...prev.aiAgentRates, newAgent]
    }))

    setNewAIAgent({ name: '', rate: '' })
    setShowAddAIAgent(false)
  }

  const removeAIAgent = (agentId: string) => {
    setCommissionSettings(prev => ({
      ...prev,
      aiAgentRates: prev.aiAgentRates.filter(agent => agent.id !== agentId)
    }))
  }

  return (
    <>
      <Head>
        <title>分润设置 - PayMind</title>
      </Head>
      <DashboardLayout userType="merchant">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">分润设置</h1>
          <p className="text-gray-600">配置AI Agent的分润比例和佣金规则（新规则：固定佣金率）</p>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">📋 新佣金规则说明</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <div>• <strong>实体商品</strong>：总佣金3%（推荐Agent 0.9% + 执行Agent 2.1% + PayMind 0.5%）</div>
              <div>• <strong>服务类</strong>：总佣金5%（推荐Agent 1.5% + 执行Agent 3.5% + PayMind 1%）</div>
              <div>• <strong>链上资产</strong>：总佣金2.5%（根据场景不同）</div>
              <div>• 佣金率由产品类型决定，不支持自定义调整（除非产品设置允许）</div>
            </div>
          </div>
        </div>
        <div className="space-y-8">
          {/* 产品类型佣金率说明 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">产品类型佣金率（固定）</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">实体商品</div>
                      <div className="text-sm text-gray-600 mt-1">总佣金：3%</div>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div>推荐Agent：0.9%</div>
                      <div>执行Agent：2.1%</div>
                      <div>PayMind：0.5%</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">服务类</div>
                      <div className="text-sm text-gray-600 mt-1">总佣金：5%</div>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div>推荐Agent：1.5%</div>
                      <div>执行Agent：3.5%</div>
                      <div>PayMind：1%</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">链上资产（NFT/FT/游戏资产/RWA）</div>
                      <div className="text-sm text-gray-600 mt-1">总佣金：2.5%（根据场景不同）</div>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <div>推荐Agent：0.75%</div>
                      <div>执行Agent：1.75%</div>
                      <div>PayMind：1%</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ 注意：佣金率由产品类型决定，不支持自定义调整。如需调整，请在商品管理页面设置 &quot;允许调整佣金率&quot;。
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* AI Agent Commission Rates */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">AI Agent 分润设置</h2>
              <button
                onClick={() => setShowAddAIAgent(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                添加AI Agent
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {commissionSettings.aiAgentRates.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600">🤖</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                        <div className="flex space-x-6 text-sm text-gray-500 mt-1">
                          <span>总销售额: {agent.totalSales}</span>
                          <span>总佣金: {agent.totalCommission}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <select
                        value={agent.rate}
                        onChange={(e) => handleAIAgentRateChange(agent.id, e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="3">3%</option>
                        <option value="5">5%</option>
                        <option value="7">7%</option>
                        <option value="8">8%</option>
                        <option value="10">10%</option>
                      </select>
                      <button
                        onClick={() => removeAIAgent(agent.id)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Product-specific Commission Rates */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">商品分润设置</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {commissionSettings.productRates.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600">📦</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-500">基础价格: {product.basePrice}</p>
                      </div>
                    </div>
                    <select
                      value={product.rate}
                      onChange={(e) => handleProductRateChange(product.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="3">3%</option>
                      <option value="5">5%</option>
                      <option value="7">7%</option>
                      <option value="8">8%</option>
                      <option value="10">10%</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Add AI Agent Modal */}
        {showAddAIAgent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">添加AI Agent</h2>
                <button
                  onClick={() => setShowAddAIAgent(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleAddAIAgent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Agent名称
                  </label>
                  <input
                    type="text"
                    value={newAIAgent.name}
                    onChange={(e) => setNewAIAgent({...newAIAgent, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例如: AI购物助手"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分润比例
                  </label>
                  <select
                    value={newAIAgent.rate}
                    onChange={(e) => setNewAIAgent({...newAIAgent, rate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">选择分润比例</option>
                    <option value="3">3%</option>
                    <option value="5">5%</option>
                    <option value="7">7%</option>
                    <option value="8">8%</option>
                    <option value="10">10%</option>
                  </select>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddAIAgent(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    添加
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}

