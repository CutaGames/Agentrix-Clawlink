import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  CreditCard, 
  Wallet, 
  DollarSign, 
  AlertCircle,
  CheckCircle2,
  Info,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  Clock,
  Users,
  Zap
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface ConnectAccount {
  id: string;
  status: 'pending' | 'active' | 'restricted';
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  email: string;
  country: string;
  created: number;
}

interface ConnectStats {
  totalEarnings: number;
  pendingSettlement: number;
  lastSettlement: number;
  settlementCount: number;
}

export default function StripeConnectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<ConnectAccount | null>(null);
  const [stats, setStats] = useState<ConnectStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    loadConnectAccount();
  }, []);

  const loadConnectAccount = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payments/connect/account', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setAccount(data.account);
        setStats(data.stats);
      } else if (response.status === 404) {
        // No account yet
        setAccount(null);
      } else {
        throw new Error('Failed to load Connect account');
      }
    } catch (error: any) {
      console.error('加载 Stripe Connect 账户失败:', error);
      setError(error.message || '加载失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    try {
      setConnecting(true);
      setError(null);

      // 创建 Stripe Connect onboarding link
      const response = await fetch('/api/payments/connect/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/app/merchant/stripe-connect?success=true`,
          refreshUrl: `${window.location.origin}/app/merchant/stripe-connect`,
        }),
      });

      if (!response.ok) {
        throw new Error('创建 Stripe 入驻链接失败');
      }

      const data = await response.json();
      
      // 跳转到 Stripe onboarding
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Stripe Connect 入驻失败:', error);
      setError(error.message || '入驻失败，请重试');
      setConnecting(false);
    }
  };

  const handleDashboard = async () => {
    try {
      const response = await fetch('/api/payments/connect/dashboard-link', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('创建仪表板链接失败');
      }

      const data = await response.json();
      window.open(data.url, '_blank');
    } catch (error: any) {
      console.error('打开 Stripe 仪表板失败:', error);
      setError(error.message || '操作失败，请重试');
    }
  };

  if (loading) {
    return (
      <DashboardLayout userType="merchant">
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="animate-spin text-indigo-600" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="merchant">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Stripe Connect</h1>
          <p className="text-slate-600">通过 Stripe Connect 接收法币支付和自动分账</p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-red-600" size={20} />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* 成功提示 */}
        {router.query.success === 'true' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="text-green-600" size={20} />
            <span className="text-green-700">Stripe Connect 账户已成功创建！</span>
          </div>
        )}

        {!account ? (
          /* 未连接状态 */
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                  <CreditCard className="text-indigo-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  连接 Stripe 开始收款
                </h2>
                <p className="text-slate-600">
                  Stripe Connect 支持全球超过 135 种货币和多种支付方式，包括信用卡、Apple Pay、Google Pay 等
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <TrendingUp className="text-indigo-600 mb-2 mx-auto" size={24} />
                  <div className="font-semibold text-slate-900 mb-1">自动分账</div>
                  <div className="text-sm text-slate-600">
                    V5.0 五方分账模型，自动分配给执行、推荐、推广 Agent
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <Clock className="text-indigo-600 mb-2 mx-auto" size={24} />
                  <div className="font-semibold text-slate-900 mb-1">T+3 结算</div>
                  <div className="text-sm text-slate-600">
                    支付成功后 3 个工作日自动转账到您的银行账户
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <Zap className="text-indigo-600 mb-2 mx-auto" size={24} />
                  <div className="font-semibold text-slate-900 mb-1">低费率</div>
                  <div className="text-sm text-slate-600">
                    Stripe 2.9% + $0.30，平台管理费 0.5-2%
                  </div>
                </div>
              </div>

              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="text-left text-sm text-blue-900">
                  <div className="font-semibold mb-1">入驻需要准备：</div>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>企业或个人身份信息</li>
                    <li>银行账户信息（用于收款）</li>
                    <li>业务描述和网站（可选）</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={handleConnectStripe}
                disabled={connecting}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    <span>连接中...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    <span>连接 Stripe Connect</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* 已连接状态 */
          <>
            {/* 账户状态 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-green-600" size={24} />
                  <h2 className="text-xl font-semibold text-slate-900">账户已连接</h2>
                </div>
                <button
                  onClick={handleDashboard}
                  className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
                >
                  <span>打开 Stripe 仪表板</span>
                  <ExternalLink size={16} />
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-slate-600 mb-1">账户 ID</div>
                  <div className="font-mono text-sm text-slate-900">{account.id}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 mb-1">邮箱</div>
                  <div className="text-sm text-slate-900">{account.email}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600 mb-1">国家</div>
                  <div className="text-sm text-slate-900">{account.country}</div>
                </div>
              </div>

              <div className="mt-4 flex gap-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                  account.chargesEnabled 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {account.chargesEnabled ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                  <span>{account.chargesEnabled ? '可接收支付' : '等待审核'}</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                  account.payoutsEnabled 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {account.payoutsEnabled ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                  <span>{account.payoutsEnabled ? '可接收转账' : '等待审核'}</span>
                </div>
              </div>
            </div>

            {/* 收款统计 */}
            {stats && (
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="text-green-600" size={20} />
                    <div className="text-sm text-slate-600">总收益</div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">
                    ${stats.totalEarnings.toFixed(2)}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="text-orange-600" size={20} />
                    <div className="text-sm text-slate-600">待结算</div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">
                    ${stats.pendingSettlement.toFixed(2)}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Wallet className="text-blue-600" size={20} />
                    <div className="text-sm text-slate-600">上次结算</div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">
                    ${stats.lastSettlement.toFixed(2)}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="text-purple-600" size={20} />
                    <div className="text-sm text-slate-600">结算次数</div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">
                    {stats.settlementCount}
                  </div>
                </div>
              </div>
            )}

            {/* V5.0 分账说明 */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">V5.0 五方分账模型</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="font-medium text-slate-900 mb-2">收益分配</div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex justify-between">
                      <span>商户（您）</span>
                      <span className="font-semibold">净额 - 管理费 - 激励池</span>
                    </li>
                    <li className="flex justify-between">
                      <span>执行 Agent</span>
                      <span className="font-semibold">激励池 × 70%</span>
                    </li>
                    <li className="flex justify-between">
                      <span>推荐 Agent</span>
                      <span className="font-semibold">激励池 × 30%</span>
                    </li>
                    <li className="flex justify-between">
                      <span>推广 Agent</span>
                      <span className="font-semibold">管理费 × 20%</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-slate-900 mb-2">$100 实物商品示例</div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex justify-between">
                      <span>Stripe 通道费</span>
                      <span className="text-slate-500">$3.20</span>
                    </li>
                    <li className="flex justify-between">
                      <span>平台管理费 (0.5%)</span>
                      <span className="text-slate-500">$0.50</span>
                    </li>
                    <li className="flex justify-between">
                      <span>激励池 (2.5%)</span>
                      <span className="text-slate-500">$2.50</span>
                    </li>
                    <li className="flex justify-between border-t border-indigo-200 pt-2">
                      <span className="font-semibold">您最终所得</span>
                      <span className="font-semibold text-green-600">$93.80</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
