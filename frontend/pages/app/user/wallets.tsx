import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useWeb3 } from '../../../contexts/Web3Context'
import { useLocalization } from '../../../contexts/LocalizationContext'
import { useToast } from '../../../contexts/ToastContext'
import { API_BASE_URL } from '../../../lib/api/client'

interface Wallet {
  id: string
  type: string
  address: string
  chain: string
  balance?: string
  isDefault: boolean
}

interface MPCWalletInfo {
  walletAddress: string
  chain: string
  currency: string
  isActive: boolean
}

export default function UserWallets() {
  const { t } = useLocalization()
  const { success: showSuccess, error: showError } = useToast()
  const { connectedWallets, defaultWallet, connect, disconnect, setDefault } = useWeb3()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [mpcWallet, setMpcWallet] = useState<MPCWalletInfo | null>(null)
  const [mpcLoading, setMpcLoading] = useState(true)
  const [isCreatingMpc, setIsCreatingMpc] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showMpcModal, setShowMpcModal] = useState(false)
  const [backupShards, setBackupShards] = useState<{ shardA: string; shardC: string } | null>(null)

  // Fetch MPC wallet
  useEffect(() => {
    const fetchMpcWallet = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          setMpcLoading(false)
          return
        }
        
        const response = await fetch(`${API_BASE_URL}/mpc-wallet/my-wallet`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setMpcWallet(data)
        }
      } catch (error) {
        console.error('Failed to fetch MPC wallet:', error)
      } finally {
        setMpcLoading(false)
      }
    }
    
    fetchMpcWallet()
  }, [])

  const loadWallets = useCallback(async () => {
    // 从Web3Context获取已连接的钱包
    const walletList: Wallet[] = connectedWallets.map(w => ({
      id: w.id,
      type: w.type,
      address: w.address || '',
      chain: w.chain || 'ethereum',
      balance: w.balance,
      isDefault: defaultWallet?.id === w.id,
    }))
    setWallets(walletList)
  }, [connectedWallets, defaultWallet])

  useEffect(() => {
    loadWallets()
  }, [loadWallets])

  const handleConnect = async (walletType: string) => {
    try {
      await connect(walletType as any)
      loadWallets()
    } catch (error) {
      console.error('连接钱包失败:', error)
    }
  }

  const handleDisconnect = async (walletId: string) => {
    try {
      await disconnect(walletId)
      loadWallets()
    } catch (error) {
      console.error('断开钱包失败:', error)
    }
  }

  const handleSetDefault = (walletId: string) => {
    setDefault(walletId)
    loadWallets()
  }

  const handleCreateMpcWallet = async () => {
    if (!password) {
      showError(t({ zh: '请输入密码', en: 'Please enter a password' }))
      return
    }
    if (password.length < 6) {
      showError(t({ zh: '密码至少需要6位字符', en: 'Password must be at least 6 characters' }))
      return
    }
    if (password !== confirmPassword) {
      showError(t({ zh: '两次密码输入不一致', en: 'Passwords do not match' }))
      return
    }

    setIsCreatingMpc(true)
    try {
      const token = localStorage.getItem('access_token')
      
      const response = await fetch(`${API_BASE_URL}/mpc-wallet/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create wallet')
      }

      const data = await response.json()
      setMpcWallet({
        walletAddress: data.walletAddress,
        chain: 'BSC',
        currency: 'USDC',
        isActive: true,
      })
      setBackupShards({
        shardA: data.encryptedShardA,
        shardC: data.encryptedShardC,
      })
      setShowMpcModal(false)
      setPassword('')
      setConfirmPassword('')
      showSuccess(t({ zh: 'MPC 钱包创建成功！', en: 'MPC Wallet created successfully!' }))
    } catch (error: any) {
      showError(error.message)
    } finally {
      setIsCreatingMpc(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showSuccess(t({ zh: `${label} 已复制`, en: `${label} copied` }))
    } catch (e) {
      showError(t({ zh: '复制失败', en: 'Failed to copy' }))
    }
  }

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>{t({ zh: '钱包管理', en: 'Wallet Management' })} - Agentrix</title>
      </Head>
      <div className="space-y-8">
        {/* MPC Wallet Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t({ zh: 'MPC 钱包', en: 'MPC Wallet' })}
          </h2>
          
          {mpcLoading ? (
            <div className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : !mpcWallet ? (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-lg shadow p-8">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">👛</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {t({ zh: '创建您的 MPC 钱包', en: 'Create Your MPC Wallet' })}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {t({
                      zh: 'MPC 钱包通过私钥分片技术提供更高的安全性。无需管理助记词，只需设置一个支付密码即可使用。',
                      en: 'MPC wallet provides higher security through private key sharding. No need to manage mnemonics, just set a payment password to use.',
                    })}
                  </p>
                  <ul className="text-sm text-gray-700 space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      {t({ zh: '无需助记词，更安全便捷', en: 'No mnemonic required, safer and more convenient' })}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      {t({ zh: '支持 AI Agent 自动支付授权', en: 'Support AI Agent auto-payment authorization' })}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      {t({ zh: '私钥分片存储，即使服务器被攻破也安全', en: 'Sharded private key, secure even if server is compromised' })}
                    </li>
                  </ul>
                  <button
                    onClick={() => setShowMpcModal(true)}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                  >
                    {t({ zh: '立即创建', en: 'Create Now' })}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    {t({ zh: 'MPC 钱包', en: 'MPC Wallet' })}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    mpcWallet.isActive 
                      ? 'bg-green-400/20 text-green-100' 
                      : 'bg-gray-400/20 text-gray-200'
                  }`}>
                    {mpcWallet.isActive ? t({ zh: '已激活', en: 'Active' }) : t({ zh: '未激活', en: 'Inactive' })}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                    {t({ zh: '钱包地址', en: 'Wallet Address' })}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono text-gray-800 bg-gray-100 px-4 py-2 rounded break-all">
                      {mpcWallet.walletAddress}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(mpcWallet.walletAddress, t({ zh: '地址', en: 'Address' }))}
                      className="text-gray-500 hover:text-gray-700 p-2"
                      title={t({ zh: '复制地址', en: 'Copy address' })}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">{t({ zh: '网络', en: 'Network' })}</p>
                    <p className="text-lg font-semibold text-gray-900">{mpcWallet.chain || 'BSC'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">{t({ zh: '默认币种', en: 'Default Currency' })}</p>
                    <p className="text-lg font-semibold text-gray-900">{mpcWallet.currency || 'USDC'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">{t({ zh: '余额', en: 'Balance' })}</p>
                    <p className="text-lg font-semibold text-gray-900">0.00 USDC</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backup Shards Alert */}
          {backupShards && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex gap-4">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h4 className="text-yellow-800 font-semibold mb-2">
                    {t({ zh: '请备份您的私钥分片', en: 'Please Backup Your Private Key Shards' })}
                  </h4>
                  <p className="text-sm text-yellow-700 mb-4">
                    {t({
                      zh: '这是您的本地分片和备份分片。请妥善保存，如果丢失且忘记密码，资产将无法找回。',
                      en: 'These are your local and backup shards. Please save them securely. If lost and password forgotten, assets cannot be recovered.',
                    })}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-yellow-700 font-medium">Shard A (Local)</p>
                        <button
                          onClick={() => copyToClipboard(backupShards.shardA, 'Shard A')}
                          className="text-xs text-yellow-600 hover:text-yellow-800"
                        >
                          {t({ zh: '复制', en: 'Copy' })}
                        </button>
                      </div>
                      <code className="block bg-yellow-100 p-2 rounded text-xs break-all text-yellow-900">{backupShards.shardA}</code>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-yellow-700 font-medium">Shard C (Backup)</p>
                        <button
                          onClick={() => copyToClipboard(backupShards.shardC, 'Shard C')}
                          className="text-xs text-yellow-600 hover:text-yellow-800"
                        >
                          {t({ zh: '复制', en: 'Copy' })}
                        </button>
                      </div>
                      <code className="block bg-yellow-100 p-2 rounded text-xs break-all text-yellow-900">{backupShards.shardC}</code>
                    </div>
                  </div>
                  <button
                    onClick={() => setBackupShards(null)}
                    className="mt-4 text-sm text-yellow-700 hover:text-yellow-900 font-medium"
                  >
                    {t({ zh: '✓ 我已妥善保存', en: '✓ I have saved them securely' })}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* External Wallets Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {t({ zh: '外部钱包', en: 'External Wallets' })}
            </h2>
            <button
              onClick={() => handleConnect('metamask')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              {t({ zh: '连接钱包', en: 'Connect Wallet' })}
            </button>
          </div>

        {wallets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-4xl mb-4">🔗</div>
            <p className="text-gray-600 mb-4">
              {t({ zh: '暂无已连接的外部钱包', en: 'No external wallets connected' })}
            </p>
            <button
              onClick={() => handleConnect('metamask')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              {t({ zh: '连接 MetaMask', en: 'Connect MetaMask' })}
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {wallets.map((wallet) => (
              <div key={wallet.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">{wallet.type}</h3>
                    <p className="text-sm text-gray-500 mt-1 font-mono">{wallet.address}</p>
                  </div>
                  {wallet.isDefault && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {t({ zh: '默认', en: 'Default' })}
                    </span>
                  )}
                </div>
                <div className="space-y-2 mb-4">
                  <div className="text-sm">
                    <span className="text-gray-600">{t({ zh: '网络', en: 'Network' })}:</span>{' '}
                    <span className="font-medium text-gray-900 capitalize">{wallet.chain}</span>
                  </div>
                  {wallet.balance && (
                    <div className="text-sm">
                      <span className="text-gray-600">{t({ zh: '余额', en: 'Balance' })}:</span>{' '}
                      <span className="font-medium text-gray-900">{wallet.balance}</span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  {!wallet.isDefault && (
                    <button
                      onClick={() => handleSetDefault(wallet.id)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      {t({ zh: '设为默认', en: 'Set Default' })}
                    </button>
                  )}
                  <button
                    onClick={() => handleDisconnect(wallet.id)}
                    className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm"
                  >
                    {t({ zh: '断开连接', en: 'Disconnect' })}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* MPC Wallet Creation Modal */}
      {showMpcModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {t({ zh: '创建 MPC 钱包', en: 'Create MPC Wallet' })}
            </h3>
            <p className="text-gray-600 text-sm mb-6">
              {t({
                zh: '请设置一个支付密码，用于加密您的私钥分片。请牢记此密码，丢失后资产将无法找回。',
                en: 'Please set a payment password to encrypt your private key shards. Remember this password, assets cannot be recovered if lost.',
              })}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t({ zh: '支付密码', en: 'Payment Password' })}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t({ zh: '至少6位字符', en: 'At least 6 characters' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t({ zh: '确认密码', en: 'Confirm Password' })}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t({ zh: '再次输入密码', en: 'Enter password again' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowMpcModal(false)
                  setPassword('')
                  setConfirmPassword('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t({ zh: '取消', en: 'Cancel' })}
              </button>
              <button
                onClick={handleCreateMpcWallet}
                disabled={isCreatingMpc}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingMpc ? t({ zh: '创建中...', en: 'Creating...' }) : t({ zh: '创建钱包', en: 'Create Wallet' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
