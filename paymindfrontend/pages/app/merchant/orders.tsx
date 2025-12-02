import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState } from 'react'

export default function MerchantOrders() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'shipped' | 'completed' | 'cancelled'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const orders = [
    {
      id: 'ORD-001',
      customer: '张三',
      product: '联想 Yoga 笔记本电脑',
      amount: '¥7,999',
      channel: 'AI购物助手',
      date: '2024-01-15 14:30',
      status: 'completed',
      shipping: '已发货',
      payment: '已支付',
      commission: '¥400'
    },
    {
      id: 'ORD-002',
      customer: '李四',
      product: '无线蓝牙耳机',
      amount: '¥299',
      channel: '智能推荐引擎',
      date: '2024-01-15 11:20',
      status: 'completed',
      shipping: '已发货',
      payment: '已支付',
      commission: '¥24'
    },
    {
      id: 'ORD-003',
      customer: '王五',
      product: '机械键盘',
      amount: '¥599',
      channel: '官网直接',
      date: '2024-01-14 16:45',
      status: 'shipped',
      shipping: '已发货',
      payment: '已支付',
      commission: '-'
    },
    {
      id: 'ORD-004',
      customer: '赵六',
      product: '4K显示器',
      amount: '¥1,899',
      channel: '个人购物顾问',
      date: '2024-01-14 09:15',
      status: 'pending',
      shipping: '待发货',
      payment: '已支付',
      commission: '¥95'
    },
    {
      id: 'ORD-005',
      customer: '钱七',
      product: '智能手表',
      amount: '¥1,299',
      channel: 'AI购物助手',
      date: '2024-01-13 20:30',
      status: 'pending',
      shipping: '待发货',
      payment: '已支付',
      commission: '¥65'
    }
  ]

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || order.status === filter
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'shipped': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成'
      case 'shipped': return '已发货'
      case 'pending': return '待处理'
      case 'cancelled': return '已取消'
      default: return status
    }
  }

  const stats = [
    { label: '总订单数', value: '156', change: '+12.1%' },
    { label: 'AI渠道订单', value: '48', change: '+25.7%' },
    { label: '待处理订单', value: '2', change: '-1' },
    { label: '今日销售额', value: '¥8,298', change: '+18.3%' }
  ]

  return (
    <>
      <Head>
        <title>订单管理 - PayMind</title>
      </Head>
      <DashboardLayout userType="merchant">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">订单管理</h1>
              <p className="text-gray-600">管理您的所有订单和发货状态</p>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              导出订单
            </button>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <div className="flex items-baseline justify-between mt-2">
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  <span className="text-sm text-green-600">{stat.change}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', name: '全部订单' },
                  { id: 'pending', name: '待处理' },
                  { id: 'shipped', name: '已发货' },
                  { id: 'completed', name: '已完成' },
                  { id: 'cancelled', name: '已取消' }
                ].map((filterOption) => (
                  <button
                    key={filterOption.id}
                    onClick={() => setFilter(filterOption.id as any)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      filter === filterOption.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filterOption.name}
                  </button>
                ))}
              </div>
              
              <div className="relative lg:w-64">
                <input
                  type="text"
                  placeholder="搜索订单号、客户、商品..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  🔍
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">订单列表</h2>
          </div>
          <div className="p-6">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">📦</div>
                <p>没有找到符合条件的订单</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-sm font-medium text-gray-600">订单号</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">客户</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">商品</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">金额</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">渠道</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">日期</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">状态</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">佣金</th>
                      <th className="text-left py-3 text-sm font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="py-4">
                          <p className="font-medium text-gray-900">{order.id}</p>
                        </td>
                        <td className="py-4 text-gray-900">{order.customer}</td>
                        <td className="py-4">
                          <p className="text-gray-900">{order.product}</p>
                        </td>
                        <td className="py-4 text-gray-900 font-semibold">{order.amount}</td>
                        <td className="py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            order.channel.includes('AI') ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {order.channel}
                          </span>
                        </td>
                        <td className="py-4 text-gray-600 text-sm">{order.date}</td>
                        <td className="py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className={`font-medium ${
                            order.commission === '-' ? 'text-gray-500' : 'text-green-600'
                          }`}>
                            {order.commission}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                              详情
                            </button>
                            {order.status === 'pending' && (
                              <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                                发货
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        {/* Pagination */}
        <div className="mt-6 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            显示 1-{filteredOrders.length} 条，共 {orders.length} 条订单
          </p>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">
              上一页
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              1
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">
              2
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">
              下一页
            </button>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}

