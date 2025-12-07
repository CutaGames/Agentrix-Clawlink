import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';
import { StrategyPermissionForm } from '../../../../components/agent/StrategyPermissionForm';
import {
  agentAuthorizationApi,
  CreateAgentAuthorizationDto,
  StrategyPermissionConfig,
} from '../../../../lib/api/agent-authorization.api';
import { useToast } from '../../../../contexts/ToastContext';
import { useWeb3 } from '../../../../contexts/Web3Context';

export default function CreateAgentAuthorizationPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { defaultWallet } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateAgentAuthorizationDto>({
    agentId: '',
    authorizationType: 'erc8004',
    walletAddress: defaultWallet?.address || '',
    singleLimit: undefined,
    dailyLimit: undefined,
    totalLimit: undefined,
    expiry: undefined,
    allowedStrategies: [],
  });
  const [strategyPermissions, setStrategyPermissions] = useState<StrategyPermissionConfig[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agentId) {
      showToast?.('error', '请输入Agent ID');
      return;
    }
    if (!formData.walletAddress) {
      showToast?.('error', '请输入钱包地址');
      return;
    }

    try {
      setLoading(true);
      const dto: CreateAgentAuthorizationDto = {
        ...formData,
        allowedStrategies: strategyPermissions,
      };
      const result = await agentAuthorizationApi.createAuthorization(dto);
      showToast?.('success', '授权创建成功');
      router.push(`/app/user/agent-authorizations/${result.id}`);
    } catch (error: any) {
      console.error('创建授权失败:', error);
      showToast?.('error', error?.message || '创建授权失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>创建Agent授权 - 用户中心</title>
      </Head>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">创建Agent授权</h1>
          <p className="text-gray-600 mt-1">为Agent创建授权，设置限额和策略权限</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.agentId}
                onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                required
                placeholder="请输入Agent ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                授权类型 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.authorizationType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    authorizationType: e.target.value as 'erc8004' | 'mpc' | 'api_key',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="erc8004">ERC8004 Session</option>
                <option value="mpc">MPC钱包</option>
                <option value="api_key">API Key</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                钱包地址 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.walletAddress}
                onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                required
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {formData.authorizationType === 'erc8004' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session ID (可选)</label>
                <input
                  type="text"
                  value={formData.sessionId || ''}
                  onChange={(e) => setFormData({ ...formData, sessionId: e.target.value || undefined })}
                  placeholder="如果已有Session ID，可在此输入"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {formData.authorizationType === 'mpc' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">MPC钱包ID (可选)</label>
                <input
                  type="text"
                  value={formData.mpcWalletId || ''}
                  onChange={(e) => setFormData({ ...formData, mpcWalletId: e.target.value || undefined })}
                  placeholder="如果已有MPC钱包ID，可在此输入"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* 限额设置 */}
          <div className="space-y-4 border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900">限额设置</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">单笔限额 (USD)</label>
                <input
                  type="number"
                  value={formData.singleLimit || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      singleLimit: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="不限制"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">每日限额 (USD)</label>
                <input
                  type="number"
                  value={formData.dailyLimit || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dailyLimit: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="不限制"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">总限额 (USD)</label>
                <input
                  type="number"
                  value={formData.totalLimit || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalLimit: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="不限制"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">过期时间 (可选)</label>
              <input
                type="datetime-local"
                value={formData.expiry ? new Date(formData.expiry).toISOString().slice(0, 16) : ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expiry: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 策略权限配置 */}
          <div className="border-t pt-6">
            <StrategyPermissionForm value={strategyPermissions} onChange={setStrategyPermissions} />
          </div>

          {/* 提交按钮 */}
          <div className="flex justify-end gap-4 border-t pt-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '创建中...' : '创建授权'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

