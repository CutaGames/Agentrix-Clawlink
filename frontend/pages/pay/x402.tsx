import Head from 'next/head'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useEffect, useState, useCallback } from 'react'
import { SmartCheckout } from '../../components/payment/SmartCheckout'
import { useWeb3 } from '../../contexts/Web3Context'
import { paymentApi } from '../../lib/api/payment.api'

export default function X402Payment() {
  const router = useRouter()
  const { isConnected, defaultWallet, connect, connectors } = useWeb3()
  const [hasAuthorization, setHasAuthorization] = useState(false)
  const [authorizationLoading, setAuthorizationLoading] = useState(true)
  const [authorizationError, setAuthorizationError] = useState<string | null>(null)
  const [paymentRequest, setPaymentRequest] = useState<any>(null)
  const [paymentType, setPaymentType] = useState<'subscription' | 'tipping'>('subscription')
  const [showCheckout, setShowCheckout] = useState(false)
  const [showWalletSelector, setShowWalletSelector] = useState(false)

  const updatePaymentRequest = useCallback(() => {
    if (paymentType === 'subscription') {
      setPaymentRequest({
        id: 'pay_x402_' + Date.now(),
        amount: '¥99.00',
        currency: 'CNY',
        description: 'AI服务订阅 - 月度会员',
        merchant: 'AI服务平台',
        metadata: {
          isOnChain: true,
          paymentType: 'subscription',
          subscriptionType: 'monthly',
          gasSavings: '40%',
          estimatedTime: '3-5秒',
          autoRenew: true,
        },
        createdAt: new Date().toISOString()
      })
    } else {
      setPaymentRequest({
        id: 'pay_x402_tip_' + Date.now(),
        amount: '¥20.00',
        currency: 'CNY',
        description: '打赏给 AI创作大师',
        merchant: '内容创作平台',
        metadata: {
          isOnChain: true,
          paymentType: 'tipping',
          creatorId: 'creator_001',
          gasSavings: '40%',
          estimatedTime: '3-5秒',
        },
        createdAt: new Date().toISOString()
      })
    }
  }, [paymentType])

  // 检查X402授权状态
  useEffect(() => {
    const checkAuthorization = async () => {
      setAuthorizationLoading(true)
      setAuthorizationError(null)
      
      try {
        // 调用API检查授权状态
        const auth = await paymentApi.checkX402Authorization()
        if (auth && auth.isActive) {
          setHasAuthorization(true)
          localStorage.setItem('x402_authorized', 'true')
        } else {
          setHasAuthorization(false)
          localStorage.removeItem('x402_authorized')
        }
      } catch (error: any) {
        console.warn('检查授权失败:', error)
        // 如果API失败，检查本地存储作为fallback
        const authorized = localStorage.getItem('x402_authorized') === 'true'
        setHasAuthorization(authorized)
        
        // 如果是因为未登录，显示提示
        if (error?.status === 401 || error?.message?.includes('unauthorized')) {
          setAuthorizationError('请先登录后再使用X402支付')
        }
      } finally {
        setAuthorizationLoading(false)
      }
    }
    
    checkAuthorization()
    updatePaymentRequest()
  }, [paymentType, updatePaymentRequest])

  // 创建X402授权
  const handleAuthorize = async () => {
    // 如果钱包未连接，先连接钱包
    if (!isConnected) {
      setShowWalletSelector(true)
      return
    }
    
    setAuthorizationLoading(true)
    setAuthorizationError(null)
    
    try {
      // 调用API创建授权
      const auth = await paymentApi.createX402Authorization({
        singleLimit: 50,
        dailyLimit: 100,
        durationDays: 30,
      })
      
      if (auth) {
        setHasAuthorization(true)
        localStorage.setItem('x402_authorized', 'true')
      }
    } catch (error: any) {
      console.error('创建授权失败:', error)
      
      // 如果是因为未登录
      if (error?.status === 401) {
        setAuthorizationError('请先登录后再创建授权')
        // 尝试钱包登录
        if (isConnected && defaultWallet) {
          setAuthorizationError('正在尝试钱包登录...')
          // TODO: 实现钱包登录
        }
      } else {
        setAuthorizationError(error?.message || '创建授权失败，请稍后重试')
      }
    } finally {
      setAuthorizationLoading(false)
    }
  }

  // 连接钱包
  const handleConnectWallet = async (walletType: string) => {
    try {
      await connect(walletType as any)
      setShowWalletSelector(false)
    } catch (error) {
      console.error('连接钱包失败:', error)
    }
  }

  const handlePayment = () => {
    if (paymentRequest) {
      setShowCheckout(true)
    }
  }

  const handlePaymentSuccess = (result: any) => {
    // Payment successful logic
    setShowCheckout(false)
    // 可以显示成功消息或跳转
  }

  const handlePaymentCancel = () => {
    setShowCheckout(false)
  }

  return (
    <>
      <Head>
        <title>X402协议支付演示 - Agentrix</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔄</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">订阅与打赏</h1>
            <p className="text-gray-600">订阅服务 · 内容打赏 · X402协议支付</p>
          </div>

          {/* 场景选择 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">选择场景</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setPaymentType('subscription')}
                className={`p-4 border-2 rounded-lg transition-colors text-left ${
                  paymentType === 'subscription'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-purple-200 hover:border-purple-400'
                }`}
              >
                <div className="text-3xl mb-2">🔄</div>
                <div className="font-semibold text-gray-900 mb-1">订阅服务</div>
                <div className="text-sm text-gray-600">月度会员 · 自动续费</div>
              </button>
              <button
                onClick={() => setPaymentType('tipping')}
                className={`p-4 border-2 rounded-lg transition-colors text-left ${
                  paymentType === 'tipping'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-yellow-200 hover:border-yellow-400'
                }`}
              >
                <div className="text-3xl mb-2">💰</div>
                <div className="font-semibold text-gray-900 mb-1">内容打赏</div>
                <div className="text-sm text-gray-600">打赏创作者 · 快速到账</div>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {paymentRequest?.metadata?.paymentType === 'tipping' ? '打赏信息' : '订阅信息'}
              </h2>
              <div className="space-y-3">
                {paymentRequest?.metadata?.paymentType === 'subscription' ? (
                  <>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">订阅类型</span>
                      <span className="font-semibold text-gray-900">月度会员</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">月费</span>
                      <span className="font-semibold text-gray-900">{paymentRequest?.amount}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">服务内容</span>
                      <span className="text-gray-900">无限API调用、优先支持</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">自动续费</span>
                      <span className="text-green-600 font-semibold">已开启</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">打赏对象</span>
                      <span className="font-semibold text-gray-900">AI创作大师</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">打赏金额</span>
                      <span className="font-semibold text-gray-900">{paymentRequest?.amount}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">支付方式</span>
                      <span className="text-gray-900">X402协议（小额快速）</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">支付协议</span>
                  <span className="font-semibold text-purple-600">X402协议</span>
                </div>
              </div>
            </div>

            {/* 钱包连接状态 */}
            <div className={`border rounded-lg p-4 mb-6 ${isConnected ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{isConnected ? '🔗' : '💳'}</span>
                  <div>
                    <h3 className={`font-semibold ${isConnected ? 'text-green-900' : 'text-blue-900'}`}>
                      {isConnected ? '钱包已连接' : '请先连接钱包'}
                    </h3>
                    <p className={`text-sm ${isConnected ? 'text-green-700' : 'text-blue-700'}`}>
                      {isConnected 
                        ? `${defaultWallet?.address?.slice(0, 6)}...${defaultWallet?.address?.slice(-4)}`
                        : '连接钱包后才能使用X402支付'
                      }
                    </p>
                  </div>
                </div>
                {!isConnected && (
                  <button
                    onClick={() => setShowWalletSelector(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    连接钱包
                  </button>
                )}
              </div>
            </div>

            {/* 授权错误提示 */}
            {authorizationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">⚠️</span>
                  <p className="text-sm text-red-700">{authorizationError}</p>
                </div>
              </div>
            )}

            {!hasAuthorization ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">🔐</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-900 mb-2">需要授权</h3>
                    <p className="text-sm text-yellow-700 mb-4">
                      首次使用X402协议支付需要授权。授权后，小额支付将自动批量处理，无需每次确认。
                    </p>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-yellow-800">
                        <span>✓</span>
                        <span>单次限额: ¥50</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-yellow-800">
                        <span>✓</span>
                        <span>每日限额: ¥500</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-yellow-800">
                        <span>✓</span>
                        <span>有效期: 30天</span>
                      </div>
                    </div>
                    <button
                      onClick={handleAuthorize}
                      disabled={authorizationLoading}
                      className="w-full bg-yellow-600 text-white py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {authorizationLoading 
                        ? '处理中...' 
                        : isConnected 
                          ? '授权X402支付' 
                          : '连接钱包并授权'
                      }
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">✅</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-1">已授权</h3>
                    <p className="text-sm text-green-700">
                      X402协议已激活，可以快速支付
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-purple-900 mb-3">X402协议优势</h3>
              <div className="space-y-2 text-sm text-purple-700">
                <div className="flex items-center space-x-2">
                  <span>⚡</span>
                  <span>Gas费用降低40%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🚀</span>
                  <span>批量压缩处理，3-5秒确认</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>💳</span>
                  <span>授权后无需每次签名</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📊</span>
                  <span>适合小额高频支付场景</span>
                </div>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={!hasAuthorization}
              className="w-full bg-purple-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasAuthorization ? '⚡ 快速支付' : '请先授权'}
            </button>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                💡 提示: X402协议特别适合AI Agent自动支付、打赏、订阅等场景
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">适用场景</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-2xl mb-2">🤖</div>
                <div className="font-semibold text-gray-900 mb-1">AI Agent支付</div>
                <div className="text-sm text-gray-600">自动支付API调用费用</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-2xl mb-2">💝</div>
                <div className="font-semibold text-gray-900 mb-1">内容打赏</div>
                <div className="text-sm text-gray-600">快速打赏创作者</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-2xl mb-2">🔄</div>
                <div className="font-semibold text-gray-900 mb-1">订阅服务</div>
                <div className="text-sm text-gray-600">周期性自动扣款</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-2xl mb-2">📦</div>
                <div className="font-semibold text-gray-900 mb-1">微支付</div>
                <div className="text-sm text-gray-600">小额高频交易</div>
              </div>
            </div>
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
                amount: parseFloat(paymentRequest.amount.replace('¥', '').replace(',', '')),
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

      {/* 钱包选择器弹窗 */}
      {showWalletSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">选择钱包</h3>
              <button
                onClick={() => setShowWalletSelector(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => handleConnectWallet(connector.id)}
                  disabled={!connector.isInstalled && connector.id !== 'walletconnect'}
                  className={`w-full flex items-center p-4 border rounded-xl transition-all ${
                    connector.isInstalled || connector.id === 'walletconnect'
                      ? 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <Image 
                    src={connector.icon} 
                    alt={connector.name} 
                    width={40}
                    height={40}
                    className="mr-4 rounded-lg"
                    unoptimized
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '🔗';
                    }}
                  />
                  <div className="text-left flex-1">
                    <div className="font-semibold text-gray-900">{connector.name}</div>
                    <div className="text-sm text-gray-500">
                      {connector.isInstalled || connector.id === 'walletconnect'
                        ? connector.description
                        : '未安装'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-4 text-center text-sm text-gray-500">
              连接钱包即表示您同意我们的服务条款
            </p>
          </div>
        </div>
      )}
    </>
  )
}
