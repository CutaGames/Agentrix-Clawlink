import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { Navigation } from '../components/ui/Navigation';
import { Footer } from '../components/layout/Footer';
import { AgentTemplateLibrary } from '../components/agent/builder/AgentTemplateLibrary';
import { AgentGenerator } from '../components/agent/builder/AgentGenerator';
import { AgentTemplate } from '../lib/api/agent-template.api';
import { useUser } from '../contexts/UserContext';
import { LoginModal } from '../components/auth/LoginModal';
import { useLocalization } from '../contexts/LocalizationContext';

export default function AgentBuilderPage() {
  const { isAuthenticated } = useUser();
  const { t } = useLocalization();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);

  return (
    <>
      <Head>
        <title>{t({ zh: 'Agentrix Agent Builder - 5分钟生成你的 AI Agent', en: 'Agentrix Agent Builder - Generate Your AI Agent in 5 Minutes' })}</title>
        <meta
          name="description"
          content={t({
            zh: '使用 AI Builder，选择模板、配置能力、自动接入支付和收益分润，快速生成个人或商户 Agent。',
            en: 'Use AI Builder to select templates, configure capabilities, automatically integrate payment and revenue sharing, quickly generate personal or merchant Agents.',
          })}
        />
      </Head>
      <Navigation onLoginClick={() => setShowLogin(true)} />
      <main className="bg-gradient-to-b from-gray-50 to-white">
        <section className="container mx-auto px-6 py-12 lg:py-16">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 lg:p-12 mb-10">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.3em] mb-3">
                  Agent Builder
                </p>
                <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4">
                  {t({ zh: '5 分钟生成你的专属 Agent', en: 'Generate Your Personal Agent in 5 Minutes' })}
                </h1>
                <p className="text-lg text-gray-600 mb-6">
                  {t({
                    zh: '从模板开始，自动配置支付、Auto-Earn、联盟分润与监控能力。即刻上线，加入 Agentrix 联盟生态，获取 GMV 分成。',
                    en: 'Start from templates, automatically configure payment, Auto-Earn, alliance revenue sharing and monitoring capabilities. Go live immediately, join Agentrix alliance ecosystem, get GMV share.',
                  })}
                </p>
                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    🧠 {t({ zh: '模板库持续更新', en: 'Template Library Continuously Updated' })}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-medium">
                    💳 {t({ zh: '支付 / QuickPay 自动接入', en: 'Payment / QuickPay Auto Integration' })}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                    💰 {t({ zh: 'Auto-Earn & 联盟收益', en: 'Auto-Earn & Alliance Revenue' })}
                  </span>
                </div>
              </div>
              <div className="bg-gray-900 text-white rounded-3xl p-6 shadow-2xl">
                <p className="text-sm text-gray-400 uppercase tracking-widest mb-4">
                  {t({ zh: '生成流程示意', en: 'Generation Process' })}
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-gray-300">① {t({ zh: '选择模板', en: 'Choose Template' })}</span>
                    <span className="font-semibold">{t({ zh: '购物 / Auto-Earn / Launchpad', en: 'Shopping / Auto-Earn / Launchpad' })}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-gray-300">② {t({ zh: '配置能力', en: 'Configure Capabilities' })}</span>
                    <span className="font-semibold">SmartPay · Auto Workflow</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-gray-300">③ {t({ zh: '接入授权', en: 'Authorization' })}</span>
                    <span className="font-semibold">KYC · QuickPay · {t({ zh: '收益账户', en: 'Revenue Account' })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">④ {t({ zh: '上线推广', en: 'Launch & Promote' })}</span>
                    <span className="font-semibold">{t({ zh: '联盟分润 · API/SDK 联动', en: 'Alliance Revenue · API/SDK Integration' })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-16">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 lg:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {t({ zh: 'Step 1 · 选择模板 / 场景', en: 'Step 1 · Choose Template / Scenario' })}
              </h3>
              <AgentTemplateLibrary
                selectedTemplateId={selectedTemplate?.id}
                onSelect={setSelectedTemplate}
              />
            </div>
            <div>
              {!isAuthenticated && (
                <div className="mb-4 p-4 rounded-2xl border border-yellow-200 bg-yellow-50 text-sm text-yellow-800 flex items-center justify-between">
                  <span>{t({ zh: '请先登录，即可保存模板并生成 Agent。', en: 'Please login to save template and generate Agent.' })}</span>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="px-3 py-1 rounded-full bg-yellow-600 text-white text-xs font-semibold"
                  >
                    {t({ zh: '登录/注册', en: 'Login/Register' })}
                  </button>
                </div>
              )}
              <AgentGenerator
                selectedTemplate={selectedTemplate}
                onTemplateReset={() => setSelectedTemplate(null)}
                isAuthenticated={isAuthenticated}
              />
            </div>
          </div>

          {/* Agent Builder 核心功能展示 */}
          <section className="mb-16">
            <div className="text-center mb-8">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.3em] mb-3">
                {t({ zh: '核心功能', en: 'Core Features' })}
              </p>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                {t({ zh: 'Agent Builder 强大功能', en: 'Agent Builder Powerful Features' })}
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {t({
                  zh: '表单式配置、规则模板、插件市场、SaaS托管，让 Agent 创建更简单、更强大。',
                  en: 'Form-based configuration, rule templates, plugin marketplace, SaaS hosting - making Agent creation simpler and more powerful.',
                })}
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* 表单式能力装配 */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t({ zh: '表单式能力装配', en: 'Form-based Capability Assembly' })}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t({
                    zh: '快速配置Agent能力，无需编写代码，降低学习成本。',
                    en: 'Quickly configure Agent capabilities without coding, reducing learning curve.',
                  })}
                </p>
                <p className="text-xs text-blue-600 font-semibold">
                  {t({ zh: '在生成流程中使用', en: 'Used in generation flow' })}
                </p>
              </div>

              {/* 规则模板系统 */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">⚙️</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t({ zh: '规则模板系统', en: 'Rule Template System' })}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t({
                    zh: '自然语言定义业务规则，预设模板快速应用，规则验证和测试。',
                    en: 'Define business rules in natural language, apply preset templates quickly, validate and test rules.',
                  })}
                </p>
                <p className="text-xs text-blue-600 font-semibold">
                  {t({ zh: '在生成流程中使用', en: 'Used in generation flow' })}
                </p>
              </div>

              {/* 插件市场 */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">🔌</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t({ zh: '插件市场', en: 'Plugin Marketplace' })}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t({
                    zh: '浏览和安装插件，扩展Agent功能，支持免费和付费插件。',
                    en: 'Browse and install plugins to extend Agent capabilities, support free and paid plugins.',
                  })}
                </p>
                <button
                  onClick={() => router.push('/plugins')}
                  className="text-xs text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                >
                  {t({ zh: '访问插件市场 →', en: 'Visit Plugin Marketplace →' })}
                </button>
              </div>

              {/* SaaS托管 */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
                <div className="text-4xl mb-4">☁️</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t({ zh: 'SaaS托管', en: 'SaaS Hosting' })}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t({
                    zh: '一键部署到云端，无需配置服务器，自动生成访问链接。',
                    en: 'One-click deploy to cloud, no server configuration needed, auto-generate access links.',
                  })}
                </p>
                <p className="text-xs text-blue-600 font-semibold">
                  {t({ zh: '在导出时使用', en: 'Used in export' })}
                </p>
              </div>
            </div>
          </section>

          {/* 插件市场入口 */}
          <section className="mb-16">
            <div className="bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 rounded-3xl border border-emerald-500/20 p-8 lg:p-12">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="text-5xl mb-4">🔌</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {t({ zh: '插件市场', en: 'Plugin Marketplace' })}
                  </h3>
                  <p className="text-lg text-gray-600 mb-6">
                    {t({
                      zh: '浏览和安装插件，扩展你的Agent功能。50+ 插件可用，支持支付、分析、营销、集成等多种类型。',
                      en: 'Browse and install plugins to extend your Agent capabilities. 50+ plugins available, supporting payment, analytics, marketing, integration and more types.',
                    })}
                  </p>
                  <div className="flex flex-wrap gap-3 mb-6">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-700 text-sm font-medium">
                      {t({ zh: '50+ 插件', en: '50+ Plugins' })}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-700 text-sm font-medium">
                      {t({ zh: '免费和付费', en: 'Free & Paid' })}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-700 text-sm font-medium">
                      {t({ zh: '一键安装', en: 'One-click Install' })}
                    </span>
                  </div>
                  <button
                    onClick={() => router.push('/plugins')}
                    className="bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-all shadow-lg"
                  >
                    {t({ zh: '访问插件市场', en: 'Visit Plugin Marketplace' })}
                  </button>
                </div>
                <div className="bg-white/60 rounded-2xl p-6 border border-white/20">
                  <p className="text-sm font-semibold text-gray-700 mb-4">
                    {t({ zh: '热门插件类型', en: 'Popular Plugin Types' })}
                  </p>
                  <div className="space-y-3">
                    {[
                      { zh: '支付插件', en: 'Payment Plugins' },
                      { zh: '数据分析插件', en: 'Analytics Plugins' },
                      { zh: '营销插件', en: 'Marketing Plugins' },
                      { zh: '集成插件', en: 'Integration Plugins' },
                    ].map((type, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="text-emerald-500">▹</span>
                        <span>{t(type)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </section>
      </main>
      <Footer />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}

