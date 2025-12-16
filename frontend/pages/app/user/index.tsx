import Head from 'next/head'
import Link from 'next/link'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useUser } from '../../../contexts/UserContext'
import { useLocalization } from '../../../contexts/LocalizationContext'

export default function UserDashboard() {
  const { user } = useUser()
  const { t } = useLocalization()
  
  const stats = [
    { name: t({ zh: '总支付金额', en: 'Total Payment Amount' }), value: '¥8,456', change: '+12.5%' },
    { name: t({ zh: '本月支付次数', en: 'Monthly Payment Count' }), value: '24', change: '+8.2%' },
    { name: t({ zh: '活跃授权', en: 'Active Authorizations' }), value: '3', change: '+1' },
    { name: t({ zh: '钱包余额', en: 'Wallet Balance' }), value: '¥1,234', change: '--' }
  ]

  const recentTransactions = [
    { id: '1', description: 'AI购物助手 - 笔记本电脑', amount: '¥7,999', date: '2024-01-15', status: t({ zh: '已完成', en: 'Completed' }) },
    { id: '2', description: 'AI订阅服务', amount: '¥299', date: '2024-01-14', status: t({ zh: '已完成', en: 'Completed' }) },
    { id: '3', description: '数字商品购买', amount: '¥199', date: '2024-01-13', status: t({ zh: '已完成', en: 'Completed' }) }
  ]

  const activeGrants = [
    { agent: 'AI购物助手', limit: '¥100/次', used: '¥0/¥500', expires: '2024-02-15' },
    { agent: 'AI订阅管理', limit: '¥50/次', used: '¥299/¥1000', expires: '2024-03-01' }
  ]

  return (
    <>
      <Head>
        <title>{t({ zh: '用户中心', en: 'User Center' })} - Agentrix</title>
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{t({ zh: '成为Agent', en: 'Become an Agent' })}</h3>
                    <p className="text-sm text-gray-600">{t({ zh: '为用户推荐商品并获得收益', en: 'Recommend products to users and earn commissions' })}</p>
                  </div>
                  <span className="text-3xl">🤖</span>
                </div>
                <ul className="text-sm text-gray-700 space-y-2 mb-4">
                  <li>• {t({ zh: '推荐商品获得佣金', en: 'Earn commissions by recommending products' })}</li>
                  <li>• {t({ zh: '访问Agent工具和API', en: 'Access Agent tools and APIs' })}</li>
                  <li>• {t({ zh: '查看收益数据', en: 'View earnings data' })}</li>
                </ul>
                <Link
                  href="/app/register/agent"
                  className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  {t({ zh: '立即注册', en: 'Register Now' })}
                </Link>
              </div>
            )}

            {!user.roles.includes('merchant') && (
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{t({ zh: '成为商家', en: 'Become a Merchant' })}</h3>
                    <p className="text-sm text-gray-600">{t({ zh: '接受AI Agent推荐的订单', en: 'Accept orders recommended by AI Agents' })}</p>
                  </div>
                  <span className="text-3xl">🏪</span>
                </div>
                <ul className="text-sm text-gray-700 space-y-2 mb-4">
                  <li>• {t({ zh: '接受Agent推荐订单', en: 'Accept Agent-recommended orders' })}</li>
                  <li>• {t({ zh: '管理商品和订单', en: 'Manage products and orders' })}</li>
                  <li>• {t({ zh: '设置分润比例', en: 'Set profit-sharing ratios' })}</li>
                </ul>
                <Link
                  href="/app/register/merchant"
                  className="block w-full text-center bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  {t({ zh: '立即注册', en: 'Register Now' })}
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{t({ zh: '最近交易', en: 'Recent Transactions' })}</h2>
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
                {t({ zh: '查看所有交易', en: 'View All Transactions' })}
              </Link>
            </div>
          </div>
          {/* Active Grants */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{t({ zh: '自动支付授权', en: 'Auto Payment Authorizations' })}</h2>
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
                        <span className="text-gray-600">{t({ zh: '单次限额:', en: 'Per Transaction Limit:' })}</span>
                        <span className="text-gray-900">{grant.limit}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t({ zh: '已使用/总额度:', en: 'Used/Total Limit:' })}</span>
                        <span className="text-gray-900">{grant.used}</span>
                      </div>
                    </div>
                    <button className="w-full mt-3 text-sm text-red-600 hover:text-red-700 font-medium">
                      {t({ zh: '撤销授权', en: 'Revoke Authorization' })}
                    </button>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 text-center text-blue-600 hover:text-blue-700 font-medium">
                {t({ zh: '管理所有授权', en: 'Manage All Authorizations' })}
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}
