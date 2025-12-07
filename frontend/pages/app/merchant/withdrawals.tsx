import Head from 'next/head';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { merchantApi } from '../../../lib/api/merchant.api';
import { 
  ArrowDownCircle, 
  Plus, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  DollarSign,
  Wallet,
  Building2
} from 'lucide-react';
import { useUser } from '../../../contexts/UserContext';

interface Withdrawal {
  id: string;
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  finalAmount: number;
  providerFee: number;
  paymindFee: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  providerId?: string;
  providerTransactionId?: string;
  transactionHash?: string;
  bankAccount: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

export default function MerchantWithdrawals() {
  const { user } = useUser();
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [total, setTotal] = useState(0);
  
  // 创建提现表单状态
  const [formData, setFormData] = useState({
    amount: '',
    fromCurrency: 'USDC',
    toCurrency: 'CNY',
    bankAccount: '',
  });

  // 加载提现列表
  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await merchantApi.getWithdrawals(50, 0);
      setWithdrawals(result.withdrawals || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      console.error('加载提现列表失败:', err);
      setError(err.message || '加载提现列表失败，请稍后重试');
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('请输入有效的提现金额');
      return;
    }

    if (!formData.bankAccount) {
      setError('请输入银行账户信息');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await merchantApi.createWithdrawal({
        amount: parseFloat(formData.amount),
        fromCurrency: formData.fromCurrency,
        toCurrency: formData.toCurrency,
        bankAccount: formData.bankAccount,
      });

      setSuccess('提现申请已创建，正在处理中...');
      setShowCreateForm(false);
      setFormData({
        amount: '',
        fromCurrency: 'USDC',
        toCurrency: 'CNY',
        bankAccount: '',
      });
      
      // 重新加载列表
      setTimeout(() => {
        loadWithdrawals();
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error('创建提现申请失败:', err);
      setError(err.message || '创建提现申请失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelWithdrawal = async (id: string) => {
    if (!confirm('确定要取消此提现申请吗？')) {
      return;
    }

    try {
      await merchantApi.cancelWithdrawal(id);
      setSuccess('提现申请已取消');
      loadWithdrawals();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      console.error('取消提现失败:', err);
      setError(err.message || '取消提现失败，请稍后重试');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      case 'cancelled':
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'processing':
        return '处理中';
      case 'pending':
        return '待处理';
      case 'failed':
        return '失败';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  // 计算统计数据
  const stats = {
    total: withdrawals.length,
    pending: withdrawals.filter(w => w.status === 'pending').length,
    processing: withdrawals.filter(w => w.status === 'processing').length,
    completed: withdrawals.filter(w => w.status === 'completed').length,
    totalAmount: withdrawals
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + w.finalAmount, 0),
  };

  return (
    <>
      <Head>
        <title>提现管理 - 商户后台</title>
      </Head>
      <DashboardLayout userType="merchant">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <ArrowDownCircle className="w-7 h-7 text-indigo-600" />
                  提现管理
                </h1>
                <p className="text-gray-600 mt-1">将数字货币转换为法币并提现到银行账户</p>
              </div>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                创建提现申请
              </button>
            </div>
          </div>

          {/* 错误/成功提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="text-red-600" size={20} />
              <span className="text-red-700">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="text-green-600" size={20} />
              <span className="text-green-700">{success}</span>
              <button
                onClick={() => setSuccess(null)}
                className="ml-auto text-green-600 hover:text-green-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 创建提现表单 */}
          {showCreateForm && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">创建提现申请</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateWithdrawal} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 提现金额 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      提现金额 (数字货币) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <select
                        value={formData.fromCurrency}
                        onChange={(e) => setFormData({ ...formData, fromCurrency: e.target.value })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 border border-slate-300 rounded bg-white text-sm"
                      >
                        <option value="USDC">USDC</option>
                        <option value="USDT">USDT</option>
                      </select>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      最小提现金额：10 {formData.fromCurrency}
                    </p>
                  </div>

                  {/* 目标法币 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      目标法币 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.toCurrency}
                      onChange={(e) => setFormData({ ...formData, toCurrency: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="CNY">人民币 (CNY)</option>
                      <option value="USD">美元 (USD)</option>
                      <option value="EUR">欧元 (EUR)</option>
                      <option value="GBP">英镑 (GBP)</option>
                    </select>
                  </div>
                </div>

                {/* 银行账户 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    银行账户 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    placeholder="请输入银行账户号码"
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    法币将转入此银行账户
                  </p>
                </div>

                {/* 费率说明 */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>费率说明：</strong>
                  </p>
                  <ul className="text-xs text-blue-800 mt-2 space-y-1 list-disc list-inside">
                    <li>Provider 手续费：约 1%-2%</li>
                    <li>平台手续费：可配置，默认 0.1%，可设为 0</li>
                    <li>实际到账金额 = 提现金额 - Provider 手续费 - 平台手续费</li>
                  </ul>
                </div>

                {/* 提交按钮 */}
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        提交中...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        提交申请
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">总提现次数</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
                </div>
                <Wallet className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">待处理</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">处理中</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.processing}</p>
                </div>
                <RefreshCw className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">已到账总额</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    ¥{stats.totalAmount.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* 提现记录列表 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">提现记录</h2>
                <button
                  onClick={loadWithdrawals}
                  disabled={loading}
                  className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  刷新
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
                <p className="text-slate-600">加载中...</p>
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">暂无提现记录</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  创建第一个提现申请
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        提现ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        金额
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        汇率
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        到账金额
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        手续费
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        创建时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {withdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-slate-900">
                            {withdrawal.id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">
                            {withdrawal.amount} {withdrawal.fromCurrency}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600">
                            1 {withdrawal.fromCurrency} = {withdrawal.exchangeRate.toFixed(4)} {withdrawal.toCurrency}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-green-600">
                            {withdrawal.finalAmount.toFixed(2)} {withdrawal.toCurrency}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600">
                            <div>Provider: {withdrawal.providerFee.toFixed(2)}</div>
                            <div>平台: {withdrawal.paymindFee.toFixed(2)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                              withdrawal.status
                            )}`}
                          >
                            {getStatusIcon(withdrawal.status)}
                            {getStatusText(withdrawal.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600">
                            {new Date(withdrawal.createdAt).toLocaleString('zh-CN')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {withdrawal.status === 'pending' && (
                            <button
                              onClick={() => handleCancelWithdrawal(withdrawal.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              取消
                            </button>
                          )}
                          {withdrawal.status === 'completed' && withdrawal.transactionHash && (
                            <a
                              href={`https://bscscan.com/tx/${withdrawal.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              查看交易
                            </a>
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
    </>
  );
}

