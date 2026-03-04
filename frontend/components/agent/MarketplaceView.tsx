import { useState, useEffect } from 'react';
import { ProductInfo, productApi } from '../../lib/api/product.api';
import { marketplaceApi } from '../../lib/api/marketplace.api';

interface MarketplaceViewProps {
  onProductClick: (product: ProductInfo) => void;
  searchQuery?: string;
}

export function MarketplaceView({ onProductClick, searchQuery }: MarketplaceViewProps) {
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAssets, setShowAssets] = useState(false); // 是否显示聚合资产

  useEffect(() => {
    loadProducts();
    loadAssets();
  }, [searchQuery, selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productApi.getProducts({
        search: searchQuery || undefined,
      });
      console.log('加载的商品数据:', data);
      setProducts(data || []);
    } catch (error) {
      console.error('加载商品失败:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAssets = async () => {
    try {
      // 加载聚合资产（Token、NFT、Launchpad）
      const assetData = await marketplaceApi.getAssets({
        search: searchQuery,
        type: selectedCategory === 'nft' ? 'nft' : selectedCategory === 'all' ? undefined : 'token',
        page: 1,
        pageSize: 20,
      });
      setAssets(assetData?.items || []);
    } catch (error) {
      console.error('加载聚合资产失败:', error);
      setAssets([]);
    }
  };

  const categories = [
    { id: 'all', name: '全部' },
    { id: 'virtual', name: '虚拟资产' },
    { id: 'electronics', name: '电子产品' },
    { id: 'clothing', name: '服装' },
    { id: 'food', name: '食品' },
    { id: 'services', name: '服务' },
    { id: 'token', name: '代币' },
    { id: 'nft', name: 'NFT' },
    { id: 'launchpad', name: 'Launchpad' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 分类筛选 */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              selectedCategory === category.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* 切换显示模式 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAssets(false)}
            className={`px-4 py-2 rounded-lg text-sm ${
              !showAssets
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            商品 ({products.length})
          </button>
          <button
            onClick={() => setShowAssets(true)}
            className={`px-4 py-2 rounded-lg text-sm ${
              showAssets
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            聚合资产 ({assets.length})
          </button>
        </div>
      </div>

      {/* 商品网格 */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">
          {selectedCategory === 'virtual' || selectedCategory === 'token' || selectedCategory === 'nft' 
            ? '虚拟资产' 
            : '实体产品与服务'}
        </h2>
        <p className="text-gray-600 text-center max-w-2xl mx-auto">
          {selectedCategory === 'virtual' || selectedCategory === 'token' || selectedCategory === 'nft'
            ? 'Agentrix Marketplace 聚合了全链资产，为您提供最优质的数字资产交易体验'
            : 'Agentrix Marketplace 不仅聚合链上资产，还支持实体商品和各类服务的交易'}
        </p>
      </div>

      {!showAssets ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products
            .filter((p) => {
              // 检查产品类型匹配
              const pType = (p.productType || '').toLowerCase();
              
              if (selectedCategory === 'all') return true;
              if (selectedCategory === 'virtual' && (pType === 'ft' || pType === 'nft' || pType === 'game_asset')) return true;
              if (selectedCategory === 'token' && pType === 'ft') return true;
              if (selectedCategory === 'nft' && pType === 'nft') return true;
              if (selectedCategory === 'services' && pType === 'service') return true;
              
              // 支持多种分类匹配方式
              const productCategory = (p.category || '').toLowerCase();
              const selectedCat = selectedCategory.toLowerCase();
              
              // 如果是虚拟资产分类，但 productType 不匹配，则不显示
              if (selectedCategory === 'virtual' || selectedCategory === 'token' || selectedCategory === 'nft') {
                return false;
              }

              return productCategory === selectedCat || 
                     productCategory.includes(selectedCat) ||
                     selectedCat.includes(productCategory);
            })
            .map((product) => (
            <div
              key={product.id}
              onClick={() => onProductClick(product)}
              className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                {(product.metadata?.image || product.metadata?.core?.media?.images?.[0]?.url) ? (
                  <img 
                    src={product.metadata?.image || product.metadata?.core?.media?.images?.[0]?.url} 
                    alt={product.name} 
                    className="w-full h-full object-cover rounded-lg" 
                  />
                ) : (
                  <div className="text-gray-400 text-4xl">📦</div>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
              {product.category && (
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mb-2">
                  {product.category}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-green-600">¥{product.price}</span>
                {product.commissionRate > 0 && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {product.commissionRate}% 分润
                  </span>
                )}
              </div>
              {product.stock > 0 ? (
                <div className="text-xs text-gray-500 mt-2">库存: {product.stock}</div>
              ) : (
                <div className="text-xs text-red-500 mt-2">缺货</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets
            .filter((asset) => {
              if (selectedCategory === 'all') return true;
              if (selectedCategory === 'token') return asset.type === 'token';
              if (selectedCategory === 'nft') return asset.type === 'nft';
              if (selectedCategory === 'launchpad') return asset.type === 'launchpad';
              return true;
            })
            .map((asset) => (
              <div
                key={asset.id}
                onClick={() => {
                  // 将资产转换为商品格式以便兼容
                  const product: ProductInfo = {
                    id: asset.id,
                    name: asset.name,
                    description: asset.symbol || '',
                    price: parseFloat(asset.priceUsd || '0'),
                    stock: 1,
                    category: asset.type,
                    commissionRate: 0,
                    status: 'active',
                    merchantId: '',
                    metadata: {
                      image: asset.imageUrl,
                      currency: 'USD',
                      chain: asset.chain,
                      type: asset.type,
                      address: asset.address,
                    },
                  };
                  onProductClick(product);
                }}
                className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  {asset.imageUrl ? (
                    <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <div className="text-gray-400 text-4xl">
                      {asset.type === 'token' ? '🪙' : asset.type === 'nft' ? '🖼️' : '🚀'}
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{asset.name}</h3>
                {asset.symbol && (
                  <p className="text-sm text-gray-600 mb-2">{asset.symbol}</p>
                )}
                <div className="flex items-center gap-2 mb-2">
                  {asset.type && (
                    <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {asset.type.toUpperCase()}
                    </div>
                  )}
                  {asset.chain && (
                    <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                      {asset.chain}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  {asset.priceUsd && (
                    <span className="text-lg font-bold text-green-600">
                      ${parseFloat(asset.priceUsd).toFixed(4)}
                    </span>
                  )}
                  {asset.liquidityUsd && (
                    <span className="text-xs text-gray-500">
                      流动性: ${(parseFloat(asset.liquidityUsd) / 1e6).toFixed(1)}M
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {((!showAssets && products.length === 0) || (showAssets && assets.length === 0)) && !loading && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-2">🔍</div>
          <div>暂无商品</div>
          <div className="text-sm mt-2 text-gray-400">
            {selectedCategory !== 'all' ? `当前分类"${categories.find(c => c.id === selectedCategory)?.name}"暂无商品，请尝试其他分类` : '请尝试搜索其他关键词'}
          </div>
        </div>
      )}
    </div>
  );
}

