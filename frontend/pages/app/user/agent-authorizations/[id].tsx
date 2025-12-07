import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import {
  agentAuthorizationApi,
  AgentAuthorization,
  AgentExecutionHistory,
} from '../../../../lib/api/agent-authorization.api';
import { useToast } from '../../../../contexts/ToastContext';
import Link from 'next/link';

export default function AgentAuthorizationDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { showToast } = useToast();
  const [authorization, setAuthorization] = useState<AgentAuthorization | null>(null);
  const [executionHistory, setExecutionHistory] = useState<AgentExecutionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'permissions' | 'history'>('details');

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id || typeof id !== 'string') return;
    try {
      setLoading(true);
      const [auth, history] = await Promise.all([
        agentAuthorizationApi.getAuthorization(id),
        agentAuthorizationApi.getExecutionHistory(id),
      ]);
      setAuthorization(auth);
      setExecutionHistory(history);
    } catch (error: any) {
      console.error('加载授权详情失败:', error);
      showToast?.('error', error?.message || '加载授权详情失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userType="user">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!authorization) {
    return (
      <DashboardLayout userType="user">
        <div className="text-center py-12">
          <p className="text-gray-600">授权不存在</p>
          <Link href="/app/user/agent-authorizations" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
            返回授权列表
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const status = authorization.isActive
    ? authorization.expiry && new Date(authorization.expiry) < new Date()
      ? 'expired'
      : 'active'
    : 'revoked';

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>授权详情 - 用户中心</title>
      </Head>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/app/user/agent-authorizations"
              className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block"
            >
              ← 返回授权列表
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">授权详情</h1>
          </div>
        </div>

        {/* 标签页 */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-1">
            {[
              { key: 'details' as const, label: '基本信息' },
              { key: 'permissions' as const, label: '策略权限' },
              { key: 'history' as const, label: '执行历史' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === tab.key
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Agent ID</p>
                  <p className="font-semibold text-gray-900">{authorization.agentId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">授权类型</p>
                  <p className="font-semibold text-gray-900">
                    {authorization.authorizationType === 'erc8004'
                      ? 'ERC8004 Session'
                      : authorization.authorizationType === 'mpc'
                      ? 'MPC钱包'
                      : 'API Key'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">钱包地址</p>
                  <p className="font-semibold text-gray-900 font-mono text-sm">{authorization.walletAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">状态</p>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      status === 'active'
                        ? 'bg-green-50 text-green-600'
                        : status === 'expired'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {status === 'active' ? '活跃' : status === 'expired' ? '已过期' : '已撤销'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">单笔限额</p>
                  <p className="font-semibold text-gray-900">
                    {authorization.singleLimit ? `$${authorization.singleLimit.toFixed(2)}` : '不限制'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">每日限额</p>
                  <p className="font-semibold text-gray-900">
                    {authorization.dailyLimit ? `$${authorization.dailyLimit.toFixed(2)}` : '不限制'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">总限额</p>
                  <p className="font-semibold text-gray-900">
                    {authorization.totalLimit ? `$${authorization.totalLimit.toFixed(2)}` : '不限制'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">今日已用</p>
                  <p className="font-semibold text-gray-900">${authorization.usedToday.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">总已用</p>
                  <p className="font-semibold text-gray-900">${authorization.usedTotal.toFixed(2)}</p>
                </div>
                {authorization.expiry && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">过期时间</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(authorization.expiry).toLocaleString('zh-CN')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500 mb-1">创建时间</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(authorization.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-4">
              {authorization.strategyPermissions && authorization.strategyPermissions.length > 0 ? (
                authorization.strategyPermissions.map((permission) => (
                  <div key={permission.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{permission.strategyType}</h4>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          permission.allowed ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {permission.allowed ? '允许' : '禁止'}
                      </span>
                    </div>
                    {permission.allowed && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {permission.maxAmount && (
                          <div>
                            <span className="text-gray-500">最大金额:</span>{' '}
                            <span className="font-medium">${permission.maxAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {permission.maxFrequency && (
                          <div>
                            <span className="text-gray-500">最大频率:</span>{' '}
                            <span className="font-medium">
                              {permission.maxFrequency} 次/{permission.frequencyPeriod === 'hour' ? '小时' : '天'}
                            </span>
                          </div>
                        )}
                        {permission.allowedTokens && permission.allowedTokens.length > 0 && (
                          <div>
                            <span className="text-gray-500">允许的代币:</span>{' '}
                            <span className="font-medium">{permission.allowedTokens.join(', ')}</span>
                          </div>
                        )}
                        {permission.allowedDEXs && permission.allowedDEXs.length > 0 && (
                          <div>
                            <span className="text-gray-500">允许的DEX:</span>{' '}
                            <span className="font-medium">{permission.allowedDEXs.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">暂无策略权限配置</p>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {executionHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-sm font-medium text-gray-700">时间</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-700">类型</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-700">金额</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-700">状态</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-700">交易哈希</th>
                      </tr>
                    </thead>
                    <tbody>
                      {executionHistory.map((history) => (
                        <tr key={history.id} className="border-b border-gray-100">
                          <td className="py-2 text-sm text-gray-600">
                            {new Date(history.executedAt).toLocaleString('zh-CN')}
                          </td>
                          <td className="py-2 text-sm text-gray-600">{history.executionType}</td>
                          <td className="py-2 text-sm text-gray-600">
                            {history.amount ? `$${history.amount.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-2">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                history.status === 'success'
                                  ? 'bg-green-50 text-green-600'
                                  : history.status === 'failed'
                                  ? 'bg-red-50 text-red-600'
                                  : history.status === 'rejected'
                                  ? 'bg-yellow-50 text-yellow-600'
                                  : 'bg-gray-50 text-gray-600'
                              }`}
                            >
                              {history.status === 'success'
                                ? '成功'
                                : history.status === 'failed'
                                ? '失败'
                                : history.status === 'rejected'
                                ? '拒绝'
                                : '待处理'}
                            </span>
                          </td>
                          <td className="py-2 text-sm text-gray-600 font-mono">
                            {history.transactionHash ? (
                              <a
                                href={`https://etherscan.io/tx/${history.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                {history.transactionHash.slice(0, 10)}...
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">暂无执行历史</p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

