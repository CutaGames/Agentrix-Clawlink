/**
 * Marketplace V2 Page
 * 
 * 用户友好的统一市场页面 - 面向普通用户、商户和开发者
 * 将技术性的 "Skill" 概念转化为更易理解的 "服务/商品/工具"
 */

import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Navigation } from '../components/ui/Navigation';
import { Footer } from '../components/layout/Footer';
import { useLocalization } from '../contexts/LocalizationContext';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { useCart } from '../contexts/CartContext';
import { 
  unifiedMarketplaceApi, 
  UnifiedSkillInfo,
  UnifiedSearchParams,
} from '../lib/api/unified-marketplace.api';
import { 
  Search,
  ShoppingCart,
  Play,
  Star,
  TrendingUp,
  Package,
  Zap,
  Code,
  Layers,
  Filter,
  ChevronDown,
  X,
  Loader2,
  Heart,
  Share2,
  ExternalLink,
  Check,
  AlertCircle,
  CreditCard,
  Truck,
  Download,
  Database,
  Settings,
} from 'lucide-react';

// 用户友好的类别映射
const CATEGORY_LABELS: Record<string, { zh: string; en: string; icon: any; color: string }> = {
  commerce: { zh: '商品购物', en: 'Shopping', icon: ShoppingCart, color: 'bg-amber-500' },
  payment: { zh: '支付服务', en: 'Payment', icon: CreditCard, color: 'bg-green-500' },
  data: { zh: '数据服务', en: 'Data', icon: Database, color: 'bg-blue-500' },
  utility: { zh: '实用工具', en: 'Tools', icon: Settings, color: 'bg-purple-500' },
  integration: { zh: '集成服务', en: 'Integration', icon: Layers, color: 'bg-indigo-500' },
  custom: { zh: '定制服务', en: 'Custom', icon: Code, color: 'bg-pink-500' },
};

// 资源类型的用户友好标签
const RESOURCE_TYPE_LABELS: Record<string, { zh: string; en: string; icon: any }> = {
  physical: { zh: '实物商品', en: 'Physical', icon: Truck },
  service: { zh: '服务', en: 'Service', icon: Zap },
  digital: { zh: '数字商品', en: 'Digital', icon: Download },
  data: { zh: '数据', en: 'Data', icon: Database },
  logic: { zh: '工具', en: 'Tool', icon: Code },
};

interface MarketplaceItem extends UnifiedSkillInfo {
  isFavorite?: boolean;
}

