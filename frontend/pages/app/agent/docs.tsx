import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState } from 'react'

export default function AgentDocs() {
  const [activeTab, setActiveTab] = useState<'api' | 'examples' | 'best-practices' | 'faq'>('api')

  const apiDocs = [
    {
      title: '商品搜索',
      method: 'POST',
      endpoint: '/api/marketplace/products/search',
      description: '搜索商品',
      code: `const results = await agentrix.agents.searchProducts('running shoes', {
  priceMax: 150
})`,
    },
    {
      title: '创建订单',
      method: 'POST',
      endpoint: '/api/marketplace/orders',
      description: '为用户创建订单',
      code: `const order = await agentrix.agents.createOrder({
  productId: 'prod_123',
  userId: 'user_123',
  quantity: 1
})`,
    },
    {
      title: '创建支付',
      method: 'POST',
      endpoint: '/api/payments',
      description: '创建支付请求',
      code: `const payment = await agentrix.payments.create({
  amount: 99.99,
  currency: 'USD',
  description: 'Purchase: Premium'
})`,
    },
  ]

  return (
    <DashboardLayout userType="agent">
      <Head>
        <title>集成文档 - Agent中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">集成文档</h1>
          <p className="text-gray-600 mt-1">API文档、示例代码和最佳实践</p>
        </div>

        {/* 标签页 */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'api', label: 'API文档' },
              { id: 'examples', label: '示例代码' },
              { id: 'best-practices', label: '最佳实践' },
              { id: 'faq', label: '常见问题' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* API文档 */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            {apiDocs.map((doc, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    doc.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                    doc.method === 'GET' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {doc.method}
                  </span>
                  <code className="text-sm font-mono text-gray-700">{doc.endpoint}</code>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{doc.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{doc.description}</p>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm">{doc.code}</code>
                </pre>
              </div>
            ))}
          </div>
        )}

        {/* 示例代码 */}
        {activeTab === 'examples' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">快速开始</h2>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
              <code className="text-sm">{`import { Agentrix } from '@agentrix/sdk'

const agentrix = new Agentrix({
  apiKey: 'your-api-key'
})

// 搜索商品
const products = await agentrix.agents.searchProducts('coffee')

// 创建订单
const order = await agentrix.agents.createOrder({
  productId: products[0].productId,
  userId: 'user_123'
})

// 创建支付
const payment = await agentrix.payments.create({
  amount: products[0].price,
  currency: 'USD',
  description: \`Purchase: \${products[0].title}\`
})`}</code>
            </pre>
          </div>
        )}

        {/* 最佳实践 */}
        {activeTab === 'best-practices' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">错误处理</h3>
              <p className="text-sm text-gray-600">
                始终使用try-catch处理API调用，并提供友好的错误提示给用户。
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">性能优化</h3>
              <p className="text-sm text-gray-600">
                使用缓存减少API调用，批量处理多个请求以提高效率。
              </p>
            </div>
          </div>
        )}

        {/* 常见问题 */}
        {activeTab === 'faq' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">如何获取API密钥？</h3>
              <p className="text-sm text-gray-600">
                在Agent中心 → API密钥管理中创建新的API密钥。
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">支持哪些支付方式？</h3>
              <p className="text-sm text-gray-600">
                支持Stripe、Apple Pay、Google Pay、加密货币和X402协议支付。
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

