import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { SmartCheckout } from '../../components/payment/SmartCheckout'

export default function AgentPayment() {
  const router = useRouter()
  const [paymentRequest, setPaymentRequest] = useState<any>(null)
  const [showCheckout, setShowCheckout] = useState(false)

  useEffect(() => {
    const mockPaymentRequest = {
      id: 'pay_' + Date.now(),
      amount: 7999,
      currency: 'CNY',
      description: '联想 Yoga 笔记本电脑 - 通过AI购物助手推荐',
      merchant: '联想官方旗舰店',
      agent: 'AI购物助手',
      metadata: {
        productId: 'prod_123',
        category: 'electronics',
        agentCommission: '5%'
      },
      createdAt: new Date().toISOString()
    }
    setPaymentRequest(mockPaymentRequest)
  }, [])

  const handleStartPayment = () => {
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

  return (
    <>
      <Head>
        <title>AI助手支付 - Agentrix</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xl">🤖</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI购物助手</h1>
              <p className="text-gray-600">为您推荐合适的商品</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-end">
              <div className="bg-blue-500 text-white px-4 py-2 rounded-2xl rounded-tr-none max-w-xs">
                我想购买一台笔记本电脑，预算8000元左右
              </div>
            </div>

            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-2xl rounded-tl-none max-w-xs">
                根据您的需求，推荐这款联想 Yoga 笔记本电脑：
                <div className="mt-2 bg-white rounded-lg p-3 border">
                  <p className="font-semibold">联想 Yoga 9i</p>
                  <p className="text-gray-600 text-sm">14英寸 2合1轻薄本</p>
                  <p className="text-green-600 font-bold mt-1">¥7,999</p>
                </div>
              </div>
            </div>
          </div>

          {paymentRequest && (
            <div className="border-t border-gray-200 pt-6">
              <div className="text-center mb-4">
                <p className="text-gray-600 mb-2">准备完成购买</p>
                <div className="text-2xl font-bold text-gray-900 mb-4">
                  ¥{paymentRequest?.amount || 0}
                </div>
              </div>
              <button
                onClick={handleStartPayment}
                className="w-full bg-green-500 text-white py-4 rounded-lg font-semibold text-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
              >
                <span>💳</span>
                <span>立即支付</span>
              </button>
              <p className="text-center text-sm text-gray-500 mt-3">
                支付即表示您同意我们的服务条款
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              继续对话
            </button>
          </div>
        </div>
      </div>

      {/* V7.0 Smart Checkout Modal */}
      {showCheckout && paymentRequest && (
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
                id: paymentRequest.id,
                amount: paymentRequest.amount,
                currency: paymentRequest.currency || 'CNY',
                description: paymentRequest.description,
                merchantId: paymentRequest.merchant,
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