export default function MarketplaceV2Page() {
  const router = useRouter();
  const { t } = useLocalization();
  const { isAuthenticated, user } = useUser();
  const { success, error: showError } = useToast();
  const { addItem } = useCart?.() || { addItem: () => {} };

  // 状态
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({});
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'price_low' | 'price_high'>('popular');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const limit = 20;

  // 加载数据
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: UnifiedSearchParams = {
        q: searchQuery || undefined,
        category: selectedCategory ? [selectedCategory as any] : undefined,
        resourceType: selectedType ? [selectedType as any] : undefined,
        priceMin: priceRange.min,
        priceMax: priceRange.max,
        humanAccessible: true,
        page,
        limit,
      };

      const response = await unifiedMarketplaceApi.search(params);
      setItems(response.results || []);
      setTotal(response.total || 0);
    } catch (err) {
      console.error('Failed to load items:', err);
      showError(t({ zh: '加载失败，请重试', en: 'Failed to load, please retry' }));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedType, priceRange, page, sortBy]);

  const loadTrending = useCallback(async () => {
    try {
      const data = await unifiedMarketplaceApi.getTrending(6);
      setTrending(data || []);
    } catch (err) {
      console.error('Failed to load trending:', err);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  // 处理购买/执行
  const handleAction = async (item: MarketplaceItem) => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }

    const isResource = item.layer === 'resource';
    
    if (isResource) {
      // 商品类 - 跳转到购买流程
      setSelectedItem(item);
      setShowDetailModal(true);
    } else {
      // 工具/服务类 - 直接执行或跳转到执行页面
      setExecutingId(item.id);
      try {
        const result = await unifiedMarketplaceApi.executeSkill({
          skillId: item.id,
          params: {},
          context: { userId: user?.id, platform: 'web' },
        });
        
        if (result.success) {
          success(t({ zh: '执行成功', en: 'Executed successfully' }));
        } else {
          showError(result.error || t({ zh: '执行失败', en: 'Execution failed' }));
        }
      } catch (err: any) {
        showError(err.message || t({ zh: '执行失败', en: 'Execution failed' }));
      } finally {
        setExecutingId(null);
      }
    }
  };

  // 添加到购物车
  const handleAddToCart = async (item: MarketplaceItem) => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }

    try {
      await unifiedMarketplaceApi.addToCart(item.id, 1);
      success(t({ zh: '已添加到购物车', en: 'Added to cart' }));
    } catch (err: any) {
      showError(err.message || t({ zh: '添加失败', en: 'Failed to add' }));
    }
  };

  // 购买
  const handlePurchase = async (item: MarketplaceItem, quantity = 1) => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }

    try {
      const result = await unifiedMarketplaceApi.purchaseSkill({
        skillId: item.id,
        quantity,
      });

      if (result.success) {
        if (result.paymentUrl) {
          window.location.href = result.paymentUrl;
        } else {
          success(t({ zh: '购买成功！', en: 'Purchase successful!' }));
          setShowDetailModal(false);
        }
      } else {
        showError(result.error || t({ zh: '购买失败', en: 'Purchase failed' }));
      }
    } catch (err: any) {
      showError(err.message || t({ zh: '购买失败', en: 'Purchase failed' }));
    }
  };

  // 获取用户友好的类别标签
  const getCategoryLabel = (category: string) => {
    const label = CATEGORY_LABELS[category];
    return label ? t(label) : category;
  };

  // 获取用户友好的类型标签
  const getTypeLabel = (type: string) => {
    const label = RESOURCE_TYPE_LABELS[type];
    return label ? t(label) : type;
  };

  // 获取价格显示
  const getPriceDisplay = (item: MarketplaceItem) => {
    const price = item.pricing?.pricePerCall;
    if (!price || price === 0) {
      return <span className="text-emerald-600 font-semibold">{t({ zh: '免费', en: 'Free' })}</span>;
    }
    return (
      <span className="font-bold text-slate-900">
        ${price.toFixed(2)}
        <span className="text-xs text-slate-400 ml-1">{item.pricing?.currency || 'USD'}</span>
      </span>
    );
  };

  // 获取操作按钮文本
  const getActionText = (item: MarketplaceItem) => {
    if (item.layer === 'resource') {
      const price = item.pricing?.pricePerCall;
      if (!price || price === 0) {
        return t({ zh: '免费获取', en: 'Get Free' });
      }
      return t({ zh: '立即购买', en: 'Buy Now' });
    }
    return t({ zh: '立即使用', en: 'Use Now' });
  };

  return (
    <>
      <Head>
        <title>{t({ zh: 'Agentrix 市场', en: 'Agentrix Marketplace' })}</title>
        <meta name="description" content={t({ 
          zh: '发现商品、服务和工具，让 AI 助手帮你完成更多', 
          en: 'Discover products, services and tools, let AI assistants help you do more' 
        })} />
      </Head>

      <Navigation />

      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        {/* Hero Section - 更友好的标题 */}
        <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white">
          <div className="container mx-auto px-6 py-12">
            <div className="max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                {t({ zh: '发现更多可能', en: 'Discover More Possibilities' })}
              </h1>
              <p className="text-lg text-white/80 mb-6">
                {t({ 
                  zh: '商品、服务、工具，一站式获取。让 AI 助手帮你完成购物、支付、数据分析等任务。', 
                  en: 'Products, services, tools - all in one place. Let AI assistants help you with shopping, payments, data analysis and more.' 
                })}
              </p>
              
              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder={t({ zh: '搜索商品、服务或工具...', en: 'Search products, services or tools...' })}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white text-slate-900 placeholder-slate-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>

            {/* 快捷分类 */}
            <div className="flex flex-wrap gap-3 mt-8">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                const Icon = label.icon;
                const isSelected = selectedCategory === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(isSelected ? null : key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                      isSelected 
                        ? 'bg-white text-slate-900 shadow-lg' 
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{t(label)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 热门推荐 */}
        {trending.length > 0 && (
          <section className="container mx-auto px-6 py-10">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-rose-500" />
              <h2 className="text-xl font-bold text-slate-900">
                {t({ zh: '热门推荐', en: 'Trending' })}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trending.slice(0, 6).map((item) => (
                <ItemCard
                  key={item.skill?.id || item.id}
                  item={item.skill || item}
                  onAction={() => handleAction(item.skill || item)}
                  onAddToCart={() => handleAddToCart(item.skill || item)}
                  getActionText={getActionText}
                  getPriceDisplay={getPriceDisplay}
                  getCategoryLabel={getCategoryLabel}
                  getTypeLabel={getTypeLabel}
                  executingId={executingId}
                  t={t}
                />
              ))}
            </div>
          </section>
        )}

        {/* 主内容区 */}
        <section className="container mx-auto px-6 py-8">
          {/* 筛选栏 */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-slate-600">
              {t({ zh: '共', en: 'Found' })} <span className="font-semibold text-slate-900">{total}</span> {t({ zh: '个结果', en: 'results' })}
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <Filter className="w-4 h-4" />
                {t({ zh: '筛选', en: 'Filter' })}
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 bg-white"
              >
                <option value="popular">{t({ zh: '最热门', en: 'Most Popular' })}</option>
                <option value="newest">{t({ zh: '最新', en: 'Newest' })}</option>
                <option value="price_low">{t({ zh: '价格从低到高', en: 'Price: Low to High' })}</option>
                <option value="price_high">{t({ zh: '价格从高到低', en: 'Price: High to Low' })}</option>
              </select>
            </div>
          </div>

          {/* 筛选面板 */}
          {showFilters && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 类型筛选 */}
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">{t({ zh: '类型', en: 'Type' })}</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(RESOURCE_TYPE_LABELS).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedType(selectedType === key ? null : key)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          selectedType === key
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {t(label)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 价格筛选 */}
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">{t({ zh: '价格', en: 'Price' })}</h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder={t({ zh: '最低', en: 'Min' })}
                      value={priceRange.min || ''}
                      onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      type="number"
                      placeholder={t({ zh: '最高', en: 'Max' })}
                      value={priceRange.max || ''}
                      onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-24 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    />
                  </div>
                </div>

                {/* 清除筛选 */}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedType(null);
                      setPriceRange({});
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {t({ zh: '清除所有筛选', en: 'Clear all filters' })}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 商品列表 */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {t({ zh: '暂无结果', en: 'No results found' })}
              </h3>
              <p className="text-slate-500">
                {t({ zh: '尝试调整搜索条件', en: 'Try adjusting your search' })}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onAction={() => handleAction(item)}
                    onAddToCart={() => handleAddToCart(item)}
                    getActionText={getActionText}
                    getPriceDisplay={getPriceDisplay}
                    getCategoryLabel={getCategoryLabel}
                    getTypeLabel={getTypeLabel}
                    executingId={executingId}
                    t={t}
                  />
                ))}
              </div>

              {/* 分页 */}
              {total > limit && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t({ zh: '上一页', en: 'Previous' })}
                  </button>
                  <span className="px-4 py-2 text-slate-600">
                    {page} / {Math.ceil(total / limit)}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= Math.ceil(total / limit)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t({ zh: '下一页', en: 'Next' })}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* 详情/购买弹窗 */}
        {showDetailModal && selectedItem && (
          <DetailModal
            item={selectedItem}
            onClose={() => setShowDetailModal(false)}
            onPurchase={handlePurchase}
            getPriceDisplay={getPriceDisplay}
            t={t}
          />
        )}
      </main>

      <Footer />
    </>
  );
}

