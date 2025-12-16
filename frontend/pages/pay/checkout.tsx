import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { SmartCheckout } from '../../components/payment/SmartCheckout'
import { productApi, ProductInfo } from '../../lib/api/product.api'
import { orderApi } from '../../lib/api/order.api'
import { Navigation } from '../../components/ui/Navigation'
import { Footer } from '../../components/layout/Footer'
import { useLocalization } from '../../contexts/LocalizationContext'

export default function CheckoutPage() {
  const router = useRouter()
  const { productId } = router.query
  const [product, setProduct] = useState<ProductInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCheckout, setShowCheckout] = useState(false)
  const [order, setOrder] = useState<any>(null)
  const [orderError, setOrderError] = useState<string | null>(null)
  const { t } = useLocalization()

  useEffect(() => {
    if (productId && typeof productId === 'string') {
      loadProduct(productId)
    } else {
      setLoading(false)
    }
  }, [productId])

  const loadProduct = async (id: string) => {
    try {
      setLoading(true)
      const data = await productApi.getProduct(id)
      setProduct(data)
      setLoading(false)
      // Don't auto-create order, let user click button first
    } catch (error) {
      console.error('Failed to load product:', error)
      setLoading(false)
    }
  }

  const handleStartPayment = async () => {
    if (!product) return;
    
    // 如果订单已创建，直接显示支付界面
    if (order) {
      setShowCheckout(true);
      return;
    }

    // 否则创建订单
    try {
      setOrderError(null);
      await createOrder(product);
    } catch (error: any) {
      setOrderError(error.message || '创建订单失败');
    }
  }

  const createOrder = async (productData: ProductInfo) => {
    try {
      // 确保 amount 是数字类型，并处理可能的字符串或 decimal 类型
      let amount: number;
      if (typeof productData.price === 'string') {
        amount = parseFloat(productData.price);
      } else if (typeof productData.price === 'number') {
        amount = productData.price;
      } else {
        amount = Number(productData.price);
      }
      
      if (isNaN(amount) || amount <= 0) {
        throw new Error(`商品价格无效: ${productData.price}`);
      }

      console.log('创建订单参数:', {
        productId: productData.id,
        merchantId: productData.merchantId,
        amount: amount,
        amountType: typeof amount,
        currency: productData.metadata?.currency || 'CNY',
      });

      // 创建订单
      const orderData = await orderApi.createOrder({
        productId: productData.id,
        merchantId: productData.merchantId,
        amount: amount, // 确保是数字类型
        currency: productData.metadata?.currency || 'CNY',
        metadata: {
          assetType: productData.metadata?.assetType || 'physical',
          productType: productData.metadata?.productType,
          paymentMethod: productData.metadata?.paymentMethod,
        },
      })

      setOrder(orderData)
      setShowCheckout(true)
    } catch (error: any) {
      console.error('创建订单失败:', error)
      setOrderError(error.message || '创建订单失败，请重试')
      throw error; // 重新抛出错误，让调用者处理
    }
  }

  const handlePaymentSuccess = async (result: any) => {
    console.log('Payment successful:', result)
    setShowCheckout(false)
    const params = new URLSearchParams()
    if (result?.id) {
      params.set('paymentId', result.id)
    }
    if (order?.id) {
      params.set('orderId', order.id)
    }
    router.push(`/pay/success${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const handlePaymentCancel = () => {
    setShowCheckout(false)
    router.back()
  }

  const handleLoginClick = () => {
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <>
        <Navigation onLoginClick={handleLoginClick} />
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-spin">⏳</div>
            <p>{t({ zh: '加载中...', en: 'Loading...' })}</p>
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
              {t({ zh: '返回 Marketplace', en: 'Back to Marketplace' })}
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
        <title>{t({ zh: '支付', en: 'Checkout' })} - {product.name} | Agentrix</title>
        <meta name="description" content={`${t({ zh: '支付', en: 'Pay for' })} ${product.name}`} />
      </Head>

      <Navigation onLoginClick={handleLoginClick} />

      <main className="min-h-screen bg-slate-950 text-white">
        {/* 商品信息卡片 */}
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
              <div className="flex items-start gap-6">
                {product.metadata?.image && (
                  <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={product.metadata.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
                  {product.description && (
                    <p className="text-slate-300 mb-4">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-green-400 mb-1">
                        {product.metadata?.currency === 'USDT' ? '$' : '¥'}
                        {product.price}
                      </div>
                      {product.metadata?.currency && (
                        <div className="text-sm text-slate-400">
                          {product.metadata.currency}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-400 mb-1">{t({ zh: '库存', en: 'Stock' })}</div>
                      <div className="text-lg font-semibold">{product.stock}</div>
                    </div>
                  </div>
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

            {/* 支付提示和按钮 */}
            {!showCheckout && (
              <>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                  <p className="text-sm text-blue-300 mb-4">
                    💡 {t({ zh: '点击下方按钮开始支付，系统将自动选择最优支付方式', en: 'Click the button below to start payment, system will auto-select optimal payment method' })}
                  </p>
                  <button
                    onClick={handleStartPayment}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-xl font-semibold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        <span>{t({ zh: '加载中...', en: 'Loading...' })}</span>
                      </>
                    ) : (
                      <>
                        <span>💳</span>
                        <span>
                          {t({ zh: '立即支付', en: 'Pay Now' })} {product.metadata?.currency === 'USDT' ? '$' : '¥'}
                          {product.price} {product.metadata?.currency || 'CNY'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* V7.0 Smart Checkout */}
        {showCheckout && order && (
          <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
            <div className="min-h-screen flex items-start justify-center p-6 pt-12">
              <div className="relative w-full max-w-4xl">
                <SmartCheckout
                  order={{
                    id: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    description: product.name,
                    merchantId: product.merchantId,
                    to: order.metadata?.paymentAddress || order.metadata?.to,
                    metadata: {
                      productId: product.id,
                      orderId: order.id,
                      assetType: product.metadata?.assetType || order.metadata?.assetType,
                      paymentMethod: product.metadata?.paymentMethod,
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

