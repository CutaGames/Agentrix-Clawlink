import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

interface Recommendation {
  productId: string
  productName: string
  recommendedCount: number
  purchaseCount: number
  conversionRate: number
  revenue: number
  avgRating?: number
}

export default function AgentRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecommendations()
  }, [])

  const loadRecommendations = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      setRecommendations([
        {
          productId: 'prod_001',
          productName: 'Premium会员',
          recommendedCount: 150,
          purchaseCount: 25,
          conversionRate: 16.67,
          revenue: 2475,
          avgRating: 4.5,
        },
        {
          productId: 'prod_002',
          productName: '数字商品包',
          recommendedCount: 100,
          purchaseCount: 15,
          conversionRate: 15,
          revenue: 4485,
          avgRating: 4.2,
        },
      ])
    } catch (error) {
      console.error('加载推荐统计失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout userType="agent">
      <Head>
        <title>商品推荐统计 - Agent中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">商品推荐统计</h1>
          <p className="text-gray-600 mt-1">查看您推荐商品的转化率和收入</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">推荐次数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">购买次数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">转化率</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">收入</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">评分</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recommendations.map((rec) => (
                  <tr key={rec.productId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{rec.productName}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{rec.recommendedCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{rec.purchaseCount}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${rec.conversionRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-700">{rec.conversionRate.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">¥{rec.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {rec.avgRating ? (
                        <div className="flex items-center">
                          <span className="text-sm text-yellow-500">⭐</span>
                          <span className="text-sm text-gray-700 ml-1">{rec.avgRating.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
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

