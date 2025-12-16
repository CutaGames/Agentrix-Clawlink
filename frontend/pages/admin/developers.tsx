import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { adminDeveloperApi } from '../../lib/api/admin.api';

interface Developer {
  id: string;
  email: string;
  agentrixId: string;
  nickname: string;
  createdAt: string;
  stats: {
    agentCount: number;
    totalRevenue: number;
  };
}

export default function AdminDevelopers() {
  const router = useRouter();
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDevelopers();
  }, [page, search]);

  const fetchDevelopers = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setError('未登录，请先登录管理后台');
        setLoading(false);
        return;
      }

      const data = await adminDeveloperApi.getDevelopers({ page, limit: 20, search: search || undefined });
      setDevelopers(data.data || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      console.error('Failed to fetch developers:', error);
      setError(error.message || '获取开发者列表失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>开发者管理 - Agentrix 管理后台</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="ml-64 p-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">开发者管理</h2>
              <p className="text-gray-600 mt-2">管理平台开发者</p>
            </div>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="搜索开发者..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">加载中...</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      开发者ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      邮箱
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Agent数量
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      总收益
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      注册时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {developers.map((developer) => (
                    <tr key={developer.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {developer.agentrixId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {developer.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {developer.stats?.agentCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${(developer.stats?.totalRevenue || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(developer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => router.push(`/admin/developers/${developer.id}`)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          查看
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {total > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    共 {total} 条记录，第 {page} 页
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page * 20 >= total}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

