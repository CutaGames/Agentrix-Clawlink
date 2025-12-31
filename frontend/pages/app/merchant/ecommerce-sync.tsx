import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';

interface Connection {
  id: string;
  platform: 'shopify' | 'woocommerce' | 'magento' | 'bigcommerce' | 'custom';
  storeName: string;
  storeUrl?: string;
  status: 'active' | 'inactive' | 'error' | 'syncing';
  isActive: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  syncConfig: {
    autoSync: boolean;
    syncInterval: number;
    syncInventory: boolean;
    syncPrices: boolean;
    syncImages: boolean;
  };
  stats: {
    totalProducts: number;
    syncedProducts: number;
    failedProducts: number;
  };
  createdAt: string;
}

interface SyncResult {
  success: boolean;
  imported: number;
  updated: number;
  failed: number;
  errors: string[];
}

const platformConfig = {
  shopify: {
    name: 'Shopify',
    icon: '🛍️',
    color: 'bg-green-500',
    description: '连接您的 Shopify 商店，自动同步商品',
    fields: ['apiKey', 'apiSecret', 'storeDomain'],
  },
  woocommerce: {
    name: 'WooCommerce',
    icon: '🛒',
    color: 'bg-purple-500',
    description: '连接 WordPress WooCommerce 商店',
    fields: ['consumerKey', 'consumerSecret', 'storeUrl'],
  },
  magento: {
    name: 'Magento',
    icon: '🏬',
    color: 'bg-orange-500',
    description: '连接 Magento 电商平台',
    fields: ['accessToken', 'storeUrl'],
  },
  bigcommerce: {
    name: 'BigCommerce',
    icon: '📦',
    color: 'bg-blue-500',
    description: '连接 BigCommerce 商店',
    fields: ['accessToken', 'storeHash', 'clientId'],
  },
  custom: {
    name: '自定义 API',
    icon: '⚙️',
    color: 'bg-gray-500',
    description: '通过自定义 API 集成其他平台',
    fields: ['apiEndpoint', 'apiKey'],
  },
};

