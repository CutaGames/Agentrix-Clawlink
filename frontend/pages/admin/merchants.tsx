import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';

interface Merchant {
  id: string;
  email: string;
  agentrixId: string;
  nickname: string;
  kycStatus: string;
  createdAt: string;
  stats: {
    productCount: number;
    orderCount: number;
    totalGMV: number;
  };
  mpcWallets?: Array<{
    walletAddress: string;
    chain: string;
    currency: string;
    isActive: boolean;
  }>;
}

export default function AdminMerchants() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchMerchants();
  }, [page]);

  const fetchMerchants = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setError('未登录，请先登录管理后台');
        setLoading(false);
        return;
      }

      const response = await fetch(`http://localhost:3002/api/admin/merchants?page=${page}&limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        setError('登录已过期，请重新登录');
        localStorage.removeItem('admin_token');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || `请求失败: ${response.status}`);
        return;
      }

      const data = await response.json();
      setMerchants(data.data || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      console.error('Failed to fetch merchants:', error);
      setError(error.message || '获取商户列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>商户管理 - Agentrix 管理后台</title>
      </Head>
      <AdminLayout title="商户管理" description="管理平台商户">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <span className="text-red-600 text-2xl mr-3">⚠️</span>
              <div>
                <h3 className="text-red-800 font-semibold">加载失败</h3>
                <p className="text-red-600 mt-1">{error}</p>
                <button
                  onClick={fetchMerchants}
                  className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  重试
                </button>
              </div>
            </div>
          </div>
        ) : merchants.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">暂无商户数据</p>
            <p className="text-yellow-600 text-sm mt-2">数据库中还没有商户，请先创建一些测试商户</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">共 {total} 个商户</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <span className="px-3 py-1">第 {page} 页</span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page * 20 >= total}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    商户ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    邮箱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    KYC状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    MPC钱包
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    商品数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    订单数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    总GMV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {merchants.map((merchant) => (
                  <tr key={merchant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {merchant.agentrixId || merchant.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {merchant.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          merchant.kycStatus === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {merchant.kycStatus || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {merchant.mpcWallets && merchant.mpcWallets.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {merchant.mpcWallets.map((wallet, idx) => (
                            <span key={idx} className="text-xs">
                              {wallet.walletAddress?.substring(0, 10)}...
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">未创建</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {merchant.stats?.productCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {merchant.stats?.orderCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${(merchant.stats?.totalGMV || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => router.push(`/admin/merchants/${merchant.id}`)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminLayout>
    </>
  );
}

