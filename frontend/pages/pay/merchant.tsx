import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { SmartCheckout } from '../../components/payment/SmartCheckout'

export default function MerchantPayment() {
  const router = useRouter()
  const [product, setProduct] = useState<any>(null)
  const [showCheckout, setShowCheckout] = useState(false)

  useEffect(() => {
    // 根据路由参数或默认显示电商商品
    const mockProduct = {
      id: 'prod_456',
      name: '无线蓝牙耳机 Pro',
      price: 299,
      description: '主动降噪、30小时续航、IPX5防水、快速充电',
      image: '🎧',
      merchant: '数码生活馆',
      category: '数码配件',
      features: ['主动降噪', '30小时续航', 'IPX5防水', '快速充电'],
      stock: 128
    }
    setProduct(mockProduct)
  }, [])

  const handlePayment = () => {
    setShowCheckout(true)
  }

  const handlePaymentSuccess = (result: any) => {
    // Payment successful logic
    setShowCheckout(false)
    // 可以跳转到成功页面或显示成功消息
  }

  const handlePaymentCancel = () => {
    setShowCheckout(false)
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📦</div>
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>支付 - {product.name}</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">确认订单</h1>
            <p className="text-gray-600">来自 {product.merchant}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">{product.image}</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
                <p className="text-gray-600 mb-4">{product.description}</p>
                {product.features && (
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {product.features.map((feature: string, idx: number) => (
                      <span key={idx} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs">
                        {feature}
                      </span>
                    ))}
                  </div>
                )}
                {product.stock && (
                  <p className="text-sm text-gray-500">库存: {product.stock} 件</p>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">商品价格</span>
                  <span className="font-semibold text-gray-900">{product.price}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">运费</span>
                  <span className="text-green-600">免费</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">税费</span>
                  <span className="text-gray-900">¥0</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-lg font-semibold text-gray-900">总计</span>
                  <span className="text-2xl font-bold text-gray-900">{product.price}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">选择支付方式</h3>
                <p className="text-gray-600">Agentrix 提供安全便捷的支付体验</p>
              </div>
              <div className="space-y-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-1">推荐支付方式</h4>
                  <p className="text-sm text-blue-700">
                    根据金额智能推荐最优支付方案
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-1">安全保障</h4>
                  <p className="text-sm text-green-700">
                    多重签名、生物识别、实时风控
                  </p>
                </div>
              </div>
              <button
                onClick={handlePayment}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
              >
                立即支付 ¥{product.price}
              </button>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  支付即代表您同意我们的{' '}
                  <a href="#" className="text-blue-600 hover:underline">服务条款</a>
                </p>
              </div>

              <div className="mt-6 flex justify-center space-x-6 text-gray-400">
                <div className="text-center">
                  <div className="text-2xl mb-1">🔒</div>
                  <p className="text-xs">安全支付</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">⚡</div>
                  <p className="text-xs">快速到账</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🛡️</div>
                  <p className="text-xs">资金保障</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* V7.0 Smart Checkout Modal */}
      {showCheckout && product && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative">
            <button
              onClick={handlePaymentCancel}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 text-2xl"
            >
              ×
            </button>
            <SmartCheckout
              order={{
                id: `order_${Date.now()}`,
                amount: product.price,
                currency: 'CNY',
                description: product.name,
                merchantId: product.merchant,
              }}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          </div>
        </div>
      )}
    </>
  )
}
