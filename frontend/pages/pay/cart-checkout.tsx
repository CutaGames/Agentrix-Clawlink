/**
 * 购物车批量结算页面
 * 
 * 功能:
 * - 支持多商品批量结算
 * - 显示订单汇总
 * - 集成SmartCheckout支付
 */

import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { SmartCheckout } from '../../components/payment/SmartCheckout'
import { productApi, ProductInfo } from '../../lib/api/product.api'
import { orderApi } from '../../lib/api/order.api'
import { Navigation } from '../../components/ui/Navigation'
import { Footer } from '../../components/layout/Footer'
import { useLocalization } from '../../contexts/LocalizationContext'
import { useCart } from '../../contexts/CartContext'

interface CheckoutItem {
  productId: string
  quantity: number
  product?: ProductInfo
}

export default function CartCheckoutPage() {
  const router = useRouter()
  const { clearCart } = useCart()
  const [items, setItems] = useState<CheckoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCheckout, setShowCheckout] = useState(false)
  const [order, setOrder] = useState<any>(null)
  const [orderError, setOrderError] = useState<string | null>(null)
  const { t } = useLocalization()

  useEffect(() => {
    const { items: itemsParam } = router.query
    if (itemsParam && typeof itemsParam === 'string') {
      try {
        const parsedItems = JSON.parse(decodeURIComponent(itemsParam))
        loadProducts(parsedItems)
      } catch (e) {
        console.error('解析商品参数失败:', e)
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [router.query])

  const loadProducts = async (checkoutItems: { productId: string; quantity: number }[]) => {
    try {
      setLoading(true)
      // 并行加载所有商品信息
      const productPromises = checkoutItems.map(async (item) => {
        try {
          const product = await productApi.getProduct(item.productId)
          return { ...item, product }
        } catch (e) {
          console.error(`Failed to load product ${item.productId}:`, e)
          return item
        }
      })
      const loadedItems = await Promise.all(productPromises)
      setItems(loadedItems)
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      setLoading(false)
    }
  }

  // 计算总价
  const totalAmount = items.reduce((sum, item) => {
    const price = item.product?.price || 0
    return sum + price * item.quantity
  }, 0)

  // 获取货币（假设所有商品使用相同货币）
  const currency = items[0]?.product?.metadata?.currency || 'CNY'

  // 获取第一个商户ID（简化处理，实际可能需要处理多商户）
  const merchantId = items[0]?.product?.merchantId

  const handleStartPayment = async () => {
    if (items.length === 0) return;
    
    if (order) {
      setShowCheckout(true);
      return;
    }

    try {
      setOrderError(null);
      await createOrder();
    } catch (error: any) {
      setOrderError(error.message || '创建订单失败');
    }
  }

  const createOrder = async () => {
    try {
      if (!merchantId) {
        throw new Error('无法确定商户信息');
      }

      // 构建订单商品列表
      const orderItems = items.map(item => ({
        productId: item.productId,
        productName: item.product?.name || '未知商品',
        quantity: item.quantity,
        price: item.product?.price || 0,
        subtotal: (item.product?.price || 0) * item.quantity,
      }))

      console.log('创建批量订单:', {
        merchantId,
        totalAmount,
        currency,
        items: orderItems,
      });

      // 创建订单
      const orderData = await orderApi.createOrder({
        merchantId,
        amount: totalAmount,
        currency,
        metadata: {
          assetType: 'cart_order',
          isCartOrder: true,
          items: orderItems,
          itemCount: items.length,
        },
      })

      setOrder(orderData)
      setShowCheckout(true)
    } catch (error: any) {
      console.error('创建订单失败:', error)
      setOrderError(error.message || '创建订单失败，请重试')
      throw error;
    }
  }

  const handlePaymentSuccess = async (result: any) => {
    console.log('Payment successful:', result)
    setShowCheckout(false)
    
    // 清空购物车中已结算的商品
    try {
      await clearCart()
    } catch (e) {
      console.error('Failed to clear cart:', e)
    }

    const params = new URLSearchParams()
    if (result?.id) {
      params.set('paymentId', result.id)
    }
    if (order?.id) {
      params.set('orderId', order.id)
    }
    params.set('type', 'cart')
    router.push(`/pay/success${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const handlePaymentCancel = () => {
    setShowCheckout(false)
  }

  const handleLoginClick = () => {
    router.push('/auth/login')
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

  if (loading) {
    return (
      <>
        <Navigation onLoginClick={handleLoginClick} />
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-spin">⏳</div>
            <p>{t({ zh: '加载订单信息...', en: 'Loading order details...' })}</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (items.length === 0) {
    return (
      <>
        <Navigation onLoginClick={handleLoginClick} />
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-xl mb-2">{t({ zh: '没有可结算的商品', en: 'No items to checkout' })}</p>
            <button
              onClick={() => router.push('/app/cart')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t({ zh: '返回购物车', en: 'Back to Cart' })}
            </button>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{t({ zh: '订单结算', en: 'Checkout' })} | Agentrix</title>
        <meta name="description" content={t({ zh: '确认您的订单并完成支付', en: 'Review your order and complete payment' })} />
      </Head>

      <Navigation onLoginClick={handleLoginClick} />

      <main className="min-h-screen bg-slate-950 text-white">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-3xl mx-auto">
            {/* 标题 */}
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <span>📦</span>
              {t({ zh: '确认订单', en: 'Confirm Order' })}
            </h1>

            {/* 订单商品列表 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>🛍️</span>
                {t({ zh: '商品清单', en: 'Order Items' })}
                <span className="text-sm text-slate-400">({items.length} {t({ zh: '件', en: 'items' })})</span>
              </h2>
              
              <div className="space-y-4">
                {items.map((item) => (
                  <div 
                    key={item.productId}
                    className="flex items-center gap-4 p-4 bg-white/5 rounded-xl"
                  >
                    {/* 商品图片 */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                      {item.product?.metadata?.image ? (
                        <img
                          src={item.product.metadata.image}
                          alt={item.product.name || t({ zh: '商品图片', en: 'Product image' })}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          🛍️
                        </div>
                      )}
                    </div>

                    {/* 商品信息 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {item.product?.name || t({ zh: '未知商品', en: 'Unknown product' })}
                      </h3>
                      <div className="text-sm text-slate-400 mt-1">
                        {t({ zh: '单价', en: 'Unit price' })}: {getCurrencySymbol(item.product?.metadata?.currency || currency)}
                        {item.product?.price?.toFixed(2) || '0.00'}
                        <span className="mx-2">×</span>
                        {item.quantity}
                      </div>
                    </div>

                    {/* 小计 */}
                    <div className="text-right">
                      <div className="font-bold text-green-400">
                        {getCurrencySymbol(item.product?.metadata?.currency || currency)}
                        {((item.product?.price || 0) * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 订单汇总 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>📋</span>
                {t({ zh: '订单汇总', en: 'Order Summary' })}
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between text-slate-400">
                  <span>{t({ zh: '商品总数', en: 'Total items' })}</span>
                  <span>{items.reduce((sum, item) => sum + item.quantity, 0)} {t({ zh: '件', en: 'items' })}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{t({ zh: '商品金额', en: 'Subtotal' })}</span>
                  <span>{getCurrencySymbol(currency)}{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{t({ zh: '运费', en: 'Shipping' })}</span>
                  <span className="text-green-400">{t({ zh: '免运费', en: 'Free shipping' })}</span>
                </div>
                <div className="h-px bg-white/10 my-2"></div>
                <div className="flex justify-between text-xl font-bold">
                  <span>{t({ zh: '应付金额', en: 'Total' })}</span>
                  <span className="text-green-400">
                    {getCurrencySymbol(currency)}{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* 错误提示 */}
            {orderError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                <p className="text-sm text-red-300">
                  ❌ {orderError}
                </p>
              </div>
            )}

            {/* 支付按钮 */}
            {!showCheckout && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-sm text-blue-300 mb-4">
                  💡 {t({ zh: '点击下方按钮开始支付，系统将自动选择最优支付方式', en: 'Click the button below to start payment, system will auto-select optimal payment method' })}
                </p>
                <button
                  onClick={handleStartPayment}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-xl font-semibold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>💳</span>
                  <span>
                    {t({ zh: '立即支付', en: 'Pay Now' })} {getCurrencySymbol(currency)}{totalAmount.toFixed(2)}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SmartCheckout */}
        {showCheckout && order && (
          <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
            <div className="min-h-screen flex items-start justify-center p-6 pt-12">
              <div className="relative w-full max-w-4xl">
                <SmartCheckout
                  order={{
                    id: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    description: t({ zh: `购物车订单 (${items.length}件商品)`, en: `Cart order (${items.length} items)` }),
                    merchantId: merchantId || '',
                    to: order.metadata?.paymentAddress || order.metadata?.to,
                    metadata: {
                      orderId: order.id,
                      assetType: 'cart_order',
                      isCartOrder: true,
                      itemCount: items.length,
                    },
                  }}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  )
}
