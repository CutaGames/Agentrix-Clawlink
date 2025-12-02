import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState } from 'react'
import { MerchantAutomationPanel } from '../../../components/merchant/MerchantAutomationPanel'

export default function MerchantDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'automation'>('overview')

  const stats = [
    { name: '总销售额', value: '¥45,678', change: '+18.3%' },
    { name: 'AI渠道销售', value: '¥23,456', change: '+25.7%' },
    { name: '订单数量', value: '156', change: '+12.1%' },
    { name: 'AI合作Agent', value: '23', change: '+5' }
  ]

  const salesData = [
    { date: '1月15日', direct: 12000, ai: 8560 },
    { date: '1月14日', direct: 9800, ai: 6420 },
    { date: '1月13日', direct: 11500, ai: 5230 },
    { date: '1月12日', direct: 8900, ai: 4350 }
  ]

  const topAIAgents = [
    { name: 'AI购物助手', sales: '¥8,456', commission: '¥423', conversions: '15' },
    { name: '智能推荐引擎', sales: '¥6,234', commission: '¥312', conversions: '12' },
    { name: '个人购物顾问', sales: '¥4,567', commission: '¥228', conversions: '8' }
  ]

  const recentOrders = [
    { id: 'ORD-001', product: '联想 Yoga 笔记本电脑', amount: '¥7,999', channel: 'AI购物助手', date: '2024-01-15', status: '已完成' },
    { id: 'ORD-002', product: '无线蓝牙耳机', amount: '¥299', channel: '智能推荐引擎', date: '2024-01-15', status: '已完成' },
    { id: 'ORD-003', product: '机械键盘', amount: '¥599', channel: '官网直接', date: '2024-01-14', status: '已发货' },
    { id: 'ORD-004', product: '4K显示器', amount: '¥1,899', channel: '个人购物顾问', date: '2024-01-14', status: '待发货' }
  ]

  return (
    <>
      <Head>
        <title>商户后台 - PayMind</title>
      </Head>
      <DashboardLayout userType="merchant">
        {/* Header with Tabs */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">商户概览</h1>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              上架新商品
            </button>
          </div>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: '数据概览' },
                { id: 'products', name: '商品管理' },
                { id: 'orders', name: '订单管理' },
                { id: 'automation', name: '自动化' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
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
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Sales Chart */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">销售趋势</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {salesData.map((data, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{data.date}</span>
                          <span className="text-gray-900">¥{(data.direct + data.ai).toLocaleString()}</span>
                        </div>
                        <div className="flex space-x-2">
                          <div 
                            className="h-2 bg-blue-500 rounded" 
                            style={{ width: `${(data.direct / (data.direct + data.ai)) * 100}%` }}
                            title={`直接销售: ¥${data.direct}`}
                          ></div>
                          <div 
                            className="h-2 bg-green-500 rounded" 
                            style={{ width: `${(data.ai / (data.direct + data.ai)) * 100}%` }}
                            title={`AI渠道: ¥${data.ai}`}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>直接: ¥{data.direct.toLocaleString()}</span>
                          <span>AI渠道: ¥{data.ai.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Top AI Agents */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">合作AI Agent排行</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {topAIAgents.map((agent, index) => (
                      <div key={index} className="flex justify-between items-center py-2">
                        <div>
                          <p className="font-medium text-gray-900">{agent.name}</p>
                          <p className="text-sm text-gray-500">{agent.conversions} 次转化</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{agent.sales}</p>
                          <p className="text-sm text-green-600">佣金: {agent.commission}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-4 text-center text-blue-600 hover:text-blue-700 font-medium">
                    查看所有合作Agent
                  </button>
                </div>
              </div>
            </div>
            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">最近订单</h2>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-sm font-medium text-gray-600">订单号</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-600">商品</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-600">金额</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-600">渠道</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-600">日期</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-600">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => (
                        <tr key={order.id} className="border-b border-gray-100 last:border-0">
                          <td className="py-3 text-sm font-medium text-gray-900">{order.id}</td>
                          <td className="py-3 text-sm text-gray-600">{order.product}</td>
                          <td className="py-3 text-sm text-gray-900">{order.amount}</td>
                          <td className="py-3 text-sm text-gray-600">{order.channel}</td>
                          <td className="py-3 text-sm text-gray-600">{order.date}</td>
                          <td className="py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              order.status === '已完成' ? 'bg-green-100 text-green-800' :
                              order.status === '已发货' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="w-full mt-4 text-center text-blue-600 hover:text-blue-700 font-medium">
                  查看所有订单
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'products' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">商品管理</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                添加商品
              </button>
            </div>
            <div className="p-6">
              <div className="text-center py-8 text-gray-500">
                商品管理功能开发中...
                <div className="mt-4">
                  <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                    查看商品文档
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">订单管理</h2>
            </div>
            <div className="p-6">
              <div className="text-center py-8 text-gray-500">
                订单管理功能开发中...
                <div className="mt-4">
                  <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                    查看订单文档
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'automation' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">商户自动化</h2>
            </div>
            <div className="p-6">
              <MerchantAutomationPanel />
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}
