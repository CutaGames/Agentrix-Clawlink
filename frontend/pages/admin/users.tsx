import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';

interface User {
  id: string;
  email: string;
  agentrixId: string;
  nickname: string;
  kycLevel: string;
  kycStatus: string;
  createdAt: string;
}

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const fetchUsers = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setError('鏈櫥褰曪紝璇峰厛鐧诲綍绠＄悊鍚庡彴');
        setLoading(false);
        return;
      }

      const response = await fetch(`https://api.agentrix.top/api/admin/users?page=${page}&limit=20`, {
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
      setUsers(data.data || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      setError(error.message || '鑾峰彇鐢ㄦ埛鍒楄〃澶辫触锛岃妫€鏌ョ綉缁滆繛鎺?);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveKYC = async (userId: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`https://api.agentrix.top/api/admin/users/${userId}/kyc/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        alert('KYC宸叉壒鍑?);
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to approve KYC:', error);
    }
  };

  return (
    <>
      <Head>
        <title>鐢ㄦ埛绠＄悊 - Agentrix 绠＄悊鍚庡彴</title>
      </Head>
      <AdminLayout title="鐢ㄦ埛绠＄悊" description="绠＄悊骞冲彴鐢ㄦ埛">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">鍔犺浇涓?..</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <span className="text-red-600 text-2xl mr-3">鈿狅笍</span>
                <div>
                  <h3 className="text-red-800 font-semibold">鍔犺浇澶辫触</h3>
                  <p className="text-red-600 mt-1 whitespace-pre-line">{error}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 ml-4">
                <button
                  onClick={fetchUsers}
                  className="bg-red-600 text-white px-3 py-1.5 rounded text-xs hover:bg-red-700"
                >
                  閲嶈瘯
                </button>
                <button
                  onClick={() => router.push('/admin/login')}
                  className="bg-white border border-red-300 text-red-600 px-3 py-1.5 rounded text-xs hover:bg-red-50"
                >
                  鍘荤櫥褰?
                </button>
              </div>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">鏆傛棤鐢ㄦ埛鏁版嵁</p>
            <p className="text-yellow-600 text-sm mt-2">鏁版嵁搴撲腑杩樻病鏈夌敤鎴凤紝璇峰厛鍒涘缓涓€浜涙祴璇曠敤鎴?/p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">鍏?{total} 涓敤鎴?/p>
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
                    鐢ㄦ埛ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    閭
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    KYC鐘舵€?
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    娉ㄥ唽鏃堕棿
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    鎿嶄綔
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.agentrixId || user.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          user.kycStatus === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {user.kycStatus || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => router.push(`/admin/users/${user.id}`)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        鏌ョ湅
                      </button>
                      {user.kycStatus !== 'approved' && (
                        <button
                          onClick={() => handleApproveKYC(user.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          鎵瑰噯KYC
                        </button>
                      )}
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

