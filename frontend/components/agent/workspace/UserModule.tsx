import { useState, useCallback, useEffect } from 'react'
import { useUser } from '../../../contexts/UserContext'
import { useLocalization } from '../../../contexts/LocalizationContext'
import { useWeb3 } from '../../../contexts/Web3Context'
import { paymentApi } from '../../../lib/api/payment.api'
import { walletApi } from '../../../lib/api/wallet.api'
import { userApi } from '../../../lib/api/user.api'
import { sessionApi, type Session } from '../../../lib/api/session.api'
import { agentAuthorizationApi, type AgentAuthorization } from '../../../lib/api/agent-authorization.api'
import { SessionKeyManager } from '../../../lib/session-key-manager'
import { orderApi, type Order } from '../../../lib/api/order.api'
import { PolicyEngine } from '../PolicyEngine'
import { SessionManager } from '../../payment/SessionManager'
import { AirdropDiscovery } from '../AirdropDiscovery'
import { AutoEarnPanel } from '../AutoEarnPanel'
import { AgentInsightsPanel } from '../AgentInsightsPanel'
import { LoginModal } from '../../auth/LoginModal'
import { useToast } from '../../../contexts/ToastContext'
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  CreditCard, 
  Wallet as WalletIcon, 
  Package, 
  Lock, 
  Globe, 
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Settings,
  Zap,
  Trash2,
  Star,
  ShieldCheck,
  ChevronRight,
  Clock,
  Cpu
} from 'lucide-react'

interface UserModuleProps {
  onCommand?: (command: string, data?: any) => any
  initialTab?: 'payments' | 'wallets' | 'kyc' | 'orders' | 'policies' | 'airdrops' | 'autoEarn' | 'security' | 'profile'
}

/**
 * 用户功能模块
 * 集成支付历史、钱包管理、KYC、订单跟踪等功能
 */
