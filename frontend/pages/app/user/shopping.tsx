import React from 'react';
import Head from 'next/head';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useLocalization } from '../../../contexts/LocalizationContext';
import { ShoppingCart, Search, Tag, Package } from 'lucide-react';

export default function ShoppingPage() {
  const { t } = useLocalization();

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>{t({ zh: '智能购物', en: 'Smart Shopping' })} - Agentrix</title>
      </Head>

      <div className="min-h-screen bg-[#0f1115] text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{t({ zh: '智能购物', en: 'Smart Shopping' })}</h1>
            <p className="text-neutral-400">
              {t({ 
                zh: '由 AI 驱动的购物体验。搜索、比价并让您的 Agent 自动下单。', 
                en: 'AI-powered shopping experience. Search, compare prices, and let your Agent place orders automatically.' 
              })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl hover:border-blue-500/50 transition-all cursor-pointer group">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Search className="text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t({ zh: '商品搜索', en: 'Product Search' })}</h3>
              <p className="text-neutral-500 text-sm">集成各大电商平台，支持 AI 语义搜索。</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl hover:border-green-500/50 transition-all cursor-pointer group">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Tag className="text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t({ zh: '价格监控', en: 'Price Monitor' })}</h3>
              <p className="text-neutral-500 text-sm">设置目标价格，Agent 自动为您抢购。</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl hover:border-purple-500/50 transition-all cursor-pointer group">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Package className="text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t({ zh: '订单中心', en: 'Order Center' })}</h3>
              <p className="text-neutral-500 text-sm">统一管理所有平台的订单与物流信息。</p>
            </div>
          </div>

          <div className="mt-12 bg-neutral-900/50 border border-neutral-800 rounded-3xl p-12 text-center">
            <ShoppingCart size={64} className="mx-auto text-neutral-700 mb-6" />
            <h2 className="text-2xl font-bold mb-4">即将推出</h2>
            <p className="text-neutral-500 max-w-md mx-auto">
              我们正在集成更多电商平台和比价 Skill。很快您就可以在 ChatGPT 中直接通过 @Agentrix 购买任何商品。
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
