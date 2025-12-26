import React from 'react';
import Head from 'next/head';
import { Navigation } from '../components/ui/Navigation';
import { Footer } from '../components/layout/Footer';
import { useLocalization } from '../contexts/LocalizationContext';
import { 
  Zap, 
  ShieldCheck, 
  Globe, 
  Cpu, 
  BarChart3, 
  ArrowRight, 
  CheckCircle2,
  Layers,
  MousePointer2,
  Code2
} from 'lucide-react';

export default function AXPaymentPage() {
  const { t } = useLocalization();

  const features = [
    {
      icon: <Zap className="w-6 h-6 text-cyan-400" />,
      title: { zh: 'Agent 编排增强层', en: 'Agent Orchestration' },
      description: { zh: '专为 AI 意图设计的支付层，支持从意图识别到自动执行的全链路闭环。', en: 'Payment layer designed for AI intent, supporting full-loop from intent to execution.' }
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      title: { zh: '委托授权 (Delegated Auth)', en: 'Delegated Auth' },
      description: { zh: '基于 ERC8004 的会话管理，用户可为 Agent 设置限额、有效期与特定场景授权。', en: 'ERC8004-based session management with limits, expiry, and scenario-specific auth.' }
    },
    {
      icon: <Layers className="w-6 h-6 text-blue-400" />,
      title: { zh: '一体化支付底座', en: 'Unified Payment Base' },
      description: { zh: '覆盖 Hosted Checkout、API-only 等多种形态，支持法币与加密货币无缝结算。', en: 'Covers Hosted Checkout, API-only, supporting seamless fiat and crypto settlement.' }
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-purple-400" />,
      title: { zh: '可追溯审计证据链', en: 'Audit Proof Chain' },
      description: { zh: '每一笔 Agent 支付都具备链上存证，确保交易意图与执行结果可追溯、不可篡改。', en: 'Every Agent payment has on-chain proof, ensuring intent and execution are traceable.' }
    }
  ];

  const sellingPoints = [
    {
      title: { zh: '传统入口 vs Agent 入口', en: 'Human vs Agent Checkout' },
      desc: { zh: '不仅支持传统的网页/APP 支付，更标准化支持 Agent 代表用户在授权范围内完成交易。', en: 'Supports both traditional web/app payments and standardized Agent-led transactions.' }
    },
    {
      title: { zh: '意图支付 (Intent-to-Pay)', en: 'Intent-to-Pay' },
      desc: { zh: 'Agent 识别用户意图后直接发起支付，超限自动降级为用户确认，兼顾便捷与安全。', en: 'Agent initiates payment upon intent; auto-downgrades to user confirmation if limits exceeded.' }
    },
    {
      title: { zh: '归因与自动分润', en: 'Attribution & RevShare' },
      desc: { zh: '内置 Agent 身份标识与分润协议，自动处理开发者、平台与商户之间的资金结算。', en: 'Built-in Agent ID and rev-share protocol, auto-handling settlements between devs and merchants.' }
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-cyan-500/30">
      <Head>
        <title>{t({ zh: 'AX 支付 - 让 AI Agent 具备商业闭环能力', en: 'AX Payment - Empowering AI Agents with Business Loops' })}</title>
      </Head>

      <Navigation onLoginClick={() => {}} />

      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_70%)] pointer-events-none" />
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold tracking-widest uppercase animate-fade-in">
                <Zap size={14} />
                {t({ zh: '下一代 AI 支付协议', en: 'Next-Gen AI Payment Protocol' })}
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                {t({ zh: '让您的 Agent', en: 'Make Your Agent' })} <br />
                <span className="text-cyan-400">{t({ zh: '秒变商业体', en: 'A Business Entity' })}</span>
              </h1>
              
              <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                {t({ 
                  zh: 'AX 支付是全球首个专为 AI Agent 打造的支付引擎。集成 X402 协议，实现从对话到交易的无缝闭环。', 
                  en: 'AX Payment is the world\'s first payment engine built specifically for AI Agents. Integrate X402 protocol for a seamless loop from conversation to transaction.' 
                })}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-full transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg shadow-cyan-500/20">
                  {t({ zh: '立即集成', en: 'Integrate Now' })}
                  <ArrowRight size={20} />
                </button>
                <button className="px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold rounded-full transition-all">
                  {t({ zh: '查看文档', en: 'View Documentation' })}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-slate-900/30 border-y border-white/5">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t({ zh: '核心架构与特色', en: 'Core Architecture & Features' })}</h2>
              <p className="text-slate-400">{t({ zh: '从通用支付底座到 Agent 编排增强层', en: 'From Core Payments to Agent Orchestration' })}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((f, i) => (
                <div key={i} className="p-8 rounded-3xl bg-slate-900/50 border border-white/5 hover:border-cyan-500/30 transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{t(f.title)}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{t(f.description)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Differentiation Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="container mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 space-y-8">
                <h2 className="text-4xl font-bold leading-tight">
                  {t({ zh: '为什么选择 AX 支付？', en: 'Why AX Payment?' })}
                </h2>
                <div className="space-y-6">
                  {sellingPoints.map((point, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1">
                        <CheckCircle2 className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white mb-2">{t(point.title)}</h4>
                        <p className="text-slate-400 leading-relaxed">{t(point.desc)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-0 bg-cyan-500/20 blur-[100px] rounded-full" />
                <div className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400">
                        <Cpu size={20} />
                      </div>
                      <span className="font-bold">Agent Checkout Flow</span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-mono">X402 Protocol</span>
                  </div>
                  <div className="space-y-4 font-mono text-sm">
                    <div className="p-3 bg-slate-950 rounded-lg border border-white/5 text-slate-400">
                      <span className="text-cyan-400">1. Intent:</span> &quot;Buy a coffee for me&quot;
                    </div>
                    <div className="flex justify-center">
                      <ArrowRight className="rotate-90 text-slate-700" />
                    </div>
                    <div className="p-3 bg-slate-950 rounded-lg border border-white/5 text-slate-400">
                      <span className="text-cyan-400">2. Auth Check:</span> ERC8004 Session Valid
                    </div>
                    <div className="flex justify-center">
                      <ArrowRight className="rotate-90 text-slate-700" />
                    </div>
                    <div className="p-3 bg-slate-950 rounded-lg border border-white/5 text-slate-400">
                      <span className="text-cyan-400">3. Execution:</span> PaymentIntent Created
                    </div>
                    <div className="flex justify-center">
                      <ArrowRight className="rotate-90 text-slate-700" />
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 text-green-400">
                      <span className="font-bold">4. Success:</span> Audit Proof Generated
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Architecture Section */}
        <section className="py-24 bg-slate-950">
          <div className="container mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 space-y-8">
                <h2 className="text-4xl font-black tracking-tight">
                  {t({ zh: '技术架构：X402 协议', en: 'Technical Architecture: X402 Protocol' })}
                </h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">1</div>
                    <div>
                      <h4 className="font-bold mb-1">{t({ zh: 'Session 级授权', en: 'Session-Level Authorization' })}</h4>
                      <p className="text-slate-400 text-sm">{t({ zh: '基于 ERC 8004，为 Agent 提供限时、限额的支付权限。', en: 'Based on ERC 8004, providing time-limited and amount-limited payment permissions for Agents.' })}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">2</div>
                    <div>
                      <h4 className="font-bold mb-1">{t({ zh: '智能路由引擎', en: 'Smart Routing Engine' })}</h4>
                      <p className="text-slate-400 text-sm">{t({ zh: '自动在法币与加密货币之间选择最优路径，降低 30% 手续费。', en: 'Automatically selects the optimal path between fiat and crypto, reducing fees by 30%.' })}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">3</div>
                    <div>
                      <h4 className="font-bold mb-1">{t({ zh: '实时分账结算', en: 'Real-time Split Settlement' })}</h4>
                      <p className="text-slate-400 text-sm">{t({ zh: '支持多方分佣，交易完成即刻到账，透明可追溯。', en: 'Supports multi-party commission splitting, instant arrival upon transaction completion.' })}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-slate-900/50 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Protocol Flow</span>
                    <span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-mono">v1.2.0-stable</span>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-xs font-mono">Agent Request</span>
                      </div>
                      <span className="text-[10px] text-slate-500">0.2ms</span>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-xs font-mono">Risk Check (AML)</span>
                      </div>
                      <span className="text-[10px] text-slate-500">15ms</span>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-400" />
                        <span className="text-xs font-mono">Smart Routing</span>
                      </div>
                      <span className="text-[10px] text-slate-500">8ms</span>
                    </div>
                    <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-mono font-bold">Settlement Success</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold">DONE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Start Section */}
        <section className="py-24 bg-slate-900/30">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
              <h2 className="text-4xl font-black tracking-tight">{t({ zh: '快速集成', en: 'Quick Integration' })}</h2>
              <p className="text-slate-400">{t({ zh: '使用我们的 SDK，在几分钟内为您的 Agent 注入商业能力。', en: 'Use our SDK to inject business capabilities into your Agent in minutes.' })}</p>
            </div>
            <div className="max-w-4xl mx-auto bg-slate-950 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/5">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="text-xs text-slate-500 font-mono">npm install @agentrix/sdk</div>
              </div>
              <div className="p-8 overflow-x-auto">
                <pre className="text-sm font-mono text-cyan-300/90 leading-relaxed">
                  <code>{`import { AXPayment } from '@agentrix/sdk';

// 1. Initialize with your Agent ID
const ax = new AXPayment({
  apiKey: process.env.AGENTRIX_API_KEY,
  agentId: 'your_agent_id'
});

// 2. Create a payment session
const session = await ax.createSession({
  userId: 'user_123',
  maxAmount: '100.00',
  currency: 'USDC',
  expiresIn: '1h'
});

// 3. Execute payment
const result = await ax.pay({
  sessionId: session.id,
  to: 'merchant_0x...',
  amount: '49.99',
  metadata: { orderId: 'ORD-998' }
});

console.log('Payment successful:', result.txHash);`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Integration Showcase */}
        <section className="py-32">
          <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <h2 className="text-4xl font-bold leading-tight">
                  {t({ zh: '三行代码，', en: 'Three lines of code,' })} <br />
                  {t({ zh: '开启 Agent 商业化之路', en: 'Start Agent Commercialization' })}
                </h2>
                <div className="space-y-6">
                  {[
                    { title: { zh: '创建支付会话', en: 'Create Payment Session' }, desc: { zh: '通过简单的 API 调用生成支付链接或会话。', en: 'Generate payment links or sessions via simple API calls.' } },
                    { title: { zh: '自动分账', en: 'Auto-Splitting' }, desc: { zh: '内置分佣逻辑，自动处理开发者、平台与推广者收益。', en: 'Built-in commission logic, auto-handling revenue for devs, platform, and promoters.' } },
                    { title: { zh: '实时结算', en: 'Real-time Settlement' }, desc: { zh: '支持 T+0 结算，资金流向清晰透明。', en: 'Supports T+0 settlement with clear and transparent cash flow.' } }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{t(item.title)}</h4>
                        <p className="text-slate-400 text-sm">{t(item.desc)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-20 blur-2xl rounded-full" />
                <div className="relative bg-slate-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-slate-800/50">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                    <span className="ml-2 text-[10px] text-slate-500 font-mono uppercase tracking-widest">ax-payment-sdk.js</span>
                  </div>
                  <div className="p-6 font-mono text-sm text-cyan-300/90 leading-relaxed">
                    <p><span className="text-purple-400">import</span> &#123; AXPayment &#125; <span className="text-purple-400">from</span> <span className="text-emerald-400">&apos;@agentrix/sdk&apos;</span>;</p>
                    <p className="mt-4"><span className="text-slate-500">{"// 1. 初始化支付"}</span></p>
                    <p><span className="text-purple-400">const</span> ax = <span className="text-purple-400">new</span> <span className="text-yellow-400">AXPayment</span>(process.env.AX_KEY);</p>
                    <p className="mt-4"><span className="text-slate-500">{"// 2. 创建订单"}</span></p>
                    <p><span className="text-purple-400">const</span> order = <span className="text-purple-400">await</span> ax.createOrder(&#123;</p>
                    <p className="ml-4">amount: <span className="text-orange-400">99.00</span>,</p>
                    <p className="ml-4">currency: <span className="text-emerald-400">&apos;USDC&apos;</span>,</p>
                    <p className="ml-4">description: <span className="text-emerald-400">&apos;AI Analysis Service&apos;</span></p>
                    <p>&#125;);</p>
                    <p className="mt-4"><span className="text-slate-500">{"// 3. 执行支付"}</span></p>
                    <p><span className="text-purple-400">await</span> ax.pay(order.id);</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-6">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 rounded-[3rem] p-12 md:p-20 text-center space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
              <h2 className="text-4xl md:text-5xl font-bold text-white">
                {t({ zh: '准备好让您的 Agent 赚钱了吗？', en: 'Ready to monetize your Agent?' })}
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                {t({ 
                  zh: '加入 500+ 领先的 AI 开发者，使用 AX 支付构建下一代商业智能体。', 
                  en: 'Join 500+ leading AI developers using AX Payment to build the next generation of business agents.' 
                })}
              </p>
              <div className="pt-4">
                <button className="px-10 py-5 bg-white text-blue-700 font-bold rounded-full hover:bg-slate-100 transition-all shadow-xl">
                  {t({ zh: '免费开始使用', en: 'Get Started for Free' })}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