export function UserModule({ onCommand, initialTab }: UserModuleProps) {
  const { t } = useLocalization()
  const { user, updateUser } = useUser()
  const { connectedWallets } = useWeb3()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'payments' | 'wallets' | 'kyc' | 'orders' | 'policies' | 'airdrops' | 'autoEarn' | 'security' | 'profile'>(initialTab || 'payments')

  // 个人资料状态
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileEmail, setProfileEmail] = useState(user?.email || '')
  const [profileNickname, setProfileNickname] = useState(user?.nickname || '')
  const [profileBio, setProfileBio] = useState(user?.bio || '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // 钱包管理状态
  const [showWalletModal, setShowWalletModal] = useState(false)

  // 当 initialTab 改变时更新 activeTab
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  useEffect(() => {
    if (user) {
      setProfileEmail(user.email || '')
      setProfileNickname(user.nickname || '')
      setProfileBio(user.bio || '')
    }
  }, [user])

  const handleSaveProfile = async () => {
    if (!isEditingProfile) {
      setIsEditingProfile(true)
      return
    }

    setIsSavingProfile(true)
    try {
      const updatedUser = await userApi.updateProfile({
        email: profileEmail || undefined,
        nickname: profileNickname || undefined,
        bio: profileBio || undefined,
      })
      
      if (updateUser && updatedUser) {
        // 后端现在直接返回更新后的用户对象
        updateUser(updatedUser as any)
      }
      
      toast.success(t({ zh: '个人资料更新成功', en: 'Profile updated successfully' }))
      setIsEditingProfile(false)
    } catch (err) {
      console.error('Failed to update profile:', err)
      toast.error(t({ zh: '更新失败', en: 'Update failed' }))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleUnbindWallet = async (walletId: string) => {
    if (!confirm(t({ zh: '确定要解绑此钱包吗？', en: 'Are you sure you want to unbind this wallet?' }))) {
      return
    }
    try {
      setLoading(true)
      await walletApi.remove(walletId)
      toast.success(t({ zh: '钱包已解绑', en: 'Wallet unbound' }))
      await loadWallets()
    } catch (error: any) {
      console.error('解绑钱包失败:', error)
      toast.error(error.message || t({ zh: '解绑失败', en: 'Unbind failed' }))
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefaultWallet = async (walletId: string) => {
    try {
      setLoading(true)
      await walletApi.setDefault(walletId)
      toast.success(t({ zh: '已设为默认钱包', en: 'Set as default wallet' }))
      await loadWallets()
    } catch (error: any) {
      console.error('设置默认钱包失败:', error)
      toast.error(error.message || t({ zh: '设置失败', en: 'Set failed' }))
    } finally {
      setLoading(false)
    }
  }

  const [payments, setPayments] = useState<any[]>([])
  const [wallets, setWallets] = useState<any[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [agentAuthorizations, setAgentAuthorizations] = useState<AgentAuthorization[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [showSessionManager, setShowSessionManager] = useState(false)
  const [showCreateAuthModal, setShowCreateAuthModal] = useState(false)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await sessionApi.getSessions()
      setSessions(data || [])
    } catch (error) {
      console.error('加载 Session 失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAgentAuthorizations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await agentAuthorizationApi.getAuthorizations()
      setAgentAuthorizations(data || [])
    } catch (error) {
      console.error('加载 Agent 授权失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm(t({ zh: '确定要撤销此授权吗？', en: 'Are you sure you want to revoke this authorization?' }))) {
      return
    }
    
    try {
      setLoading(true)
      await sessionApi.revokeSession(sessionId)
      await loadSessions()
    } catch (error) {
      console.error('撤销 Session 失败:', error)
      alert(t({ zh: '撤销失败，请稍后重试', en: 'Revocation failed, please try again later' }))
    } finally {
      setLoading(false)
    }
  }

  const loadPayments = useCallback(async () => {
    setLoading(true)
    try {
      // 尝试调用支付历史API
      const payments = await paymentApi.getUserAgentPayments()
      setPayments(
        payments.map((p: any) => ({
          id: p.id || `pay_${Date.now()}`,
          amount: p.amount || 0,
          currency: p.currency || 'CNY',
          status: p.status || 'completed',
          description: p.description || '支付',
          createdAt: p.createdAt || new Date().toISOString(),
        })),
      )
    } catch (error: any) {
      console.error('加载支付历史失败:', error)
      // 如果API失败，使用mock数据作为fallback
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        setPayments([])
      } else {
        setPayments([
          {
            id: 'pay_001',
            amount: 99.00,
            currency: 'CNY',
            status: 'completed',
            description: 'X402协议支付演示',
            createdAt: new Date().toISOString(),
          },
        ])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const loadWallets = useCallback(async () => {
    setLoading(true)
    try {
      const data = await walletApi.list()
      setWallets(data.map(w => ({
        id: w.id,
        type: w.walletType,
        address: w.walletAddress,
        isDefault: w.isDefault,
      })) || [])
    } catch (error) {
      console.error('加载钱包失败:', error)
      // 只有在 API 失败时才回退到本地连接的钱包
      if (connectedWallets && connectedWallets.length > 0) {
        setWallets(connectedWallets.map(w => ({
          id: w.id,
          type: w.type,
          address: w.address,
          balance: w.balance,
          isDefault: false,
        })))
      } else {
        setWallets([])
      }
    } finally {
      setLoading(false)
    }
  }, [connectedWallets])

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await orderApi.getOrders()
      setOrders(data || [])
    } catch (error) {
      console.error('加载订单失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'payments') {
      loadPayments()
    } else if (activeTab === 'wallets') {
      loadWallets()
    } else if (activeTab === 'orders') {
      loadOrders()
    } else if (activeTab === 'security') {
      loadSessions()
      loadAgentAuthorizations()
    }
  }, [activeTab, loadPayments, loadWallets, loadOrders, loadSessions, loadAgentAuthorizations])

  // 处理命令
  useEffect(() => {
    if (onCommand) {
      const handleCommand = (command: string) => {
        const result = onCommand(command)
        if (result?.view === 'user') {
          if (command.includes('支付') || command.includes('payment')) {
            setActiveTab('payments')
          } else if (command.includes('钱包') || command.includes('wallet')) {
            setActiveTab('wallets')
          } else if (command.includes('kyc') || command.includes('认证')) {
            setActiveTab('kyc')
          } else if (command.includes('订单') || command.includes('order')) {
            setActiveTab('orders')
          }
        }
      }
      // 可以在这里监听命令
    }
  }, [onCommand])

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* 标签页 */}
      <div className="border-b border-white/10 bg-slate-900/50 px-6 overflow-x-auto">
        <div className="flex space-x-1 min-w-max">
          {[
            { key: 'payments' as const, label: { zh: '支付历史', en: 'Payment History' } },
            { key: 'wallets' as const, label: { zh: '钱包管理', en: 'Wallet Management' } },
            { key: 'orders' as const, label: { zh: '订单跟踪', en: 'Order Tracking' } },
            { key: 'policies' as const, label: { zh: '策略授权', en: 'Policies' } },
            { key: 'airdrops' as const, label: { zh: '空投发现', en: 'Airdrops' } },
            { key: 'autoEarn' as const, label: { zh: '自动赚钱', en: 'Auto-Earn' } },
            { key: 'security' as const, label: { zh: '安全中心', en: 'Security' } },
            { key: 'kyc' as const, label: { zh: 'KYC认证', en: 'KYC Verification' } },
            { key: 'profile' as const, label: { zh: '个人资料', en: 'Profile' } },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t({ zh: '支付历史', en: 'Payment History' })}</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                {t({ zh: '导出', en: 'Export' })}
              </button>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                {t({ zh: '暂无支付记录', en: 'No payment records' })}
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{payment.description || payment.id}</p>
                        <p className="text-sm text-slate-400">
                          {new Date(payment.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {payment.currency} {payment.amount}
                        </p>
                        <p className={`text-sm ${
                          payment.status === 'completed' ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {payment.status === 'completed' ? t({ zh: '已完成', en: 'Completed' }) : t({ zh: '处理中', en: 'Processing' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'wallets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t({ zh: '钱包管理', en: 'Wallet Management' })}</h3>
              <button 
                onClick={() => setShowWalletModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                {t({ zh: '添加钱包', en: 'Add Wallet' })}
              </button>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : wallets.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                {t({ zh: '暂未绑定钱包', en: 'No wallets connected' })}
              </div>
            ) : (
              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <div key={wallet.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-400">
                          <WalletIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">{wallet.type.toUpperCase()}</p>
                            {wallet.isDefault && (
                              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-[10px] rounded-full uppercase font-bold">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 font-mono">{wallet.address.substring(0, 6)}...{wallet.address.substring(wallet.address.length - 4)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!wallet.isDefault && (
                          <button 
                            onClick={() => handleSetDefaultWallet(wallet.id)}
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-yellow-400 transition-colors"
                            title={t({ zh: '设为默认', en: 'Set as Default' })}
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleUnbindWallet(wallet.id)}
                          className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                          title={t({ zh: '解绑', en: 'Unbind' })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'kyc' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">{t({ zh: 'KYC认证', en: 'KYC Verification' })}</h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="text-center space-y-4">
                <div className="text-4xl mb-4">
                  {user?.kycLevel === 'verified' ? '✅' : '⏳'}
                </div>
                <p className="text-lg font-semibold">
                  {user?.kycLevel === 'verified'
                    ? t({ zh: 'KYC认证已完成', en: 'KYC Verification Completed' })
                    : t({ zh: 'KYC认证未完成', en: 'KYC Verification Not Completed' })}
                </p>
                {user?.kycLevel !== 'verified' && (
                  <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                    {t({ zh: '开始认证', en: 'Start Verification' })}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t({ zh: '订单跟踪', en: 'Order Tracking' })}</h3>
              <button 
                onClick={loadOrders}
                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                {t({ zh: '暂无订单记录', en: 'No order records' })}
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{order.id}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">
                          {order.amount} {order.currency}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          order.status === 'completed' ? 'bg-green-500/20 text-green-400' : 
                          order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t({ zh: '安全中心 & 授权管理', en: 'Security & Authorizations' })}</h3>
              <button 
                onClick={() => {
                  loadSessions()
                  loadAgentAuthorizations()
                }}
                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Agent Authorizations (ERC8004/MPC) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Cpu className="w-5 h-5 text-cyan-400" />
                      <h4 className="font-semibold">{t({ zh: 'Agent 商业授权 (ERC8004/MPC)', en: 'Agent Business Authorizations' })}</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setShowSessionManager(true)}
                        className="px-3 py-1 bg-cyan-500 text-slate-950 text-[10px] font-bold rounded-full hover:bg-cyan-400 transition-colors uppercase tracking-wider"
                      >
                        {t({ zh: '新增授权', en: 'New Auth' })}
                      </button>
                      <span className="text-[10px] px-2 py-1 rounded bg-cyan-500/10 text-cyan-400 font-mono uppercase tracking-wider">Production Ready</span>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-12">
                      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : agentAuthorizations.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 border border-dashed border-white/10 rounded-xl">
                      <div className="mb-4 flex justify-center">
                        <Shield className="w-12 h-12 opacity-20" />
                      </div>
                      <p>{t({ zh: '暂无活跃的 Agent 商业授权', en: 'No active Agent business authorizations' })}</p>
                      <p className="text-xs mt-2 opacity-50">{t({ zh: '在 Agent 工作台中与 Agent 交互即可开启授权', en: 'Interact with Agents in the workspace to start authorization' })}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {agentAuthorizations.map((auth) => (
                        <div key={auth.id} className="bg-slate-900/50 border border-white/5 rounded-xl p-5 hover:border-cyan-500/30 transition-all group">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                                <Cpu size={20} />
                              </div>
                              <div>
                                <h5 className="font-bold text-sm">{auth.agentName || 'Unknown Agent'}</h5>
                                <p className="text-[10px] text-slate-500 font-mono">{auth.agentId.substring(0, 12)}...</p>
                              </div>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              auth.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                            }`}>
                              {auth.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          <div className="space-y-3 mb-4">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">{t({ zh: '授权类型', en: 'Auth Type' })}</span>
                              <span className="text-slate-300 font-mono uppercase">{auth.authorizationType}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">{t({ zh: '单次限额', en: 'Single Limit' })}</span>
                              <span className="text-slate-300">{auth.singleLimit || '∞'} USDC</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">{t({ zh: '每日限额', en: 'Daily Limit' })}</span>
                              <span className="text-slate-300">{auth.dailyLimit || '∞'} USDC</span>
                            </div>
                            <div className="pt-2">
                              <div className="flex justify-between text-[10px] mb-1">
                                <span className="text-slate-500">{t({ zh: '今日已用', en: 'Used Today' })}</span>
                                <span className="text-slate-400">{auth.usedToday} / {auth.dailyLimit || '∞'} USDC</span>
                              </div>
                              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-cyan-500" 
                                  style={{ width: `${auth.dailyLimit ? (auth.usedToday / auth.dailyLimit) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              onClick={async () => {
                                if (confirm(t({ zh: '确定要撤销此 Agent 的所有授权吗？', en: 'Are you sure you want to revoke all authorizations for this Agent?' }))) {
                                  try {
                                    await agentAuthorizationApi.revokeAuthorization(auth.id)
                                    toast.success(t({ zh: '授权已撤销', en: 'Authorization revoked' }))
                                    loadAgentAuthorizations()
                                  } catch (err) {
                                    toast.error(t({ zh: '撤销失败', en: 'Revocation failed' }))
                                  }
                                }
                              }}
                              className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold rounded-lg transition-colors"
                            >
                              {t({ zh: '撤销授权', en: 'Revoke' })}
                            </button>
                            <button className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg transition-colors">
                              <Settings className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* QuickPay Sessions (Legacy/Simple) */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      <h4 className="font-semibold">{t({ zh: 'QuickPay 会话 (Legacy)', en: 'QuickPay Sessions (Legacy)' })}</h4>
                    </div>
                    <button 
                      onClick={() => setShowSessionManager(true)}
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      {t({ zh: '管理', en: 'Manage' })}
                    </button>
                  </div>
                  
                  {sessions.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 border border-dashed border-white/10 rounded-lg text-xs">
                      {t({ zh: '暂无活跃会话', en: 'No active sessions' })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs font-mono text-slate-300">{session.sessionId.substring(0, 12)}...</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-slate-500">{session.dailyLimit} USDC / Day</span>
                            <button 
                              onClick={() => handleRevokeSession(session.sessionId)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Account Security Sidebar */}
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Lock className="w-5 h-5 text-purple-400" />
                    <h4 className="font-semibold">{t({ zh: '账户安全', en: 'Account Security' })}</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">{t({ zh: '邮箱验证', en: 'Email' })}</p>
                          <p className="text-[10px] text-slate-500">{user?.email || 'Not bound'}</p>
                        </div>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-400">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">{t({ zh: '双重认证 (2FA)', en: '2FA' })}</p>
                          <p className="text-[10px] text-slate-500">{t({ zh: '未启用', en: 'Disabled' })}</p>
                        </div>
                      </div>
                      <button className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider">{t({ zh: '启用', en: 'Enable' })}</button>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-6">
                  <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    {t({ zh: '安全建议', en: 'Security Tips' })}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t({ 
                      zh: '建议为高频交易 Agent 设置合理的每日限额，并定期检查授权列表。Agentrix 永远不会要求您提供私钥。', 
                      en: 'Set reasonable daily limits for high-frequency Agents and check authorizations regularly. Agentrix never asks for your private keys.' 
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <AgentInsightsPanel />
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{t({ zh: '个人资料', en: 'Profile' })}</h3>
              <button 
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSavingProfile ? t({ zh: '保存中...', en: 'Saving...' }) : isEditingProfile ? t({ zh: '保存修改', en: 'Save Changes' }) : t({ zh: '编辑资料', en: 'Edit Profile' })}
              </button>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-400">
                  <UserIcon className="w-10 h-10" />
                </div>
                <div className="flex-1">
                  {isEditingProfile ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 uppercase font-bold">{t({ zh: '昵称', en: 'Nickname' })}</label>
                        <input 
                          type="text"
                          value={profileNickname}
                          onChange={(e) => setProfileNickname(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 uppercase font-bold">{t({ zh: '邮箱', en: 'Email' })}</label>
                        <input 
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className="text-xl font-bold text-white">{user?.nickname || user?.agentrixId}</h4>
                      <p className="text-slate-400 text-sm">{user?.email}</p>
                    </>
                  )}
                </div>
              </div>

              {isEditingProfile && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase font-bold">{t({ zh: '个人简介', en: 'Bio' })}</label>
                  <textarea 
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder={t({ zh: '介绍一下你自己...', en: 'Tell us about yourself...' })}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{t({ zh: '用户 ID', en: 'User ID' })}</p>
                  <p className="text-white font-mono text-sm">{user?.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{t({ zh: 'Agentrix ID', en: 'Agentrix ID' })}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-mono text-sm">{user?.agentrixId}</p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(user?.agentrixId || '')
                        toast.success(t({ zh: '已复制', en: 'Copied' }))
                      }}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{t({ zh: '注册时间', en: 'Joined' })}</p>
                  <p className="text-white text-sm">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{t({ zh: '角色', en: 'Roles' })}</p>
                  <div className="flex gap-2">
                    {user?.roles?.map((role: string) => (
                      <span key={role} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded-full uppercase font-bold">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {isEditingProfile && (
                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    {t({ zh: '取消', en: 'Cancel' })}
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {t({ zh: '保存', en: 'Save' })}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'policies' && (
          <div className="h-full">
            <PolicyEngine />
          </div>
        )}

        {activeTab === 'airdrops' && (
          <div className="h-full">
            <AirdropDiscovery />
          </div>
        )}

        {activeTab === 'autoEarn' && (
          <div className="h-full">
            <AutoEarnPanel />
          </div>
        )}
      </div>

      {showSessionManager && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <SessionManager onClose={() => {
              setShowSessionManager(false)
              loadSessions()
            }} />
          </div>
        </div>
      )}
      {showWalletModal && (
        <LoginModal
          onClose={() => setShowWalletModal(false)}
          onWalletSuccess={async () => {
            setShowWalletModal(false)
            await loadWallets()
          }}
        />
      )}
    </div>
  )
}

