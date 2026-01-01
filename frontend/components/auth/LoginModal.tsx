import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useWeb3 } from '../../contexts/Web3Context'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import { useLocalization } from '../../contexts/LocalizationContext'
import type { WalletType, WalletInfo } from '../../lib/wallet/WalletService'
import { authApi } from '../../lib/api/auth.api'
import { apiClient, API_BASE_URL } from '../../lib/api/client'
import type { UserRole } from '../../types/user'
import { walletApi } from '../../lib/api/wallet.api'
import { X, Wallet, Mail, Globe, Shield, ChevronRight, LogIn, UserPlus, RefreshCw, AlertCircle } from 'lucide-react'

interface LoginModalProps {
  onClose: () => void
  onWalletSuccess?: () => void
  /** 管理员模式：使用 /admin/auth/login 并在登录后跳转到 /admin（或 redirect 参数） */
  adminMode?: boolean
  /** 登录成功后重定向目标，优先于默认路径 */
  redirectTo?: string
}

export function LoginModal({ onClose, onWalletSuccess, adminMode, redirectTo }: LoginModalProps) {
  const { isConnected, address, connect, connectors, defaultWallet, signMessage } = useWeb3()
  const { login, isAuthenticated } = useUser()
  const router = useRouter()
  const toast = useToast()
  const { t } = useLocalization()

  const handleWalletConnect = async (walletType: WalletType) => {
    try {
      console.log('开始连接钱包:', walletType)

      // 如果在登录页面，且当前有 token，说明可能是过期的，先清除以确保执行登录流程而不是绑定流程
      const isAuthPage = typeof window !== 'undefined' && 
        (window.location.pathname.includes('/auth') || window.location.pathname.includes('/login'));
      if (isAuthPage) {
        console.log('登录页面检测到现有 Token，正在清除以确保全新登录...')
        apiClient.clearToken();
      }

      const walletInfo = await connect(walletType)
      console.log('钱包连接成功，开始登录:', walletInfo)
      // 立即开始登录流程，不等待状态更新
      await completeWalletLogin(walletInfo)
    } catch (error: any) {
      console.error('钱包连接失败:', error)
      toast.error(error.message || '钱包连接失败，请重试')
      throw error
    }
  }

  const completeWalletLogin = async (walletInfo: WalletInfo) => {
    if (!walletInfo.address) {
      throw new Error('未能获取钱包地址，请重试')
    }

    console.log('开始签名登录，钱包信息:', walletInfo)
    const loginMessage = `Agentrix 登录验证\n地址: ${walletInfo.address}\n时间: ${new Date().toISOString()}`
    
    try {
      // 使用 Web3Context 中的 signMessage（它会委托给 walletService）
      // 显式传入 walletInfo，避免依赖尚未更新的 defaultWallet 状态
      const signature = await signMessage!(loginMessage, walletInfo)
      console.log('签名成功，开始登录验证')

      // 检查是否在登录/注册页面，如果是，则优先执行登录而不是绑定
      const isAuthPage = typeof window !== 'undefined' && 
        (window.location.pathname.includes('/auth') || window.location.pathname.includes('/login'));

      if (isAuthenticated && !isAuthPage) {
        try {
          await walletApi.bind({
            walletAddress: walletInfo.address,
            walletType: walletInfo.type,
            chain: walletInfo.chain,
            chainId: walletInfo.chainId ? String(walletInfo.chainId) : undefined,
            message: loginMessage,
            signature,
          })
          toast.success('钱包绑定成功')
          onClose()
          onWalletSuccess?.()
          return
        } catch (bindError: any) {
          console.error('钱包绑定失败:', bindError)
          
          // 如果是 401 错误，说明当前登录状态已失效，尝试直接登录
          const isUnauthorized = 
            bindError.status === 401 || 
            bindError.message?.includes('401') || 
            bindError.message?.includes('未授权') ||
            bindError.message?.includes('Unauthorized');

          if (isUnauthorized) {
            console.log('检测到 401 错误，登录状态可能已失效，尝试直接登录...')
            // 继续执行下面的 walletLogin 流程，不返回
          } else {
            // 如果钱包已经绑定到当前用户，也视为成功
            if (bindError.message?.includes('已绑定') || bindError.message?.includes('already bound')) {
              toast.success('钱包已绑定')
              onClose()
              onWalletSuccess?.()
              return
            }
            // 如果钱包已绑定到其他账号，显示错误
            if (bindError.message?.includes('其他账号') || bindError.message?.includes('other account')) {
              throw new Error('该钱包已绑定其他账号，请使用其他钱包')
            }
            throw bindError
          }
        }
      }

      console.log('执行钱包登录流程...')
      const authResponse = await authApi.walletLogin({
        walletAddress: walletInfo.address,
        walletType: walletInfo.type,
        chain: walletInfo.chain,
        chainId: walletInfo.chainId ? String(walletInfo.chainId) : undefined,
        message: loginMessage,
        signature,
      })

      console.log('登录验证成功:', authResponse)

      if (!authResponse || !(authResponse as any).user) {
        throw new Error('登录返回数据格式错误')
      }
      const _user = (authResponse as any).user
      const roles = (_user.roles || []) as UserRole[]

      login({
        id: _user.id,
        agentrixId: _user.agentrixId,
        email: _user.email || undefined,
        walletAddress: walletInfo.address,
        roles,
        role: roles[0] || 'user',
        createdAt: new Date().toISOString(),
      })
      toast.success('钱包登录成功！')
      // 立即关闭模态框并跳转
        onClose()
        onWalletSuccess?.()
      // 使用replace而不是push，避免用户返回登录页
      const _target = redirectTo || (adminMode ? '/admin' : '/app/user')
      router.replace(_target)
    } catch (signError: any) {
      console.error('签名或登录失败:', signError)
      throw signError
    }
  }

  const handleLoginWithConnectedWallet = async () => {
    try {
      if (!defaultWallet) {
        throw new Error('未找到已连接的钱包，请先连接钱包')
      }
      await completeWalletLogin(defaultWallet)
    } catch (error: any) {
      console.error('使用已连接钱包登录失败:', error)
      toast.error(error.message || '登录失败，请重试')
      throw error
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'apple' | 'x') => {
    try {
      // 如果已经通过Web3登录，先提示用户
      if (isConnected && address) {
        const confirmContinue = window.confirm(
          '您已通过钱包登录。继续使用Web2登录将绑定您的社交账号到当前账户。是否继续？'
        )
        if (!confirmContinue) {
          return
        }
      }
      
      // Google OAuth 真实集成
      if (provider === 'google') {
        const apiBaseUrl = API_BASE_URL
        window.location.href = `${apiBaseUrl}/auth/google`
        return
      }

      // Apple OAuth 真实集成
      if (provider === 'apple') {
        const apiBaseUrl = API_BASE_URL
        window.location.href = `${apiBaseUrl}/auth/apple`
        return
      }

      // X (Twitter) OAuth 真实集成
      if (provider === 'x') {
        const apiBaseUrl = API_BASE_URL
        window.location.href = `${apiBaseUrl}/auth/twitter`
        return
      }
    } catch (error: any) {
      console.error(`${provider} 登录失败:`, error)
      toast.error(error.message || `${provider === 'google' ? 'Google' : provider === 'apple' ? 'Apple' : 'X'} 登录失败，请重试`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div>
            <h2 className="text-lg font-bold">欢迎来到 Agentrix</h2>
            <p className="text-blue-100 text-xs mt-0.5">连接您的数字身份</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Web3 Section */}
          <section>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Wallet className="w-3 h-3" />
              Web3 钱包登录
            </h3>
            <Web3Login 
              connectors={connectors}
              onWalletConnect={handleWalletConnect}
              isConnected={isConnected}
              address={address}
              onLoginWithConnectedWallet={handleLoginWithConnectedWallet}
            />
          </section>

          {/* Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
              <span className="px-3 bg-white text-gray-400 font-bold">或者使用 Web2 方式</span>
            </div>
          </div>

          {/* Web2 Section */}
          <section>
            <Web2Login onSocialLogin={handleSocialLogin} onClose={onClose} />
          </section>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400">
            登录即表示您同意我们的
            <a href="#" className="text-blue-600 hover:underline mx-1">服务条款</a>
            和
            <a href="#" className="text-blue-600 hover:underline mx-1">隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  )
}

interface Web3LoginConnector {
  id: WalletType
  name: string
  icon: string
  description: string
  isInstalled: boolean
}

interface Web3LoginProps {
  connectors: Web3LoginConnector[]
  onWalletConnect: (walletType: WalletType) => Promise<void>
  isConnected: boolean
  address?: string
  onLoginWithConnectedWallet: () => Promise<void>
}

function Web3Login({ connectors, onWalletConnect, isConnected, address, onLoginWithConnectedWallet }: Web3LoginProps) {
  const [isConnecting, setIsConnecting] = useState<WalletType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleConnect = (walletType: WalletType) => {
    const connectPromise = onWalletConnect(walletType)
    setIsConnecting(walletType)
    setError(null)

    connectPromise
      .then(() => {
        setIsConnecting(null)
      })
      .catch((error: any) => {
        setError(error.message || '连接失败')
        setIsConnecting(null)
      })
  }

  return (
    <div className="space-y-3">
      {isConnected && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-left">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <div className="text-xs font-bold text-blue-900">已连接钱包</div>
            </div>
            <div className="text-[10px] text-blue-700 font-mono bg-white px-2 py-0.5 rounded border border-blue-100">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '未知地址'}
            </div>
          </div>
          <button
            onClick={async () => {
              setIsLoggingIn(true)
              setError(null)
              try {
                await onLoginWithConnectedWallet()
              } catch (err: any) {
                setError(err.message || '登录失败，请重试')
              } finally {
                setIsLoggingIn(false)
              }
            }}
            disabled={isLoggingIn}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoggingIn ? <RefreshCw className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
            {isLoggingIn ? '登录中...' : '签名并登录'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {connectors.map((connector) => {
          const isConnectingThis = isConnecting === connector.id
          const isDisabled = isConnectingThis || (!connector.isInstalled && connector.id !== 'walletconnect')
          
          return (
            <button
              key={connector.id}
              onClick={() => handleConnect(connector.id)}
              disabled={isDisabled}
              className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-blue-200 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed relative group"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">
                {connector.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 text-xs truncate">{connector.name}</div>
                <div className="text-[9px] text-gray-400 truncate">
                  {isConnectingThis ? '连接中...' : connector.isInstalled ? '已安装' : '未安装'}
                </div>
              </div>
              {isConnectingThis && (
                <RefreshCw className="w-3 h-3 text-blue-600 animate-spin absolute right-3" />
              )}
            </button>
          )
        })}
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-2">
          <p className="text-[10px] text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        </div>
      )}
    </div>
  )
}

function Web2Login({ onSocialLogin, onClose }: { onSocialLogin: (provider: 'google' | 'apple' | 'x') => void; onClose: () => void }) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agentrixId, setAgentrixId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { login } = useUser()
  const router = useRouter()
  const toast = useToast()

  const handleSocialLogin = async (provider: 'google' | 'apple' | 'x') => {
    setIsLoading(provider)
    try {
      await onSocialLogin(provider)
    } catch (error) {
      console.error('登录失败:', error)
      setIsLoading(null)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading('email')

    try {
      if (isRegisterMode) {
        const response = await authApi.register({
          email,
          password,
          agentrixId: agentrixId || undefined,
        })
        if (!response || !(response as any).user) {
          throw new Error('注册返回数据格式错误')
        }
        const _userReg = (response as any).user
        const roles = (_userReg.roles || []) as UserRole[]
        login({
          id: _userReg.id,
          agentrixId: _userReg.agentrixId,
          email: _userReg.email,
          walletAddress: undefined,
          roles,
          role: roles[0] || 'user',
          createdAt: new Date().toISOString(),
        })
        toast.success('注册成功！')
        onClose()
        router.replace('/app/user')
      } else {
        const response = await authApi.login({
          email,
          password,
        })
        if (!response || !(response as any).user) {
          throw new Error('登录返回数据格式错误')
        }
        const _user = (response as any).user
        const roles = (_user.roles || []) as UserRole[]
        login({
          id: _user.id,
          agentrixId: _user.agentrixId,
          email: _user.email,
          walletAddress: undefined,
          roles,
          role: roles[0] || 'user',
          createdAt: new Date().toISOString(),
        })
        toast.success('登录成功！')
        onClose()
        router.replace('/app/user')
      }
    } catch (error: any) {
      console.error('邮箱登录失败:', error)
      let errorMessage = error.message || (isRegisterMode ? '注册失败，请重试' : '登录失败，请检查邮箱和密码')
      if (error.message?.includes('未授权') || error.message?.includes('Unauthorized')) {
        errorMessage = '邮箱或密码错误，请重试'
      } else if (error.message?.includes('已存在') || error.message?.includes('already exists')) {
        errorMessage = '该邮箱已被注册，请直接登录'
      }
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Social Logins Row */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => handleSocialLogin('google')}
          disabled={isLoading !== null}
          className="flex flex-col items-center justify-center p-3 border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-blue-200 transition-all disabled:opacity-50 relative group"
        >
          {isLoading === 'google' ? (
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          ) : (
            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          <span className="text-[9px] font-bold text-gray-500 mt-1">Google</span>
        </button>

        <button
          onClick={() => handleSocialLogin('apple')}
          disabled={isLoading !== null}
          className="flex flex-col items-center justify-center p-3 border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-blue-200 transition-all disabled:opacity-50 relative group"
        >
          {isLoading === 'apple' ? (
            <RefreshCw className="w-5 h-5 text-gray-900 animate-spin" />
          ) : (
            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          )}
          <span className="text-[9px] font-bold text-gray-500 mt-1">Apple</span>
        </button>

        <button
          onClick={() => handleSocialLogin('x')}
          disabled={isLoading !== null}
          className="flex flex-col items-center justify-center p-3 border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-blue-200 transition-all disabled:opacity-50 relative group"
        >
          {isLoading === 'x' ? (
            <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
          ) : (
            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          )}
          <span className="text-[9px] font-bold text-gray-500 mt-1">X</span>
        </button>
      </div>

      {/* Email Toggle */}
      <div className="text-center">
        <button
          onClick={() => setShowEmailForm(!showEmailForm)}
          className="text-[10px] text-blue-600 font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
        >
          <Mail className="w-3 h-3" />
          {showEmailForm ? '隐藏邮箱登录' : '使用邮箱登录/注册'}
        </button>
      </div>

      {/* Email Form */}
      {showEmailForm && (
        <form onSubmit={handleEmailAuth} className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="your@email.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="至少6位字符"
            />
          </div>

          {isRegisterMode && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">AX ID (可选)</label>
              <input
                type="text"
                value={agentrixId}
                onChange={(e) => setAgentrixId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="自定义AX ID"
              />
            </div>
          )}

          {error && (
            <p className="text-[10px] text-red-600 flex items-center gap-1 ml-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading === 'email'}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading === 'email' ? <RefreshCw className="w-3 h-3 animate-spin" /> : isRegisterMode ? <UserPlus className="w-3 h-3" /> : <LogIn className="w-3 h-3" />}
            {isRegisterMode ? '立即注册' : '立即登录'}
          </button>

          <button
            type="button"
            onClick={() => setIsRegisterMode(!isRegisterMode)}
            className="w-full text-[10px] text-gray-500 hover:text-blue-600 transition-colors"
          >
            {isRegisterMode ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
        </form>
      )}
    </div>
  )
}
