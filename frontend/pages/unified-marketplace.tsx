/**
 * Unified Marketplace Page
 * 
 * V2.0: 统一市场页面 - 整合所有 Skill（商品、服务、工具、数据）
 * 
 * 升级内容：
 * - 意图型导航 (Intent-based Navigation)
 * - 去技术化卡片 (De-technicalized Cards)
 * - 深度详情模态框 (Detail Modal)
 */

import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Navigation } from '../components/ui/Navigation';
import { Footer } from '../components/layout/Footer';
import { SkillCard } from '../components/a2h';
import { SkillLayer, SkillSource, SkillResourceType } from '../types/skill';
import { SkillFilters, FilterState } from '../components/a2h/SkillFilters';
import { ShoppingCart } from '../components/marketplace/ShoppingCart';
import { useLocalization } from '../contexts/LocalizationContext';
// V2.0 新组件
import { 
  MarketplaceItemCard, 
  SkillDetailModal,
} from '../components/marketplace';
import { 
  IntentNavigation, 
  IntentCategory, 
  intentToLayerFilter,
  intentNavConfig,
} from '../components/marketplace/IntentNavigation';
import { 
  TrendingUp, 
  Sparkles, 
  Zap, 
  Package, 
  Code, 
  Layers,
  ArrowRight,
  Loader2,
  Download,
  Settings,
  Play,
  ShoppingBag,
  CheckCircle,
  AlertCircle,
  X,
  LayoutGrid,
  List,
} from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  displayName?: string;
  description: string;
  layer: SkillLayer;
  category: string;
  resourceType?: SkillResourceType;
  source: SkillSource;
  rating?: number;
  callCount?: number;
  pricing?: {
    type: string;
    pricePerCall?: number;
    currency?: string;
  };
  tags?: string[];
  authorInfo?: {
    id: string;
    name: string;
    type: string;
  };
  humanAccessible?: boolean;
  imageUrl?: string;
  thumbnailUrl?: string;
}

interface SearchResult {
  items: Skill[];
  total: number;
  page: number;
  limit: number;
  facets: {
    layers: Array<{ value: SkillLayer; count: number }>;
    categories: Array<{ value: string; count: number }>;
    resourceTypes: Array<{ value: SkillResourceType; count: number }>;
    sources: Array<{ value: SkillSource; count: number }>;
  };
}

interface TrendingSkill {
  skill: Skill;
  callCount24h: number;
  callCountGrowth: number;
  revenueGenerated: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// 执行结果弹窗
interface ExecuteResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export default function UnifiedMarketplacePage() {
  const router = useRouter();
  const { t } = useLocalization();
  
  // 执行和购买状态
  const [executeModal, setExecuteModal] = useState<{ skill: Skill | null; loading: boolean; result: ExecuteResult | null }>({
    skill: null,
    loading: false,
    result: null,
  });
  const [purchaseModal, setPurchaseModal] = useState<{ skill: Skill | null; loading: boolean; quantity: number; success: boolean }>({
    skill: null,
    loading: false,
    quantity: 1,
    success: false,
  });
  const [showEcosystemPanel, setShowEcosystemPanel] = useState(false);
  const [ecosystemLoading, setEcosystemLoading] = useState(false);
  const [ecosystemResult, setEcosystemResult] = useState<{ mcp: number; chatgpt: number } | null>(null);
  
  // V2.0: 意图导航状态
  const [selectedIntent, setSelectedIntent] = useState<IntentCategory>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [useV2Cards, setUseV2Cards] = useState(true); // 使用V2.0卡片
  const [detailModal, setDetailModal] = useState<{ skill: Skill | null; isOpen: boolean }>({
    skill: null,
    isOpen: false,
  });
  
