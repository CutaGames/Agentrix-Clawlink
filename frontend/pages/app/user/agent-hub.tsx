'use client';

import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useToast } from '../../../contexts/ToastContext';
import { useLocalization } from '../../../contexts/LocalizationContext';
import { useWeb3 } from '../../../contexts/Web3Context';
import { agentAuthorizationApi, AgentAuthorization } from '../../../lib/api/agent-authorization.api';
import {
  Zap,
  Gift,
  TrendingUp,
  Wallet,
  Shield,
  ChevronRight,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Settings,
  Play,
  Pause,
  DollarSign,
  Target,
  Rocket,
  BarChart3,
  Lock,
  Unlock,
  Send,
  Plus,
  Eye,
  EyeOff,
  Key,
  Trash2,
} from 'lucide-react';

// 模拟数据类型
interface Airdrop {
  id: string;
  name: string;
  project: string;
  estimatedValue: number;
  status: 'eligible' | 'claimed' | 'expired' | 'pending';
  expiresAt?: Date;
  claimUrl?: string;
}

interface Strategy {
  id: string;
  name: string;
  type: 'dca' | 'grid' | 'arbitrage' | 'launchpad';
  status: 'active' | 'paused' | 'stopped';
  profit: number;
  profitPercent: number;
  invested: number;
}

interface MPCWallet {
  id: string;
  name: string;
  address: string;
  network: string;
  balance: number;
  isLocked: boolean;
}

interface EarningsStats {
  totalEarnings: number;
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
}

