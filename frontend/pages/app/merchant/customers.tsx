import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { merchantApi, MerchantCustomer } from '../../../lib/api/merchant.api'

export default function MerchantCustomers() {
  const [customers, setCustomers] = useState<MerchantCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await merchantApi.getCustomers({ search: search || undefined })
      setCustomers(data.customers || [])
    } catch (error) {
      console.error('加载客户列表失败:', error)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout userType="merchant">
      <Head>
        <title>客户管理 - 商户中心</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">客户管理</h1>
            <p className="text-gray-600 mt-1">管理您的客户信息和消费记录</p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索客户..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">累计消费</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最后订单</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标签</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ¥{(customer.totalSpent || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{customer.orderCount || customer.totalOrders || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {(customer.lastOrderDate || customer.lastOrderAt) ? new Date(customer.lastOrderDate || customer.lastOrderAt!).toLocaleDateString('zh-CN') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-1">
                        {(customer.tags || []).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        查看详情
                      </button>
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
