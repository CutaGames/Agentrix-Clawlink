import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '../../components/admin/AdminLayout';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  productType: string;
  status: string;
  reviewStatus?: string;
  images: string[];
  merchantId: string;
  merchant?: {
    nickname: string;
    email: string;
  };
  stock?: number;
  totalSales: number;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  totalProducts: number;
  activeProducts: number;
  pendingReview: number;
  todayCreated: number;
  byType: Record<string, number>;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const apiBaseUrl = typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3001/api'
      : 'https://api.agentrix.top/api')
    : 'http://localhost:3001/api';

  const getToken = () => localStorage.getItem('admin_token');

  useEffect(() => {
    fetchProducts();
    fetchStats();
  }, [page, statusFilter, typeFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        setError('请先登录');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('productType', typeFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`${apiBaseUrl}/admin/products?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        setError('登录已过期');
        return;
      }

      if (!response.ok) {
        throw new Error('获取商品列表失败');
      }

      const data = await response.json();
      setProducts(data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${apiBaseUrl}/admin/products/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleStatusChange = async (productId: string, newStatus: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${apiBaseUrl}/admin/products/${productId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('操作失败');
      }

      alert('状态已更新');
      fetchProducts();
      fetchStats();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: '已上架' },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800', label: '已下架' },
      draft: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '草稿' },
      pending_review: { bg: 'bg-blue-100', text: 'text-blue-800', label: '待审核' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: '已审核' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: '已拒绝' },
    };
    const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const types: Record<string, { icon: string; label: string }> = {
      physical: { icon: '📦', label: '实物' },
      service: { icon: '🛠️', label: '服务' },
      nft: { icon: '🖼️', label: 'NFT' },
      ft: { icon: '🪙', label: '代币' },
      game_asset: { icon: '🎮', label: '游戏资产' },
      rwa: { icon: '🏢', label: 'RWA' },
      plugin: { icon: '🔌', label: '插件' },
      subscription: { icon: '📅', label: '订阅' },
    };
    const typeInfo = types[type] || { icon: '❓', label: type };
    return (
      <span className="inline-flex items-center gap-1 text-sm text-gray-600">
        {typeInfo.icon} {typeInfo.label}
      </span>
    );
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <Head>
        <title>商品管理 - Agentrix 管理后台</title>
      </Head>
      <AdminLayout title="商品管理" description="管理平台所有商品">
        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.totalProducts}</div>
              <div className="text-sm text-gray-500">总商品数</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{stats.activeProducts}</div>
              <div className="text-sm text-gray-500">已上架</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.pendingReview}</div>
              <div className="text-sm text-gray-500">待审核</div>
              {stats.pendingReview > 0 && (
                <Link href="/admin/product-review" className="text-xs text-blue-600 hover:underline">
                  去审核 →
                </Link>
              )}
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.todayCreated}</div>
              <div className="text-sm text-gray-500">今日新增</div>
            </div>
          </div>
        )}

        {/* 按类型分布 */}
        {stats?.byType && Object.keys(stats.byType).length > 0 && (
          <div className="bg-white border rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">商品类型分布</h3>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2">
                  {getTypeBadge(type)}
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 筛选和搜索 */}
        <div className="bg-white border rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索商品名称..."
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                >
                  搜索
                </button>
              </div>
            </form>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">所有状态</option>
              <option value="active">已上架</option>
              <option value="inactive">已下架</option>
              <option value="draft">草稿</option>
              <option value="pending_review">待审核</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">所有类型</option>
              <option value="physical">实物商品</option>
              <option value="service">服务</option>
              <option value="nft">NFT</option>
              <option value="ft">代币</option>
              <option value="game_asset">游戏资产</option>
              <option value="rwa">RWA</option>
            </select>
          </div>
        </div>

        {/* 商品列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error}</p>
            <button onClick={fetchProducts} className="mt-4 text-indigo-600 hover:underline">重试</button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">暂无商品</div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">商户</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">价格</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">销量</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {product.images?.[0] && (
                            <img src={product.images[0]} alt="" className="w-10 h-10 rounded object-cover mr-3" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-xs text-gray-500">{product.category || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.merchant?.nickname || '-'}</div>
                        <div className="text-xs text-gray-500">{product.merchant?.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTypeBadge(product.productType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.currency === 'CNY' ? '¥' : product.currency} {product.price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(product.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.totalSales || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedProduct(product)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            详情
                          </button>
                          {product.status === 'active' && (
                            <button
                              onClick={() => handleStatusChange(product.id, 'inactive')}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              下架
                            </button>
                          )}
                          {product.status === 'inactive' && (
                            <button
                              onClick={() => handleStatusChange(product.id, 'active')}
                              className="text-green-600 hover:text-green-900"
                            >
                              上架
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="px-3 py-1">
                  第 {page} / {totalPages} 页
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}

        {/* 商品详情模态框 */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold">商品详情</h3>
                <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-6">
                {selectedProduct.images?.length > 0 && (
                  <div className="mb-4">
                    <div className="grid grid-cols-4 gap-2">
                      {selectedProduct.images.map((img, idx) => (
                        <img key={idx} src={img} alt="" className="w-full h-20 object-cover rounded" />
                      ))}
                    </div>
                  </div>
                )}
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-500">商品名称</dt>
                    <dd className="font-medium">{selectedProduct.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">商品ID</dt>
                    <dd className="font-mono text-sm">{selectedProduct.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">价格</dt>
                    <dd className="font-medium">{selectedProduct.currency} {selectedProduct.price}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">库存</dt>
                    <dd className="font-medium">{selectedProduct.stock ?? '不限'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">商户</dt>
                    <dd>{selectedProduct.merchant?.nickname || selectedProduct.merchantId}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">状态</dt>
                    <dd>{getStatusBadge(selectedProduct.status)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-sm text-gray-500">描述</dt>
                    <dd className="text-sm">{selectedProduct.description || '无描述'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">创建时间</dt>
                    <dd className="text-sm">{new Date(selectedProduct.createdAt).toLocaleString('zh-CN')}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">更新时间</dt>
                    <dd className="text-sm">{new Date(selectedProduct.updatedAt).toLocaleString('zh-CN')}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
