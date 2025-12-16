import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { mpcWalletApi, MPCWallet } from '../../../lib/api/mpc-wallet.api'
import { merchantApi } from '../../../lib/api/merchant.api'
import { useUser } from '../../../contexts/UserContext'
import { Wallet, Building2, ArrowRight, Plus, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function MerchantFinance() {
  const [activeTab, setActiveTab] = useState('crypto');
  const { user } = useUser();
  const [mpcWallet, setMpcWallet] = useState<MPCWallet | null>(null);
  const [mpcLoading, setMpcLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'crypto') {
      loadMpcWallet();
    } else if (activeTab === 'withdrawal') {
      loadWithdrawals();
    }
  }, [activeTab]);

  const loadMpcWallet = async () => {
    try {
      setMpcLoading(true);
      const data = await mpcWalletApi.getMyWallet();
      setMpcWallet(data);
    } catch (err: any) {
      // Ignore 404
    } finally {
      setMpcLoading(false);
    }
  };

  const loadWithdrawals = async () => {
    try {
      setWithdrawalsLoading(true);
      const result = await merchantApi.getWithdrawals(10, 0);
      setWithdrawals(result.withdrawals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>资金管理 - 商家后台</title>
      </Head>
      <DashboardLayout userType="merchant">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">资金管理</h1>
          <p className="text-gray-600">统一管理您的数字货币、法币账户及提现</p>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex">
                    <button
                        onClick={() => setActiveTab('crypto')}
                        className={`${activeTab === 'crypto' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center`}
                    >
                        <Wallet className="w-4 h-4 mr-2" />
                        数字货币账户 (MPC)
                    </button>
                    <button
                        onClick={() => setActiveTab('fiat')}
                        className={`${activeTab === 'fiat' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center`}
                    >
                        <Building2 className="w-4 h-4 mr-2" />
                        法币账户 (Off-ramp)
                    </button>
                    <button
                        onClick={() => setActiveTab('withdrawal')}
                        className={`${activeTab === 'withdrawal' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center`}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        提现记录
                    </button>
                </nav>
            </div>
            <div className="p-6">
                {activeTab === 'crypto' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="text-lg font-medium text-blue-900 mb-2">数字货币账户</h3>
                            <p className="text-blue-700 text-sm mb-4">
                                您可以绑定自己的Web3钱包，或者开通Agentrix提供的MPC托管钱包来接收加密货币付款。
                            </p>
                            
                            <div className="grid md:grid-cols-2 gap-6 mt-4">
                                {/* MPC Wallet Card */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-semibold text-gray-900">MPC 托管钱包</h4>
                                            <p className="text-sm text-gray-500 mt-1">安全、无需私钥管理的托管方案</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${mpcWallet ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                            {mpcWallet ? '已开通' : '未开通'}
                                        </span>
                                    </div>
                                    
                                    {mpcWallet ? (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-gray-500">钱包地址</label>
                                                <div className="font-mono text-sm bg-gray-50 p-2 rounded mt-1 break-all">
                                                    {mpcWallet.walletAddress}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center pt-2">
                                                <div className="text-sm">
                                                    <span className="text-gray-500">余额: </span>
                                                    <span className="font-medium">0.00 USDC</span>
                                                </div>
                                                <Link href="/app/merchant/mpc-wallet" className="text-blue-600 text-sm hover:underline flex items-center">
                                                    管理钱包 <ArrowRight className="w-3 h-3 ml-1" />
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-4">
                                            <Link href="/app/merchant/mpc-wallet" className="block w-full py-2 px-4 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors">
                                                立即开通 MPC 钱包
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Connected Wallet Card */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-semibold text-gray-900">自有 Web3 钱包</h4>
                                            <p className="text-sm text-gray-500 mt-1">连接您自己的 MetaMask 或其他钱包</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${user?.walletAddress ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                            {user?.walletAddress ? '已连接' : '未连接'}
                                        </span>
                                    </div>

                                    {user?.walletAddress ? (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-gray-500">已连接地址</label>
                                                <div className="font-mono text-sm bg-gray-50 p-2 rounded mt-1 break-all">
                                                    {user.walletAddress}
                                                </div>
                                            </div>
                                            <div className="pt-2">
                                                <Link href="/app/user/profile" className="text-blue-600 text-sm hover:underline flex items-center">
                                                    管理连接 <ArrowRight className="w-3 h-3 ml-1" />
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-4">
                                            <Link href="/app/user/profile" className="block w-full py-2 px-4 border border-blue-600 text-blue-600 text-center rounded-lg hover:bg-blue-50 transition-colors">
                                                连接钱包
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'fiat' && (
                    <div className="space-y-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">法币收款账户 (Off-ramp)</h3>
                                    <p className="text-gray-500 text-sm mt-1">配置用于接收法币结算的银行账户信息</p>
                                </div>
                                <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    添加账户
                                </button>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-8 text-center">
                                <div className="mx-auto w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                                    <Building2 className="w-6 h-6 text-gray-400" />
                                </div>
                                <h4 className="text-gray-900 font-medium mb-1">暂无收款账户</h4>
                                <p className="text-gray-500 text-sm mb-4">添加银行账户以启用自动法币结算功能</p>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'withdrawal' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">提现记录</h3>
                            <Link href="/app/merchant/withdrawals" className="text-blue-600 text-sm hover:underline">
                                查看全部详情
                            </Link>
                        </div>

                        {withdrawals.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">账户</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {withdrawals.map((w) => (
                                            <tr key={w.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(w.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {w.amount} {w.fromCurrency}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${w.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                                          w.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                                          'bg-gray-100 text-gray-800'}`}>
                                                        {w.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {w.bankAccount}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-lg">
                                <p className="text-gray-500">暂无提现记录</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </DashboardLayout>
    </>
  )
}
