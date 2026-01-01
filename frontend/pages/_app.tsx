import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Web3Provider } from '../contexts/Web3Context'
import { PaymentProvider } from '../contexts/PaymentContext'
import { UserProvider } from '../contexts/UserContext'
import { ToastProvider } from '../contexts/ToastContext'
import { CartProvider } from '../contexts/CartContext'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
// V7.0: 使用新的 SmartCheckout 组件，不再需要全局支付弹窗
import '../styles/globals.css'
import { AgentModeProvider } from '../contexts/AgentModeContext'
import { LocalizationProvider } from '../contexts/LocalizationContext'
import { CurrencyProvider } from '../contexts/CurrencyContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const routesDisablingLegacyModal = ['/pay/user-demo', '/agent-enhanced', '/agent-builder']
  const disableLegacyPaymentModal =
    Boolean((pageProps as any)?.disableLegacyPaymentModal) ||
    routesDisablingLegacyModal.some((route) => router.pathname.startsWith(route))
  
  // 管理后台页面不需要 Web3 功能
  const isAdminPage = router.pathname.startsWith('/admin')

  // 处理推广链接
  useEffect(() => {
    if (typeof window !== 'undefined' && router.query.ref) {
      const refId = router.query.ref as string;
      console.log('🔍 检测到推广 ID:', refId);
      localStorage.setItem('agentrix_referral_id', refId);
      
      // 可选：清除 URL 中的 ref 参数以保持美观
      // const { ref, ...rest } = router.query;
      // router.replace({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
    }
  }, [router.query.ref])

  // 在开发环境中加载支付调试工具和授权诊断工具
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      import('../utils/payment-debug').catch(() => {
        // 静默失败，不影响应用运行
      })
      // 加载授权诊断工具
      import('../utils/auth-diagnosis').then(() => {
        console.log('✅ 授权诊断工具已加载，使用: await window.checkAuth()');
      }).catch((err) => {
        console.warn('授权诊断工具加载失败:', err);
      })
    }
  }, [])

  // 全局错误处理：捕获 MetaMask 连接错误
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 捕获未处理的 Promise 拒绝（MetaMask 连接错误）
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // 检查是否是 MetaMask 连接错误
      const error = event.reason
      const errorMessage = error?.message || error?.toString() || ''
      const isMetaMaskError = 
        errorMessage.includes('Failed to connect to MetaMask') ||
        errorMessage.includes('MetaMask extension not found') ||
        errorMessage.includes('MetaMask') ||
        error?.code === 'UNSUPPORTED_METHOD' ||
        (typeof error === 'string' && error.includes('MetaMask'))
      
      if (isMetaMaskError) {
        // 在管理后台页面完全静默 MetaMask 错误
        if (router.pathname.startsWith('/admin')) {
          event.preventDefault()
          return
        }
        // 在其他页面静默处理 MetaMask 连接错误，不显示错误提示
        console.warn('MetaMask 连接失败（这是正常的，如果用户没有安装 MetaMask）:', error)
        event.preventDefault() // 阻止错误显示
        return
      }
    }

    // 捕获未处理的错误
    const handleError = (event: ErrorEvent) => {
      const error = event.error
      const errorMessage = error?.message || error?.toString() || ''
      const isMetaMaskError = 
        errorMessage.includes('Failed to connect to MetaMask') ||
        errorMessage.includes('MetaMask extension not found') ||
        errorMessage.includes('MetaMask') ||
        (typeof error === 'string' && error.includes('MetaMask'))
      
      if (isMetaMaskError) {
        // 在管理后台页面完全静默 MetaMask 错误
        if (router.pathname.startsWith('/admin')) {
          event.preventDefault()
          return
        }
        // 在其他页面静默处理 MetaMask 连接错误
        console.warn('MetaMask 连接错误（这是正常的，如果用户没有安装 MetaMask）:', error)
        event.preventDefault() // 阻止错误显示
        return
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [router.pathname])

  // 管理后台页面不需要 Web3、Payment、Agent 等功能
  const AdminLayout = ({ children }: { children: React.ReactNode }) => (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LocalizationProvider>
          <CurrencyProvider>
            <ToastProvider>
              <UserProvider>
                {children}
              </UserProvider>
            </ToastProvider>
          </CurrencyProvider>
        </LocalizationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )

  const FullLayout = ({ children }: { children: React.ReactNode }) => (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LocalizationProvider>
          <CurrencyProvider>
            <ToastProvider>
              <Web3Provider>
                <UserProvider>
                  <CartProvider>
                    <PaymentProvider>
                      <AgentModeProvider>
                        {children}
                        {/* V7.0: 支付流程已改为页面级 SmartCheckout 组件 */}
                      </AgentModeProvider>
                    </PaymentProvider>
                  </CartProvider>
                </UserProvider>
              </Web3Provider>
            </ToastProvider>
          </CurrencyProvider>
        </LocalizationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )

  return isAdminPage ? (
    <AdminLayout>
      <Component {...pageProps} />
    </AdminLayout>
  ) : (
    <FullLayout>
      <Component {...pageProps} />
    </FullLayout>
  )
}
