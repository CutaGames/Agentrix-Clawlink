import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface RiskAssessment {
  id: string;
  riskScore: number;
  riskLevel: string;
  decision: string;
  createdAt: string;
  payment?: {
    id: string;
    amount: number;
  };
  user?: {
    email: string;
  };
}

interface RiskOrder {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  user?: {
    email: string;
  };
}

export default function AdminRisk() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'assessments' | 'orders' | 'users'>('assessments');
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [orders, setOrders] = useState<RiskOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchStats();
    if (activeTab === 'assessments') {
      fetchAssessments();
    } else if (activeTab === 'orders') {
      fetchRiskOrders();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:3002/api/admin/risk/statistics', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch risk stats:', error);
    }
  };

  const fetchAssessments = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:3002/api/admin/risk/assessments?limit=20', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAssessments(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRiskOrders = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:3002/api/admin/risk/orders?limit=20', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch risk orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'reject':
        return 'bg-red-100 text-red-800';
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      case 'approve':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Head>
        <title>风控管理 - PayMind 管理后台</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="ml-64 p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">风控管理</h2>
            <p className="text-gray-600 mt-2">风险监控和处理</p>
          </div>

          {/* 统计卡片 */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">总风险评估</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{stats.total || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">高风险数量</div>
                <div className="text-3xl font-bold text-red-600 mt-2">{stats.highRiskCount || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">待审核</div>
                <div className="text-3xl font-bold text-yellow-600 mt-2">
                  {stats.byDecision?.review || 0}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">已拒绝</div>
                <div className="text-3xl font-bold text-red-600 mt-2">
                  {stats.byDecision?.reject || 0}
                </div>
              </div>
            </div>
          )}

          {/* 标签页 */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('assessments')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'assessments'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                风险评估
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'orders'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                风险订单
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                风险用户
              </button>
            </nav>
          </div>

          {loading ? (
            <div className="text-center py-12">加载中...</div>
          ) : activeTab === 'assessments' ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      风险评分
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      风险等级
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      决策
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      用户
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      创建时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assessments.map((assessment) => (
                    <tr key={assessment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {assessment.riskScore}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getRiskLevelColor(assessment.riskLevel)}`}>
                          {assessment.riskLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getDecisionColor(assessment.decision)}`}>
                          {assessment.decision}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {assessment.user?.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(assessment.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => router.push(`/admin/risk/assessments/${assessment.id}`)}
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
          ) : activeTab === 'orders' ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      订单ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      金额
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      用户
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      创建时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {order.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${order.amount?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          order.status === 'frozen' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.user?.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {order.status === 'frozen' ? (
                          <button
                            onClick={async () => {
                              const token = localStorage.getItem('admin_token');
                              await fetch(`http://localhost:3002/api/admin/risk/orders/${order.id}/release`, {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              fetchRiskOrders();
                            }}
                            className="text-green-600 hover:text-green-900 mr-2"
                          >
                            解冻
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              const reason = prompt('请输入冻结原因:');
                              if (reason) {
                                const token = localStorage.getItem('admin_token');
                                await fetch(`http://localhost:3002/api/admin/risk/orders/${order.id}/block`, {
                                  method: 'POST',
                                  headers: {
                                    Authorization: `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({ reason }),
                                });
                                fetchRiskOrders();
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            冻结
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">风险用户功能开发中...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

