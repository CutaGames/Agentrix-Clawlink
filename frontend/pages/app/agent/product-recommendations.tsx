import Head from 'next/head'
import { useState } from 'react'

interface Recommendation {
  productId: string
  productName: string
  recommendations: number
  conversions: number
  conversionRate: number
  revenue: number
  userFeedback: {
    positive: number
    negative: number
  }
}

export default function ProductRecommendations() {
  const [recommendations] = useState<Recommendation[]>([
    {
      productId: 'prod_001',
      productName: 'Nike Air Max 2024',
      recommendations: 45,
      conversions: 12,
      conversionRate: 26.7,
      revenue: 1440,
      userFeedback: {
        positive: 8,
        negative: 2,
      },
    },
    {
      productId: 'prod_002',
      productName: 'Apple AirPods Pro',
      recommendations: 32,
      conversions: 8,
      conversionRate: 25.0,
      revenue: 1992,
      userFeedback: {
        positive: 6,
        negative: 1,
      },
    },
  ])

  return (
    <>
      <Head>
        <title>商品推荐统计 - Agent控制台</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">商品推荐统计</h1>
            <p className="text-gray-600">分析您的商品推荐效果</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">推荐商品列表</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">推荐次数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">转化数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">转化率</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">收入</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户反馈</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recommendations.map((rec) => (
                    <tr key={rec.productId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{rec.productName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{rec.recommendations}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{rec.conversions}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{rec.conversionRate.toFixed(1)}%</td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600">${rec.revenue.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600 text-sm">👍 {rec.userFeedback.positive}</span>
                          <span className="text-red-600 text-sm">👎 {rec.userFeedback.negative}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

