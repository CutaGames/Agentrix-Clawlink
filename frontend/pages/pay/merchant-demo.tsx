import Head from 'next/head'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { Navigation } from '../../components/ui/Navigation'
import { Footer } from '../../components/layout/Footer'
import { useLocalization } from '../../contexts/LocalizationContext'

type IntegrationStep = 'sdk' | 'config' | 'scenarios' | 'results'
type PaymentScenario = 'qr' | 'button' | 'agent'

export default function MerchantDemoPage() {
  const [activeStep, setActiveStep] = useState<IntegrationStep>('sdk')
  const [selectedScenario, setSelectedScenario] = useState<PaymentScenario>('qr')
  const { t } = useLocalization()
  const router = useRouter()

  const integrationSteps = [
    {
      key: 'sdk' as IntegrationStep,
      title: { zh: '1. 安装SDK', en: '1. Install SDK' },
      description: { zh: '快速集成Agentrix SDK到您的项目', en: 'Quickly integrate Agentrix SDK into your project' },
    },
    {
      key: 'config' as IntegrationStep,
      title: { zh: '2. 配置API Key', en: '2. Configure API Key' },
      description: { zh: '获取并配置您的商户API密钥', en: 'Get and configure your merchant API key' },
    },
    {
      key: 'scenarios' as IntegrationStep,
      title: { zh: '3. 选择支付场景', en: '3. Choose Payment Scenario' },
      description: { zh: '根据业务场景选择支付方式', en: 'Select payment method based on your business scenario' },
    },
    {
      key: 'results' as IntegrationStep,
      title: { zh: '4. 查看订单管理', en: '4. View Order Management' },
      description: { zh: '实时查看订单状态和结算信息', en: 'View order status and settlement in real-time' },
    },
  ]

  const scenarios = [
    {
      key: 'qr' as PaymentScenario,
      title: { zh: '二维码支付', en: 'QR Code Payment' },
      description: { zh: '适用于线下门店、展会、活动等场景', en: 'For offline stores, exhibitions, events' },
      icon: '📱',
      useCase: { zh: '线下门店收款', en: 'Offline store payment' },
    },
    {
      key: 'button' as PaymentScenario,
      title: { zh: '购买按钮', en: 'Buy Button' },
      description: { zh: '适用于网站、App、小程序等在线场景', en: 'For websites, apps, mini-programs' },
      icon: '🛒',
      useCase: { zh: '在线商城购买', en: 'Online store purchase' },
    },
    {
      key: 'agent' as PaymentScenario,
      title: { zh: 'Agent内支付', en: 'Agent Payment' },
      description: { zh: '适用于AI Agent、聊天机器人等对话场景', en: 'For AI agents, chatbots, conversational scenarios' },
      icon: '🤖',
      useCase: { zh: '对话内购买', en: 'In-chat purchase' },
    },
  ]

  const sdkCode = {
    npm: 'npm install @agentrix/sdk',
    code: `import { Agentrix } from '@agentrix/sdk'

const agentrix = new Agentrix({
  apiKey: 'your-api-key',
  environment: 'production' // or 'sandbox'
})`,
  }

  const scenarioCodes = {
    qr: `// 生成二维码支付
const payment = await agentrix.payments.create({
  amount: 1299,
  currency: 'CNY',
  description: '商品名称',
  metadata: {
    orderId: 'ORDER_123',
    scenario: 'offline'
  }
})

// 获取二维码URL
const qrCodeUrl = payment.qrCodeUrl
// 显示二维码给用户扫描`,
    button: `// 创建支付按钮
const payment = await agentrix.payments.create({
  amount: 1299,
  currency: 'CNY',
  description: '商品名称',
  metadata: {
    orderId: 'ORDER_123',
    scenario: 'online'
  }
})

// 跳转到支付页面
window.location.href = payment.checkoutUrl`,
    agent: `// Agent内支付
const payment = await agentrix.agents.createPayment({
  amount: 1299,
  currency: 'CNY',
  description: '商品名称',
  agentId: 'your-agent-id',
  metadata: {
    orderId: 'ORDER_123',
    scenario: 'agent'
  }
})

// 在对话中显示支付卡片
agent.showPaymentCard(payment)`,
  }

  return (
    <>
      <Head>
        <title>{t({ zh: '商户端支付演示 - Agentrix', en: 'Merchant Payment Demo - Agentrix' })}</title>
        <meta
          name="description"
          content={t({
            zh: '演示商户如何快速接入Agentrix支付，支持二维码、购买按钮、Agent内支付等多种场景',
            en: 'Demonstrate how merchants can quickly integrate Agentrix payment, supporting QR code, buy button, and agent payment scenarios',
          })}
        />
      </Head>
      <Navigation />
      <main className="bg-slate-950 text-white min-h-screen">
        {/* Hero */}
        <section className="border-b border-white/10 bg-gradient-to-br from-blue-600/90 to-purple-600/90 py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <p className="text-sm uppercase tracking-wide text-blue-100">
                {t({ zh: '商户接入演示', en: 'Merchant Integration Demo' })}
              </p>
              <h1 className="text-4xl md:text-5xl font-bold">
                {t({ zh: '5分钟接入，全场景支持', en: '5-minute integration, all scenarios supported' })}
              </h1>
              <p className="text-lg text-blue-100 max-w-2xl mx-auto">
                {t({
                  zh: '通过SDK快速接入Agentrix，支持二维码支付、购买按钮、Agent内支付等多种场景，一次接入，全面覆盖',
                  en: 'Quickly integrate Agentrix via SDK, supporting QR code payment, buy button, agent payment and more. One integration, full coverage',
                })}
              </p>
            </div>
          </div>
        </section>

        {/* 接入步骤 */}
        <section className="py-16 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                {t({ zh: '4步完成接入', en: '4 Steps to Integration' })}
              </h2>
              <div className="grid md:grid-cols-4 gap-6 mb-12">
                {integrationSteps.map((step, index) => (
                  <button
                    key={step.key}
                    onClick={() => setActiveStep(step.key)}
                    className={`text-left p-6 rounded-2xl border transition-all ${
                      activeStep === step.key
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mb-4">
                      {index + 1}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{t(step.title)}</h3>
                    <p className="text-sm text-slate-300">{t(step.description)}</p>
                  </button>
                ))}
              </div>

              {/* 步骤内容 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                {activeStep === 'sdk' && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-semibold mb-4">{t({ zh: '安装SDK', en: 'Install SDK' })}</h3>
                    <div className="bg-slate-900 rounded-lg p-4">
                      <code className="text-green-400 text-sm">{sdkCode.npm}</code>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-4">
                      <pre className="text-green-400 text-sm whitespace-pre-wrap">{sdkCode.code}</pre>
                    </div>
                  </div>
                )}

                {activeStep === 'config' && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-semibold mb-4">
                      {t({ zh: '配置API Key', en: 'Configure API Key' })}
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-slate-900 rounded-lg p-4">
                        <p className="text-slate-300 mb-2">{t({ zh: '1. 登录商户后台获取API Key', en: '1. Login to merchant dashboard to get API Key' })}</p>
                        <p className="text-slate-300 mb-2">{t({ zh: '2. 在环境变量中配置', en: '2. Configure in environment variables' })}</p>
                        <code className="text-green-400 text-sm">AGENTRIX_API_KEY=your-api-key</code>
                      </div>
                      <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                        <p className="text-blue-200 text-sm">
                          {t({
                            zh: '💡 提示：生产环境请使用生产API Key，测试环境使用Sandbox Key',
                            en: '💡 Tip: Use production API Key for production, Sandbox Key for testing',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 'scenarios' && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-semibold mb-4">
                      {t({ zh: '选择支付场景', en: 'Choose Payment Scenario' })}
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                      {scenarios.map((scenario) => (
                        <button
                          key={scenario.key}
                          onClick={() => setSelectedScenario(scenario.key)}
                          className={`p-6 rounded-2xl border text-left transition-all ${
                            selectedScenario === scenario.key
                              ? 'border-blue-500 bg-blue-500/20'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="text-4xl mb-3">{scenario.icon}</div>
                          <h4 className="text-lg font-semibold mb-2">{t(scenario.title)}</h4>
                          <p className="text-sm text-slate-300 mb-2">{t(scenario.description)}</p>
                          <p className="text-xs text-blue-400">{t(scenario.useCase)}</p>
                        </button>
                      ))}
                    </div>
                    <div className="bg-slate-900 rounded-lg p-4">
                      <p className="text-slate-300 mb-3">{t({ zh: '代码示例：', en: 'Code Example:' })}</p>
                      <pre className="text-green-400 text-sm whitespace-pre-wrap">{scenarioCodes[selectedScenario]}</pre>
                    </div>
                  </div>
                )}

                {activeStep === 'results' && (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-semibold mb-4">
                      {t({ zh: '订单管理面板', en: 'Order Management Dashboard' })}
                    </h3>
                    <div className="bg-slate-900 rounded-lg p-6 space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                        <div>
                          <p className="font-semibold">ORDER_123</p>
                          <p className="text-sm text-slate-400">{t({ zh: '商品名称', en: 'Product Name' })}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">¥1,299.00</p>
                          <p className="text-sm text-green-400">{t({ zh: '已支付', en: 'Paid' })}</p>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-white/5 rounded-lg p-4">
                          <p className="text-sm text-slate-400 mb-1">{t({ zh: '今日订单', en: 'Today Orders' })}</p>
                          <p className="text-2xl font-bold">128</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                          <p className="text-sm text-slate-400 mb-1">{t({ zh: '今日GMV', en: 'Today GMV' })}</p>
                          <p className="text-2xl font-bold">¥165,432</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                          <p className="text-sm text-slate-400 mb-1">{t({ zh: '成功率', en: 'Success Rate' })}</p>
                          <p className="text-2xl font-bold">99.2%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 border-b border-white/10">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">{t({ zh: '准备开始接入？', en: 'Ready to integrate?' })}</h2>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              {t({
                zh: '立即注册商户账号，获取API Key，5分钟完成接入',
                en: 'Register merchant account now, get API Key, complete integration in 5 minutes',
              })}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => router.push('/auth/register')}
                className="bg-white text-slate-900 font-semibold px-8 py-3 rounded-xl hover:bg-slate-100 transition-colors"
              >
                {t({ zh: '注册商户账号', en: 'Register Merchant Account' })}
              </button>
              <button
                onClick={() => window.open('/developers', '_blank')}
                className="border border-white/30 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                {t({ zh: '查看完整文档', en: 'View Full Documentation' })}
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