// 商品卡片组件
function ItemCard({
  item,
  onAction,
  onAddToCart,
  getActionText,
  getPriceDisplay,
  getCategoryLabel,
  getTypeLabel,
  executingId,
  t,
}: {
  item: MarketplaceItem;
  onAction: () => void;
  onAddToCart: () => void;
  getActionText: (item: MarketplaceItem) => string;
  getPriceDisplay: (item: MarketplaceItem) => React.ReactNode;
  getCategoryLabel: (category: string) => string;
  getTypeLabel: (type: string) => string;
  executingId: string | null;
  t: any;
}) {
  const isResource = item.layer === 'resource';
  const isExecuting = executingId === item.id;
  const TypeIcon = RESOURCE_TYPE_LABELS[item.resourceType || 'service']?.icon || Package;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group">
      {/* 图片区域 */}
      <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-50 relative overflow-hidden">
        {item.metadata?.image ? (
          <img 
            src={item.metadata.image} 
            alt={item.displayName || item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon className="w-16 h-16 text-slate-300" />
          </div>
        )}
        
        {/* 类型标签 */}
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium text-white ${
            CATEGORY_LABELS[item.category]?.color || 'bg-slate-500'
          }`}>
            {getCategoryLabel(item.category)}
          </span>
        </div>

        {/* 收藏按钮 */}
        <button className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white text-slate-400 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
          <Heart className="w-4 h-4" />
        </button>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 line-clamp-1 mb-1">
          {item.displayName || item.name}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-2 mb-3 min-h-[40px]">
          {item.description}
        </p>

        {/* 评分和调用次数 */}
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
          {item.rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              {item.rating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {item.callCount?.toLocaleString() || 0} {t({ zh: '次使用', en: 'uses' })}
          </span>
        </div>

        {/* 价格和操作 */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div>{getPriceDisplay(item)}</div>
          <div className="flex items-center gap-2">
            {isResource && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title={t({ zh: '加入购物车', en: 'Add to cart' })}
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onAction(); }}
              disabled={isExecuting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {getActionText(item)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 详情弹窗组件
function DetailModal({
  item,
  onClose,
  onPurchase,
  getPriceDisplay,
  t,
}: {
  item: MarketplaceItem;
  onClose: () => void;
  onPurchase: (item: MarketplaceItem, quantity: number) => void;
  getPriceDisplay: (item: MarketplaceItem) => React.ReactNode;
  t: any;
}) {
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    setPurchasing(true);
    await onPurchase(item, quantity);
    setPurchasing(false);
  };

  const totalPrice = (item.pricing?.pricePerCall || 0) * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{item.displayName || item.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{item.authorInfo?.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-600 mb-6">{item.description}</p>

          {/* 数量选择 */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-slate-700 font-medium">{t({ zh: '数量', en: 'Quantity' })}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
              >
                -
              </button>
              <span className="w-12 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
              >
                +
              </button>
            </div>
          </div>

          {/* 价格汇总 */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600">{t({ zh: '单价', en: 'Unit Price' })}</span>
              <span>{getPriceDisplay(item)}</span>
            </div>
            <div className="flex items-center justify-between text-lg font-bold">
              <span className="text-slate-900">{t({ zh: '总计', en: 'Total' })}</span>
              <span className="text-blue-600">
                {totalPrice === 0 ? t({ zh: '免费', en: 'Free' }) : `$${totalPrice.toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* 购买按钮 */}
          <button
            onClick={handlePurchase}
            disabled={purchasing}
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {purchasing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t({ zh: '处理中...', en: 'Processing...' })}
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                {totalPrice === 0 
                  ? t({ zh: '免费获取', en: 'Get Free' })
                  : t({ zh: '确认购买', en: 'Confirm Purchase' })
                }
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
