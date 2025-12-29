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
        setError('璇峰厛鐧诲綍');
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
        setError('鐧诲綍宸茶繃鏈?);
        return;
      }

      if (!response.ok) {
        throw new Error('鑾峰彇鍟嗗搧鍒楄〃澶辫触');
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
        throw new Error('鎿嶄綔澶辫触');
      }

      alert('鐘舵€佸凡鏇存柊');
      fetchProducts();
      fetchStats();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: '宸蹭笂鏋? },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800', label: '宸蹭笅鏋? },
      draft: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '鑽夌' },
      pending_review: { bg: 'bg-blue-100', text: 'text-blue-800', label: '寰呭鏍? },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: '宸插鏍? },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: '宸叉嫆缁? },
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
      physical: { icon: '馃摝', label: '瀹炵墿' },
      service: { icon: '馃洜锔?, label: '鏈嶅姟' },
      nft: { icon: '馃柤锔?, label: 'NFT' },
      ft: { icon: '馃獧', label: '浠ｅ竵' },
      game_asset: { icon: '馃幃', label: '娓告垙璧勪骇' },
      rwa: { icon: '馃彚', label: 'RWA' },
      plugin: { icon: '馃攲', label: '鎻掍欢' },
      subscription: { icon: '馃搮', label: '璁㈤槄' },
    };
    const typeInfo = types[type] || { icon: '鉂?, label: type };
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
        <title>Product Management - Agentrix Admin</title>
      </Head>
      <AdminLayout title="Product Management" description="Manage all products on the platform">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.totalProducts}</div>
              <div className="text-sm text-gray-500">鎬诲晢鍝佹暟</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{stats.activeProducts}</div>
              <div className="text-sm text-gray-500">宸蹭笂鏋?/div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.pendingReview}</div>
              <div className="text-sm text-gray-500">寰呭鏍?/div>
              {stats.pendingReview > 0 && (
                <Link href="/admin/product-review" className="text-xs text-blue-600 hover:underline">
                  鍘诲鏍?鈫?
                </Link>
              )}
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.todayCreated}</div>
              <div className="text-sm text-gray-500">浠婃棩鏂板</div>
            </div>
          </div>
        )}

        {/* 鎸夌被鍨嬪垎甯?*/}
        {stats?.byType && Object.keys(stats.byType).length > 0 && (
          <div className="bg-white border rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">鍟嗗搧绫诲瀷鍒嗗竷</h3>
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

        {/* 绛涢€夊拰鎼滅储 */}
        <div className="bg-white border rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="鎼滅储鍟嗗搧鍚嶇О..."
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                >
                  鎼滅储
                </button>
              </div>
            </form>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">鎵€鏈夌姸鎬?/option>
              <option value="active">宸蹭笂鏋?/option>
              <option value="inactive">宸蹭笅鏋?/option>
              <option value="draft">鑽夌</option>
              <option value="pending_review">寰呭鏍?/option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">鎵€鏈夌被鍨?/option>
              <option value="physical">瀹炵墿鍟嗗搧</option>
              <option value="service">鏈嶅姟</option>
              <option value="nft">NFT</option>
              <option value="ft">浠ｅ竵</option>
              <option value="game_asset">娓告垙璧勪骇</option>
              <option value="rwa">RWA</option>
            </select>
          </div>
        </div>

        {/* 鍟嗗搧鍒楄〃 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error}</p>
            <button onClick={fetchProducts} className="mt-4 text-indigo-600 hover:underline">閲嶈瘯</button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">鏆傛棤鍟嗗搧</div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">鍟嗗搧</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">鍟嗘埛</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">绫诲瀷</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">浠锋牸</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">鐘舵€?/th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">閿€閲?/th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">鎿嶄綔</th>
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
                        {product.currency === 'CNY' ? '楼' : product.currency} {product.price}
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
                            璇︽儏
                          </button>
                          {product.status === 'active' && (
                            <button
                              onClick={() => handleStatusChange(product.id, 'inactive')}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              涓嬫灦
                            </button>
                          )}
                          {product.status === 'inactive' && (
                            <button
                              onClick={() => handleStatusChange(product.id, 'active')}
                              className="text-green-600 hover:text-green-900"
                            >
                              涓婃灦
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 鍒嗛〉 */}
            {totalPages > 1 && (
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  涓婁竴椤?
                </button>
                <span className="px-3 py-1">
                  绗?{page} / {totalPages} 椤?
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  涓嬩竴椤?
                </button>
              </div>
            )}
          </>
        )}

        {/* 鍟嗗搧璇︽儏妯℃€佹 */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold">鍟嗗搧璇︽儏</h3>
                <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600">鉁?/button>
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
                    <dt className="text-sm text-gray-500">鍟嗗搧鍚嶇О</dt>
                    <dd className="font-medium">{selectedProduct.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">鍟嗗搧ID</dt>
                    <dd className="font-mono text-sm">{selectedProduct.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">浠锋牸</dt>
                    <dd className="font-medium">{selectedProduct.currency} {selectedProduct.price}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">搴撳瓨</dt>
                    <dd className="font-medium">{selectedProduct.stock ?? '涓嶉檺'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">鍟嗘埛</dt>
                    <dd>{selectedProduct.merchant?.nickname || selectedProduct.merchantId}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">鐘舵€?/dt>
                    <dd>{getStatusBadge(selectedProduct.status)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-sm text-gray-500">鎻忚堪</dt>
                    <dd className="text-sm">{selectedProduct.description || '鏃犳弿杩?}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">鍒涘缓鏃堕棿</dt>
                    <dd className="text-sm">{new Date(selectedProduct.createdAt).toLocaleString('zh-CN')}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">鏇存柊鏃堕棿</dt>
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
