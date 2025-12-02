import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'

export default function AuthCallback() {
  const router = useRouter()
  const { login } = useUser()
  const toast = useToast()

  useEffect(() => {
    const handleCallback = async () => {
      const { token, userId, email, paymindId } = router.query

      if (!token || !paymindId) {
        toast.error('登录失败：缺少必要参数')
        setTimeout(() => {
          router.push('/')
        }, 2000)
        return
      }

      try {
        // 保存 token
        if (typeof token === 'string') {
          localStorage.setItem('access_token', token)
          // 更新 API 客户端的 token
          const { apiClient } = await import('../../lib/api/client')
          apiClient.setToken(token)
        }

        const resolvedPaymindId = typeof paymindId === 'string' ? paymindId : undefined
        const resolvedUserId = typeof userId === 'string' ? userId : `user_${Date.now()}`

        login({
          id: resolvedUserId,
          paymindId: resolvedPaymindId,
          email: typeof email === 'string' ? email : undefined,
          walletAddress: undefined,
          roles: ['user'],
          role: 'user',
          createdAt: new Date().toISOString(),
        })

        toast.success('登录成功！')
        
        // 重定向到用户后台
        setTimeout(() => {
          router.push('/app/user')
        }, 500)
      } catch (error: any) {
        console.error('处理登录回调失败:', error)
        toast.error('登录失败，请重试')
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    }

    if (router.isReady) {
      handleCallback()
    }
  }, [router.isReady, router.query, login, toast, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">正在处理登录...</p>
      </div>
    </div>
  )
}

