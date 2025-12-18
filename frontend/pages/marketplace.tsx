import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { Navigation } from '../components/ui/Navigation'
import { Footer } from '../components/layout/Footer'
import { LoginModal } from '../components/auth/LoginModal'
import { ProductServiceSection } from '../components/marketplace/ProductServiceSection'
import { X402ProductSection } from '../components/marketplace/X402ProductSection'
import { ShoppingCart } from '../components/marketplace/ShoppingCart'
import { useLocalization } from '../contexts/LocalizationContext'

export default function MarketplacePage() {
  const [showLogin, setShowLogin] = useState(false)
  const [activeTab, setActiveTab] = useState<'physical' | 'service' | 'digital' | 'x402' | 'plugin'>('physical')
  const router = useRouter()
  const { t } = useLocalization()

  const tabs = [
    { id: 'physical', label: { zh: '实物商品', en: 'Physical Goods' } },
    { id: 'service', label: { zh: '服务', en: 'Services' } },
    { id: 'digital', label: { zh: '虚拟资产', en: 'Digital Assets' } },
    { id: 'x402', label: { zh: 'X402 专区', en: 'X402 Zone' }, badge: 'NEW' },
    { id: 'plugin', label: { zh: '插件市场', en: 'Plugins' } },
  ]

  return (
    <>
      <Head>
        <title>Agentrix Marketplace</title>
        <meta
          name="description"
          content="Agentrix Marketplace - Physical Goods, Services, Digital Assets, and Plugins."
        />
      </Head>

      <Navigation onLoginClick={() => setShowLogin(true)} />

      <main className="min-h-screen bg-slate-50">
        {/* Header Section */}
        <section className="bg-white border-b border-slate-200">
          <div className="container mx-auto px-6 py-12">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              {t({ zh: '市场', en: 'Marketplace' })}
            </h1>
            <p className="text-slate-500 max-w-2xl">
              {t({ zh: '发现并获取各类商品、服务、数字资产及插件，赋能您的 Agent 业务。', en: 'Discover and acquire physical goods, services, digital assets, and plugins to empower your Agent business.' })}
            </p>
          </div>
          
          {/* Tabs */}
          <div className="container mx-auto px-6">
            <div className="flex space-x-8 border-b border-slate-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {t(tab.label)}
                  {tab.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="container mx-auto px-6 py-12">
          {activeTab === 'physical' && (
            <ProductServiceSection type="physical" />
          )}
          {activeTab === 'service' && (
            <ProductServiceSection type="service" />
          )}
          {activeTab === 'digital' && (
            <ProductServiceSection type="digital" />
          )}
          {activeTab === 'x402' && (
            <X402ProductSection />
          )}
          {activeTab === 'plugin' && (
             <div className="text-center py-20">
               <h3 className="text-xl font-semibold text-slate-900 mb-2">{t({ zh: '插件市场', en: 'Plugin Market' })}</h3>
               <p className="text-slate-500">{t({ zh: '即将上线', en: 'Coming Soon' })}</p>
             </div>
          )}
        </section>
      </main>

      <ShoppingCart />
      <Footer />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  )
}

