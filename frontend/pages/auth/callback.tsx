import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import dynamic from 'next/dynamic'

// 动态导入 MPC 钱包设置组件
const MPCWalletSetup = dynamic(
  () => import('../../components/auth/MPCWalletSetup').then(mod => ({ default: mod.MPCWalletSetup })),
  { ssr: false }
)

export default function AuthCallback() {
  const router = useRouter()
  const { login } = useUser()
  const toast = useToast()
  const [showMPCSetup, setShowMPCSetup] = useState(false)
  const [pendingLogin, setPendingLogin] = useState<{
    token: string
    userId: string
    email: string
    agentrixId: string
    socialType: string
    socialId: string
  } | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const { 
        token, userId, email, agentrixId, error,
        needMPCWallet, socialType, socialId 
      } = router.query

      // 处理错误
      if (error) {
        toast.error(typeof error === 'string' ? error : '登录失败')
        setTimeout(() => router.push('/auth/login'), 2000)
        return
      }

      if (!token || !agentrixId) {
        toast.error('登录失败：缺少必要参数')
        setTimeout(() => router.push('/auth/login'), 2000)
        return
      }

      try {
        // 保存 token
        if (typeof token === 'string') {
          localStorage.setItem('access_token', token)
          const { apiClient } = await import('../../lib/api/client')
          apiClient.setToken(token)
        }

        // 检查是否需要创建 MPC 钱包
        if (needMPCWallet === 'true' && socialType && socialId) {
          setPendingLogin({
            token: token as string,
            userId: userId as string,
            email: email as string || '',
            agentrixId: agentrixId as string,
            socialType: socialType as string,
            socialId: socialId as string,
          })
          setShowMPCSetup(true)
          return
        }

        // 直接登录
        completeLogin(
          userId as string, 
          agentrixId as string, 
          email as string,
          undefined
        )
      } catch (error: any) {
        console.error('处理登录回调失败:', error)
        toast.error('登录失败，请重试')
        setTimeout(() => router.push('/auth/login'), 2000)
      }
    }

    if (router.isReady) {
      handleCallback()
    }
  }, [router.isReady, router.query])

  const completeLogin = (userId: string, agentrixId: string, email?: string, walletAddress?: string) => {
    login({
      id: userId,
      agentrixId: agentrixId,
      email: email,
      walletAddress: walletAddress,
      roles: ['user'],
      role: 'user',
      createdAt: new Date().toISOString(),
    })
    toast.success('登录成功！')
    // 跳转到 Agentrix 工作台
    router.push('/workbench')
  }

  const handleMPCWalletComplete = (wallet: { walletAddress: string }) => {
    if (pendingLogin) {
      completeLogin(
        pendingLogin.userId,
        pendingLogin.agentrixId,
        pendingLogin.email,
        wallet.walletAddress
      )
    }
    setShowMPCSetup(false)
  }

  const handleMPCWalletSkip = () => {
    if (pendingLogin) {
      completeLogin(
        pendingLogin.userId,
        pendingLogin.agentrixId,
        pendingLogin.email
      )
    }
    setShowMPCSetup(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
      {showMPCSetup && pendingLogin ? (
        <MPCWalletSetup
          userId={pendingLogin.userId}
          socialProviderId={pendingLogin.socialId}
          onComplete={handleMPCWalletComplete}
          onSkip={handleMPCWalletSkip}
        />
      ) : (
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">正在处理登录...</p>
        </div>
      )}
    </div>
  )
}