export default function EcommerceSyncPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<keyof typeof platformConfig | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // 表单状态
  const [formData, setFormData] = useState<Record<string, string>>({
    storeName: '',
    storeUrl: '',
    apiKey: '',
    apiSecret: '',
    consumerKey: '',
    consumerSecret: '',
    accessToken: '',
    storeHash: '',
    clientId: '',
    apiEndpoint: '',
  });

  const apiBaseUrl = typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3001/api'
      : 'https://api.agentrix.top/api')
    : 'http://localhost:3001/api';

  const getToken = () => localStorage.getItem('access_token');

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        setError('请先登录');
        return;
      }

      const response = await fetch(`${apiBaseUrl}/ecommerce/connections`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('获取连接列表失败');
      }

      const data = await response.json();
      setConnections(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConnection = async () => {
    if (!selectedPlatform) return;

    try {
      const token = getToken();
      const credentials: Record<string, string> = {};
      
      platformConfig[selectedPlatform].fields.forEach(field => {
        if (formData[field]) {
          credentials[field] = formData[field];
        }
      });

      const response = await fetch(`${apiBaseUrl}/ecommerce/connections`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          storeName: formData.storeName,
          storeUrl: formData.storeUrl,
          credentials,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '创建连接失败');
      }

      alert('连接创建成功！');
      setShowAddModal(false);
      setSelectedPlatform(null);
      setFormData({
        storeName: '',
        storeUrl: '',
        apiKey: '',
        apiSecret: '',
        consumerKey: '',
        consumerSecret: '',
        accessToken: '',
        storeHash: '',
        clientId: '',
        apiEndpoint: '',
      });
      fetchConnections();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSync = async (connectionId: string) => {
    try {
      setSyncingId(connectionId);
      setSyncResult(null);
      const token = getToken();

      const response = await fetch(`${apiBaseUrl}/ecommerce/connections/${connectionId}/sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('同步失败');
      }

      const data = await response.json();
      setSyncResult(data.data);
      fetchConnections();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleToggleActive = async (connectionId: string, isActive: boolean) => {
    try {
      const token = getToken();
      await fetch(`${apiBaseUrl}/ecommerce/connections/${connectionId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchConnections();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (connectionId: string) => {
    if (!confirm('确定要删除此连接吗？')) return;

    try {
      const token = getToken();
      await fetch(`${apiBaseUrl}/ecommerce/connections/${connectionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchConnections();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: '正常' },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800', label: '已停用' },
      error: { bg: 'bg-red-100', text: 'text-red-800', label: '错误' },
      syncing: { bg: 'bg-blue-100', text: 'text-blue-800', label: '同步中' },
    };
    const badge = badges[status] || badges.inactive;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      apiKey: 'API Key',
      apiSecret: 'API Secret',
      consumerKey: 'Consumer Key',
      consumerSecret: 'Consumer Secret',
      accessToken: 'Access Token',
      storeHash: 'Store Hash',
      clientId: 'Client ID',
      apiEndpoint: 'API Endpoint',
      storeDomain: 'Store Domain',
    };
    return labels[field] || field;
  };

  return (
    <>
      <Head>
        <title>电商平台同步 - Agentrix</title>
      </Head>
      <DashboardLayout userType="merchant">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">电商平台同步</h1>
              <p className="text-gray-600 mt-1">连接外部电商平台，自动同步商品到 Agentrix</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <span>➕</span> 添加连接
            </button>
          </div>

          {/* 同步结果提示 */}
          {syncResult && (
            <div className={`mb-6 p-4 rounded-lg ${syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-medium ${syncResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {syncResult.success ? '同步完成' : '同步失败'}
                  </h3>
                  <div className="mt-2 text-sm space-y-1">
                    <p>导入: {syncResult.imported} 个商品</p>
                    <p>更新: {syncResult.updated} 个商品</p>
                    <p>失败: {syncResult.failed} 个商品</p>
                  </div>
                  {syncResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-red-600">错误:</p>
                      <ul className="list-disc list-inside text-sm text-red-600">
                        {syncResult.errors.slice(0, 5).map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <button onClick={() => setSyncResult(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
          )}

          {/* 连接列表 */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">加载中...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600">{error}</p>
              <button onClick={fetchConnections} className="mt-4 text-indigo-600 hover:underline">重试</button>
            </div>
          ) : connections.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <div className="text-6xl mb-4">🔗</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">尚未添加电商平台连接</h3>
              <p className="text-gray-500 mb-6">连接您的电商平台，一键同步商品到 Agentrix Marketplace</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                添加第一个连接
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {connections.map((conn) => (
                <div key={conn.id} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg ${platformConfig[conn.platform]?.color || 'bg-gray-500'} flex items-center justify-center text-2xl text-white`}>
                        {platformConfig[conn.platform]?.icon || '🔗'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{conn.storeName}</h3>
                        <p className="text-sm text-gray-500">
                          {platformConfig[conn.platform]?.name || conn.platform}
                          {conn.storeUrl && ` • ${conn.storeUrl}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(conn.status)}
                          {conn.lastSyncAt && (
                            <span className="text-xs text-gray-400">
                              上次同步: {new Date(conn.lastSyncAt).toLocaleString('zh-CN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSync(conn.id)}
                        disabled={syncingId === conn.id || !conn.isActive}
                        className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50 text-sm"
                      >
                        {syncingId === conn.id ? '同步中...' : '🔄 同步'}
                      </button>
                      <button
                        onClick={() => handleToggleActive(conn.id, conn.isActive)}
                        className={`px-4 py-2 rounded-lg text-sm ${
                          conn.isActive
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {conn.isActive ? '停用' : '启用'}
                      </button>
                      <button
                        onClick={() => handleDelete(conn.id)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  {/* 统计信息 */}
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold text-gray-900">{conn.stats?.totalProducts || 0}</div>
                      <div className="text-xs text-gray-500">平台商品数</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold text-green-600">{conn.stats?.syncedProducts || 0}</div>
                      <div className="text-xs text-gray-500">已同步</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold text-red-600">{conn.stats?.failedProducts || 0}</div>
                      <div className="text-xs text-gray-500">同步失败</div>
                    </div>
                  </div>

                  {/* 同步配置 */}
                  <div className="mt-4 pt-4 border-t flex items-center gap-4 text-sm text-gray-500">
                    <span>
                      自动同步: {conn.syncConfig?.autoSync ? '✅ 开启' : '❌ 关闭'}
                    </span>
                    {conn.syncConfig?.autoSync && (
                      <span>同步间隔: {conn.syncConfig.syncInterval}分钟</span>
                    )}
                    <span>库存同步: {conn.syncConfig?.syncInventory ? '✅' : '❌'}</span>
                    <span>价格同步: {conn.syncConfig?.syncPrices ? '✅' : '❌'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 返回链接 */}
          <div className="mt-6">
            <Link href="/app/merchant/products" className="text-indigo-600 hover:underline">
              ← 返回商品管理
            </Link>
          </div>
        </div>

        {/* 添加连接模态框 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {selectedPlatform ? `连接 ${platformConfig[selectedPlatform].name}` : '选择电商平台'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedPlatform(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                {!selectedPlatform ? (
                  // 平台选择
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(platformConfig).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedPlatform(key as keyof typeof platformConfig)}
                        className="p-4 border rounded-lg hover:border-indigo-300 hover:bg-indigo-50 text-left transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center text-xl text-white`}>
                            {config.icon}
                          </div>
                          <div>
                            <div className="font-medium">{config.name}</div>
                            <div className="text-xs text-gray-500">{config.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  // 连接表单
                  <div className="space-y-4">
                    <button
                      onClick={() => setSelectedPlatform(null)}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      ← 返回选择平台
                    </button>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        商店名称 *
                      </label>
                      <input
                        type="text"
                        value={formData.storeName}
                        onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="例如: 我的商店"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        商店 URL
                      </label>
                      <input
                        type="text"
                        value={formData.storeUrl}
                        onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="https://your-store.com"
                      />
                    </div>

                    {platformConfig[selectedPlatform].fields.map((field) => (
                      <div key={field}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {getFieldLabel(field)} *
                        </label>
                        <input
                          type={field.toLowerCase().includes('secret') || field.toLowerCase().includes('key') ? 'password' : 'text'}
                          value={formData[field] || ''}
                          onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                          placeholder={`输入 ${getFieldLabel(field)}`}
                        />
                      </div>
                    ))}

                    <div className="pt-4">
                      <button
                        onClick={handleCreateConnection}
                        disabled={!formData.storeName || platformConfig[selectedPlatform].fields.some(f => !formData[f])}
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        创建连接
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  );
}
