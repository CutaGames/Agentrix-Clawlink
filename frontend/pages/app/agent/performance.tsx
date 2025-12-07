import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

interface PerformanceMetric {
  endpoint: string
  avgResponseTime: number
  successRate: number
  requestCount: number
  errorCount: number
}

export default function AgentPerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      setMetrics([
        {
          endpoint: '/api/products/search',
          avgResponseTime: 245,
          successRate: 98.5,
          requestCount: 1250,
          errorCount: 19,
        },
        {
          endpoint: '/api/orders/create',
          avgResponseTime: 320,
          successRate: 99.2,
          requestCount: 850,
          errorCount: 7,
        },
        {
          endpoint: '/api/payments/create',
          avgResponseTime: 450,
          successRate: 97.8,
          requestCount: 600,
          errorCount: 13,
        },
      ])
    } catch (error) {
      console.error('加载性能指标失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getResponseTimeColor = (time: number) => {
    if (time < 200) return 'text-green-600'
    if (time < 500) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 99) return 'text-green-600'
    if (rate >= 95) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <DashboardLayout userType="agent">
      <Head>
        <title>性能监控 - Agent中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">性能监控</h1>
          <p className="text-gray-600 mt-1">监控Agent API的性能指标</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API端点</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">平均响应时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">成功率</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">请求数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">错误数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {metrics.map((metric, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 font-mono">
                      {metric.endpoint}
                    </td>
                    <td className={`px-6 py-4 text-sm font-semibold ${getResponseTimeColor(metric.avgResponseTime)}`}>
                      {metric.avgResponseTime}ms
                    </td>
                    <td className={`px-6 py-4 text-sm font-semibold ${getSuccessRateColor(metric.successRate)}`}>
                      {metric.successRate}%
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{metric.requestCount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-red-600">{metric.errorCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

