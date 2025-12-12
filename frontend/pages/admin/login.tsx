import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { apiClient } from '../../lib/api/client'

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 如果已经有 admin_token，直接跳转到后台首页
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('admin_token');
    if (token) {
      router.replace('/admin');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 使用统一的 API client（自动识别环境）发起管理员登录请求
      const data = await apiClient.post<any>('/admin/auth/login', { username, password });

      if (!data || !(data as any).access_token) {
        setError('登录失败：未返回令牌或网络异常');
        return;
      }

      // 保存 admin token（与普通用户 token 分开存储）
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_token', (data as any).access_token);
      }

      // 跳转到后台首页
      router.replace('/admin');
    } catch (err: any) {
      console.error('Admin login failed:', err);
      setError(err?.message || '网络异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>管理员登录 - Agentrix 管理后台</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-indigo-50 p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Agentrix 管理后台</h1>
            <p className="mt-2 text-gray-500 text-sm">仅限平台管理员访问</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="admin"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? '登录中…' : '登录'}
            </button>
          </form>

          <div className="mt-6 text-xs text-gray-400 text-center space-y-1">
            <p>默认开发账号：用户名 admin / 密码 admin123456</p>
            <p>建议登录后尽快在“系统管理 - 管理员管理”中修改密码</p>
          </div>

          <div className="mt-6 flex justify-between text-xs text-gray-500">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="hover:text-indigo-600"
            >
              ← 返回官网首页
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="hover:text-indigo-600"
            >
              直接进入后台首页
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


