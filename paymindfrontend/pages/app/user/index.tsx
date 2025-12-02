import Head from 'next/head'
import Link from 'next/link'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useUser } from '../../../contexts/UserContext'

export default function UserDashboard() {
  const { user } = useUser()
  
  const stats = [
    { name: '总支付金额', value: '¥8,456', change: '+12.5%' },
    { name: '本月支付次数', value: '24', change: '+8.2%' },
    { name: '活跃授权', value: '3', change: '+1' },
    { name: '钱包余额', value: '¥1,234', change: '--' }
  ]

  const recentTransactions = [
    { id: '1', description: 'AI购物助手 - 笔记本电脑', amount: '¥7,999', date: '2024-01-15', status: '已完成' },
    { id: '2', description: 'AI订阅服务', amount: '¥299', date: '2024-01-14', status: '已完成' },
    { id: '3', description: '数字商品购买', amount: '¥199', date: '2024-01-13', status: '已完成' }
  ]

  const activeGrants = [
    { agent: 'AI购物助手', limit: '¥100/次', used: '¥0/¥500', expires: '2024-02-15' },
    { agent: 'AI订阅管理', limit: '¥50/次', used: '¥299/¥1000', expires: '2024-03-01' }
  ]

  return (
    <>
      <Head>
        <title>用户中心 - PayMind</title>
      </Head>
      <DashboardLayout userType="user">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Role Registration Cards */}
        {user && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {!user.roles.includes('agent') && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">成为Agent</h3>
                    <p className="text-sm text-gray-600">为用户推荐商品并获得收益</p>
                  </div>
                  <span className="text-3xl">🤖</span>
                </div>
                <ul className="text-sm text-gray-700 space-y-2 mb-4">
                  <li>• 推荐商品获得佣金</li>
                  <li>• 访问Agent工具和API</li>
                  <li>• 查看收益数据</li>
                </ul>
                <Link
                  href="/app/register/agent"
                  className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  立即注册
                </Link>
              </div>
            )}

            {!user.roles.includes('merchant') && (
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">成为商家</h3>
                    <p className="text-sm text-gray-600">接受AI Agent推荐的订单</p>
                  </div>
                  <span className="text-3xl">🏪</span>
                </div>
                <ul className="text-sm text-gray-700 space-y-2 mb-4">
                  <li>• 接受Agent推荐订单</li>
                  <li>• 管理商品和订单</li>
                  <li>• 设置分润比例</li>
                </ul>
                <Link
                  href="/app/register/merchant"
                  className="block w-full text-center bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  立即注册
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">最近交易</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center py-2">
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-500">{transaction.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{transaction.amount}</p>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/app/user/payment-history" className="block w-full mt-4 text-center text-blue-600 hover:text-blue-700 font-medium">
                查看所有交易
              </Link>
            </div>
          </div>
          {/* Active Grants */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">自动支付授权</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {activeGrants.map((grant, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{grant.agent}</h3>
                      <span className="text-sm text-gray-500">到期: {grant.expires}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">单次限额:</span>
                        <span className="text-gray-900">{grant.limit}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">已使用/总额度:</span>
                        <span className="text-gray-900">{grant.used}</span>
                      </div>
                    </div>
                    <button className="w-full mt-3 text-sm text-red-600 hover:text-red-700 font-medium">
                      撤销授权
                    </button>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 text-center text-blue-600 hover:text-blue-700 font-medium">
                管理所有授权
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}
