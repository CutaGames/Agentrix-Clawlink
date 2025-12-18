import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  ArrowRight, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Zap,
  Users,
  Building2,
  Wallet,
  TrendingUp,
  Clock,
  Hash
} from 'lucide-react';

interface FundPath {
  id: string;
  paymentId: string;
  orderId: string;
  transactionHash: string | null;
  pathType: string;
  fromAddress: string;
  fromLabel: string;
  toAddress: string;
  toLabel: string;
  amount: string;
  currency: string;
  rate: string | null;
  description: string;
  isX402: boolean;
  createdAt: string;
}

interface FundPathTransaction {
  paymentId: string;
  transactionHash: string | null;
  isX402: boolean;
  totalAmount: string;
  currency: string;
  createdAt: string;
  paths: FundPath[];
  breakdown: {
    merchantNet: string;
    platformFee: string;
    channelFee: string;
    promoterShare: string;
    executorShare: string;
    referrerShare: string;
    platformFund: string;
  };
}

interface Statistics {
  totalTransactions: number;
  totalVolume: string;
  x402Transactions: number;
  channelFeeTotal: string;
  platformFeeTotal: string;
  agentSharesTotal: string;
  merchantNetTotal: string;
}

const PATH_TYPE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  merchant_net: { label: '商户实收', color: 'bg-green-100 text-green-800', icon: Building2 },
  platform_fee: { label: '平台费', color: 'bg-blue-100 text-blue-800', icon: TrendingUp },
  channel_fee: { label: 'X402通道费', color: 'bg-purple-100 text-purple-800', icon: Zap },
  promoter_share: { label: '推广Agent', color: 'bg-orange-100 text-orange-800', icon: Users },
  executor_share: { label: '执行Agent', color: 'bg-cyan-100 text-cyan-800', icon: Users },
  referrer_share: { label: '推荐Agent', color: 'bg-pink-100 text-pink-800', icon: Users },
  platform_fund: { label: '平台基金', color: 'bg-gray-100 text-gray-800', icon: Wallet },
  tax: { label: '税费', color: 'bg-red-100 text-red-800', icon: TrendingUp },
  gas_fee: { label: 'Gas费', color: 'bg-yellow-100 text-yellow-800', icon: Zap },
};

