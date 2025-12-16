import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { productApi, ProductInfo } from '../../lib/api/product.api'
import { useCart } from '../../contexts/CartContext'
import { useLocalization } from '../../contexts/LocalizationContext'

interface Product {
  id: string
  name: { zh: string; en: string }
  description: { zh: string; en: string }
  price: number
  currency: string
  category: 'electronics' | 'clothing' | 'books' | 'home' | 'food' | 'other'
  merchant: { zh: string; en: string }
  image?: string
  rating?: number
  stock?: number
}

interface Service {
  id: string
  name: { zh: string; en: string }
  description: { zh: string; en: string }
  price: number
  currency: string
  category: 'consultation' | 'subscription' | 'technical' | 'design' | 'marketing' | 'other'
  merchant: { zh: string; en: string }
  duration?: string
  rating?: number
}

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: { zh: '联想 Yoga 14s 笔记本电脑', en: 'Lenovo Yoga 14s Laptop' },
    description: { zh: '14英寸 2.8K高分辨率屏幕，AMD Ryzen 7处理器，16GB内存，512GB SSD', en: '14-inch 2.8K high-resolution screen, AMD Ryzen 7 processor, 16GB RAM, 512GB SSD' },
    price: 5999,
    currency: 'CNY',
    category: 'electronics',
    merchant: { zh: '联想官方旗舰店', en: 'Lenovo Official Store' },
    rating: 4.8,
    stock: 15,
  },
  {
    id: 'prod-2',
    name: { zh: 'Apple AirPods Pro 2', en: 'Apple AirPods Pro 2' },
    description: { zh: '主动降噪，空间音频，MagSafe充电盒', en: 'Active noise cancellation, spatial audio, MagSafe charging case' },
    price: 1899,
    currency: 'CNY',
    category: 'electronics',
    merchant: { zh: 'Apple官方', en: 'Apple Official' },
    rating: 4.9,
    stock: 50,
  },
  {
    id: 'prod-3',
    name: { zh: 'Kindle Paperwhite 电子书阅读器', en: 'Kindle Paperwhite E-reader' },
    description: { zh: '6.8英寸屏幕，32GB存储，防水设计', en: '6.8-inch screen, 32GB storage, waterproof design' },
    price: 899,
    currency: 'CNY',
    category: 'electronics',
    merchant: { zh: '亚马逊官方', en: 'Amazon Official' },
    rating: 4.7,
    stock: 30,
  },
  {
    id: 'prod-4',
    name: { zh: 'Nike Air Max 270 运动鞋', en: 'Nike Air Max 270 Sneakers' },
    description: { zh: '经典气垫设计，舒适透气', en: 'Classic air cushion design, comfortable and breathable' },
    price: 799,
    currency: 'CNY',
    category: 'clothing',
    merchant: { zh: 'Nike官方', en: 'Nike Official' },
    rating: 4.6,
    stock: 25,
  },
  {
    id: 'prod-5',
    name: { zh: '《AI商业应用指南》', en: 'AI Business Applications Guide' },
    description: { zh: '全面介绍AI在商业领域的应用案例和实践方法', en: 'Comprehensive introduction to AI application cases and practical methods in business' },
    price: 89,
    currency: 'CNY',
    category: 'books',
    merchant: { zh: '科技出版社', en: 'Tech Publishing' },
    rating: 4.5,
    stock: 100,
  },
]

const mockServices: Service[] = [
  {
    id: 'svc-1',
    name: { zh: 'AI Agent 开发咨询服务', en: 'AI Agent Development Consulting' },
    description: { zh: '提供AI Agent架构设计、开发指导、最佳实践咨询', en: 'Provides AI Agent architecture design, development guidance, and best practices consulting' },
    price: 500,
    currency: 'CNY',
    category: 'consultation',
    merchant: { zh: 'Agentrix技术团队', en: 'Agentrix Tech Team' },
    duration: '1小时',
    rating: 4.9,
  },
  {
    id: 'svc-2',
    name: { zh: 'Agentrix SDK 企业版订阅', en: 'Agentrix SDK Enterprise Subscription' },
    description: { zh: '包含高级API、优先支持、定制化功能', en: 'Includes advanced APIs, priority support, and customized features' },
    price: 999,
    currency: 'CNY',
    category: 'subscription',
    merchant: { zh: 'Agentrix', en: 'Agentrix' },
    duration: '月度',
    rating: 4.8,
  },
  {
    id: 'svc-3',
    name: { zh: '智能支付系统集成服务', en: 'Smart Payment System Integration Service' },
    description: { zh: '帮助商户快速集成Agentrix支付系统，包含技术支持和培训', en: 'Help merchants quickly integrate Agentrix payment system, including technical support and training' },
    price: 5000,
    currency: 'CNY',
    category: 'technical',
    merchant: { zh: 'Agentrix专业服务', en: 'Agentrix Professional Services' },
    duration: '一次性',
    rating: 4.7,
  },
  {
    id: 'svc-4',
    name: { zh: 'UI/UX设计服务', en: 'UI/UX Design Service' },
    description: { zh: '专业的界面设计和用户体验优化服务', en: 'Professional interface design and user experience optimization services' },
    price: 3000,
    currency: 'CNY',
    category: 'design',
    merchant: { zh: '设计工作室', en: 'Design Studio' },
    duration: '项目制',
    rating: 4.6,
  },
  {
    id: 'svc-5',
    name: { zh: '数字营销策略咨询', en: 'Digital Marketing Strategy Consulting' },
    description: { zh: '提供数字营销策略、SEO优化、社交媒体营销方案', en: 'Provides digital marketing strategies, SEO optimization, and social media marketing solutions' },
    price: 2000,
    currency: 'CNY',
    category: 'marketing',
    merchant: { zh: '营销咨询公司', en: 'Marketing Consulting Company' },
    duration: '月度',
    rating: 4.5,
  },
]

