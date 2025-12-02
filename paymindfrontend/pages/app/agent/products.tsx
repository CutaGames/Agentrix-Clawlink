import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState } from 'react'

export default function AgentProducts() {
  const [activeTab, setActiveTab] = useState<'available' | 'recommended' | 'performance'>('available')

  const availableProducts = [
    {
      id: '1',
      name: '联想 Yoga 笔记本电脑',
      price: '¥7,999',
      commission: '¥400',
      commissionRate: '5%',
      category: '电子产品',
      image: '💻',
      description: '高性能轻薄本，适合办公和娱乐'
    },
    {
      id: '2',
      name: '无线蓝牙耳机',
      price: '¥299', 
      commission: '¥24',
      commissionRate: '8%',
      category: '音频设备',
      image: '🎧',
      description: '降噪蓝牙耳机，续航时间长'
    },
    {
      id: '3',
      name: '智能手表',
      price: '¥1,299',
      commission: '¥78',
      commissionRate: '6%',
      category: '穿戴设备',
      image: '⌚',
      description: '健康监测，运动追踪'
    }
  ]

  const recommendedProducts = [
    {
      id: '1',
      name: '联想 Yoga 笔记本电脑',
      recommendations: 15,
      earnings: '¥1,234',
      conversionRate: '12.5%'
    },
    {
      id: '2',
      name: '无线蓝牙耳机', 
      recommendations: 23,
      earnings: '¥856',
      conversionRate: '18.3%'
    }
  ]

  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])

  // 语义搜索
  const handleSemanticSearch = async (query: string) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const token = localStorage.getItem('paymind_token')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/search/semantic?q=${encodeURIComponent(query)}&topK=10`,
        {
          headers: {
            'Authorization': `Bearer ${token || ''}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results || [])
      } else {
        // 如果API不存在，使用文本搜索
        const filtered = availableProducts.filter(product =>
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.category.toLowerCase().includes(query.toLowerCase())
        )
        setSearchResults(filtered)
      }
    } catch (error) {
      console.error('语义搜索失败:', error)
      // Fallback到文本搜索
      const filtered = availableProducts.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
      )
      setSearchResults(filtered)
    } finally {
      setIsSearching(false)
    }
  }

  const filteredProducts = searchTerm 
    ? (searchResults.length > 0 ? searchResults : availableProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    : availableProducts

  return (
    <>
      <Head>
        <title>商品推荐 - PayMind</title>
      </Head>
      <DashboardLayout userType="agent">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">商品推荐</h1>
              <p className="text-gray-600">发现高佣金商品，提升您的推荐收益</p>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="语义搜索商品（例如：买一台笔记本电脑）..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  // 防抖搜索
                  const timeoutId = setTimeout(() => {
                    handleSemanticSearch(e.target.value)
                  }, 500)
                  return () => clearTimeout(timeoutId)
                }}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  '🔍'
                )}
              </span>
            </div>
          </div>
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'available', name: '可推荐商品', count: availableProducts.length },
                { id: 'recommended', name: '已推荐商品', count: recommendedProducts.length },
                { id: 'performance', name: '推荐效果', count: '' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.name}</span>
                  {tab.count && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {activeTab === 'available' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="text-4xl text-center mb-4">{product.image}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{product.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">价格:</span>
                      <span className="font-semibold text-gray-900">{product.price}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">佣金:</span>
                      <span className="font-semibold text-green-600">{product.commission}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">佣金率:</span>
                      <span className="font-semibold text-blue-600">{product.commissionRate}</span>
                    </div>
                  </div>
                  <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                    加入推荐列表
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'recommended' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="space-y-4">
                {recommendedProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">💻</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-500">推荐次数: {product.recommendations}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{product.earnings}</p>
                      <p className="text-sm text-gray-500">转化率: {product.conversionRate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">推荐效果分析</h2>
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">📈</div>
              <p>推荐效果分析功能开发中...</p>
              <p className="text-sm mt-2">即将为您提供详细的推荐效果数据和优化建议</p>
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  )
}

