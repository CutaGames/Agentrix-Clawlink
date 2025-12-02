import Head from 'next/head'
import { useState } from 'react'

export default function ApiStats() {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week')
  const [stats] = useState({
    totalCalls: 1250,
    successCalls: 1200,
    failedCalls: 50,
    successRate: 96,
    averageResponseTime: 245,
    endpoints: [
      { name: 'searchProducts', calls: 450, success: 435, avgTime: 180 },
      { name: 'createOrder', calls: 320, success: 310, avgTime: 320 },
      { name: 'createPayment', calls: 280, success: 275, avgTime: 280 },
      { name: 'getRecommendedProducts', calls: 200, success: 180, avgTime: 150 },
    ],
  })

  return (
    <>
      <Head>
        <title>API调用统计 - Agent控制台</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">API调用统计</h1>
                <p className="text-gray-600">监控您的API使用情况</p>
              </div>
              <div className="flex space-x-2">
                {(['day', 'week', 'month'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      timeRange === range
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {range === 'day' ? '今日' : range === 'week' ? '本周' : '本月'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-1">总调用数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCalls.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-1">成功调用</p>
              <p className="text-2xl font-bold text-green-600">{stats.successCalls.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-1">失败调用</p>
              <p className="text-2xl font-bold text-red-600">{stats.failedCalls}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-1">成功率</p>
              <p className="text-2xl font-bold text-blue-600">{stats.successRate}%</p>
            </div>
          </div>

          {/* API端点统计 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">API端点统计</h3>
            <div className="space-y-4">
              {stats.endpoints.map((endpoint) => (
                <div key={endpoint.name} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{endpoint.name}</p>
                      <p className="text-xs text-gray-600">
                        成功: {endpoint.success}/{endpoint.calls} ({((endpoint.success / endpoint.calls) * 100).toFixed(1)}%)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{endpoint.calls} 次</p>
                      <p className="text-xs text-gray-600">平均: {endpoint.avgTime}ms</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(endpoint.success / endpoint.calls) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

