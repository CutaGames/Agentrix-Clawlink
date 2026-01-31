/**
 * Marketplace Page - 统一市场入口
 * 
 * 双视图设计：
 * - 资源与商品 (Resources & Goods) - Layer 2 Resource Skills
 * - 工具与应用 (Tools & Apps) - Layer 1/3/4 Skills
 */

import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Navigation } from '../components/ui/Navigation';
import { Footer } from '../components/layout/Footer';
import { SkillLayer, SkillSource, SkillResourceType } from '../types/skill';
import { useLocalization } from '../contexts/LocalizationContext';
import { useUser } from '../contexts/UserContext';
import { 
  ShoppingBag, 
  Wrench, 
  Sparkles, 
  Search,
  Grid,
  List,
  TrendingUp,
  Star,
  Package,
  Code,
  Zap,
  Layers,
  Loader2,
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
    commissionRate?: number;
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
  ucpEnabled?: boolean;
  x402Enabled?: boolean;
  metadata?: {
    performanceMetric?: string;
    persona?: string;
    image?: string;
  };
}

type ViewMode = 'resources' | 'tools';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function MarketplacePage() {
  const router = useRouter();
  const { t } = useLocalization();
  const { isAuthenticated } = useUser();
  
  const [viewMode, setViewMode] = useState<ViewMode>('resources');
  const [searchQuery, setSearchQuery] = useState('');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'callCount' | 'createdAt' | 'rating'>('callCount');

  // 分类配置
  const resourceCategories = [
    { id: 'all', label: { zh: '全部', en: 'All' } },
    { id: 'physical', label: { zh: '实物商品', en: 'Physical Goods' } },
    { id: 'digital', label: { zh: '数字资产', en: 'Digital Assets' } },
    { id: 'service', label: { zh: '专业服务', en: 'Services' } },
    { id: 'data', label: { zh: '数据资源', en: 'Data' } },
  ];

  const toolCategories = [
    { id: 'all', label: { zh: '全部', en: 'All' } },
    { id: 'payment', label: { zh: '支付工具', en: 'Payment' } },
    { id: 'analysis', label: { zh: '数据分析', en: 'Analysis' } },
    { id: 'utility', label: { zh: '实用工具', en: 'Utilities' } },
    { id: 'workflow', label: { zh: '工作流', en: 'Workflows' } },
  ];

  const categories = viewMode === 'resources' ? resourceCategories : toolCategories;

  // 获取数据
  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      
      // 根据视图模式筛选 layer
      if (viewMode === 'resources') {
        params.append('layer', 'resource');
      } else {
        params.append('layer', 'infra');
        params.append('layer', 'logic');
        params.append('layer', 'composite');
      }
      
      if (selectedCategory !== 'all') {
        if (viewMode === 'resources') {
          params.set('resourceType', selectedCategory);
        } else {
          params.set('category', selectedCategory);
        }
      }
      
      params.set('humanAccessible', 'true');
      params.set('limit', '24');
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortBy === 'createdAt' ? 'DESC' : 'DESC');

      const res = await fetch(`/api/unified-marketplace/search?${params}`);
      const data = await res.json();
      setSkills(data.items || []);
    } catch (error) {
      console.error('Failed to fetch skills:', error);
    } finally {
      setLoading(false);
    }
  }, [viewMode, searchQuery, selectedCategory, sortBy]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // 处理点击
  const handleSkillClick = (skill: Skill) => {
    router.push(`/skill/${skill.id}`);
  };

  const handleBuy = async (skill: Skill) => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/marketplace');
      return;
    }
    router.push(`/pay/checkout?skillId=${skill.id}`);
  };

  const handleInstall = async (skill: Skill) => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/marketplace');
      return;
    }
    router.push(`/workbench?action=install&skillId=${skill.id}`);
  };

  return (
    <>
      <Head>
        <title>{t({ zh: 'Agentrix 市场 - 发现技能与商品', en: 'Agentrix Marketplace - Discover Skills & Products' })}</title>
        <meta name="description" content={t({ zh: '统一市场，发现并获取各类 Skill、商品、服务与工具', en: 'Unified marketplace to discover and acquire Skills, Products, Services and Tools' })} />
      </Head>

      <Navigation />

      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-slate-800">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent" />
          <div className="container mx-auto px-6 py-12 relative">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">Agentrix Marketplace</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              {t({ zh: '发现下一代 AI 能力', en: 'Discover Next-Gen AI Capabilities' })}
            </h1>
            <p className="text-slate-400 max-w-2xl">
              {t({ 
                zh: '在这里，商品是可调用的、工具是可组合的、一切皆为 Skill。', 
                en: 'Here, products are callable, tools are composable, everything is a Skill.' 
              })}
            </p>
          </div>
        </section>

        {/* View Mode Toggle + Search */}
        <section className="sticky top-20 z-30 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800">
          <div className="container mx-auto px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-xl border border-slate-700">
                <button
                  onClick={() => { setViewMode('resources'); setSelectedCategory('all'); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'resources'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <ShoppingBag size={16} />
                  {t({ zh: '资源与商品', en: 'Resources & Goods' })}
                </button>
                <button
                  onClick={() => { setViewMode('tools'); setSelectedCategory('all'); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'tools'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-600/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Wrench size={16} />
                  {t({ zh: '工具与应用', en: 'Tools & Apps' })}
                </button>
              </div>

              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder={t({ 
                    zh: viewMode === 'resources' ? '搜索商品、服务...' : '搜索工具、技能...', 
                    en: viewMode === 'resources' ? 'Search products, services...' : 'Search tools, skills...' 
                  })}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25"
                />
              </div>

              {/* Display Mode Toggle */}
              <div className="hidden md:flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700">
                <button
                  onClick={() => setDisplayMode('grid')}
                  className={`p-2 rounded ${displayMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setDisplayMode('list')}
                  className={`p-2 rounded ${displayMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}
                >
                  <List size={18} />
                </button>
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25"
              >
                <option value="callCount">{t({ zh: '最热门', en: 'Most Popular' })}</option>
                <option value="createdAt">{t({ zh: '最新上架', en: 'Newest' })}</option>
                <option value="rating">{t({ zh: '最高评分', en: 'Highest Rated' })}</option>
              </select>
            </div>

            {/* Category Filters */}
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? viewMode === 'resources'
                        ? 'bg-blue-600 text-white'
                        : 'bg-purple-600 text-white'
                      : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700'
                  }`}
                >
                  {t(cat.label)}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="container mx-auto px-6 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : skills.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">
                {t({ zh: '暂无数据，请稍后再试', en: 'No data available, please try again later' })}
              </p>
            </div>
          ) : (
            <div className={displayMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
              : 'flex flex-col gap-4'
            }>
              {skills.map((skill) => (
                viewMode === 'resources' ? (
                  // 商品卡片样式 - Enhanced with protocol badges & persona metrics
                  <div
                    key={skill.id}
                    className="group bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer"
                    onClick={() => handleSkillClick(skill)}
                  >
                    {/* 封面图 */}
                    <div className="aspect-[4/3] bg-gradient-to-br from-slate-700 to-slate-800 relative overflow-hidden">
                      {(skill.imageUrl || skill.thumbnailUrl || skill.metadata?.image) ? (
                        <img 
                          src={skill.imageUrl || skill.thumbnailUrl || skill.metadata?.image} 
                          alt={skill.displayName || skill.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-slate-600" />
                        </div>
                      )}
                      {/* 价格标签 */}
                      {skill.pricing?.pricePerCall && (
                        <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-white text-sm font-semibold">
                          ${skill.pricing.pricePerCall}
                        </div>
                      )}
                      {/* Protocol Badges - Bottom Left */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-1">
                        {skill.ucpEnabled && (
                          <span className="px-1.5 py-0.5 text-[9px] font-medium bg-emerald-500/90 text-white rounded" title="UCP 物流履约">
                            📦 UCP
                          </span>
                        )}
                        {skill.x402Enabled && (
                          <span className="px-1.5 py-0.5 text-[9px] font-medium bg-amber-500/90 text-white rounded" title="X402 瞬时结算">
                            ⚡ X402
                          </span>
                        )}
                      </div>
                    </div>
                    {/* 信息 */}
                    <div className="p-4">
                      <h3 className="font-semibold text-white truncate mb-1">
                        {skill.displayName || skill.name}
                      </h3>
                      <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                        {skill.description}
                      </p>
                      {/* Merchant Performance Metrics */}
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-3">
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-700/50 rounded">
                          <Package size={10} className="text-orange-400" />
                          {skill.metadata?.performanceMetric || t({ zh: '优质现货', en: 'In Stock' })}
                        </span>
                        {skill.pricing?.commissionRate && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                            {skill.pricing.commissionRate}% {t({ zh: '分佣', en: 'Commission' })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {skill.rating && typeof skill.rating === 'number' && (
                            <span className="flex items-center gap-0.5">
                              <Star size={12} className="text-amber-400 fill-amber-400" />
                              {skill.rating.toFixed(1)}
                            </span>
                          )}
                          {skill.callCount && (
                            <span>{skill.callCount.toLocaleString()} {t({ zh: '次', en: 'sales' })}</span>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleBuy(skill); }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          {t({ zh: '购买', en: 'Buy' })}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // 工具卡片样式 - Enhanced with protocol badges & developer metrics
                  <div
                    key={skill.id}
                    className="group bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-purple-500/50 transition-all cursor-pointer flex items-start gap-4"
                    onClick={() => handleSkillClick(skill)}
                  >
                    {/* 图标 */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      skill.layer === 'infra' ? 'bg-amber-500/20 text-amber-400' :
                      skill.layer === 'logic' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {skill.layer === 'infra' ? <Zap size={24} /> :
                       skill.layer === 'logic' ? <Code size={24} /> :
                       <Layers size={24} />}
                    </div>
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">
                          {skill.displayName || skill.name}
                        </h3>
                        <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">
                          v1.0
                        </span>
                        {/* Protocol Badges */}
                        {skill.x402Enabled && (
                          <span className="px-1.5 py-0.5 text-[9px] font-medium bg-amber-500/20 text-amber-400 rounded" title="X402 瞬时结算">
                            ⚡ X402
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 line-clamp-2 mb-2">
                        {skill.description}
                      </p>
                      {/* Developer/API Performance Metrics */}
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-2">
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-700/50 rounded">
                          ⏱️ {skill.metadata?.performanceMetric || '~50ms'} {t({ zh: '延迟', en: 'latency' })}
                        </span>
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                          99.9% {t({ zh: '可用', en: 'uptime' })}
                        </span>
                        {skill.pricing?.commissionRate && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                            {skill.pricing.commissionRate}% {t({ zh: '分佣', en: 'Commission' })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <TrendingUp size={12} />
                          {skill.callCount?.toLocaleString() || 0} {t({ zh: '次调用', en: 'calls' })}
                        </span>
                        {skill.pricing?.pricePerCall && (
                          <span className="font-semibold text-green-400">
                            ${skill.pricing.pricePerCall}/{t({ zh: '次', en: 'call' })}
                          </span>
                        )}
                        {skill.pricing?.type === 'free' && (
                          <span className="font-semibold text-blue-400">
                            {t({ zh: '免费', en: 'Free' })}
                          </span>
                        )}
                        {skill.authorInfo && (
                          <span>by {skill.authorInfo.name}</span>
                        )}
                      </div>
                    </div>
                    {/* 操作按钮 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleInstall(skill); }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
                    >
                      {skill.pricing?.type === 'free' || !skill.pricing?.pricePerCall 
                        ? t({ zh: '安装', en: 'Install' })
                        : t({ zh: `$${skill.pricing.pricePerCall} 购买`, en: `Buy $${skill.pricing.pricePerCall}` })
                      }
                    </button>
                  </div>
                )
              ))}
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-12">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              {t({ zh: '成为卖家，发布你的 Skill', en: 'Become a Seller, Publish Your Skill' })}
            </h2>
            <p className="text-slate-400 mb-6 max-w-lg mx-auto">
              {t({ 
                zh: '无论你是商家还是开发者，都可以在 Agentrix 上发布你的商品或技能，触达全球 AI Agent。', 
                en: 'Whether you are a merchant or developer, publish your products or skills on Agentrix to reach global AI Agents.' 
              })}
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => router.push('/workbench?mode=merchant')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                <ShoppingBag size={18} />
                {t({ zh: '我是商家', en: "I'm a Merchant" })}
              </button>
              <button
                onClick={() => router.push('/workbench?mode=developer')}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                <Code size={18} />
                {t({ zh: '我是开发者', en: "I'm a Developer" })}
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}