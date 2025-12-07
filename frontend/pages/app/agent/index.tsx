import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

export default function AgentDashboard() {
  const stats = [
    { name: '本月收益', value: '¥2,456', change: '+15.3%' },
    { name: '完成交易', value: '48', change: '+22.1%' },
    { name: '活跃用户', value: '156', change: '+8.7%' },
    { name: '推荐商品', value: '23', change: '+3' }
  ]

  const earningsData = [
    { date: '1月15日', amount: '¥856' },
    { date: '1月14日', amount: '¥642' },
    { date: '1月13日', amount: '¥523' },
    { date: '1月12日', amount: '¥435' }
  ]

  const topProducts = [
    { name: '联想 Yoga 笔记本电脑', earnings: '¥1,234', conversions: '12' },
    { name: '无线蓝牙耳机', earnings: '¥856', conversions: '23' },
    { name: '智能手表', earnings: '¥642', conversions: '8' }
  ]

  return (
    <>
      <Head>
        <title>Agent控制台 - Agentrix</title>
      </Head>
      <DashboardLayout userType="agent">
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
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Earnings Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">收益趋势</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {earningsData.map((data, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-600">{data.date}</span>
                    <div className="flex items-center space-x-4">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${(parseInt(data.amount.replace('¥', '')) / 1000) * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-semibold text-gray-900">{data.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">热门推荐商品</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex justify-between items-center py-2">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.conversions} 次转化</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{product.earnings}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 text-center text-blue-600 hover:text-blue-700 font-medium">
                查看商品库
              </button>
            </div>
          </div>
        </div>
        {/* Quick Actions */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">集成 SDK</h3>
            <p className="text-blue-700 text-sm mb-4">快速为您的 AI Agent 集成支付能力</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
              查看文档
            </button>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 mb-2">管理授权</h3>
            <p className="text-green-700 text-sm mb-4">查看和管理用户的自动支付授权</p>
            <button className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700">
              查看授权
            </button>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="font-semibold text-purple-900 mb-2">数据分析</h3>
            <p className="text-purple-700 text-sm mb-4">深入了解用户行为和转化数据</p>
            <button className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-purple-700">
              查看分析
            </button>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}
