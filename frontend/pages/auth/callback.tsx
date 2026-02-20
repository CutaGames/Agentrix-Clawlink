import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '../../contexts/UserContext'
import { useToast } from '../../contexts/ToastContext'
import { API_BASE_URL } from '../../lib/api/client'
import { Wallet, CheckCircle, Loader2, Copy, Shield, ArrowRight } from 'lucide-react'

export default function AuthCallback() {
  const router = useRouter()
  const { login } = useUser()
  const toast = useToast()
  const [status, setStatus] = useState<'processing' | 'creating-wallet' | 'wallet-created' | 'success' | 'error'>('processing')
  const [statusMessage, setStatusMessage] = useState('正在处理登录...')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [encryptedShardC, setEncryptedShardC] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [shardCopied, setShardCopied] = useState(false)
  const [backupConfirmed, setBackupConfirmed] = useState(false)
  const [pendingLogin, setPendingLogin] = useState<{userId: string, agentrixId: string, email?: string, walletAddress?: string} | null>(null)

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
              setStatus('wallet-created')
              setStatusMessage('MPC 钱包创建成功！')
              
              // 保存 ShardC 供用户备份
              if (walletResult.encryptedShardC) {
                setEncryptedShardC(walletResult.encryptedShardC)
              }
              
              // 存储分片A到本地（如果有）
              if (walletResult.encryptedShardA) {
                await storeShardA(userId as string, walletResult.encryptedShardA)
              }
              
              // 暂存登录信息，等用户确认后再跳转
              setPendingLogin({
                userId: userId as string,
                agentrixId: agentrixId as string,
                email: email as string,
                walletAddress: walletResult.walletAddress,
              })
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

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyShardC = () => {
    if (encryptedShardC) {
      navigator.clipboard.writeText(encryptedShardC)
      setShardCopied(true)
      setTimeout(() => setShardCopied(false), 3000)
    }
  }

  const handleDownloadRecoveryCode = () => {
    if (!encryptedShardC || !walletAddress) return
    const content = `Agentrix MPC Wallet Recovery Code\n=====================================\nWallet Address: ${walletAddress}\nCreated: ${new Date().toISOString()}\n\nRecovery Code (Keep this safe!):\n${encryptedShardC}\n\nInstructions:\n1. Store this file in a secure location\n2. Never share this code with anyone\n3. You need this code + your device to recover your wallet\n=====================================`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agentrix-wallet-recovery-${walletAddress.slice(0, 8)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleContinue = () => {
    if (pendingLogin) {
      completeLogin(pendingLogin.userId, pendingLogin.agentrixId, pendingLogin.email, pendingLogin.walletAddress)
    }
  }

  const handleGoToWallet = () => {
    if (pendingLogin) {
      login({
        id: pendingLogin.userId,
        agentrixId: pendingLogin.agentrixId,
        email: pendingLogin.email,
        walletAddress: pendingLogin.walletAddress,
        roles: ['user'],
        role: 'user',
        createdAt: new Date().toISOString(),
      })
      toast.success('登录成功！')
      router.push('/workbench?tab=assets')
    }
  }

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
          {status === 'wallet-created' && (
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
              <Shield className="w-10 h-10 text-white" />
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
        
        {/* 钱包创建成功 - 显示详情和备份提示 */}
        {status === 'wallet-created' && walletAddress && (
          <div className="mt-6 space-y-4 text-left">
            <div className="p-4 bg-slate-800/50 rounded-xl border border-white/10">
              <p className="text-xs text-slate-400 mb-1">您的 MPC 钱包地址</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-mono text-emerald-400 break-all flex-1">{walletAddress}</p>
                <button onClick={handleCopyAddress} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0">
                  <Copy className={`w-4 h-4 ${copied ? 'text-emerald-400' : 'text-slate-400'}`} />
                </button>
              </div>
              {copied && <p className="text-xs text-emerald-400 mt-1">已复制!</p>}
            </div>

            {/* 分片备份区域 */}
            {encryptedShardC ? (
              <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <p className="text-sm font-bold text-amber-300">重要：请备份恢复码</p>
                </div>
                <p className="text-xs text-amber-200/70">
                  恢复码用于在设备丢失时恢复钱包。请妥善保存，我们无法为您找回。
                </p>
                <div className="bg-black/30 rounded-lg p-3">
                  <code className="text-[10px] text-slate-300 break-all block max-h-16 overflow-y-auto leading-relaxed">
                    {encryptedShardC.slice(0, 120)}...
                  </code>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCopyShardC} className="flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center gap-1.5 text-xs text-white transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                    {shardCopied ? '已复制!' : '复制恢复码'}
                  </button>
                  <button onClick={handleDownloadRecoveryCode} className="flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center gap-1.5 text-xs text-white transition-colors">
                    📥 下载备份文件
                  </button>
                </div>
                <label className="flex items-start gap-2 cursor-pointer mt-1">
                  <input type="checkbox" checked={backupConfirmed} onChange={(e) => setBackupConfirmed(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500" />
                  <span className="text-xs text-slate-300">我已安全保存恢复码，了解丢失后无法找回</span>
                </label>
              </div>
            ) : (
              <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-300">安全提示</p>
                    <p className="text-xs text-amber-200/70 mt-1">
                      系统已为您自动创建 MPC 钱包，密钥分片已安全存储。您可以稍后在「工作台 → 资产」页面查看钱包详情和管理密钥备份。
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleGoToWallet}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                查看钱包详情
              </button>
              <button
                onClick={handleContinue}
                disabled={encryptedShardC ? !backupConfirmed : false}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                进入工作台 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 钱包地址显示（非wallet-created状态） */}
        {walletAddress && status !== 'wallet-created' && (
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

