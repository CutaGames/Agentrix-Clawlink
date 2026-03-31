import Head from 'next/head'
import { Navigation } from '../components/ui/Navigation'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { useLocalization } from '../contexts/LocalizationContext'

export default function Developers() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'docs' | 'sdk' | 'api'>('docs')
  const { t } = useLocalization()

  const targetAudiences = [
    {
      icon: '🤖',
      title: t({ zh: 'Agent 开发者', en: 'Agent Developer' }),
      description: t({ zh: '使用 SDK / API 为 Agent 注入支付、订单、结算、资产聚合与联盟分润能力。', en: 'Use SDK/API to inject payment, order, settlement, asset aggregation and alliance profit-sharing capabilities into agents.' }),
      action: t({ zh: '查看 Agent SDK 模板', en: 'View Agent SDK Templates' }),
    },
    {
      icon: '🧑‍💻',
      title: t({ zh: '普通开发者', en: 'General Developer' }),
      description: t({ zh: '编写插件、策略、爬虫、数据源，接入 Marketplace 并通过联盟分润获益。', en: 'Write plugins, strategies, crawlers, data sources, connect to Marketplace and benefit from alliance profit-sharing.' }),
      action: t({ zh: '领取开发任务', en: 'Claim Development Tasks' }),
    },
    {
      icon: '🧍',
      title: t({ zh: '个人用户 / 创作者', en: 'Individual User / Creator' }),
      description: t({ zh: '一键生成我的 AX Agent（无需代码），绑定钱包/法币账户即可开始 Auto-Earn。', en: 'Generate my AX Agent with one click (no code required), bind wallet/fiat account to start Auto-Earn.' }),
      action: t({ zh: '立即生成个人 Agent', en: 'Generate Personal Agent Now' }),
    },
    {
      icon: '🏪',
      title: t({ zh: '商户 / 品牌', en: 'Merchant / Brand' }),
      description: t({ zh: '通过 API 与 Webhook 管理商品、订单、结算，与 Agent 联动完成销售。', en: 'Manage products, orders, settlements through API and Webhook, complete sales in conjunction with agents.' }),
      action: t({ zh: '接入商户 API', en: 'Connect Merchant API' }),
    },
  ]

  const personalAgentSteps = [
    { title: t({ zh: '01. 登录 & 选择模版', en: '01. Login & Select Template' }), detail: t({ zh: '选择消费、商户、开发者、策略等预设 Agent 模板，或从零开始。', en: 'Select preset agent templates for consumption, merchants, developers, strategies, or start from scratch.' }) },
    { title: t({ zh: '02. 绑定支付 / 钱包', en: '02. Bind Payment / Wallet' }), detail: t({ zh: '配置 QuickPay 限额、法币 / 稳定币账户、联盟链接与收益地址。', en: 'Configure QuickPay limits, fiat/stablecoin accounts, alliance links and revenue addresses.' }) },
    { title: t({ zh: '03. 发布到 Marketplace', en: '03. Publish to Marketplace' }), detail: t({ zh: '一键生成分享链接 / SDK Key，立刻参与联盟收益。', en: 'Generate sharing links/SDK Keys with one click, immediately participate in alliance revenue.' }) },
  ]

  const devSupport = [
    { title: t({ zh: '多语言 SDK', en: 'Multi-language SDK' }), detail: t({ zh: 'JS/TS、Python、React 组件库与 CLI，覆盖前后端场景。', en: 'JS/TS, Python, React component library and CLI, covering front-end and back-end scenarios.' }) },
    { title: t({ zh: '全链路 Sandbox', en: 'Full-link Sandbox' }), detail: t({ zh: '提供沙盒 API Key、Mock Provider、虚拟资产池，便于本地调试。', en: 'Provides sandbox API Key, Mock Provider, virtual asset pool for easy local debugging.' }) },
    { title: t({ zh: '开放数据 / Webhook', en: 'Open Data / Webhook' }), detail: t({ zh: '实时获取 Agent 收益、支付状态、资产行情，便于联动自身业务。', en: 'Get real-time agent revenue, payment status, asset quotes to facilitate integration with your own business.' }) },
    { title: t({ zh: '联盟任务 & Bounty', en: 'Alliance Tasks & Bounty' }), detail: t({ zh: '列出最新任务，提交即可获得返佣或一次性奖金。', en: 'List the latest tasks, submit to get commissions or one-time bonuses.' }) },
  ]

  const quickStartSteps = [
    {
      step: 1,
      title: '获取 API Key',
      description: '注册 Agentrix 开发者账户并获取您的专属 API Key',
      code: 'npm install @agentrix/sdk'
    },
    {
      step: 2,
      title: '集成 SDK',
      description: '安装并配置 Agentrix SDK 到您的项目中',
      code: `import { Agentrix } from '@agentrix/sdk';\n\nconst agentrix = new Agentrix({\n  apiKey: 'your-api-key'\n});`
    },
    {
      step: 3,
      title: '发起支付请求',
      description: '在您的 AI Agent 中调用支付接口',
      code: `const payment = await agentrix.createPayment({\n  amount: 7999,\n  currency: 'CNY',\n  description: '联想 Yoga 笔记本电脑'\n});`
    },
    {
      step: 4,
      title: '处理支付结果',
      description: '监听支付状态变化并更新业务逻辑',
      code: `agentrix.onPaymentSuccess((payment) => {\n  // 支付成功逻辑\n  console.log('支付成功:', payment.id);\n});`
    }
  ]

  const sdks = [
    {
      language: 'JavaScript/TypeScript',
      icon: '📦',
      description: '适用于 Web 前端和 Node.js 后端',
      version: '2.2.0',
      installCommand: 'npm install @agentrix/sdk',
      documentation: '/docs/javascript'
    },
    {
      language: 'Python',
      icon: '🐍',
      description: '适用于 Python AI 应用和后端服务',
      version: '2.2.0',
      installCommand: 'pip install agentrix-sdk',
      documentation: '/docs/python'
    },
    {
      language: 'React',
      icon: '⚛️',
      description: 'React 组件和 Hook，快速集成支付 UI',
      version: '2.2.0',
      installCommand: 'npm install @agentrix/react',
      documentation: '/docs/react'
    }
  ]

  const apiEndpoints = [
    {
      method: 'POST',
      path: '/v1/payments',
      description: '创建新的支付订单',
      authentication: 'API Key'
    },
    {
      method: 'GET',
      path: '/v1/payments/:id',
      description: '获取支付订单详情',
      authentication: 'API Key'
    },
    {
      method: 'POST',
      path: '/v1/webhooks',
      description: '配置支付结果 webhook',
      authentication: 'API Key'
    },
    {
      method: 'GET',
      path: '/v1/agents/:id/earnings',
      description: '获取 Agent 收益数据',
      authentication: 'API Key'
    }
  ]

  return (
    <>
      <Head>
        <title>开发者中心 - Agentrix</title>
        <meta name="description" content="Agentrix开发者文档：SDK下载、API参考、快速开始指南" />
      </Head>

      <Navigation />
      
      <main className="min-h-screen bg-slate-950 text-white">
        {/* Hero Section */}
        <section className="border-b border-white/10 bg-gradient-to-br from-purple-600/90 to-blue-700/90 text-white py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Agentrix 开发者中心
              </h1>
              <p className="text-xl text-purple-100 mb-8">
                完整的开发文档、SDK 和 API 参考，助您快速集成 Agentrix 支付能力
              </p>
              <div className="bg-white/10 rounded-2xl p-6 mb-8 border border-white/20">
                <p className="text-lg font-semibold mb-3">🚀 使用 Agent Builder 创建 Agent</p>
                <p className="text-sm text-purple-100 mb-4">
                  5 分钟创建 Agent，无需编写代码。选择模板、配置参数、发布上线，立即拥有完整商业能力。
                </p>
                <button
                  onClick={() => router.push('/agent-builder')}
                  className="bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-all"
                >
                  立即使用 Agent Builder →
                </button>
              </div>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => {
                    const docsSection = document.getElementById('docs-section')
                    if (docsSection) {
                      docsSection.scrollIntoView({ behavior: 'smooth' })
                    } else {
                      // 如果找不到，跳转到API文档部分
                      router.push('/developers#api-reference')
                    }
                  }}
                  className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
                >
                  查看 API 文档
                </button>
                <button 
                  onClick={() => window.open('https://github.com/agentrix', '_blank')}
                  className="border border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
                >
                  加入开发者社区
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Audience */}
        <section className="py-16 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">我们服务的用户</h2>
              <p className="text-lg text-slate-300">个人用户、Agent 构建者、商户与普通开发者都能在此获得所需能力</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {targetAudiences.map((audience) => (
                <div key={audience.title} className="rounded-2xl border border-white/10 border-b border-white/10/5 p-6">
                  <div className="flex items-start space-x-4 mb-4">
                    <span className="text-3xl">{audience.icon}</span>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{audience.title}</h3>
                      <p className="text-sm text-slate-300 mt-1">{audience.description}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if (audience.title === 'Agent 开发者') {
                        router.push('/agent-builder?template=agent-sdk')
                      } else if (audience.title === '普通开发者') {
                        router.push('/marketplace?tab=tasks')
                      } else if (audience.title === '个人用户 / 创作者') {
                        router.push('/agent-builder?template=personal')
                      } else if (audience.title === '商户 / 品牌') {
                        router.push('/developers#merchant-api')
                      }
                    }}
                    className="text-blue-400 text-sm font-semibold flex items-center space-x-1 hover:text-blue-300 transition-colors"
                  >
                    <span>{audience.action}</span>
                    <span>→</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Personal Agent */}
        <section className="py-16 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">{t({ zh: '一键生成个人 Agent', en: 'Generate Personal Agent with One Click' })}</p>
                <h2 className="text-3xl font-bold text-white mb-4">{t({ zh: '非开发者也能 3 步完成', en: 'Non-developers can complete in 3 steps' })}</h2>
                <p className="text-lg text-slate-300 mb-8">
                  {t({ zh: 'Agentrix Agent Builder 内置模板、支付配置、联盟分享链路，帮助每个人快速上线 Auto-Earn 组合。', en: 'Agentrix Agent Builder has built-in templates, payment configurations, and alliance sharing links to help everyone quickly launch Auto-Earn combinations.' })}
                </p>
                <div className="space-y-4">
                  {personalAgentSteps.map((step) => (
                    <div key={step.title} className="flex items-start space-x-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-semibold flex items-center justify-center">
                        {step.title.slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-white">{step.title}</div>
                        <p className="text-sm text-slate-300">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-b border-white/10 border border-white/10 rounded-3xl p-8 shadow-lg">
                <h3 className="text-xl font-semibold text-white mb-6">Builder 面板示意</h3>
                <div className="space-y-4 text-sm text-slate-300">
                  <div className="p-4 rounded-2xl border-b border-white/10 border border-white/10">
                    <div className="font-semibold mb-2">模板选择</div>
                    <p>消费助手 / 商户小二 / 开发者 SDK / 策略 Robo</p>
                  </div>
                  <div className="p-4 rounded-2xl border-b border-white/10 border border-white/10">
                    <div className="font-semibold mb-2">支付 & 收益</div>
                    <p>绑定钱包 / Stripe / MoonPay、设置 QuickPay 限额与联盟返佣比例</p>
                  </div>
                  <div className="p-4 rounded-2xl border-b border-white/10 border border-white/10">
                    <div className="font-semibold mb-2">发布与分享</div>
                    <p>自动生成 Marketplace Listing、分享链接、API Key、Webhook</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/agent-builder')}
                  className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-indigo-500 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all"
                >
                  立即使用 Agent Builder →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Developer Support */}
        <section className="py-16 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">开发者支持矩阵</h2>
              <p className="text-lg text-slate-300">不止支付 API，Agentrix 还提供资产数据、Sandbox、任务奖励</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {devSupport.map((item) => (
                <div key={item.title} className="border-b border-white/10 border border-white/10 rounded-2xl p-5">
                  <div className="text-lg font-semibold text-white mb-2">{item.title}</div>
                  <p className="text-sm text-slate-300">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Start */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">
                5分钟快速开始
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                只需几个简单步骤，即可为您的 AI Agent 集成支付能力
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              {quickStartSteps.map((step, index) => (
                <div key={index} className="flex flex-col md:flex-row gap-8 mb-12 last:mb-0">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {step.step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-slate-300 mb-4">
                      {step.description}
                    </p>
                    <div className="bg-slate-900 rounded-lg p-4">
                      <code className="text-green-400 text-sm whitespace-pre-wrap">
                        {step.code}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SDKs */}
        <section className="py-20 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">
                官方 SDK 支持
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                选择适合您技术栈的 SDK，快速开始集成
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {sdks.map((sdk, index) => (
                <div key={index} className="border-b border-white/10 rounded-2xl p-6 border border-white/10">
                  <div className="text-3xl mb-4">{sdk.icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {sdk.language}
                  </h3>
                  <div className="text-sm text-blue-600 mb-3">v{sdk.version}</div>
                  <p className="text-slate-300 mb-4">
                    {sdk.description}
                  </p>
                  <div className="bg-slate-900 rounded-lg p-3 mb-4">
                    <code className="text-green-400 text-sm">
                      {sdk.installCommand}
                    </code>
                  </div>
                  <button 
                    onClick={() => {
                      if (sdk.language === 'JavaScript/TypeScript') {
                        window.open('https://docs.agentrix.com/javascript', '_blank')
                      } else if (sdk.language === 'Python') {
                        window.open('https://docs.agentrix.com/python', '_blank')
                      } else if (sdk.language === 'React') {
                        window.open('https://docs.agentrix.com/react', '_blank')
                      } else {
                        router.push('/developers#sdk-docs')
                      }
                    }}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    查看文档
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* API Reference */}
        <section id="api-reference" className="py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">
                API 参考
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                完整的 REST API 文档，支持所有支付和业务功能
              </p>
            </div>
            <div className="max-w-4xl mx-auto border-b border-white/10 rounded-2xl shadow-sm border border-white/10 overflow-hidden">
              <div className="border-b border-white/10">
                <div className="flex">
                  <button
                    className={`flex-1 py-4 font-medium ${
                      activeTab === 'docs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'
                    }`}
                    onClick={() => setActiveTab('docs')}
                  >
                    接口文档
                  </button>
                  <button
                    className={`flex-1 py-4 font-medium ${
                      activeTab === 'sdk' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'
                    }`}
                    onClick={() => setActiveTab('sdk')}
                  >
                    SDK 示例
                  </button>
                  <button
                    className={`flex-1 py-4 font-medium ${
                      activeTab === 'api' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'
                    }`}
                    onClick={() => setActiveTab('api')}
                  >
                    API 端点
                  </button>
                </div>
              </div>
              <div className="p-6">
                {activeTab === 'api' && (
                  <div className="space-y-4">
                    {apiEndpoints.map((endpoint, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border-b border-white/10 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <span className={`px-3 py-1 rounded text-sm font-medium ${
                            endpoint.method === 'POST' ? 'bg-green-100 text-green-800' :
                            endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                            'bg-white/10 text-gray-800'
                          }`}>
                            {endpoint.method}
                          </span>
                          <code className="text-white font-mono">{endpoint.path}</code>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium">{endpoint.description}</div>
                          <div className="text-sm text-slate-400">{endpoint.authentication}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'docs' && (
                  <div className="prose max-w-none">
                    <h3>API 基础配置</h3>
                    <p>所有 API 请求都需要在 Header 中包含 API Key：</p>
                    <div className="bg-slate-900 rounded-lg p-4">
                      <code className="text-green-400 text-sm">
                        Authorization: Bearer your-api-key-here
                      </code>
                    </div>
                    
                    <h3>Base URL</h3>
                    <p>生产环境：<code>https://api.agentrix.com</code></p>
                    <p>测试环境：<code>https://sandbox-api.agentrix.com</code></p>
                  </div>
                )}

                {activeTab === 'sdk' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-white mb-2">创建支付订单</h4>
                      <div className="bg-slate-900 rounded-lg p-4">
                        <code className="text-green-400 text-sm whitespace-pre-wrap">
{`const payment = await agentrix.payments.create({
  amount: 7999,
  currency: 'CNY',
  description: '商品描述',
  metadata: {
    order_id: '12345'
  }
});`}
                        </code>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">处理 Webhook</h4>
                      <div className="bg-slate-900 rounded-lg p-4">
                        <code className="text-green-400 text-sm whitespace-pre-wrap">
{`app.post('/webhook', (req, res) => {
  const event = agentrix.webhooks.constructEvent(
    req.body,
    req.headers['agentrix-signature']
  );
  
  if (event.type === 'payment.succeeded') {
    // 处理支付成功逻辑
  }
});`}
                        </code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 接入流程演示 */}
        <section className="py-20 border-b border-white/10">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">接入流程演示</h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                商户和Agent如何快速接入Agentrix
              </p>
            </div>
            
            {/* 商户接入流程 */}
            <div className="max-w-4xl mx-auto mb-12">
              <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-2xl p-8 border border-green-500/30">
                <div className="flex items-center mb-6">
                  <div className="text-4xl mr-4">🏪</div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">商户接入流程</h3>
                    <p className="text-slate-300">3步完成支付系统接入</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-2">注册商户账号</h4>
                      <p className="text-slate-300 text-sm mb-3">完成KYC认证，获取商户ID和API Key</p>
                      <div className="bg-slate-900 rounded-lg p-3">
                        <code className="text-green-400 text-xs">
                          POST /v1/merchants/register<br/>
                          {`{ "name": "商户名称", "email": "merchant@example.com" }`}
                        </code>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-2">上传商品信息</h4>
                      <p className="text-slate-300 text-sm mb-3">使用API或管理后台添加商品，商品自动进入AI分销网络</p>
                      <div className="bg-slate-900 rounded-lg p-3">
                        <code className="text-green-400 text-xs">
                          POST /v1/products<br/>
                          {`{ "name": "商品名称", "price": 299, "description": "..." }`}
                        </code>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-2">集成支付SDK</h4>
                      <p className="text-slate-300 text-sm mb-3">在您的网站/App中集成Agentrix SDK，开始接收支付</p>
                      <div className="bg-slate-900 rounded-lg p-3">
                        <code className="text-green-400 text-xs">
                          {`import { Agentrix } from '@agentrix/sdk';\nconst agentrix = new Agentrix({ apiKey: 'your-key' });\nawait agentrix.payments.create({ amount: 299, ... });`}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Agent接入流程 */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl p-8 border border-purple-500/30">
                <div className="flex items-center mb-6">
                  <div className="text-4xl mr-4">🤖</div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Agent接入流程</h3>
                    <p className="text-slate-300">为AI Agent添加支付和推荐能力</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-2">注册Agent账号</h4>
                      <p className="text-slate-300 text-sm mb-3">创建Agent身份，获取Agent ID和API Key</p>
                      <div className="bg-slate-900 rounded-lg p-3">
                        <code className="text-green-400 text-xs">
                          POST /v1/agents/register<br/>
                          {`{ "name": "AI助手", "type": "chatbot" }`}
                        </code>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-2">集成SDK到Agent</h4>
                      <p className="text-slate-300 text-sm mb-3">在Agent代码中集成Agentrix SDK，启用支付和商品推荐功能</p>
                      <div className="bg-slate-900 rounded-lg p-3">
                        <code className="text-green-400 text-xs">
                          {`const results = await agentrix.marketplace.search("buy coffee");\nconst payment = await agentrix.agents.createPayment({ amount: 9.9 });`}
                        </code>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-2">配置分润和授权</h4>
                      <p className="text-slate-300 text-sm mb-3">设置推荐商品的分润比例，配置自动支付授权</p>
                      <div className="bg-slate-900 rounded-lg p-3">
                        <code className="text-green-400 text-xs">
                          {`await agentrix.agents.setCommission({ rate: 0.1 });\nawait agentrix.agents.enableAutoPay({ limit: 50 });`}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-700 py-16 text-white">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">
              准备好开始开发了吗？
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              立即注册开发者账户，获取 API Key 并开始集成 Agentrix 支付能力
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/auth/register')}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
              >
                注册开发者账户
              </button>
              <button 
                onClick={() => window.open('/developers#docs', '_blank')}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                查看完整文档
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
