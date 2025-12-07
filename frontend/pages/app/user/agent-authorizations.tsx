import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { agentAuthorizationApi, AgentAuthorization } from '../../../lib/api/agent-authorization.api';
import { useToast } from '../../../contexts/ToastContext';
import Link from 'next/link';

const statusBadge = {
  active: 'text-green-600 bg-green-50',
  expired: 'text-gray-600 bg-gray-100',
  revoked: 'text-red-600 bg-red-50',
};

const typeLabels = {
  erc8004: 'ERC8004 Session',
  mpc: 'MPC钱包',
  api_key: 'API Key',
};

export default function AgentAuthorizationsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [authorizations, setAuthorizations] = useState<AgentAuthorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    loadAuthorizations();
  }, []);

  const loadAuthorizations = async () => {
    try {
      setLoading(true);
      const data = await agentAuthorizationApi.getAuthorizations();
      setAuthorizations(data);
    } catch (error: any) {
      console.error('加载授权列表失败:', error);
      showToast?.('error', error?.message || '加载授权列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('确定要撤销这个Agent授权吗？撤销后Agent将无法继续使用此授权。')) {
      return;
    }
    try {
      setRevokingId(id);
      await agentAuthorizationApi.revokeAuthorization(id);
      showToast?.('success', '授权已撤销');
      await loadAuthorizations();
    } catch (error: any) {
      console.error('撤销授权失败:', error);
      showToast?.('error', error?.message || '撤销授权失败，请稍后重试');
    } finally {
      setRevokingId(null);
    }
  };

  const getStatus = (auth: AgentAuthorization): 'active' | 'expired' | 'revoked' => {
    if (!auth.isActive) return 'revoked';
    if (auth.expiry && new Date(auth.expiry) < new Date()) return 'expired';
    return 'active';
  };

  const formatAmount = (amount?: number) => {
    if (!amount) return '不限制';
    return `$${amount.toFixed(2)}`;
  };

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>Agent授权管理 - 用户中心</title>
      </Head>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agent授权管理</h1>
            <p className="text-gray-600 mt-1">管理您的Agent授权，设置限额和策略权限</p>
          </div>
          <Link
            href="/app/user/agent-authorizations/create"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            + 创建新授权
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : authorizations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-4xl mb-4">🔐</div>
            <p className="text-gray-600 mb-4">暂无Agent授权</p>
            <Link
              href="/app/user/agent-authorizations/create"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              创建第一个授权
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {authorizations.map((auth) => {
              const status = getStatus(auth);
              return (
                <div key={auth.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-4xl">🤖</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900">Agent: {auth.agentId}</h3>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                statusBadge[status]
                              }`}
                            >
                              {status === 'active' ? '活跃' : status === 'expired' ? '已过期' : '已撤销'}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600">
                              {typeLabels[auth.authorizationType]}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-mono mt-1">
                            钱包: {auth.walletAddress.slice(0, 8)}...{auth.walletAddress.slice(-6)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">单笔限额</p>
                          <p className="font-semibold text-gray-900">{formatAmount(auth.singleLimit)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">每日限额</p>
                          <p className="font-semibold text-gray-900">{formatAmount(auth.dailyLimit)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">总限额</p>
                          <p className="font-semibold text-gray-900">{formatAmount(auth.totalLimit)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">今日已用</p>
                          <p className="font-semibold text-gray-900">${auth.usedToday.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">策略权限:</span>{' '}
                          <span>{auth.strategyPermissions?.length || 0} 个策略</span>
                        </div>
                        <div>
                          <span className="font-medium">执行次数:</span>{' '}
                          <span>{auth.executionHistory?.length || 0} 次</span>
                        </div>
                        {auth.expiry && (
                          <div>
                            <span className="font-medium">到期时间:</span>{' '}
                            <span>{new Date(auth.expiry).toLocaleDateString('zh-CN')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Link
                        href={`/app/user/agent-authorizations/${auth.id}`}
                        className="px-4 py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium text-center"
                      >
                        查看详情
                      </Link>
                      {status === 'active' && (
                        <button
                          onClick={() => handleRevoke(auth.id)}
                          disabled={revokingId === auth.id}
                          className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm font-medium"
                        >
                          {revokingId === auth.id ? '撤销中...' : '撤销授权'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