interface ProductServiceSectionProps {
  type: 'physical' | 'service' | 'digital'
}

export function ProductServiceSection({ type }: ProductServiceSectionProps) {
  const router = useRouter()
  const { addItem, isInCart } = useCart()
  const { t } = useLocalization()
  const [products, setProducts] = useState<ProductInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await productApi.getProducts()
      if (data && data.length > 0) {
        setProducts(data)
      } else {
        const mocks = [...mockProducts, ...mockServices].map(m => ({
            id: m.id,
            name: t(m.name),
            description: t(m.description),
            price: m.price,
            stock: (m as any).stock || 999,
            category: m.category,
            merchantId: t(m.merchant),
            metadata: {
                currency: m.currency,
                productType: (m.id.startsWith('svc') ? 'service' : 'physical')
            }
        })) as any
        setProducts(mocks)
      }
    } catch (error) {
      console.error('加载商品失败:', error)
      const mocks = [...mockProducts, ...mockServices].map(m => ({
            id: m.id,
            name: t(m.name),
            description: t(m.description),
            price: m.price,
            stock: (m as any).stock || 999,
            category: m.category,
            merchantId: t(m.merchant),
            metadata: {
                currency: m.currency,
                productType: (m.id.startsWith('svc') ? 'service' : 'physical')
            }
        })) as any
        setProducts(mocks)
    } finally {
      setLoading(false)
    }
  }

  const handleProductClick = (product: ProductInfo) => {
    // 跳转到商品详情页
    router.push(`/marketplace/product/${product.id}`)
  }

  const handleServiceClick = (product: ProductInfo) => {
    // 跳转到商品详情页
    router.push(`/marketplace/product/${product.id}`)
  }

  const handleBuyNow = (product: ProductInfo) => {
    // 跳转到支付页面
    router.push(`/pay/checkout?productId=${product.id}`)
  }

  const handleAddToCart = async (product: ProductInfo) => {
    setAddingToCart(product.id)
    try {
      const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price
      await addItem(product.id, 1, {
        id: product.id,
        name: product.name,
        description: product.description,
        price,
        currency: product.metadata?.currency || 'CNY',
        stock: product.stock,
        image: product.metadata?.image,
        category: product.category,
        merchantId: product.merchantId,
      })
    } catch (error) {
      console.error('添加购物车失败:', error)
    } finally {
      setAddingToCart(null)
    }
  }

  const filteredProducts = products.filter((p) => {
      const pType = (p as any).productType || p.metadata?.productType || 'physical'
      return pType === type
  })

  if (loading) return <div className="py-20 text-center">Loading...</div>

  if (filteredProducts.length === 0) {
      return (
          <div className="py-20 text-center text-slate-500">
              {t({ zh: '暂无商品', en: 'No products found' })}
          </div>
      )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {filteredProducts.map((product) => (
        <div 
            key={product.id} 
            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleProductClick(product)}
        >
            <div className="h-48 bg-slate-100 flex items-center justify-center text-4xl">
                {type === 'physical' ? '📦' : type === 'service' ? '🛠️' : '💎'}
            </div>
            <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{product.name}</h3>
                    <span className="text-blue-600 font-bold">
                        {product.metadata?.currency || 'CNY'} {product.price}
                    </span>
                </div>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">{product.description}</p>
                
                <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
                        {product.merchantId || 'Agentrix'}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(product);
                        }}
                        disabled={addingToCart === product.id || isInCart(product.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isInCart(product.id)
                                ? 'bg-green-50 text-green-600'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        {addingToCart === product.id 
                            ? '...' 
                            : isInCart(product.id) 
                                ? t({ zh: '已在购物车', en: 'In Cart' }) 
                                : t({ zh: '加入购物车', en: 'Add to Cart' })}
                    </button>
                </div>
            </div>
        </div>
      ))}
    </div>
  )
}

