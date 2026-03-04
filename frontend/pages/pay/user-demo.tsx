import Head from 'next/head'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { Navigation } from '../../components/ui/Navigation'
import { Footer } from '../../components/layout/Footer'
import { useLocalization } from '../../contexts/LocalizationContext'
import { SmartCheckout } from '../../components/payment/SmartCheckout'

type PaymentMethod = 'qr' | 'link' | 'agent'

export default function UserDemoPage() {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('qr')
  const [showPaymentFlow, setShowPaymentFlow] = useState(false)
  const { t } = useLocalization()
  const router = useRouter()

  const paymentMethods = [
    {
      key: 'qr' as PaymentMethod,
      title: { zh: '扫码支付', en: 'Scan QR Code' },
      description: { zh: '使用手机扫描二维码完成支付', en: 'Scan QR code with your phone to complete payment' },
      icon: '📱',
      scenario: { zh: '线下门店、展会、活动', en: 'Offline stores, exhibitions, events' },
    },
    {
      key: 'link' as PaymentMethod,
      title: { zh: '链接支付', en: 'Link Payment' },
      description: { zh: '点击网站或App中的购买链接', en: 'Click purchase link on website or app' },
      icon: '🔗',
      scenario: { zh: '在线商城、网站、App', en: 'Online stores, websites, apps' },
    },
    {
      key: 'agent' as PaymentMethod,
      title: { zh: 'Agent内支付', en: 'Agent Payment' },
      description: { zh: '在AI Agent对话中直接购买', en: 'Purchase directly in AI Agent conversation' },
      icon: '🤖',
      scenario: { zh: 'AI助手、聊天机器人', en: 'AI assistants, chatbots' },
    },
  ]

  const handleStartPayment = () => {
    setShowPaymentFlow(true)
  }

  const handlePaymentSuccess = (result: any) => {
    // 可以在这里处理支付成功后的逻辑
    // 延迟关闭支付流程，让用户看到成功信息
    setTimeout(() => {
      setShowPaymentFlow(false)
    }, 3000)
  }

  const handlePaymentCancel = () => {
    setShowPaymentFlow(false)
  }

  const getOrderConfig = () => {
    // 根据选择的场景返回不同的商户配置
    if (selectedMethod === 'qr') {
      return {
        merchantConfig: 'both' as const, // 扫码支付：支持法币和数字货币
      }
    } else if (selectedMethod === 'link') {
      return {
        merchantConfig: 'fiat_only' as const, // 链接支付：通常只收法币
      }
    } else {
      return {
        merchantConfig: 'crypto_only' as const, // Agent支付：通常只收数字货币
      }
    }
  }

  const getScenarioDescription = () => {
    if (selectedMethod === 'qr') {
      return {
        zh: '线下门店、展会、活动场景：用户使用手机扫描商户展示的二维码，进入支付页面',
        en: 'Offline stores, exhibitions, events: Users scan QR code displayed by merchant with their phone to enter payment page',
      }
    } else if (selectedMethod === 'link') {
      return {
        zh: '在线商城、网站、App场景：用户在网站或App中点击"立即购买"或"支付"按钮，跳转到支付页面',
        en: 'Online stores, websites, apps: Users click "Buy Now" or "Pay" button on website or app, redirect to payment page',
      }
    } else {
      return {
        zh: 'AI助手、聊天机器人场景：用户在Agent对话中确认购买，在对话界面内完成支付',
        en: 'AI assistants, chatbots: Users confirm purchase in Agent conversation, complete payment within conversation interface',
      }
    }
  }

  return (
    <>
      <Head>
        <title>{t({ zh: '用户端支付演示 - Agentrix', en: 'User Payment Demo - Agentrix' })}</title>
        <meta
          name="description"
          content={t({
            zh: '演示用户如何通过扫码、链接、Agent等多种方式完成支付',
            en: 'Demonstrate how users can complete payment via QR code, link, agent and more',
          })}
        />
      </Head>
      <Navigation />
      <main className="bg-slate-950 text-white min-h-screen">
        {/* Hero */}
        <section className="border-b border-white/10 bg-gradient-to-br from-emerald-600/90 to-blue-600/90 py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <p className="text-sm uppercase tracking-wide text-emerald-100">
                {t({ zh: '用户支付体验', en: 'User Payment Experience' })}
              </p>
              <h1 className="text-4xl md:text-5xl font-bold">
                {t({ zh: '多种支付方式，统一流畅体验', en: 'Multiple payment methods, unified smooth experience' })}
              </h1>
              <p className="text-lg text-emerald-100 max-w-2xl mx-auto">
                {t({
                  zh: '无论是扫码支付、点击链接还是通过Agent购买，Agentrix为您提供一致、安全、快速的支付体验',
                  en: 'Whether scanning QR code, clicking link or purchasing through Agent, Agentrix provides consistent, secure and fast payment experience',
                })}
              </p>
            </div>
          </div>
        </section>

        {/* 支付方式选择 */}
        <section className="py-16 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                {t({ zh: '选择支付场景', en: 'Choose Payment Scenario' })}
              </h2>
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                {paymentMethods.map((method) => (
                  <button
                    key={method.key}
                    onClick={() => {
                      setSelectedMethod(method.key)
                      setShowPaymentFlow(false) // 切换场景时重置支付流程
                    }}
                    className={`p-6 rounded-2xl border text-left transition-all ${
                      selectedMethod === method.key
                        ? 'border-emerald-500 bg-emerald-500/20'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-4xl mb-4">{method.icon}</div>
                    <h3 className="text-xl font-semibold mb-2">{t(method.title)}</h3>
                    <p className="text-sm text-slate-300 mb-3">{t(method.description)}</p>
                    <p className="text-xs text-emerald-400">{t({ zh: '适用场景：', en: 'Scenario: ' })}{t(method.scenario)}</p>
                  </button>
                ))}
              </div>

              {/* 支付流程演示 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <h3 className="text-2xl font-semibold mb-6">
                  {t({ zh: '支付流程演示', en: 'Payment Flow Demo' })}
                </h3>

                {/* 场景说明 */}
                <div className="bg-slate-900/50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-slate-300">{t(getScenarioDescription())}</p>
                </div>

                {!showPaymentFlow ? (
                  <div className="space-y-4">
                    {/* 场景展示 */}
                    {selectedMethod === 'qr' && (
                      <div className="bg-slate-900 rounded-lg p-6 text-center">
                        <p className="text-sm text-slate-400 mb-4">{t({ zh: '商户展示的二维码', en: 'QR Code from Merchant' })}</p>
                        <div className="bg-white p-4 rounded-lg inline-block mb-4">
                          <div className="w-48 h-48 bg-slate-700 flex items-center justify-center rounded">
                            <span className="text-6xl">📱</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">{t({ zh: '使用手机扫描此二维码', en: 'Scan this QR code with your phone' })}</p>
                        <div className="bg-white/5 rounded-lg p-4 text-left">
                          <p className="font-semibold mb-2">AI 智能音箱套装</p>
                          <p className="text-2xl font-bold mb-2">¥1,299.00</p>
                          <p className="text-sm text-slate-400">≈ $189.50</p>
                        </div>
                      </div>
                    )}

                    {selectedMethod === 'link' && (
                      <div className="bg-slate-900 rounded-lg p-6">
                        <p className="text-sm text-slate-400 mb-4">{t({ zh: '网站/App中的购买按钮', en: 'Buy Button on Website/App' })}</p>
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="font-semibold">AI 智能音箱套装</p>
                              <p className="text-sm text-slate-400">¥1,299.00</p>
                            </div>
                            <Image 
                              src="/placeholder-product.jpg" 
                              alt="Product" 
                              width={80}
                              height={80}
                              className="rounded-lg bg-slate-700" 
                              unoptimized
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedMethod === 'agent' && (
                      <div className="bg-slate-900 rounded-lg p-6">
                        <p className="text-sm text-slate-400 mb-4">{t({ zh: 'AI Agent对话界面', en: 'AI Agent Conversation' })}</p>
                        <div className="space-y-4">
                          <div className="bg-white/5 rounded-lg p-4">
                            <p className="text-xs text-slate-400 mb-1">{t({ zh: '用户', en: 'User' })}</p>
                            <p>{t({ zh: '我想买一台AI智能音箱，预算1500以内', en: 'I want to buy an AI smart speaker, budget under 1500' })}</p>
                          </div>
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <p className="text-xs text-blue-300 mb-1">{t({ zh: 'Agentrix Agent', en: 'Agentrix Agent' })}</p>
                            <p className="mb-3">
                              {t({
                                zh: '为您推荐：AI智能音箱套装，¥1,299，支持语音控制、智能家居联动',
                                en: 'Recommended: AI Smart Speaker Set, ¥1,299, supports voice control and smart home integration',
                              })}
                            </p>
                            <div className="bg-white/5 rounded-lg p-4 mt-3">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <p className="font-semibold">AI 智能音箱套装</p>
                                  <p className="text-sm text-slate-400">¥1,299.00</p>
                                </div>
                                <Image 
                                  src="/placeholder-product.jpg" 
                                  alt="Product" 
                                  width={64}
                                  height={64}
                                  className="rounded-lg bg-slate-700" 
                                  unoptimized
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 开始支付按钮 */}
                    <button
                      onClick={handleStartPayment}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors text-lg"
                    >
                      {t({ zh: '开始支付演示', en: 'Start Payment Demo' })}
                    </button>
                  </div>
                ) : (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                          amount: 1299.00,
                          currency: 'CNY',
                          description: selectedMethod === 'agent' ? 'AI Agent 服务包' : selectedMethod === 'qr' ? 'AI 智能音箱套装' : '在线服务订阅',
                          merchantId: 'TechStore',
                        }}
                        onSuccess={handlePaymentSuccess}
                        onCancel={handlePaymentCancel}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 支付优势 */}
        <section className="py-16 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                {t({ zh: '为什么选择Agentrix支付', en: 'Why Choose Agentrix Payment' })}
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                  <div className="text-4xl mb-4">⚡</div>
                  <h3 className="text-lg font-semibold mb-2">{t({ zh: '快速支付', en: 'Fast Payment' })}</h3>
                  <p className="text-sm text-slate-300">
                    {t({ zh: '平均3秒完成支付', en: 'Average 3 seconds to complete payment' })}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                  <div className="text-4xl mb-4">🔒</div>
                  <h3 className="text-lg font-semibold mb-2">{t({ zh: '安全可靠', en: 'Secure & Reliable' })}</h3>
                  <p className="text-sm text-slate-300">
                    {t({ zh: '多重加密和风控保护', en: 'Multiple encryption and risk control protection' })}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                  <div className="text-4xl mb-4">🌍</div>
                  <h3 className="text-lg font-semibold mb-2">{t({ zh: '全球支持', en: 'Global Support' })}</h3>
                  <p className="text-sm text-slate-300">
                    {t({ zh: '支持多种支付方式和货币', en: 'Support multiple payment methods and currencies' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
