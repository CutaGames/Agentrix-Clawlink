import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Settings, 
  LogOut, 
  TrendingUp, 
  Activity,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.replace('/admin/login');
      return;
    }

    fetchStats(token);
  }, [router]);

  const fetchStats = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch('https://api.agentrix.top/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('admin_token');
        router.replace('/admin/login');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.replace('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-500">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">Agentrix</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg font-medium">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => router.push('/admin/developers')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Users className="w-5 h-5" />
            Developers
          </button>
          <button 
            onClick={() => router.push('/admin/fund-paths')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <TrendingUp className="w-5 h-5" />
            Fund Paths
          </button>
          <button 
            onClick={() => router.push('/admin/marketing')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Activity className="w-5 h-5" />
            Marketing
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-gray-800">Dashboard Overview</h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => fetchStats(localStorage.getItem('admin_token') || '')}
              className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              title="Total Users" 
              value={stats?.totalUsers || 0} 
              icon={<Users className="w-6 h-6 text-blue-600" />}
              trend="+12% from last month"
            />
            <StatCard 
              title="Total Revenue" 
              value={`$${(stats?.totalRevenue || 0).toLocaleString()}`} 
              icon={<CreditCard className="w-6 h-6 text-green-600" />}
              trend="+8.4% from last month"
            />
            <StatCard 
              title="Active Agents" 
              value={stats?.activeAgents || 0} 
              icon={<Activity className="w-6 h-6 text-purple-600" />}
              trend="+24 today"
            />
            <StatCard 
              title="Success Rate" 
              value={`${stats?.successRate || 99.9}%`} 
              icon={<ShieldCheck className="w-6 h-6 text-indigo-600" />}
              trend="Stable"
            />
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Recent Transactions</h3>
              <button className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                View All <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-medium">Transaction ID</th>
                    <th className="px-6 py-3 font-medium">User</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {stats?.recentTransactions?.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{tx.id}</td>
                      <td className="px-6 py-4 text-gray-900">{tx.user}</td>
                      <td className="px-6 py-4 font-medium">${tx.amount}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tx.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{tx.date}</td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        No recent transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">
          {icon}
        </div>
        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
          {trend}
        </span>
      </div>
      <h4 className="text-gray-500 text-sm font-medium mb-1">{title}</h4>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
