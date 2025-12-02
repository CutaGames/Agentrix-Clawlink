import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState, useEffect } from 'react'

export default function UserGrants() {
  const [activeGrants, setActiveGrants] = useState([
    {
      id: '1',
      agentName: 'AI购物助手',
      agentIcon: '🤖',
      singleLimit: '¥100',
      dailyLimit: '¥500',
      usedToday: '¥0',
      totalUsed: '¥0',
      expiresAt: '2024-02-15',
      createdAt: '2024-01-10'
    },
    {
      id: '2', 
      agentName: 'AI订阅管理',
      agentIcon: '📅',
      singleLimit: '¥50',
      dailyLimit: '¥1000',
      usedToday: '¥299',
      totalUsed: '¥598',
      expiresAt: '2024-03-01',
      createdAt: '2024-01-05'
    }
  ])

  const [newGrant, setNewGrant] = useState({
    agentId: '',
    singleLimit: '100',
    dailyLimit: '500',
    duration: '30'
  })

  const availableAgents = [
    { id: 'agent1', name: 'AI购物助手', description: '智能商品推荐和购买' },
    { id: 'agent2', name: 'AI订阅管理', description: '自动管理订阅服务' },
    { id: 'agent3', name: '旅行助手', description: '机票酒店预订' },
    { id: 'agent4', name: '外卖助手', description: '快速点餐和支付' }
  ]

  useEffect(() => {
    loadGrants()
  }, [])

  const loadGrants = async () => {
    try {
      const { autoPayApi } = await import('../../../lib/api/auto-pay.api')
      const grants = await autoPayApi.getGrants()
      setActiveGrants(grants.map((g: any) => ({
        id: g.id,
        agentName: g.agentId || 'AI Agent',
        agentIcon: '🤖',
        singleLimit: `¥${g.singleLimit}`,
        dailyLimit: `¥${g.dailyLimit}`,
        usedToday: `¥${g.usedToday || 0}`,
        totalUsed: `¥${g.totalUsed || 0}`,
        expiresAt: new Date(g.expiresAt).toISOString().split('T')[0],
        createdAt: new Date(g.createdAt).toISOString().split('T')[0],
      })))
    } catch (error) {
      console.error('加载授权列表失败:', error)
    }
  }

  const handleRevokeGrant = async (grantId: string) => {
    try {
      const { autoPayApi } = await import('../../../lib/api/auto-pay.api')
      await autoPayApi.revokeGrant(grantId)
      setActiveGrants(grants => grants.filter(g => g.id !== grantId))
    } catch (error: any) {
      console.error('撤销授权失败:', error)
      alert(error.message || '撤销授权失败，请重试')
    }
  }

  const handleCreateGrant = async (e: React.FormEvent) => {
    e.preventDefault()
    const agent = availableAgents.find(a => a.id === newGrant.agentId)
    if (!agent) {
      alert('请选择AI Agent')
      return
    }

    try {
      const { autoPayApi } = await import('../../../lib/api/auto-pay.api')
      await autoPayApi.createGrant({
        agentId: newGrant.agentId,
        singleLimit: parseFloat(newGrant.singleLimit),
        dailyLimit: parseFloat(newGrant.dailyLimit),
        duration: parseInt(newGrant.duration),
      })
      
      await loadGrants()
      setNewGrant({ agentId: '', singleLimit: '100', dailyLimit: '500', duration: '30' })
    } catch (error: any) {
      console.error('创建授权失败:', error)
      alert(error.message || '创建授权失败，请重试')
    }
  }

  return (
    <>
      <Head>
        <title>自动支付授权 - PayMind</title>
      </Head>
      <DashboardLayout userType="user">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">自动支付授权</h1>
          <p className="text-gray-600">管理AI Agent的自动支付权限和限额</p>
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Active Grants */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">活跃授权</h2>
            </div>
            <div className="p-6">
              {activeGrants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">🔐</div>
                  <p>暂无自动支付授权</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeGrants.map((grant) => (
                    <div key={grant.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{grant.agentIcon}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">{grant.agentName}</h3>
                            <p className="text-sm text-gray-500">创建于 {grant.createdAt}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokeGrant(grant.id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          撤销授权
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">单次限额</p>
                          <p className="font-semibold text-gray-900">{grant.singleLimit}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">日限额</p>
                          <p className="font-semibold text-gray-900">{grant.dailyLimit}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">今日已用</p>
                          <p className="font-semibold text-gray-900">{grant.usedToday}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">到期时间</p>
                          <p className="font-semibold text-gray-900">{grant.expiresAt}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* New Grant Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">新建授权</h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateGrant} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择AI Agent
                  </label>
                  <select
                    value={newGrant.agentId}
                    onChange={(e) => setNewGrant({...newGrant, agentId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">请选择AI Agent</option>
                    {availableAgents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} - {agent.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    单次支付限额 (¥)
                  </label>
                  <input
                    type="number"
                    value={newGrant.singleLimit}
                    onChange={(e) => setNewGrant({...newGrant, singleLimit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="1000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    每日累计限额 (¥)
                  </label>
                  <input
                    type="number"
                    value={newGrant.dailyLimit}
                    onChange={(e) => setNewGrant({...newGrant, dailyLimit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="10"
                    max="5000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    授权时长 (天)
                  </label>
                  <select
                    value={newGrant.duration}
                    onChange={(e) => setNewGrant({...newGrant, duration: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="7">7天</option>
                    <option value="30">30天</option>
                    <option value="90">90天</option>
                    <option value="180">180天</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  创建授权
                </button>
              </form>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}

