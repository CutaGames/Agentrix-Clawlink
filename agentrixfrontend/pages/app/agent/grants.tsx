import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState } from 'react'

export default function AgentGrants() {
  const [activeGrants, setActiveGrants] = useState([
    {
      id: '1',
      userName: '张三',
      userAvatar: '👤',
      singleLimit: '¥100',
      dailyLimit: '¥500',
      usedToday: '¥0',
      totalUsed: '¥0',
      expiresAt: '2024-02-15',
      createdAt: '2024-01-10',
      lastUsed: '-'
    },
    {
      id: '2',
      userName: '李四',
      userAvatar: '👤',
      singleLimit: '¥50',
      dailyLimit: '¥1000',
      usedToday: '¥299',
      totalUsed: '¥598',
      expiresAt: '2024-03-01',
      createdAt: '2024-01-05',
      lastUsed: '2024-01-15'
    },
    {
      id: '3',
      userName: '王五',
      userAvatar: '👤',
      singleLimit: '¥200',
      dailyLimit: '¥800',
      usedToday: '¥0',
      totalUsed: '¥0',
      expiresAt: '2024-01-31',
      createdAt: '2024-01-12',
      lastUsed: '-'
    }
  ])

  const grantStats = {
    totalUsers: '156',
    activeGrants: '3',
    totalTransactions: '48',
    successRate: '94.2%'
  }

  const recentTransactions = [
    {
      id: 'TXN-001',
      userName: '李四',
      amount: '¥299',
      description: 'AI订阅服务',
      timestamp: '2024-01-15 14:30',
      status: 'completed'
    },
    {
      id: 'TXN-002',
      userName: '张三',
      amount: '¥199',
      description: '数字商品购买',
      timestamp: '2024-01-14 11:20',
      status: 'completed'
    }
  ]

  const revokeGrant = (grantId: string) => {
    setActiveGrants(grants => grants.filter(g => g.id !== grantId))
  }

  return (
    <>
      <Head>
        <title>支付授权 - Agentrix</title>
      </Head>
      <DashboardLayout userType="agent">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">支付授权管理</h1>
          <p className="text-gray-600">管理用户对您的自动支付授权</p>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: '总用户数', value: grantStats.totalUsers, icon: '👥' },
            { label: '活跃授权', value: grantStats.activeGrants, icon: '🔐' },
            { label: '自动交易', value: grantStats.totalTransactions, icon: '💳' },
            { label: '成功率', value: grantStats.successRate, icon: '🎯' }
          ].map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl">{stat.icon}</div>
              </div>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
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
                  <p>暂无用户授权</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeGrants.map((grant) => (
                    <div key={grant.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{grant.userAvatar}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">{grant.userName}</h3>
                            <p className="text-sm text-gray-500">
                              授权时间: {grant.createdAt} • 到期: {grant.expiresAt}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => revokeGrant(grant.id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          撤销授权
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
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
                          <p className="text-gray-600">最后使用</p>
                          <p className="font-semibold text-gray-900">{grant.lastUsed}</p>
                        </div>
                      </div>
                      {/* Usage Progress */}
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>今日额度使用情况</span>
                          <span>{grant.usedToday}/{grant.dailyLimit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ 
                              width: `${Math.min((parseInt(grant.usedToday.replace('¥', '')) / parseInt(grant.dailyLimit.replace('¥', ''))) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">最近自动交易</h2>
            </div>
            <div className="p-6">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">💳</div>
                  <p>暂无自动交易记录</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 text-sm">✓</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.userName}</p>
                          <p className="text-sm text-gray-500">{transaction.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{transaction.amount}</p>
                        <p className="text-xs text-gray-500">{transaction.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Authorization Guidelines */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">授权使用指南</h3>
          <ul className="text-blue-700 space-y-2 text-sm">
            <li>• 用户授权后，您可以在限额内为用户完成自动支付</li>
            <li>• 请确保只在用户明确请求时使用自动支付功能</li>
            <li>• 单次支付金额不能超过用户设置的单次限额</li>
            <li>• 每日累计支付金额不能超过用户设置的日限额</li>
            <li>• 用户可随时撤销授权，请及时更新您的支付逻辑</li>
          </ul>
        </div>
      </DashboardLayout>
    </>
  )
}

