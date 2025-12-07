import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

interface ProductAnalytics {
  productId: string
  name: string
  views: number
  purchases: number
  conversionRate: number
  revenue: number
  stock: number
}

export default function MerchantProductAnalytics() {
  const [analytics, setAnalytics] = useState<ProductAnalytics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      setAnalytics([
        {
          productId: 'prod_001',
          name: 'Premium会员',
          views: 1250,
          purchases: 125,
          conversionRate: 10,
          revenue: 12500,
          stock: 1000,
        },
        {
          productId: 'prod_002',
          name: '数字商品包',
          views: 850,
          purchases: 68,
          conversionRate: 8,
          revenue: 6800,
          stock: 500,
        },
      ])
    } catch (error) {
      console.error('加载商品分析失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout userType="merchant">
      <Head>
        <title>商品分析 - 商户中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">商品分析</h1>
          <p className="text-gray-600 mt-1">查看商品浏览量、转化率和销售数据</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">浏览量</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">购买数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">转化率</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">收入</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">库存</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.map((item) => (
                  <tr key={item.productId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.views.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{item.purchases}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${item.conversionRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-700">{item.conversionRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ¥{item.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${
                        item.stock < 50 ? 'text-red-600 font-semibold' : 'text-gray-700'
                      }`}>
                        {item.stock}
                        {item.stock < 50 && ' (库存不足)'}
                      </span>
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
