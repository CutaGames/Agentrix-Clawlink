import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

interface WishlistItem {
  id: string
  productId: string
  name: string
  price: number
  currency: string
  image?: string
  addedAt: string
  originalPrice?: number
}

export default function UserWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWishlist()
  }, [])

  const loadWishlist = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      setItems([
        {
          id: 'wl_001',
          productId: 'prod_001',
          name: 'Premium会员',
          price: 99,
          currency: 'CNY',
          originalPrice: 149,
          addedAt: '2025-01-10T00:00:00Z',
        },
        {
          id: 'wl_002',
          productId: 'prod_002',
          name: '数字商品包',
          price: 299,
          currency: 'CNY',
          addedAt: '2025-01-12T00:00:00Z',
        },
      ])
    } catch (error) {
      console.error('加载心愿单失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const addToCart = (item: WishlistItem) => {
    alert(`添加到购物车: ${item.name}`)
  }

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>收藏与心愿单 - 用户中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">收藏与心愿单</h1>
          <p className="text-gray-600 mt-1">管理您收藏的商品</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-4xl mb-4">❤️</div>
            <p className="text-gray-600">心愿单是空的</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden">
                {item.image && (
                  <img src={item.image} alt={item.name} className="w-full h-48 object-cover" />
                )}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.name}</h3>
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-xl font-bold text-gray-900">
                      ¥{item.price}
                    </span>
                    {item.originalPrice && item.originalPrice > item.price && (
                      <span className="text-sm text-gray-500 line-through">
                        ¥{item.originalPrice}
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => addToCart(item)}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      购买
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      移除
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    添加于 {new Date(item.addedAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