  const [filters, setFilters] = useState<FilterState>({
    query: '',
    layers: [],
    categories: [],
    resourceTypes: [],
    sources: [],
    priceRange: {},
    rating: undefined,
    humanAccessible: undefined,
    sortBy: 'callCount',
    sortOrder: 'DESC',
  });

  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [trending, setTrending] = useState<TrendingSkill[]>([]);
  const [layerStats, setLayerStats] = useState<Array<{ layer: SkillLayer; count: number; totalCalls: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  // 获取搜索结果
  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.query) params.set('q', filters.query);
      if (filters.layers.length) filters.layers.forEach(l => params.append('layer', l));
      if (filters.categories.length) filters.categories.forEach(c => params.append('category', c));
      if (filters.resourceTypes.length) filters.resourceTypes.forEach(r => params.append('resourceType', r));
      if (filters.sources.length) filters.sources.forEach(s => params.append('source', s));
      if (filters.priceRange.min !== undefined) params.set('priceMin', String(filters.priceRange.min));
      if (filters.priceRange.max !== undefined) params.set('priceMax', String(filters.priceRange.max));
      if (filters.rating !== undefined) params.set('rating', String(filters.rating));
      if (filters.humanAccessible !== undefined) params.set('humanAccessible', String(filters.humanAccessible));
      params.set('sortBy', filters.sortBy);
      params.set('sortOrder', filters.sortOrder);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`${API_BASE}/api/unified-marketplace/search?${params}`);
      const data = await res.json();
      setSearchResult(data);
    } catch (error) {
      console.error('Failed to fetch skills:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  // 获取热门 Skill
  const fetchTrending = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/unified-marketplace/trending?limit=6`);
      const data = await res.json();
      setTrending(data);
    } catch (error) {
      console.error('Failed to fetch trending:', error);
    }
  }, []);

  // 获取层级统计
  const fetchLayerStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/unified-marketplace/stats/layers`);
      const data = await res.json();
      setLayerStats(data);
    } catch (error) {
      console.error('Failed to fetch layer stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    fetchTrending();
    fetchLayerStats();
  }, [fetchTrending, fetchLayerStats]);

  // 处理 Skill 点击
  const handleSkillClick = (skill: Skill) => {
    router.push(`/skill/${skill.id}`);
  };

  // 处理执行
  const handleExecute = async (skill: Skill) => {
    setExecuteModal({ skill, loading: true, result: null });
    
    try {
      const res = await fetch(`${API_BASE}/api/unified-marketplace/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId: skill.id, params: {} }),
      });
      const data = await res.json();
      
      setExecuteModal(prev => ({
        ...prev,
        loading: false,
        result: {
          success: data.success !== false,
          message: data.message || (data.success !== false ? '执行成功' : '执行失败'),
          data: data.result,
          error: data.error,
        },
      }));
      
      // 刷新数据
      fetchSkills();
    } catch (error: any) {
      setExecuteModal(prev => ({
        ...prev,
        loading: false,
        result: {
          success: false,
          error: error.message || '网络错误',
        },
      }));
    }
  };

  // 处理购买
  const handlePurchase = async () => {
    if (!purchaseModal.skill) return;
    
    setPurchaseModal(prev => ({ ...prev, loading: true }));
    
    try {
      const res = await fetch(`${API_BASE}/api/unified-marketplace/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          skillId: purchaseModal.skill.id, 
          quantity: purchaseModal.quantity,
        }),
      });
      const data = await res.json();
      
      if (data.success !== false) {
        setPurchaseModal(prev => ({ ...prev, loading: false, success: true }));
        // 3秒后关闭弹窗
        setTimeout(() => {
          setPurchaseModal({ skill: null, loading: false, quantity: 1, success: false });
        }, 3000);
      } else {
        alert(data.error || '购买失败');
        setPurchaseModal(prev => ({ ...prev, loading: false }));
      }
    } catch (error: any) {
      alert(error.message || '网络错误');
      setPurchaseModal(prev => ({ ...prev, loading: false }));
    }
  };

  // 处理加入购物车
  const handleAddToCart = async (skill: Skill) => {
    try {
      const res = await fetch(`${API_BASE}/api/unified-marketplace/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId: skill.id, quantity: 1 }),
      });
      const data = await res.json();
      
      if (data.success !== false) {
        alert(t({ zh: '已加入购物车', en: 'Added to cart' }));
      } else {
        alert(data.error || t({ zh: '加入失败', en: 'Failed to add' }));
      }
    } catch (error: any) {
      alert(error.message || t({ zh: '网络错误', en: 'Network error' }));
    }
  };

  // 导入生态 Skill
  const handleImportEcosystem = async () => {
    setEcosystemLoading(true);
    setEcosystemResult(null);
    
    try {
      // 导入 Claude MCP
      const mcpRes = await fetch(`${API_BASE}/api/skills/ecosystem/import-mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const mcpData = await mcpRes.json();
      
      // 导入 ChatGPT Actions
      const gptRes = await fetch(`${API_BASE}/api/skills/ecosystem/import-chatgpt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const gptData = await gptRes.json();
      
      setEcosystemResult({
        mcp: mcpData.imported || 0,
        chatgpt: gptData.imported || 0,
      });
      
      // 刷新列表
      fetchSkills();
      fetchLayerStats();
    } catch (error: any) {
      alert(error.message || '导入失败');
    } finally {
      setEcosystemLoading(false);
    }
  };

  // 层级图标
  const layerIcons: Record<SkillLayer, React.ReactNode> = {
    infra: <Zap className="w-5 h-5" />,
    resource: <Package className="w-5 h-5" />,
    logic: <Code className="w-5 h-5" />,
    composite: <Layers className="w-5 h-5" />,
  };

  const layerLabels: Record<SkillLayer, string> = {
    infra: 'Infrastructure',
    resource: 'Resources',
    logic: 'Logic',
    composite: 'Composite',
  };

  const layerDescriptions: Record<SkillLayer, string> = {
    infra: t({ zh: '支付、钱包、身份、授权', en: 'Payment, Wallet, Identity, Auth' }),
    resource: t({ zh: '商品、服务、数字资产', en: 'Products, Services, Digital Assets' }),
    logic: t({ zh: '算法、分析、工具', en: 'Algorithms, Analysis, Tools' }),
    composite: t({ zh: '工作流、多 Skill 编排', en: 'Workflows, Multi-Skill Orchestration' }),
  };

  return (
    <>
      <Head>
        <title>Agentrix Unified Marketplace</title>
        <meta
          name="description"
          content="Discover and acquire Skills - Products, Services, Tools, and Data - all in one unified marketplace."
        />
      </Head>

      <Navigation />

      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="container mx-auto px-6 py-16 relative">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">Skill Ecosystem 2.0</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {t({ zh: '统一市场', en: 'Unified Marketplace' })}
              </h1>
              <p className="text-lg text-slate-300 mb-8">
                {t({ 
                  zh: '发现并获取各类 Skill —— 商品、服务、工具、数据 —— 一切皆可调用，赋能您的 Agent。', 
                  en: 'Discover and acquire Skills — Products, Services, Tools, and Data — everything is callable, empowering your Agent.' 
                })}
              </p>
              
              {/* 操作按钮 */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowEcosystemPanel(!showEcosystemPanel)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium transition-all"
                >
                  <Download className="w-4 h-4" />
                  {t({ zh: '导入生态 Skill', en: 'Import Ecosystem Skills' })}
                </button>
                <button
                  onClick={() => router.push('/merchants/dashboard?tab=pricing')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all border border-white/20"
                >
                  <Settings className="w-4 h-4" />
                  {t({ zh: '佣金配置', en: 'Commission Config' })}
                </button>
              </div>
            </div>
            
            {/* 生态导入面板 */}
            {showEcosystemPanel && (
              <div className="mt-8 p-6 rounded-xl bg-white/10 backdrop-blur border border-white/20">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  {t({ zh: '从外部生态导入 Skill', en: 'Import Skills from External Ecosystems' })}
                </h3>
                <p className="text-slate-300 text-sm mb-4">
                  {t({ 
                    zh: '一键导入 Claude MCP 服务器和 ChatGPT Actions 作为 Agentrix Skill，实现多生态聚合。', 
                    en: 'One-click import Claude MCP servers and ChatGPT Actions as Agentrix Skills for multi-ecosystem aggregation.' 
                  })}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🤖</span>
                      <span className="font-medium">Claude MCP</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      filesystem, github, brave-search, fetch, memory, puppeteer, slack, google-drive
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">💬</span>
                      <span className="font-medium">ChatGPT Actions</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      DALL·E, Code Interpreter, Web Browsing
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleImportEcosystem}
                  disabled={ecosystemLoading}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {ecosystemLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t({ zh: '导入中...', en: 'Importing...' })}
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      {t({ zh: '开始导入', en: 'Start Import' })}
                    </>
                  )}
                </button>
                {ecosystemResult && (
                  <div className="mt-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-sm">
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    {t({ 
                      zh: `导入完成！Claude MCP: ${ecosystemResult.mcp} 个, ChatGPT: ${ecosystemResult.chatgpt} 个`, 
                      en: `Import complete! Claude MCP: ${ecosystemResult.mcp}, ChatGPT: ${ecosystemResult.chatgpt}` 
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Layer Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {(['infra', 'resource', 'logic', 'composite'] as SkillLayer[]).map((layer) => {
                const stats = layerStats.find(s => s.layer === layer);
                return (
                  <button
                    key={layer}
                    onClick={() => setFilters(f => ({ 
                      ...f, 
                      layers: f.layers.includes(layer) 
                        ? f.layers.filter(l => l !== layer) 
                        : [...f.layers, layer] 
                    }))}
                    className={`p-4 rounded-xl border transition-all ${
                      filters.layers.includes(layer)
                        ? 'bg-white/20 border-white/40'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {layerIcons[layer]}
                      <span className="font-semibold">{layerLabels[layer]}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{layerDescriptions[layer]}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span>{stats?.count || 0} skills</span>
                      <span className="text-slate-400">{(stats?.totalCalls || 0).toLocaleString()} calls</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Trending Section */}
        {trending.length > 0 && (
          <section className="container mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-rose-500" />
                <h2 className="text-xl font-bold text-slate-900">
                  {t({ zh: '热门 Skill', en: 'Trending Skills' })}
                </h2>
              </div>
              <button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                {t({ zh: '查看全部', en: 'View All' })}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trending.map((item) => (
                <SkillCard
                  key={item.skill.id}
                  {...item.skill}
                  price={item.skill.pricing?.pricePerCall}
                  currency={item.skill.pricing?.currency}
                  authorName={item.skill.authorInfo?.name}
                  imageUrl={item.skill.imageUrl}
                  thumbnailUrl={item.skill.thumbnailUrl}
                  onClick={() => handleSkillClick(item.skill)}
                  onExecute={() => handleExecute(item.skill)}
                  onAddToCart={item.skill.layer === 'resource' ? () => handleAddToCart(item.skill) : undefined}
                />
              ))}
            </div>
          </section>
        )}

        {/* Main Content */}
        <section className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* V2.0 Intent Navigation Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* 意图导航 */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <IntentNavigation
                    selectedIntent={selectedIntent}
                    onIntentChange={(intent) => {
                      setSelectedIntent(intent);
                      // 同步更新层级筛选
                      const layers = intentToLayerFilter(intent);
                      setFilters(f => ({ ...f, layers: intent === 'all' ? [] : layers }));
                      setPage(1);
                    }}
                    selectedSubcategory={selectedSubcategory}
                    onSubcategoryChange={setSelectedSubcategory}
                    counts={{
                      all: searchResult?.total || 0,
                      shopping: layerStats.find(s => s.layer === 'resource')?.count || 0,
                      services: (layerStats.find(s => s.layer === 'resource')?.count || 0) + (layerStats.find(s => s.layer === 'logic')?.count || 0),
                      analysis: layerStats.find(s => s.layer === 'logic')?.count || 0,
                      development: (layerStats.find(s => s.layer === 'infra')?.count || 0) + (layerStats.find(s => s.layer === 'logic')?.count || 0),
                      automation: layerStats.find(s => s.layer === 'composite')?.count || 0,
                    }}
                  />
                </div>
                
                {/* 高级筛选折叠面板 */}
                <details className="bg-white rounded-xl border border-slate-200">
                  <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl">
                    {t({ zh: '高级筛选', en: 'Advanced Filters' })}
                  </summary>
                  <div className="px-4 pb-4">
                    <SkillFilters
                      filters={filters}
                      onFilterChange={(newFilters) => {
                        setFilters(newFilters);
                        setPage(1);
                      }}
                      facets={searchResult?.facets}
                      categories={searchResult?.facets?.categories?.map(c => ({ category: c.value, count: c.count })) || []}
                    />
                  </div>
                </details>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-3">
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-slate-600">
                  {searchResult ? (
                    <>
                      {t({ zh: '找到', en: 'Found' })} <span className="font-semibold text-slate-900">{searchResult.total}</span> {t({ zh: '项', en: 'items' })}
                    </>
                  ) : (
                    t({ zh: '加载中...', en: 'Loading...' })
                  )}
                </p>
                
                {/* 视图切换 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUseV2Cards(!useV2Cards)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      useV2Cards ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    V2.0
                  </button>
                  <div className="flex items-center bg-slate-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                    >
                      <LayoutGrid className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                    >
                      <List className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              )}

              {/* Results Grid */}
              {!loading && searchResult && (
                <>
                  <div className={`grid gap-4 ${
                    viewMode === 'grid' 
                      ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
                      : 'grid-cols-1'
                  }`}>
                    {searchResult.items.map((skill) => (
                      useV2Cards ? (
                        <MarketplaceItemCard
                          key={skill.id}
                          id={skill.id}
                          name={skill.name}
                          displayName={skill.displayName}
                          description={skill.description}
                          layer={skill.layer}
                          imageUrl={skill.imageUrl || skill.thumbnailUrl}
                          rating={skill.rating}
                          callCount={skill.callCount}
                          pricingType={skill.pricing?.type as any}
                          price={skill.pricing?.pricePerCall}
                          currency={skill.pricing?.currency}
                          supportsInstant={skill.layer === 'logic' || skill.layer === 'infra'}
                          supportsDelivery={skill.layer === 'resource'}
                          authorName={skill.authorInfo?.name}
                          variant={viewMode === 'list' ? 'compact' : 'default'}
                          onClick={() => setDetailModal({ skill, isOpen: true })}
                        />
                      ) : (
                        <SkillCard
                          key={skill.id}
                          {...skill}
                          price={skill.pricing?.pricePerCall}
                          currency={skill.pricing?.currency}
                          authorName={skill.authorInfo?.name}
                          imageUrl={skill.imageUrl}
                          thumbnailUrl={skill.thumbnailUrl}
                          onClick={() => handleSkillClick(skill)}
                          onExecute={() => handleExecute(skill)}
                          onAddToCart={skill.layer === 'resource' ? () => handleAddToCart(skill) : undefined}
                        />
                      )
                    ))}
                  </div>

                  {/* Empty State */}
                  {searchResult.items.length === 0 && (
                    <div className="text-center py-20">
                      <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {t({ zh: '没有找到匹配项', en: 'No items found' })}
                      </h3>
                      <p className="text-slate-500">
                        {t({ zh: '尝试调整筛选条件', en: 'Try adjusting your filters' })}
                      </p>
                    </div>
                  )}

                  {/* Pagination */}
                  {searchResult.total > limit && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t({ zh: '上一页', en: 'Previous' })}
                      </button>
                      <span className="px-4 py-2 text-slate-600">
                        {page} / {Math.ceil(searchResult.total / limit)}
                      </span>
                      <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= Math.ceil(searchResult.total / limit)}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t({ zh: '下一页', en: 'Next' })}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <ShoppingCart />
      <Footer />

      {/* 执行结果弹窗 */}
      {executeModal.skill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setExecuteModal({ skill: null, loading: false, result: null })}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Play className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {t({ zh: '执行 Skill', en: 'Execute Skill' })}
                </h3>
                <p className="text-sm text-slate-500">{executeModal.skill.displayName || executeModal.skill.name}</p>
              </div>
            </div>

            {executeModal.loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-3 text-slate-600">{t({ zh: '执行中...', en: 'Executing...' })}</span>
              </div>
            )}

            {executeModal.result && (
              <div className={`p-4 rounded-lg ${executeModal.result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {executeModal.result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-medium ${executeModal.result.success ? 'text-green-900' : 'text-red-900'}`}>
                    {executeModal.result.success ? t({ zh: '执行成功', en: 'Success' }) : t({ zh: '执行失败', en: 'Failed' })}
                  </span>
                </div>
                {executeModal.result.message && (
                  <p className="text-sm text-slate-600 mb-2">{executeModal.result.message}</p>
                )}
                {executeModal.result.error && (
                  <p className="text-sm text-red-600">{executeModal.result.error}</p>
                )}
                {executeModal.result.data && (
                  <pre className="mt-2 p-2 bg-slate-100 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(executeModal.result.data, null, 2)}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={() => setExecuteModal({ skill: null, loading: false, result: null })}
              className="w-full mt-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              {t({ zh: '关闭', en: 'Close' })}
            </button>
          </div>
        </div>
      )}

      {/* 购买弹窗 */}
      {purchaseModal.skill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setPurchaseModal({ skill: null, loading: false, quantity: 1, success: false })}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            {purchaseModal.success ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {t({ zh: '购买成功！', en: 'Purchase Successful!' })}
                </h3>
                <p className="text-slate-500">
                  {t({ zh: '您已成功购买此商品', en: 'You have successfully purchased this item' })}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {t({ zh: '购买商品', en: 'Purchase Item' })}
                    </h3>
                    <p className="text-sm text-slate-500">{purchaseModal.skill.displayName || purchaseModal.skill.name}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">{t({ zh: '单价', en: 'Unit Price' })}</span>
                    <span className="font-semibold text-slate-900">
                      ${purchaseModal.skill.pricing?.pricePerCall?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">{t({ zh: '数量', en: 'Quantity' })}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPurchaseModal(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-semibold">{purchaseModal.quantity}</span>
                      <button
                        onClick={() => setPurchaseModal(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <span className="font-medium text-slate-900">{t({ zh: '总计', en: 'Total' })}</span>
                    <span className="text-xl font-bold text-green-600">
                      ${((purchaseModal.skill.pricing?.pricePerCall || 0) * purchaseModal.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePurchase}
                  disabled={purchaseModal.loading}
                  className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {purchaseModal.loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t({ zh: '处理中...', en: 'Processing...' })}
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5" />
                      {t({ zh: '确认购买', en: 'Confirm Purchase' })}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* V2.0 详情模态框 */}
      {detailModal.skill && (
        <SkillDetailModal
          isOpen={detailModal.isOpen}
          onClose={() => setDetailModal({ skill: null, isOpen: false })}
          skill={{
            id: detailModal.skill.id,
            name: detailModal.skill.name,
            displayName: detailModal.skill.displayName,
            description: detailModal.skill.description,
            layer: detailModal.skill.layer,
            rating: detailModal.skill.rating,
            callCount: detailModal.skill.callCount,
            pricingType: detailModal.skill.pricing?.type as any,
            price: detailModal.skill.pricing?.pricePerCall,
            currency: detailModal.skill.pricing?.currency,
            ucpEnabled: detailModal.skill.layer === 'resource',
            x402Enabled: detailModal.skill.layer === 'logic' || detailModal.skill.layer === 'infra',
            authorName: detailModal.skill.authorInfo?.name,
            imageUrl: detailModal.skill.imageUrl || detailModal.skill.thumbnailUrl,
            tags: detailModal.skill.tags,
          }}
          onTryIt={detailModal.skill.layer === 'logic' ? async (params) => {
            const res = await fetch(`${API_BASE}/api/skills/${detailModal.skill!.id}/playground`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ params }),
            });
            return res.json();
          } : undefined}
          onPurchase={() => {
            setDetailModal({ skill: null, isOpen: false });
            setPurchaseModal({ skill: detailModal.skill, loading: false, quantity: 1, success: false });
          }}
          onAddToAgent={() => {
            handleAddToCart(detailModal.skill!);
            setDetailModal({ skill: null, isOpen: false });
          }}
        />
      )}
    </>
  );
}
