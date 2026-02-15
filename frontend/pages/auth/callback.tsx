import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import { API_BASE_URL } from '../../lib/api/client'
import { Wallet, CheckCircle, Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const router = useRouter()
  const { login } = useUser()
  const toast = useToast()
  const [status, setStatus] = useState<'processing' | 'creating-wallet' | 'success' | 'error'>('processing')
  const [statusMessage, setStatusMessage] = useState('正在处理登录...')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  // 自动创建 MPC 钱包
  const autoCreateMPCWallet = useCallback(async (token: string, socialId: string): Promise<{
    walletAddress: string
    encryptedShardA?: string
    encryptedShardC?: string
  }> => {
    const response = await fetch(`${API_BASE_URL}/mpc-wallet/create-for-social`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        socialProviderId: socialId,
        chain: 'BSC',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to create wallet')
    }

    return response.json()
  }, [])

  // 存储分片A到IndexedDB
  const storeShardA = useCallback(async (userId: string, encryptedShardA: string) => {
    try {
      const dbName = 'agentrix_mpc_wallet'
      const storeName = 'shards'
      
      const request = indexedDB.open(dbName, 1)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'userId' })
        }
      }
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        store.put({ userId, shardA: encryptedShardA, createdAt: new Date().toISOString() })
      }
    } catch (error) {
      console.error('Failed to store shard A:', error)
    }
  }, [])

  const completeLogin = useCallback((userId: string, agentrixId: string, email?: string, walletAddress?: string) => {
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
    router.push('/workbench')
  }, [login, router, toast])

  useEffect(() => {
    const handleCallback = async () => {
      const { 
        token, userId, email, agentrixId, error,
        needMPCWallet, socialType, socialId 
      } = router.query

      // 处理错误
      if (error) {
        setStatus('error')
        setStatusMessage(typeof error === 'string' ? error : '登录失败')
        toast.error(typeof error === 'string' ? error : '登录失败')
        setTimeout(() => router.push('/auth/login'), 2000)
        return
      }

      if (!token || !agentrixId) {
        setStatus('error')
        setStatusMessage('登录失败：缺少必要参数')
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

        // Web2登录：自动创建 MPC 钱包
        if (needMPCWallet === 'true' && socialType && socialId) {
          setStatus('creating-wallet')
          setStatusMessage('正在为您创建安全钱包...')
          
          try {
            const walletResult = await autoCreateMPCWallet(
              token as string,
              socialId as string
            )
            
            if (walletResult.walletAddress) {
              setWalletAddress(walletResult.walletAddress)
              setStatus('success')
              setStatusMessage('钱包创建成功！正在跳转...')
              
              // 存储分片A到本地（如果有）
              if (walletResult.encryptedShardA) {
                await storeShardA(userId as string, walletResult.encryptedShardA)
              }
              
              // 延迟跳转让用户看到成功状态
              setTimeout(() => {
                completeLogin(
                  userId as string,
                  agentrixId as string,
                  email as string,
                  walletResult.walletAddress
                )
              }, 1500)
              return
            }
          } catch (walletError: any) {
            console.error('MPC钱包创建失败:', walletError)
            // 钱包创建失败不阻止登录，继续正常登录流程
            toast.error('钱包创建失败，您可以稍后在资产页面手动创建')
          }
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
        setStatus('error')
        setStatusMessage('登录失败，请重试')
        toast.error('登录失败，请重试')
        setTimeout(() => router.push('/auth/login'), 2000)
      }
    }

    if (router.isReady) {
      handleCallback()
    }
  }, [router, completeLogin, toast, autoCreateMPCWallet, storeShardA])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19]">
      <div className="text-center max-w-md mx-auto px-6">
        {/* 状态图标 */}
        <div className="mb-6">
          {status === 'processing' && (
            <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          )}
          {status === 'creating-wallet' && (
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
              <Wallet className="w-10 h-10 text-white" />
            </div>
          )}
          {status === 'success' && (
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
          )}
          {status === 'error' && (
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <span className="text-4xl">❌</span>
            </div>
          )}
        </div>

        {/* 状态文字 */}
        <h2 className="text-xl font-bold text-white mb-2">{statusMessage}</h2>
        
        {/* 钱包地址显示 */}
        {walletAddress && (
          <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-white/10">
            <p className="text-xs text-slate-400 mb-1">您的 MPC 钱包地址</p>
            <p className="text-sm font-mono text-emerald-400 break-all">{walletAddress}</p>
          </div>
        )}

        {/* 创建钱包时的额外提示 */}
        {status === 'creating-wallet' && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>正在生成安全密钥分片...</span>
            </div>
            <p className="text-xs text-slate-500">
              MPC 钱包采用分片技术，无需助记词，更加安全
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

