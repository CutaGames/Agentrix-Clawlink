
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Navigation } from '../../../components/ui/Navigation'
import { Footer } from '../../../components/layout/Footer'
import { productApi, ProductInfo } from '../../../lib/api/product.api'
import { useCart } from '../../../contexts/CartContext'
import { useLocalization } from '../../../contexts/LocalizationContext'

export default function ProductDetailPage() {
  const { t } = useLocalization()
  const router = useRouter()
  const { productId } = router.query
  const { addItem, isInCart, getItemQuantity } = useCart()
  
  const [product, setProduct] = useState<ProductInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [addSuccess, setAddSuccess] = useState(false)

  useEffect(() => {
    if (productId && typeof productId === 'string') {
      loadProduct(productId)
    }
  }, [productId])

  const loadProduct = async (id: string) => {
    try {
      setLoading(true)
      const data = await productApi.getProduct(id)
      setProduct(data)
    } catch (error) {
      console.error('Failed to load product:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLoginClick = () => {
    router.push('/auth/login')
  }

  const handleAddToCart = async () => {
    if (!product || adding) return
    
    setAdding(true)
    try {
      await addItem(product.id, quantity, {
        id: product.id,
        name: product.name,
        description: product.description,
        price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
        currency: product.metadata?.currency || 'CNY',
        stock: product.stock,
        image: product.metadata?.image,
        category: product.category,
        merchantId: product.merchantId,
      })
      setAddSuccess(true)
      setTimeout(() => setAddSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to add to cart:', error)
    } finally {
      setAdding(false)
    }
  }

  const handleBuyNow = () => {
    if (!product) return
    router.push(`/pay/checkout?productId=${product.id}&quantity=${quantity}`)
  }

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta
    if (newQuantity >= 1 && (product?.stock === undefined || newQuantity <= product.stock)) {
      setQuantity(newQuantity)
    }
  }

  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case 'USD':
      case 'USDT':
      case 'USDC':
        return '$'
      case 'CNY':
        return '¥'
      case 'EUR':
        return '€'
      default:
        return ''
    }
  }

  const inCart = product ? isInCart(product.id) : false
  const cartQuantity = product ? getItemQuantity(product.id) : 0

  if (loading) {
    return (
      <>
        <Navigation onLoginClick={handleLoginClick} />
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-spin">⏳</div>
            <p>{t({ zh: '加载商品信息...' , en: 'Loading product information...' })}</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!product) {
    return (
      <>
        <Navigation onLoginClick={handleLoginClick} />
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-xl mb-2">{t({ zh: '商品不存在', en: 'Product not found' })}</p>
            <button
              onClick={() => router.push('/marketplace')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t({ zh: '返回商城', en: 'Back to Marketplace' })}
            </button>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const currency = product.metadata?.currency || 'CNY'
  const currencySymbol = getCurrencySymbol(currency)
  const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price
  const isOutOfStock = product.stock !== undefined && product.stock <= 0

  return (
    <>
      <Head>
        <title>{product.name} | Agentrix 商城</title>
        <meta name="description" content={product.description || product.name} />
      </Head>

      <Navigation onLoginClick={handleLoginClick} />

      <main className="min-h-screen bg-slate-950 text-white">
        <div className="container mx-auto px-6 py-12">
          {/* 面包屑导航 */}
          <nav className="mb-8 text-sm">
            <ol className="flex items-center gap-2 text-slate-400">
              <li>
                <button onClick={() => router.push('/marketplace')} className="hover:text-white">
                  商城
                </button>
              </li>
              <li>/</li>
              {product.category && (
                <>
                  <li>
                    <span className="text-slate-500">{product.category}</span>
                  </li>
                  <li>/</li>
                </>
              )}
              <li className="text-white">{product.name}</li>
            </ol>
          </nav>

          <div className="grid md:grid-cols-2 gap-12">
            {/* 商品图片 */}
            <div className="space-y-4">
              <div className="aspect-square bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex items-center justify-center">
                {product.metadata?.image ? (
                  <img
                    src={product.metadata.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-9xl">🛍️</span>
                )}
              </div>
              
              {/* 缩略图列表（预留） */}
              {/* <div className="flex gap-2 overflow-x-auto">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-20 h-20 bg-white/5 rounded-lg flex-shrink-0" />
                ))}
              </div> */}
            </div>

            {/* 商品信息 */}
            <div className="space-y-6">
              {/* 商品名称和分类 */}
              <div>
                {product.category && (
                  <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full mb-3">
                    {product.category}
                  </span>
                )}
                <h1 className="text-3xl font-bold">{product.name}</h1>
              </div>

              {/* 价格 */}
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-green-400">
                    {currencySymbol}{price.toFixed(2)}
                  </span>
                  <span className="text-slate-400">{currency}</span>
                </div>
              </div>

              {/* 描述 */}
              {product.description && (
                <div>
                  <h2 className="text-lg font-semibold mb-2">{t({ zh: '商品描述', en: 'Product Description' })}</h2>
                  <p className="text-slate-300 leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* 库存状态 */}
              <div className="flex items-center gap-4">
                <span className="text-slate-400">{t({ zh: '库存状态:', en: 'Stock Status:' })}</span>
                {isOutOfStock ? (
                  <span className="text-red-400">{t({ zh: '已售罄', en: 'Out of Stock' })}</span>
                ) : product.stock !== undefined ? (
                  <span className="text-green-400">{t({ zh: `有货 (${product.stock}件)`, en: `In Stock (${product.stock} items)` })}</span>
                ) : (
                  <span className="text-green-400">{t({ zh: '有货', en: 'In Stock' })}</span>
                )}
              </div>

              {/* 购物车状态 */}
              {inCart && (
                <div className="flex items-center gap-2 text-blue-400">
                  <span>✓</span>
                  <span>{t({ zh: `已在购物车中 (${cartQuantity}件)`, en: `Already in cart (${cartQuantity} items)` })}</span>
                  <button
                    onClick={() => router.push('/app/cart')}
                    className="underline hover:text-blue-300"
                  >
                    {t({ zh: '查看购物车', en: 'View Cart' })}
                  </button>
                </div>
              )}

              {/* 数量选择 */}
              <div className="flex items-center gap-4">
                <span className="text-slate-400">{t({ zh: '购买数量:', en: 'Quantity:' })}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-xl"
                  >
                    -
                  </button>
                  <span className="w-16 text-center text-xl font-semibold">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={product.stock !== undefined && quantity >= product.stock}
                    className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-xl"
                  >
                    +
                  </button>
                </div>
                <span className="text-slate-400 text-sm">
                  {t({ zh: '小计:', en: 'Subtotal:' })} {currencySymbol}{(price * quantity).toFixed(2)}
                </span>
              </div>

              {/* 添加成功提示 */}
              {addSuccess && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-green-400 flex items-center gap-2">
                  <span>✓</span>
                  <span>{t({ zh: '已添加到购物车', en: 'Added to cart' })}</span>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || adding}
                  className="flex-1 py-4 border border-blue-500 text-blue-400 rounded-xl font-semibold hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {adding ? t({ zh: '添加中...', en: 'Adding...' }) : inCart ? t({ zh: '再次加入购物车', en: 'Add to Cart Again' }) : t({ zh: '加入购物车', en: 'Add to Cart' })}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {t({ zh: '立即购买', en: 'Buy Now' })}
                </button>
              </div>

              {/* 商品类型和支付方式 */}
              <div className="bg-white/5 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold mb-3">{t({ zh: '商品信息', en: 'Product Information' })}</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{t({ zh: '商品类型', en: 'Product Type' })}</span>
                  <span>{product.metadata?.productType || t({ zh: '实体商品', en: 'Physical Product' })}</span>
                </div>
                {product.metadata?.paymentMethod && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{t({ zh: '支持支付', en: 'Supported Payment' })}</span>
                    <span>
                      {product.metadata.paymentMethod === 'quickpay' ? 'QuickPay' :
                       product.metadata.paymentMethod === 'wallet' ? t({ zh: '钱包支付', en: 'Wallet Payment' }) :
                       product.metadata.paymentMethod === 'all' ? t({ zh: '全部方式', en: 'All Methods' }) : t({ zh: '多种方式', en: 'Multiple Methods' })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{t({ zh: '商品ID', en: 'Product ID' })}</span>
                  <span className="font-mono text-xs">{product.id.slice(0, 12)}...</span>
                </div>
              </div>
            </div>
          </div>

          {/* 相关推荐（预留） */}
          {/* <section className="mt-16">
            <h2 className="text-2xl font-bold mb-6">相关推荐</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              ...
            </div>
          </section> */}
        </div>
      </main>

      <Footer />
    </>
  )
}
