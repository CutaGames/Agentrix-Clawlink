import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState } from 'react'
import { useRouter } from 'next/router'

export default function AutoPaySetup() {
  const router = useRouter()
  const { agentId } = router.query
  const [grantSettings, setGrantSettings] = useState({
    singleLimit: '10',
    dailyLimit: '100',
    duration: '30',
    agentName: 'AI购物助手'
  })

  const agents = [
    { id: 'agent1', name: 'AI购物助手', description: '智能商品推荐和购买', icon: '🛒' },
    { id: 'agent2', name: 'AI订阅管理', description: '自动管理订阅服务', icon: '📅' },
    { id: 'agent3', name: '旅行助手', description: '机票酒店预订', icon: '✈️' },
    { id: 'agent4', name: '外卖助手', description: '快速点餐和支付', icon: '🍔' }
  ]

  const handleCreateGrant = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { autoPayApi } = await import('../../../lib/api/auto-pay.api')
      const selectedAgent = agents.find(a => a.name === grantSettings.agentName)
      
      if (!selectedAgent) {
        alert('请选择AI Agent')
        return
      }

      await autoPayApi.createGrant({
        agentId: selectedAgent.id,
        singleLimit: parseFloat(grantSettings.singleLimit),
        dailyLimit: parseFloat(grantSettings.dailyLimit),
        duration: parseInt(grantSettings.duration),
      })

      router.push('/app/user/grants')
    } catch (error: any) {
      console.error('创建授权失败:', error)
      alert(error.message || '创建授权失败，请重试')
    }
  }

  return (
    <>
      <Head>
        <title>设置自动支付 - Agentrix</title>
      </Head>
      <DashboardLayout userType="user">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">设置自动支付授权</h1>
            <p className="text-gray-600">授权AI Agent在限额内自动为您完成支付</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleCreateGrant} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  选择AI Agent
                </label>
                <div className="grid gap-3">
                  {agents.map((agent) => (
                    <label key={agent.id} className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="agent"
                        value={agent.id}
                        checked={grantSettings.agentName === agent.name}
                        onChange={() => setGrantSettings({...grantSettings, agentName: agent.name})}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex items-center space-x-3">
                        <span className="text-2xl">{agent.icon}</span>
                        <div>
                          <p className="font-medium text-gray-900">{agent.name}</p>
                          <p className="text-sm text-gray-500">{agent.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    单次支付限额 (¥)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={grantSettings.singleLimit}
                      onChange={(e) => setGrantSettings({...grantSettings, singleLimit: e.target.value})}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="1000"
                      required
                    />
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      ¥
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">单笔交易最高金额</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    每日累计限额 (¥)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={grantSettings.dailyLimit}
                      onChange={(e) => setGrantSettings({...grantSettings, dailyLimit: e.target.value})}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="10"
                      max="5000"
                      required
                    />
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      ¥
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">24小时内累计支付上限</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  授权时长
                </label>
                <select
                  value={grantSettings.duration}
                  onChange={(e) => setGrantSettings({...grantSettings, duration: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7">7天</option>
                  <option value="30">30天</option>
                  <option value="90">90天</option>
                  <option value="180">180天</option>
                </select>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="text-yellow-400 mr-3">⚠️</div>
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">安全提示</h4>
                    <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                      <li>• 仅授权您信任的AI Agent</li>
                      <li>• 设置合理的支付限额</li>
                      <li>• 定期检查授权状态</li>
                      <li>• 可随时撤销授权</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">授权摘要</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>AI Agent</span>
                    <span className="font-medium">{grantSettings.agentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>单次限额</span>
                    <span className="font-medium">¥{grantSettings.singleLimit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>每日限额</span>
                    <span className="font-medium">¥{grantSettings.dailyLimit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>有效期</span>
                    <span className="font-medium">{grantSettings.duration}天</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/app/user/grants')}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  确认授权
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}
