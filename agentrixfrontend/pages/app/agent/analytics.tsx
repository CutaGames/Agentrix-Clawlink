import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState } from 'react'

export default function AgentAnalytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  const analyticsData = {
    conversionRate: '12.5%',
    avgOrderValue: '¥642',
    userRetention: '68.3%',
    recommendationEfficiency: '8.2/10'
  }

  const performanceMetrics = [
    { metric: '点击率', value: '15.3%', change: '+2.1%', trend: 'up' },
    { metric: '转化率', value: '12.5%', change: '+1.8%', trend: 'up' },
    { metric: '平均响应时间', value: '1.2s', change: '-0.3s', trend: 'up' },
    { metric: '用户满意度', value: '4.8/5', change: '+0.2', trend: 'up' }
  ]

  const userBehavior = [
    { time: '09:00', conversions: 8, revenue: '¥5,120' },
    { time: '12:00', conversions: 12, revenue: '¥7,680' },
    { time: '15:00', conversions: 6, revenue: '¥3,840' },
    { time: '18:00', conversions: 15, revenue: '¥9,600' },
    { time: '21:00', conversions: 10, revenue: '¥6,400' }
  ]

  const topPerformingProducts = [
    { name: '联想 Yoga 笔记本电脑', conversions: 15, revenue: '¥11,985', cr: '15.8%' },
    { name: '无线蓝牙耳机', conversions: 23, revenue: '¥6,877', cr: '18.3%' },
    { name: '智能手表', conversions: 8, revenue: '¥10,392', cr: '12.1%' },
    { name: '机械键盘', conversions: 7, revenue: '¥4,193', cr: '11.5%' }
  ]

  return (
    <>
      <Head>
        <title>数据分析 - Agentrix</title>
      </Head>
      <DashboardLayout userType="agent">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">数据分析</h1>
              <p className="text-gray-600">深入了解您的推荐效果和用户行为</p>
            </div>
            <div className="flex space-x-2">
              {[
                { id: '7d', name: '7天' },
                { id: '30d', name: '30天' },
                { id: '90d', name: '90天' }
              ].map((range) => (
                <button
                  key={range.id}
                  onClick={() => setTimeRange(range.id as any)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    timeRange === range.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: '转化率', value: analyticsData.conversionRate, icon: '📊', description: '推荐成功转化比例' },
            { label: '客单价', value: analyticsData.avgOrderValue, icon: '💰', description: '平均订单金额' },
            { label: '用户留存', value: analyticsData.userRetention, icon: '👥', description: '重复使用率' },
            { label: '推荐效率', value: analyticsData.recommendationEfficiency, icon: '🎯', description: 'AI推荐评分' }
          ].map((metric, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl">{metric.icon}</div>
              </div>
              <p className="text-sm font-medium text-gray-600">{metric.label}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{metric.value}</p>
              <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Performance Metrics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">性能指标</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {performanceMetrics.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{item.metric}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{item.value}</p>
                      <p className={`text-sm ${
                        item.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.change}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* User Behavior Patterns */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">用户行为模式</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {userBehavior.map((behavior, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-600 w-16">{behavior.time}</span>
                    <div className="flex-1 mx-4">
                      <div className="flex space-x-1">
                        <div 
                          className="bg-blue-500 h-4 rounded"
                          style={{ width: `${(behavior.conversions / 15) * 100}%` }}
                        ></div>
                        <div 
                          className="bg-green-500 h-4 rounded"
                          style={{ width: `${Math.min((parseInt(behavior.revenue.replace('¥', '').replace(',', '')) / 10000) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right w-24">
                      <p className="text-sm text-gray-900">{behavior.conversions} 转化</p>
                      <p className="text-xs text-gray-500">{behavior.revenue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Top Performing Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">高绩效商品</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-sm font-medium text-gray-600">商品名称</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">转化数</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">收入</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">转化率</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-600">表现评分</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformingProducts.map((product, index) => (
                    <tr key={index} className="border-b border-gray-100 last:border-0">
                      <td className="py-4">
                        <p className="font-medium text-gray-900">{product.name}</p>
                      </td>
                      <td className="py-4 text-gray-900">{product.conversions}</td>
                      <td className="py-4 font-semibold text-gray-900">{product.revenue}</td>
                      <td className="py-4">
                        <span className="text-blue-600 font-medium">{product.cr}</span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`text-lg ${
                                i < Math.floor((parseFloat(product.cr) / 20) * 5)
                                  ? 'text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Optimization Suggestions */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2">优化建议</h3>
            <ul className="text-green-700 space-y-2 text-sm">
              <li>• 在18:00-21:00时段增加推荐频率</li>
              <li>• 高客单价商品搭配配件推荐</li>
              <li>• 优化无线耳机的推荐话术</li>
              <li>• 增加用户个性化偏好分析</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">增长机会</h3>
            <ul className="text-blue-700 space-y-2 text-sm">
              <li>• 拓展家居电子产品品类</li>
              <li>• 开发订阅制服务推荐</li>
              <li>• 优化移动端用户体验</li>
              <li>• 增加社交分享功能</li>
            </ul>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}