export default function FundPathsPage() {
  const [transactions, setTransactions] = useState<FundPathTransaction[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterX402, setFilterX402] = useState<boolean | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const apiBaseUrl = typeof window !== 'undefined' 
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3001/api' 
        : 'https://api.agentrix.top/api')
    : 'http://localhost:3001/api';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setError('未登录，请先登录管理后台');
        return;
      }

      // Fetch recent transactions
      const txResponse = await fetch(`${apiBaseUrl}/admin/fund-paths/recent?limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!txResponse.ok) {
        throw new Error(`获取交易数据失败: ${txResponse.status}`);
      }

      const txData = await txResponse.json();
      setTransactions(txData);

      // Fetch statistics
      const statsResponse = await fetch(`${apiBaseUrl}/admin/fund-paths/statistics`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStatistics(statsData);
      }
    } catch (err: any) {
      console.error('Failed to fetch fund paths:', err);
      setError(err.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchData();
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      // Try searching by transaction hash first
      let response = await fetch(
        `${apiBaseUrl}/admin/fund-paths/tx/${encodeURIComponent(searchTerm)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data) {
          setTransactions([data]);
          return;
        }
      }

      // Try searching by payment ID
      response = await fetch(
        `${apiBaseUrl}/admin/fund-paths/payment/${encodeURIComponent(searchTerm)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data) {
          setTransactions([data]);
          return;
        }
      }

      setError('未找到匹配的交易记录');
      setTransactions([]);
    } catch (err: any) {
      setError(err.message || '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: string, currency: string = 'USDT') => {
    const num = parseFloat(amount || '0');
    return `${num.toFixed(6)} ${currency}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const shortenHash = (hash: string | null) => {
    if (!hash) return '-';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const toggleExpand = (paymentId: string) => {
    setExpandedTx(expandedTx === paymentId ? null : paymentId);
  };

  return (
    <>
      <Head>
        <title>资金路径追踪 - 管理后台</title>
      </Head>
      <AdminLayout title="资金路径追踪" description="查看每笔交易的详细资金流向">
        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">总交易数</p>
                  <p className="text-2xl font-bold">{statistics.totalTransactions}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Hash className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">X402 交易数</p>
                  <p className="text-2xl font-bold text-purple-600">{statistics.x402Transactions}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">通道费收入</p>
                  <p className="text-2xl font-bold text-green-600">{parseFloat(statistics.channelFeeTotal).toFixed(2)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Agent 分成总额</p>
                  <p className="text-2xl font-bold text-orange-600">{parseFloat(statistics.agentSharesTotal).toFixed(2)}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索交易哈希或支付ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterX402 === null ? '' : filterX402 ? 'x402' : 'other'}
                onChange={(e) => {
                  if (e.target.value === '') setFilterX402(null);
                  else if (e.target.value === 'x402') setFilterX402(true);
                  else setFilterX402(false);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">全部类型</option>
                <option value="x402">X402 交易</option>
                <option value="other">普通交易</option>
              </select>

              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                搜索
              </button>

              <button
                onClick={fetchData}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                刷新
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        )}

        {/* Transaction List */}
        {!loading && transactions.length > 0 && (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div key={tx.paymentId} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Transaction Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(tx.paymentId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${tx.isX402 ? 'bg-purple-100' : 'bg-blue-100'}`}>
                        {tx.isX402 ? (
                          <Zap className="h-5 w-5 text-purple-600" />
                        ) : (
                          <Wallet className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-500">
                            {shortenHash(tx.transactionHash)}
                          </span>
                          {tx.transactionHash && (
                            <a
                              href={`https://testnet.bscscan.com/tx/${tx.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          {tx.isX402 && (
                            <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                              X402 V2
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(tx.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">交易金额</p>
                        <p className="font-semibold">{formatAmount(tx.totalAmount, tx.currency)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">商户实收</p>
                        <p className="font-semibold text-green-600">{formatAmount(tx.breakdown.merchantNet, tx.currency)}</p>
                      </div>
                      {expandedTx === tx.paymentId ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedTx === tx.paymentId && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    {/* Breakdown Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                      <div className="text-center p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">商户实收</p>
                        <p className="font-semibold text-green-600">{parseFloat(tx.breakdown.merchantNet).toFixed(4)}</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">平台费</p>
                        <p className="font-semibold text-blue-600">{parseFloat(tx.breakdown.platformFee).toFixed(4)}</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">X402通道费</p>
                        <p className="font-semibold text-purple-600">{parseFloat(tx.breakdown.channelFee).toFixed(4)}</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">推广Agent</p>
                        <p className="font-semibold text-orange-600">{parseFloat(tx.breakdown.promoterShare).toFixed(4)}</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">执行Agent</p>
                        <p className="font-semibold text-cyan-600">{parseFloat(tx.breakdown.executorShare).toFixed(4)}</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">推荐Agent</p>
                        <p className="font-semibold text-pink-600">{parseFloat(tx.breakdown.referrerShare).toFixed(4)}</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">平台基金</p>
                        <p className="font-semibold text-gray-600">{parseFloat(tx.breakdown.platformFund).toFixed(4)}</p>
                      </div>
                    </div>

                    {/* Fund Flow Visualization */}
                    <h4 className="font-medium text-gray-700 mb-3">资金流向明细</h4>
                    <div className="space-y-2">
                      {tx.paths.map((path, index) => {
                        const typeInfo = PATH_TYPE_LABELS[path.pathType] || {
                          label: path.pathType,
                          color: 'bg-gray-100 text-gray-800',
                          icon: ArrowRight,
                        };
                        const Icon = typeInfo.icon;

                        return (
                          <div
                            key={path.id || index}
                            className="flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-200"
                          >
                            <div className={`p-2 rounded-full ${typeInfo.color.split(' ')[0]}`}>
                              <Icon className={`h-4 w-4 ${typeInfo.color.split(' ')[1]}`} />
                            </div>
                            
                            <div className="flex-1 flex items-center gap-2">
                              <div className="min-w-[120px]">
                                <p className="text-sm font-medium">{path.fromLabel}</p>
                                <p className="text-xs text-gray-400 font-mono truncate max-w-[100px]">
                                  {path.fromAddress?.slice(0, 10)}...
                                </p>
                              </div>
                              
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                              
                              <div className="min-w-[120px]">
                                <p className="text-sm font-medium">{path.toLabel}</p>
                                <p className="text-xs text-gray-400 font-mono truncate max-w-[100px]">
                                  {path.toAddress?.slice(0, 10)}...
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className={`px-2 py-1 text-xs rounded-full ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              {path.rate && (
                                <p className="text-xs text-gray-400 mt-1">
                                  费率: {(parseFloat(path.rate) * 100).toFixed(1)}%
                                </p>
                              )}
                            </div>

                            <div className="text-right min-w-[120px]">
                              <p className="font-semibold">{parseFloat(path.amount).toFixed(6)}</p>
                              <p className="text-xs text-gray-400">{path.currency}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Additional Info */}
                    <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
                      <div className="flex gap-6">
                        <span>支付ID: <code className="bg-gray-100 px-1 rounded">{tx.paymentId}</code></span>
                        {tx.transactionHash && (
                          <span>交易哈希: <code className="bg-gray-100 px-1 rounded">{tx.transactionHash}</code></span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && transactions.length === 0 && !error && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无交易记录</p>
            <p className="text-sm text-gray-400 mt-1">当有支付交易时，资金路径将显示在这里</p>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