export default function AgentHubPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useLocalization();
  const { isConnected, defaultWallet } = useWeb3();

  const [activeTab, setActiveTab] = useState<'overview' | 'authorizations' | 'airdrops' | 'autoearn' | 'wallet'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // 数据状态
  const [airdrops, setAirdrops] = useState<Airdrop[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [wallets, setWallets] = useState<MPCWallet[]>([]);
  const [earningsStats, setEarningsStats] = useState<EarningsStats | null>(null);
  const [showBalances, setShowBalances] = useState(true);
  
  // Agent授权数据
  const [authorizations, setAuthorizations] = useState<AgentAuthorization[]>([]);
  const [authLoading, setAuthLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 模拟API调用，实际应该从后端获取
      // 这里使用模拟数据展示功能
      
      // 模拟空投数据
      setAirdrops([
        {
          id: '1',
          name: 'LayerZero Airdrop',
          project: 'LayerZero',
          estimatedValue: 2500,
          status: 'eligible',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          id: '2',
          name: 'Scroll Genesis',
          project: 'Scroll',
          estimatedValue: 1200,
          status: 'pending',
        },
        {
          id: '3',
          name: 'zkSync Rewards',
          project: 'zkSync',
          estimatedValue: 800,
          status: 'claimed',
        },
      ]);

      // 模拟策略数据
      setStrategies([
        {
          id: '1',
          name: 'BTC DCA Strategy',
          type: 'dca',
          status: 'active',
          profit: 156.78,
          profitPercent: 5.2,
          invested: 3000,
        },
        {
          id: '2',
          name: 'ETH-USDT Grid',
          type: 'grid',
          status: 'active',
          profit: 89.45,
          profitPercent: 3.8,
          invested: 2500,
        },
        {
          id: '3',
          name: 'DEX Arbitrage',
          type: 'arbitrage',
          status: 'paused',
          profit: 234.12,
          profitPercent: 8.1,
          invested: 5000,
        },
      ]);

      // 模拟钱包数据
      setWallets([
        {
          id: '1',
          name: 'Main Wallet',
          address: defaultWallet?.address || '0x1234...5678',
          network: 'BSC Testnet',
          balance: 1250.50,
          isLocked: false,
        },
      ]);

      // 模拟收益统计
      setEarningsStats({
        totalEarnings: 3280.35,
        todayEarnings: 45.67,
        weekEarnings: 312.89,
        monthEarnings: 1456.23,
      });

    } catch (error: any) {
      console.error('加载数据失败:', error);
      showToast?.('error', '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [defaultWallet, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // 加载Agent授权数据
  const loadAuthorizations = useCallback(async () => {
    try {
      setAuthLoading(true);
      const data = await agentAuthorizationApi.getAuthorizations();
      setAuthorizations(data);
    } catch (error: any) {
      console.error('加载授权列表失败:', error);
      // 不显示错误提示，因为用户可能没有授权
    } finally {
      setAuthLoading(false);
    }
  }, []);
  
  useEffect(() => {
    if (activeTab === 'authorizations' || activeTab === 'overview') {
      loadAuthorizations();
    }
  }, [activeTab, loadAuthorizations]);
  
  // 撤销授权
  const handleRevokeAuth = async (id: string) => {
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
      showToast?.('error', error?.message || '撤销授权失败');
    } finally {
      setRevokingId(null);
    }
  };
  
  // 获取授权状态
  const getAuthStatus = (auth: AgentAuthorization): 'active' | 'expired' | 'revoked' => {
    if (!auth.isActive) return 'revoked';
    if (auth.expiry && new Date(auth.expiry) < new Date()) return 'expired';
    return 'active';
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    showToast?.('success', '数据已刷新');
  };

  const handleClaimAirdrop = async (airdropId: string) => {
    try {
      showToast?.('info', '正在领取空投...');
      // 模拟领取
      await new Promise(resolve => setTimeout(resolve, 2000));
      setAirdrops(prev => prev.map(a => 
        a.id === airdropId ? { ...a, status: 'claimed' as const } : a
      ));
      showToast?.('success', '空投领取成功！');
    } catch (error) {
      showToast?.('error', '领取失败，请重试');
    }
  };

  const handleToggleStrategy = async (strategyId: string) => {
    setStrategies(prev => prev.map(s => 
      s.id === strategyId 
        ? { ...s, status: s.status === 'active' ? 'paused' as const : 'active' as const }
        : s
    ));
    showToast?.('success', '策略状态已更新');
  };

  const handleCreateWallet = () => {
    showToast?.('info', 'MPC钱包创建功能即将上线');
  };

  // 概览标签页
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* 收益统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="总收益"
          value={showBalances ? `$${earningsStats?.totalEarnings.toLocaleString() || '0'}` : '****'}
          icon={<DollarSign className="text-green-600" />}
          trend="+12.5%"
          trendUp
        />
        <StatCard
          title="今日收益"
          value={showBalances ? `$${earningsStats?.todayEarnings.toFixed(2) || '0'}` : '****'}
          icon={<TrendingUp className="text-blue-600" />}
          trend="+3.2%"
          trendUp
        />
        <StatCard
          title="活跃策略"
          value={strategies.filter(s => s.status === 'active').length.toString()}
          icon={<Target className="text-purple-600" />}
        />
        <StatCard
          title="可领空投"
          value={airdrops.filter(a => a.status === 'eligible').length.toString()}
          icon={<Gift className="text-orange-600" />}
        />
      </div>

      {/* 快捷操作 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-4">快捷操作</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction
            icon={<Shield size={24} />}
            title="授权管理"
            description="Agent权限设置"
            onClick={() => setActiveTab('authorizations')}
            color="green"
          />
          <QuickAction
            icon={<Gift size={24} />}
            title="扫描空投"
            description="发现新空投机会"
            onClick={() => setActiveTab('airdrops')}
            color="orange"
          />
          <QuickAction
            icon={<Rocket size={24} />}
            title="创建策略"
            description="启动自动收益"
            onClick={() => setActiveTab('autoearn')}
            color="purple"
          />
          <QuickAction
            icon={<Wallet size={24} />}
            title="MPC钱包"
            description="安全资产管理"
            onClick={() => setActiveTab('wallet')}
            color="blue"
          />
        </div>
      </div>

      {/* 最近活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent授权预览 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Agent授权</h3>
            <button 
              onClick={() => setActiveTab('authorizations')}
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              管理授权 <ChevronRight size={16} />
            </button>
          </div>
          <div className="space-y-3">
            {authLoading ? (
              <div className="text-center py-6">
                <Loader2 className="animate-spin text-slate-400 mx-auto" size={24} />
              </div>
            ) : authorizations.filter(a => getAuthStatus(a) === 'active').length > 0 ? (
              authorizations.filter(a => getAuthStatus(a) === 'active').slice(0, 3).map(auth => (
                <div key={auth.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Key className="text-green-600" size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{auth.agentName || 'Agent'}</div>
                      <div className="text-xs text-slate-500">
                        限额: ${auth.singleLimit?.toFixed(2) || '不限'} / 日限: ${auth.dailyLimit?.toFixed(2) || '不限'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">活跃</span>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <Shield className="text-slate-300 mx-auto mb-2" size={32} />
                <p className="text-slate-500 text-sm">暂无活跃授权</p>
                <Link
                  href="/app/user/agent-authorizations/create"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <Plus size={14} /> 创建授权
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 策略预览 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">活跃策略</h3>
            <button 
              onClick={() => setActiveTab('autoearn')}
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              查看全部 <ChevronRight size={16} />
            </button>
          </div>
          <div className="space-y-3">
            {strategies.filter(s => s.status === 'active').slice(0, 3).map(strategy => (
              <div key={strategy.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    strategy.type === 'dca' ? 'bg-blue-100' :
                    strategy.type === 'grid' ? 'bg-purple-100' :
                    strategy.type === 'arbitrage' ? 'bg-green-100' : 'bg-orange-100'
                  }`}>
                    {strategy.type === 'dca' && <TrendingUp className="text-blue-600" size={20} />}
                    {strategy.type === 'grid' && <BarChart3 className="text-purple-600" size={20} />}
                    {strategy.type === 'arbitrage' && <Zap className="text-green-600" size={20} />}
                    {strategy.type === 'launchpad' && <Rocket className="text-orange-600" size={20} />}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{strategy.name}</div>
                    <div className="text-xs text-green-600">+{strategy.profitPercent}% (${strategy.profit})</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">运行中</span>
                </div>
              </div>
            ))}
            <div className="text-center py-2">
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                ⚠️ 自动收益功能正在开发中，敬请期待
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Agent授权管理标签页
  const AuthorizationsTab = () => {
    const statusBadge = {
      active: 'text-green-600 bg-green-50',
      expired: 'text-gray-600 bg-gray-100',
      revoked: 'text-red-600 bg-red-50',
    };
    
    const statusLabels = {
      active: '活跃',
      expired: '已过期',
      revoked: '已撤销',
    };
    
    const typeLabels: Record<string, string> = {
      erc8004: 'ERC8004 Session',
      mpc: 'MPC钱包',
      api_key: 'API Key',
    };
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Agent授权管理</h2>
            <p className="text-sm text-slate-500">管理您的Agent授权，设置限额和策略权限</p>
          </div>
          <Link
            href="/app/user/agent-authorizations/create"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
          >
            <Plus size={16} />
            创建新授权
          </Link>
        </div>
        
        {/* 授权统计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="text-2xl font-bold text-green-600">
              {authorizations.filter(a => getAuthStatus(a) === 'active').length}
            </div>
            <div className="text-sm text-green-700">活跃授权</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="text-2xl font-bold text-slate-600">
              {authorizations.filter(a => getAuthStatus(a) === 'expired').length}
            </div>
            <div className="text-sm text-slate-700">已过期</div>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <div className="text-2xl font-bold text-red-600">
              {authorizations.filter(a => getAuthStatus(a) === 'revoked').length}
            </div>
            <div className="text-sm text-red-700">已撤销</div>
          </div>
        </div>
        
        {/* 授权列表 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {authLoading ? (
            <div className="text-center py-12">
              <Loader2 className="animate-spin text-indigo-600 mx-auto" size={32} />
            </div>
          ) : authorizations.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="text-slate-300 mx-auto mb-4" size={48} />
              <p className="text-slate-500 mb-4">暂无Agent授权</p>
              <Link
                href="/app/user/agent-authorizations/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus size={16} /> 创建第一个授权
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {authorizations.map(auth => {
                const status = getAuthStatus(auth);
                return (
                  <div key={auth.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          status === 'active' ? 'bg-green-100' : 'bg-slate-100'
                        }`}>
                          <Key className={status === 'active' ? 'text-green-600' : 'text-slate-400'} size={24} />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{auth.agentName || 'Agent'}</div>
                          <div className="text-xs text-slate-500">
                            {typeLabels[auth.type] || auth.type} • 创建于 {new Date(auth.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusBadge[status]}`}>
                          {statusLabels[status]}
                        </span>
                        {status === 'active' && (
                          <button
                            onClick={() => handleRevokeAuth(auth.id)}
                            disabled={revokingId === auth.id}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                          >
                            {revokingId === auth.id ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-4 text-sm">
                      <div className="text-slate-500">
                        单笔限额: <span className="text-slate-700">${auth.singleLimit?.toFixed(2) || '不限'}</span>
                      </div>
                      <div className="text-slate-500">
                        每日限额: <span className="text-slate-700">${auth.dailyLimit?.toFixed(2) || '不限'}</span>
                      </div>
                      {auth.expiry && (
                        <div className="text-slate-500">
                          过期时间: <span className="text-slate-700">{new Date(auth.expiry).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 空投标签页
  const AirdropsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">空投发现</h2>
          <p className="text-sm text-slate-500">自动扫描并领取符合条件的空投</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          扫描空投
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
          <div className="text-2xl font-bold text-orange-600">{airdrops.filter(a => a.status === 'eligible').length}</div>
          <div className="text-sm text-orange-700">可领取</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <div className="text-2xl font-bold text-green-600">{airdrops.filter(a => a.status === 'claimed').length}</div>
          <div className="text-sm text-green-700">已领取</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="text-2xl font-bold text-blue-600">
            ${airdrops.filter(a => a.status === 'eligible').reduce((sum, a) => sum + a.estimatedValue, 0).toLocaleString()}
          </div>
          <div className="text-sm text-blue-700">预估总价值</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">空投列表</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {airdrops.map(airdrop => (
            <div key={airdrop.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  airdrop.status === 'eligible' ? 'bg-orange-100' :
                  airdrop.status === 'claimed' ? 'bg-green-100' :
                  airdrop.status === 'pending' ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  <Gift size={24} className={
                    airdrop.status === 'eligible' ? 'text-orange-600' :
                    airdrop.status === 'claimed' ? 'text-green-600' :
                    airdrop.status === 'pending' ? 'text-blue-600' : 'text-slate-400'
                  } />
                </div>
                <div>
                  <div className="font-medium text-slate-900">{airdrop.name}</div>
                  <div className="text-sm text-slate-500">{airdrop.project}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold text-slate-900">${airdrop.estimatedValue.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">预估价值</div>
                </div>
                {airdrop.status === 'eligible' && (
                  <button
                    onClick={() => handleClaimAirdrop(airdrop.id)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} /> 领取
                  </button>
                )}
                {airdrop.status === 'claimed' && (
                  <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl">已领取</span>
                )}
                {airdrop.status === 'pending' && (
                  <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl">处理中</span>
                )}
                {airdrop.status === 'expired' && (
                  <span className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl">已过期</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 开发中提示 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-amber-700">
          <AlertTriangle size={20} />
          <span className="font-medium">功能开发中</span>
        </div>
        <p className="text-sm text-amber-600 mt-1">
          空投自动发现与领取功能正在开发中，当前展示为示例数据。敬请期待！
        </p>
      </div>
    </div>
  );

  // AutoEarn标签页
  const AutoEarnTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">自动收益</h2>
          <p className="text-sm text-slate-500">管理您的自动化收益策略</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
          onClick={() => showToast?.('info', '创建策略功能即将上线')}
        >
          <Plus size={16} /> 创建策略
        </button>
      </div>
      
      {/* 开发中提示 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-amber-700">
          <AlertTriangle size={20} />
          <span className="font-medium">功能开发中</span>
        </div>
        <p className="text-sm text-amber-600 mt-1">
          自动收益策略功能正在开发中，当前展示为示例数据。敬请期待！
        </p>
      </div>

      {/* 收益概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="text-sm opacity-80">总收益</div>
          <div className="text-2xl font-bold">${earningsStats?.totalEarnings.toLocaleString() || '0'}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-sm text-slate-500">今日收益</div>
          <div className="text-2xl font-bold text-slate-900">${earningsStats?.todayEarnings.toFixed(2) || '0'}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-sm text-slate-500">本周收益</div>
          <div className="text-2xl font-bold text-slate-900">${earningsStats?.weekEarnings.toFixed(2) || '0'}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-sm text-slate-500">本月收益</div>
          <div className="text-2xl font-bold text-slate-900">${earningsStats?.monthEarnings.toFixed(2) || '0'}</div>
        </div>
      </div>

      {/* 策略类型 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StrategyTypeCard
          icon={<TrendingUp size={24} />}
          title="DCA定投"
          description="定期定额投资"
          color="blue"
          count={strategies.filter(s => s.type === 'dca').length}
        />
        <StrategyTypeCard
          icon={<BarChart3 size={24} />}
          title="网格交易"
          description="自动低买高卖"
          color="purple"
          count={strategies.filter(s => s.type === 'grid').length}
        />
        <StrategyTypeCard
          icon={<Zap size={24} />}
          title="套利策略"
          description="跨平台价差套利"
          color="green"
          count={strategies.filter(s => s.type === 'arbitrage').length}
        />
        <StrategyTypeCard
          icon={<Rocket size={24} />}
          title="Launchpad"
          description="新项目投资"
          color="orange"
          count={strategies.filter(s => s.type === 'launchpad').length}
        />
      </div>

      {/* 策略列表 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">我的策略</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {strategies.map(strategy => (
            <div key={strategy.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  strategy.type === 'dca' ? 'bg-blue-100' :
                  strategy.type === 'grid' ? 'bg-purple-100' :
                  strategy.type === 'arbitrage' ? 'bg-green-100' : 'bg-orange-100'
                }`}>
                  {strategy.type === 'dca' && <TrendingUp className="text-blue-600" size={24} />}
                  {strategy.type === 'grid' && <BarChart3 className="text-purple-600" size={24} />}
                  {strategy.type === 'arbitrage' && <Zap className="text-green-600" size={24} />}
                  {strategy.type === 'launchpad' && <Rocket className="text-orange-600" size={24} />}
                </div>
                <div>
                  <div className="font-medium text-slate-900">{strategy.name}</div>
                  <div className="text-sm text-slate-500">投入: ${strategy.invested.toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`font-bold ${strategy.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {strategy.profit >= 0 ? '+' : ''}{strategy.profitPercent}%
                  </div>
                  <div className="text-xs text-slate-500">${strategy.profit.toFixed(2)}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  strategy.status === 'active' ? 'bg-green-100 text-green-700' :
                  strategy.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {strategy.status === 'active' ? '运行中' : strategy.status === 'paused' ? '已暂停' : '已停止'}
                </span>
                <button
                  onClick={() => handleToggleStrategy(strategy.id)}
                  className={`p-2 rounded-lg ${
                    strategy.status === 'active' 
                      ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }`}
                >
                  {strategy.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // MPC钱包标签页
  const WalletTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">MPC钱包</h2>
          <p className="text-sm text-slate-500">安全的多方计算钱包，无需担心私钥丢失</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBalances(!showBalances)}
            className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            {showBalances ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
          <button
            onClick={handleCreateWallet}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
          >
            <Plus size={16} /> 创建钱包
          </button>
        </div>
      </div>

      {/* 钱包安全提示 */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Shield size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">MPC钱包安全保护</h3>
            <p className="text-sm text-white/80 mb-3">
              您的私钥被安全地分割存储在多个地点，即使单点泄露也不会导致资产损失。支持社交恢复和紧急锁定。
            </p>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30">
                了解更多
              </button>
              <button className="px-4 py-2 bg-white text-indigo-600 rounded-lg text-sm hover:bg-white/90 font-medium">
                导出恢复密钥
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 钱包列表 */}
      <div className="space-y-4">
        {wallets.map(wallet => (
          <div key={wallet.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Wallet className="text-indigo-600" size={24} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{wallet.name}</div>
                    <div className="text-sm text-slate-500 font-mono">
                      {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                    {wallet.network}
                  </span>
                  {wallet.isLocked ? (
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
                      <Lock size={12} /> 已锁定
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                      <Unlock size={12} /> 正常
                    </span>
                  )}
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <div className="text-sm text-slate-500 mb-1">总余额</div>
                <div className="text-3xl font-bold text-slate-900">
                  {showBalances ? `$${wallet.balance.toLocaleString()}` : '******'}
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
                  <Send size={16} /> 发送
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200">
                  <Plus size={16} /> 接收
                </button>
                <button className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200">
                  <Settings size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {wallets.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">暂无MPC钱包</h3>
            <p className="text-sm text-slate-500 mb-4">创建您的第一个MPC钱包，享受更安全的资产管理</p>
            <button
              onClick={handleCreateWallet}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
            >
              立即创建
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout userType="user">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>Agent Hub - 一体化管理 | Agentrix</title>
      </Head>

      <div className="space-y-6">
        {/* 页面头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agent Hub</h1>
            <p className="text-slate-500">一站式管理您的Agent授权、空投、自动收益和MPC钱包</p>
          </div>
          <button
            onClick={() => setShowBalances(!showBalances)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-slate-700 hover:bg-slate-200"
          >
            {showBalances ? <Eye size={16} /> : <EyeOff size={16} />}
            {showBalances ? '隐藏余额' : '显示余额'}
          </button>
        </div>

        {/* 标签导航 */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {[
            { id: 'overview', label: '概览', icon: <BarChart3 size={16} /> },
            { id: 'authorizations', label: '授权管理', icon: <Shield size={16} /> },
            { id: 'airdrops', label: '空投', icon: <Gift size={16} /> },
            { id: 'autoearn', label: '自动收益', icon: <TrendingUp size={16} /> },
            { id: 'wallet', label: 'MPC钱包', icon: <Wallet size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'authorizations' && <AuthorizationsTab />}
        {activeTab === 'airdrops' && <AirdropsTab />}
        {activeTab === 'autoearn' && <AutoEarnTab />}
        {activeTab === 'wallet' && <WalletTab />}
      </div>
    </DashboardLayout>
  );
}

// 统计卡片组件
function StatCard({ title, value, icon, trend, trendUp }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
        {trend && (
          <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500">{title}</div>
    </div>
  );
}

// 快捷操作组件
function QuickAction({ icon, title, description, onClick, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: 'orange' | 'purple' | 'blue' | 'green';
}) {
  const colorClasses = {
    orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 hover:bg-green-100',
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl text-left transition-colors ${colorClasses[color]}`}
    >
      <div className="mb-2">{icon}</div>
      <div className="font-medium text-slate-900">{title}</div>
      <div className="text-xs text-slate-500">{description}</div>
    </button>
  );
}

// 策略类型卡片
function StrategyTypeCard({ icon, title, description, color, count }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'blue' | 'purple' | 'green' | 'orange';
  count: number;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-100',
    purple: 'bg-purple-50 border-purple-100',
    green: 'bg-green-50 border-green-100',
    orange: 'bg-orange-50 border-orange-100',
  };
  const iconColors = {
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <div className={`mb-2 ${iconColors[color]}`}>{icon}</div>
      <div className="font-medium text-slate-900">{title}</div>
      <div className="text-xs text-slate-500 mb-2">{description}</div>
      <div className="text-lg font-bold text-slate-900">{count} 个策略</div>
    </div>
  );
}
