import React, { useState } from 'react';
import Head from 'next/head';
import { 
  Search, 
  Filter, 
  Zap, 
  Package, 
  Database, 
  UserCheck, 
  Wrench,
  Grid,
  List,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { Navigation } from '../components/ui/Navigation';
import { MarketplaceItemCard, ItemPersona, MarketplaceItemProps } from '../components/marketplace/MarketplaceItemCard';

const MarketplaceV3 = () => {
  const [activePersona, setActivePersona] = useState<ItemPersona | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const personas = [
    { id: 'all', label: '全部能力', icon: <Grid className="w-4 h-4" /> },
    { id: 'api_provider', label: 'API 接口', icon: <Zap className="w-4 h-4" /> },
    { id: 'merchant', label: '实物商品', icon: <Package className="w-4 h-4" /> },
    { id: 'data_provider', label: '数据资产', icon: <Database className="w-4 h-4" /> },
    { id: 'expert', label: '专家逻辑', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'developer', label: '开发工具', icon: <Wrench className="w-4 h-4" /> },
  ];

  const mockItems: MarketplaceItemProps[] = [
    {
      id: '1',
      name: 'Global Logistics Tracker Pro',
      displayName: '全球物流追踪大师',
      description: '接入 200+ 快递供应商，支持 X402 实时支付，提供 SLA 级稳定性保证。',
      persona: 'api_provider',
      layer: 'resource',
      rating: 4.9,
      callCount: 12500,
      price: 0.05,
      pricingType: 'per_call',
      supportsInstant: true,
      slaGuarantee: true,
      performanceMetric: '~32ms'
    },
    {
      id: '2',
      name: 'Market Sentiment Data Feed',
      displayName: '加密市场情绪情绪指标',
      description: '实时聚合 X (Twitter) 与主流新闻情绪，提供结构化数据流，适用于交易机器人。',
      persona: 'data_provider',
      layer: 'resource',
      rating: 4.7,
      callCount: 8900,
      price: 29.9,
      pricingType: 'subscription',
      supportsInstant: true,
    },
    {
      id: '3',
      name: 'Organic Fair Trade Coffee Beans',
      displayName: '有机公平贸易咖啡豆',
      description: '来自埃塞俄比亚的顶级原产地，通过 UCP 协议保证物理履约与全程追溯。',
      persona: 'merchant',
      layer: 'resource',
      rating: 5.0,
      callCount: 1200,
      price: 45,
      pricingType: 'subscription',
      supportsDelivery: true,
    },
    {
      id: '4',
      name: 'Arbitrage Strategy Expert',
      displayName: '跨链套利决策专家',
      description: '基于多链流动性池深度分析，提供毫秒级套利逻辑执行，佣金比例透明。',
      persona: 'expert',
      layer: 'logic',
      rating: 4.8,
      callCount: 3400,
      commissionRate: 15,
      pricingType: 'revenue_share',
    },
    {
      id: '5',
      name: 'SDK Scaffold Generator',
      displayName: '多语言 SDK 脚手架生成器',
      description: '一键生成适配 Agentrix 协议的客户端代码，支持 TypeScript, Python, Go。',
      persona: 'developer',
      layer: 'infra',
      rating: 4.6,
      callCount: 5600,
      price: 0,
      pricingType: 'free',
    },
  ];

  const filteredItems = mockItems.filter(item => 
    (activePersona === 'all' || item.persona === activePersona) &&
    (item.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
     item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Head>
        <title>Agentrix Marketplace | 去中心化能力与资产商店</title>
      </Head>

      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 顶部搜索与标题 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Agentrix Marketplace</h1>
            <p className="mt-2 text-slate-500 max-w-2xl">
              发现、集成并非凡跨链资产与 AI 技能。基于 ASP V2.0 协议，实现物理商品与数字逻辑的统一分发。
            </p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="搜索技能或资产..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-8">
          {/* 左侧侧边栏过滤器 */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sticky top-24">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-500" />
                身份过滤 (Persona)
              </h3>
              
              <div className="space-y-1">
                {personas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePersona(p.id as any)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      activePersona === p.id 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {p.icon}
                      {p.label}
                    </div>
                    {activePersona === p.id && <ArrowRight className="w-3 h-3" />}
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <h3 className="font-bold text-slate-900 mb-4 px-2">热门搜索</h3>
                <div className="flex flex-wrap gap-2">
                  {['结算网关', 'Oracle', '跨境汇款', '专家决策'].map(tag => (
                    <button key={tag} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[11px] transition-colors">
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 bg-blue-600 rounded-xl p-4 text-white">
                <h4 className="font-bold text-sm mb-1">成为发布者</h4>
                <p className="text-[10px] text-blue-100 mb-3 leading-relaxed">
                  全球已有 12,000+ 开发者在此发布其资产与技能，支持 3 分钟极速入驻。
                </p>
                <button className="w-full py-1.5 bg-white text-blue-600 rounded-lg text-[11px] font-bold hover:bg-blue-50 transition-colors">
                  立即开始
                </button>
              </div>
            </div>
          </aside>

          {/* 右侧内容区 */}
          <div className="flex-1">
            {/* 顶栏工具栏 */}
            <div className="flex items-center justify-between mb-6 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {['最新发布', '调用最多', '评分最高', '分成最优'].map((tab, idx) => (
                  <button 
                    key={tab} 
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                      idx === 0 ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 ml-4 px-2">
                <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                  <Grid className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 卡片网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <MarketplaceItemCard key={item.id} {...item} />
                ))
              ) : (
                <div className="col-span-full py-20 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                    <Search className="w-6 h-6 text-slate-300" />
                  </div>
                  <h3 className="text-slate-900 font-bold">未找到匹配的结果</h3>
                  <p className="text-slate-500 text-sm mt-1">请尝试调整过滤器或搜索词</p>
                </div>
              )}
            </div>

            {/* 底部加载更多 */}
            {filteredItems.length > 0 && (
              <div className="mt-12 flex justify-center">
                <button className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-bold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm">
                  加载更多资产
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 底部装饰 */}
      <footer className="mt-20 border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-slate-400">
              <Award className="w-5 h-5" />
              <span className="text-xs font-medium">Verified Protocols</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <TrendingUp className="w-5 h-5" />
              <span className="text-xs font-medium">Real-time Settlement</span>
            </div>
          </div>
          <p className="text-slate-400 text-[11px] font-mono">
            &copy; 2026 AGENTRIX ECOSYSTEM. POWERED BY ASP V2.0 & X402.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MarketplaceV3;
