import Head from 'next/head';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { agentAuthorizationApi, AgentExecutionHistory } from '../../../lib/api/agent-authorization.api';
import { useToast } from '../../../contexts/ToastContext';

export default function ExecutionHistoryPage() {
  const { showToast } = useToast();
  const [allHistory, setAllHistory] = useState<AgentExecutionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    agentId: '',
    strategyType: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadAllHistory();
  }, []);

  const loadAllHistory = async () => {
    try {
      setLoading(true);
      // 获取所有授权，然后获取每个授权的执行历史
      const authorizations = await agentAuthorizationApi.getAuthorizations();
      const allHistoryPromises = authorizations.map((auth) =>
        agentAuthorizationApi.getExecutionHistory(auth.id).catch((): AgentExecutionHistory[] => []),
      );
      const histories = await Promise.all(allHistoryPromises);
      const flattened = histories.flat();
      setAllHistory(flattened.sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()));
    } catch (error: any) {
      console.error('加载执行历史失败:', error);
      showToast?.('error', error?.message || '加载执行历史失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = allHistory.filter((history) => {
    if (filters.agentId && history.agentId !== filters.agentId) return false;
    if (filters.strategyType && history.strategyType !== filters.strategyType) return false;
    if (filters.status && history.status !== filters.status) return false;
    if (filters.startDate && new Date(history.executedAt) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(history.executedAt) > new Date(filters.endDate)) return false;
    return true;
  });

  const uniqueAgentIds = Array.from(new Set(allHistory.map((h) => h.agentId)));
  const uniqueStrategyTypes = Array.from(
    new Set(allHistory.map((h) => h.strategyType).filter(Boolean) as string[]),
  );

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>执行历史 - 用户中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">执行历史</h1>
          <p className="text-gray-600 mt-1">查看所有Agent的执行历史记录</p>
        </div>

        {/* 筛选器 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">筛选条件</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Agent ID</label>
              <select
                value={filters.agentId}
                onChange={(e) => setFilters({ ...filters, agentId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部</option>
                {uniqueAgentIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">策略类型</label>
              <select
                value={filters.strategyType}
                onChange={(e) => setFilters({ ...filters, strategyType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部</option>
                {uniqueStrategyTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部</option>
                <option value="success">成功</option>
                <option value="failed">失败</option>
                <option value="rejected">拒绝</option>
                <option value="pending">待处理</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 执行历史列表 */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">暂无执行历史</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">时间</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Agent ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">执行类型</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">策略类型</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">金额</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">状态</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">交易哈希</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((history) => (
                    <tr key={history.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(history.executedAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 font-mono">{history.agentId}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{history.executionType}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{history.strategyType || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {history.amount ? `$${history.amount.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4 text-sm text-gray-600 font-mono">
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
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

