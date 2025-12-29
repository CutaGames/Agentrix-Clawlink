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
        setError('Not logged in, please login to admin panel');
        setLoading(false);
        return;
      }

      const response = await fetch(`https://api.agentrix.top/api/admin/merchants?page=${page}&limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        setError('鐧诲綍宸茶繃鏈燂紝璇烽噸鏂扮櫥褰?);
        localStorage.removeItem('admin_token');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || `璇锋眰澶辫触: ${response.status}`);
        return;
      }

      const data = await response.json();
      setMerchants(data.data || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      console.error('Failed to fetch merchants:', error);
      setError(error.message || '鑾峰彇鍟嗘埛鍒楄〃澶辫触锛岃妫€鏌ョ綉缁滆繛鎺?);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Merchant Management - Agentrix Admin</title>
      </Head>
      <AdminLayout title="Merchant Management" description="Manage platform merchants">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">鍔犺浇涓?..</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <span className="text-red-600 text-2xl mr-3">鈿狅笍</span>
              <div>
                <h3 className="text-red-800 font-semibold">鍔犺浇澶辫触</h3>
                <p className="text-red-600 mt-1">{error}</p>
                <button
                  onClick={fetchMerchants}
                  className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  閲嶈瘯
                </button>
              </div>
            </div>
          </div>
        ) : merchants.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">鏆傛棤鍟嗘埛鏁版嵁</p>
            <p className="text-yellow-600 text-sm mt-2">鏁版嵁搴撲腑杩樻病鏈夊晢鎴凤紝璇峰厛鍒涘缓涓€浜涙祴璇曞晢鎴?/p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">鍏?{total} 涓晢鎴?/p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    涓婁竴椤?
                  </button>
                  <span className="px-3 py-1">绗?{page} 椤?/span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page * 20 >= total}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    涓嬩竴椤?
                  </button>
                </div>
              </div>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    鍟嗘埛ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    閭
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    KYC鐘舵€?
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    MPC閽卞寘
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    鍟嗗搧鏁?
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    璁㈠崟鏁?
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    鎬籊MV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    鎿嶄綔
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
                        <span className="text-gray-400">鏈垱寤?/span>
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
                        鏌ョ湅
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

