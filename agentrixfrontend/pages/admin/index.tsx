import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';

interface DashboardStats {
  users: {
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    newUsersToday: number;
  };
  merchants: {
    totalMerchants: number;
    activeMerchants: number;
    verifiedMerchants: number;
  };
  tickets: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setError('未登录，请先登录管理后台');
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:3002/api/admin/dashboard/overview', {
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
      setStats(data);
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error.message || '获取数据失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>管理后台 - Agentrix</title>
      </Head>
      <AdminLayout title="仪表盘" description="平台数据概览">

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <span className="text-red-600 text-2xl mr-3">⚠️</span>
                <div>
                  <h3 className="text-red-800 font-semibold">加载失败</h3>
                  <p className="text-red-600 mt-1 whitespace-pre-line">{error}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 ml-4">
                <button
                  onClick={fetchDashboardData}
                  className="bg-red-600 text-white px-3 py-1.5 rounded text-xs hover:bg-red-700"
                >
                  重试
                </button>
                <button
                  onClick={() => router.push('/admin/login')}
                  className="bg-white border border-red-300 text-red-600 px-3 py-1.5 rounded text-xs hover:bg-red-50"
                >
                  去登录
                </button>
              </div>
            </div>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 用户统计 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">总用户数</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.users?.totalUsers?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="text-4xl">👤</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">活跃用户</p>
                  <p className="font-semibold">{stats.users?.activeUsers || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600">今日新增</p>
                  <p className="font-semibold">{stats.users?.newUsersToday || 0}</p>
                </div>
              </div>
            </div>

            {/* 商户统计 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">总商户数</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.merchants?.totalMerchants?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="text-4xl">🏪</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">活跃商户</p>
                  <p className="font-semibold">{stats.merchants?.activeMerchants || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600">已认证</p>
                  <p className="font-semibold">{stats.merchants?.verifiedMerchants || 0}</p>
                </div>
              </div>
            </div>

            {/* 工单统计 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">总工单数</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.tickets?.total?.toLocaleString() || 0}
                  </p>
                </div>
                <div className="text-4xl">🎫</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">待处理</p>
                  <p className="font-semibold text-orange-600">{stats.tickets?.pending || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600">处理中</p>
                  <p className="font-semibold text-blue-600">{stats.tickets?.inProgress || 0}</p>
                </div>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">快速操作</p>
                </div>
                <div className="text-4xl">⚡</div>
              </div>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => router.push('/admin/users')}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition-colors"
                >
                  查看用户
                </button>
                <button
                  onClick={() => router.push('/admin/tickets')}
                  className="w-full bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 transition-colors"
                >
                  处理工单
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">暂无数据</p>
            <p className="text-yellow-600 text-sm mt-2">数据库可能为空，请先创建一些测试数据</p>
          </div>
        )}
      </AdminLayout>
    </>
  );
}

