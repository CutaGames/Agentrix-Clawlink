import { useState } from 'react'
import { useRouter } from 'next/router'
import { useWeb3 } from '../../contexts/Web3Context'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import { walletService, WalletType, WalletInfo } from '../../lib/wallet/WalletService'
import { authApi } from '../../lib/api/auth.api'
import type { UserRole } from '../../types/user'
import { walletApi } from '../../lib/api/wallet.api'

interface LoginModalProps {
  onClose: () => void
  onWalletSuccess?: () => void
}

export function LoginModal({ onClose, onWalletSuccess }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<'web3' | 'web2'>('web3')
  const { isConnected, address, connect, connectors, defaultWallet } = useWeb3()
  const { login, isAuthenticated } = useUser()
  const router = useRouter()
  const toast = useToast()

  const handleWalletConnect = async (walletType: WalletType) => {
    try {
      console.log('开始连接钱包:', walletType)
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
      const signature = await walletService.signMessage(walletInfo, loginMessage)
      console.log('签名成功，开始登录验证')

      if (isAuthenticated) {
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

      const authResponse = await authApi.walletLogin({
        walletAddress: walletInfo.address,
        walletType: walletInfo.type,
        chain: walletInfo.chain,
        chainId: walletInfo.chainId ? String(walletInfo.chainId) : undefined,
        message: loginMessage,
        signature,
      })

      console.log('登录验证成功:', authResponse)

      const roles = (authResponse.user.roles || []) as UserRole[]

      login({
        id: authResponse.user.id,
        agentrixId: authResponse.user.agentrixId,
        email: authResponse.user.email || undefined,
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
      router.replace('/app/user')
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
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
        // 重定向到后端 OAuth 端点
        window.location.href = `${apiBaseUrl}/auth/google`
        return
      }
      
      // Apple 和 X 暂时使用演示模式（待实现）
      const providerName = provider === 'apple' ? 'Apple' : 'X'
      toast.info(`${providerName} 登录功能即将推出`)
      
      // 模拟登录流程（演示模式）
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const socialEmail = `user-${provider}@agentrix.com`
      const agentrixId = `user-${provider}-${Date.now()}`
      
      // 尝试调用后端API（如果可用）
      try {
          const { authApi } = await import('../../lib/api/auth.api')
        
        try {
          const result = await authApi.register({
            email: socialEmail,
            password: 'social-login-temp-password',
            agentrixId: agentrixId
          })
          
          login({
            email: result.user?.email || socialEmail,
            walletAddress: undefined
          })
          
          toast.success(`${providerName} 登录成功！`)
          setTimeout(() => {
            onClose()
            router.push('/app/user')
          }, 500)
          return
        } catch (registerError: any) {
          if (registerError.message?.includes('already exists') || registerError.message?.includes('已存在')) {
            try {
              const loginResult = await authApi.login({
                email: socialEmail,
                password: 'social-login-temp-password'
              })
              
              login({
                email: loginResult.user?.email || socialEmail,
                walletAddress: undefined
              })
              
              toast.success(`${providerName} 登录成功！`)
              setTimeout(() => {
                onClose()
                router.push('/app/user')
              }, 500)
              return
            } catch (loginError: any) {
              console.warn('API登录失败，使用本地模式:', loginError)
            }
          } else {
            throw registerError
          }
        }
      } catch (apiError: any) {
        console.warn('API调用失败，使用本地模式:', apiError)
      }
      
      // 本地模式：直接创建用户（演示）
      login({
        email: socialEmail,
        walletAddress: undefined
      })
      
      toast.success(`${providerName} 登录成功！（演示模式）`)
      setTimeout(() => {
        onClose()
        router.push('/app/user')
      }, 500)
    } catch (error: any) {
      console.error(`${provider} 登录失败:`, error)
      toast.error(error.message || `${provider === 'google' ? 'Google' : provider === 'apple' ? 'Apple' : 'X'} 登录失败，请重试`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">登录 Agentrix</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`flex-1 py-2 font-medium ${
              activeTab === 'web3'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('web3')}
          >
            Web3钱包
          </button>
          <button
            className={`flex-1 py-2 font-medium ${
              activeTab === 'web2'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('web2')}
          >
            Web2账户
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'web3' && (
            <Web3Login 
              connectors={connectors}
              onWalletConnect={handleWalletConnect}
              isConnected={isConnected}
              address={address}
              onLoginWithConnectedWallet={handleLoginWithConnectedWallet}
            />
          )}
          {activeTab === 'web2' && <Web2Login onSocialLogin={handleSocialLogin} onClose={onClose} />}
        </div>
        <div className="mt-6 text-center text-sm text-gray-500">
          登录即表示您同意我们的
          <a href="#" className="text-blue-600 hover:underline">服务条款</a>
          和
          <a href="#" className="text-blue-600 hover:underline">隐私政策</a>
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

  const handleConnect = async (walletType: WalletType) => {
    setIsConnecting(walletType)
    setError(null)
    try {
      await onWalletConnect(walletType)
      // 连接成功后清除连接状态（登录会在onWalletConnect内部完成）
      setIsConnecting(null)
    } catch (error: any) {
      setError(error.message || '连接失败')
      setIsConnecting(null)
    }
  }

  return (
    <div className="space-y-3">
      {isConnected && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-green-900">检测到已连接钱包</div>
              <div className="text-xs text-green-700 font-mono mt-1">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '未知地址'}
              </div>
            </div>
            <div className="text-2xl">✅</div>
          </div>
          <p className="text-xs text-green-700 mb-3">
            仍需签名一次以完成 Agentrix 登录并获取 Agentrix ID。
          </p>
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
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {isLoggingIn ? '登录中...' : '使用已连接钱包签名登录'}
          </button>
        </div>
      )}

      {connectors.map((connector) => {
        const isConnectingThis = isConnecting === connector.id
        const isDisabled = isConnectingThis || (!connector.isInstalled && connector.id !== 'walletconnect')
        
        return (
          <button
            key={connector.id}
            onClick={() => handleConnect(connector.id)}
            disabled={isDisabled}
            className="w-full flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed relative"
          >
            {isConnectingThis && (
              <div className="absolute left-4 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            )}
            <span className="text-2xl mr-4 ml-8">
              {connector.icon}
            </span>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{connector.name}</div>
              <div className="text-sm text-gray-500">
                {connector.description}
                {!connector.isInstalled && connector.id !== 'walletconnect' && ' (未安装)'}
                {isConnectingThis && ' (连接中...)'}
              </div>
            </div>
          </button>
        )
      })}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      <div className="text-xs text-gray-500 text-center mt-4">
        连接钱包即代表您已阅读并同意我们的服务条款
      </div>
    </div>
  )
}

function Web2Login({ onSocialLogin, onClose }: { onSocialLogin: (provider: 'google' | 'apple' | 'x') => void; onClose: () => void }) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agentrixId, setPaymindId] = useState('')
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
        // 注册
        const response = await authApi.register({
          email,
          password,
          agentrixId: agentrixId || undefined,
        })
        
        const roles = (response.user.roles || []) as UserRole[]
        login({
          id: response.user.id,
          agentrixId: response.user.agentrixId,
          email: response.user.email,
          walletAddress: undefined,
          roles,
          role: roles[0] || 'user',
          createdAt: new Date().toISOString(),
        })
        toast.success('注册成功！')
        onClose()
        router.replace('/app/user')
      } else {
        // 登录
        const response = await authApi.login({
          email,
          password,
        })
        
        const roles = (response.user.roles || []) as UserRole[]
        login({
          id: response.user.id,
          agentrixId: response.user.agentrixId,
          email: response.user.email,
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
      
      // 处理特定的错误情况
      if (error.message?.includes('未授权') || error.message?.includes('Unauthorized')) {
        errorMessage = '邮箱或密码错误，请重试'
      } else if (error.message?.includes('已存在') || error.message?.includes('already exists')) {
        errorMessage = '该邮箱已被注册，请直接登录'
      } else if (error.message?.includes('Conflict')) {
        errorMessage = '该邮箱已被注册'
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* 邮箱登录表单 */}
      <form onSubmit={handleEmailAuth} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            邮箱地址
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading !== null}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-gray-900"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            密码
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading !== null}
            minLength={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-gray-900"
            placeholder="至少6位字符"
          />
        </div>

        {isRegisterMode && (
          <div>
            <label htmlFor="agentrixId" className="block text-sm font-medium text-gray-700 mb-1">
              Agentrix ID（可选）
            </label>
            <input
              id="agentrixId"
              type="text"
              value={agentrixId}
              onChange={(e) => setPaymindId(e.target.value)}
              disabled={isLoading !== null}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-gray-900"
              placeholder="自定义Agentrix ID"
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading !== null || !email || !password}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
        >
          {isLoading === 'email' ? (
            <span className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              {isRegisterMode ? '注册中...' : '登录中...'}
            </span>
          ) : (
            isRegisterMode ? '注册' : '登录'
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode)
              setError(null)
            }}
            disabled={isLoading !== null}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {isRegisterMode ? '已有账号？立即登录' : '没有账号？立即注册'}
          </button>
        </div>
      </form>

      {/* 分隔线 */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">或使用第三方账号</span>
        </div>
      </div>

      <div className="text-center mb-4">
        <p className="text-gray-600 text-sm">使用第三方账号快速登录</p>
      </div>

      {/* Google Login */}
      <button
        onClick={() => handleSocialLogin('google')}
        disabled={isLoading !== null}
        className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
      >
        {isLoading === 'google' && (
          <div className="absolute left-4 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span className="font-medium text-gray-900">
          {isLoading === 'google' ? '登录中...' : '使用 Google 账号登录'}
        </span>
      </button>

      {/* Apple Login */}
      <button
        onClick={() => handleSocialLogin('apple')}
        disabled={isLoading !== null}
        className="w-full flex items-center justify-center px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
      >
        {isLoading === 'apple' && (
          <div className="absolute left-4 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        )}
        <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
        <span className="font-medium">
          {isLoading === 'apple' ? '登录中...' : '使用 Apple 账号登录'}
        </span>
      </button>

      {/* X (Twitter) Login */}
      <button
        onClick={() => handleSocialLogin('x')}
        disabled={isLoading !== null}
        className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
      >
        {isLoading === 'x' && (
          <div className="absolute left-4 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
        <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        <span className="font-medium text-gray-900">
          {isLoading === 'x' ? '登录中...' : '使用 X 账号登录'}
        </span>
      </button>

      <div className="text-xs text-gray-500 text-center mt-4">
        使用第三方账号登录即代表您已阅读并同意我们的服务条款
      </div>
    </div>
  )
}
