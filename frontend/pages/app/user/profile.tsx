import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useUser } from '../../../contexts/UserContext'
import { useToast } from '../../../contexts/ToastContext'
import { useLocalization } from '../../../contexts/LocalizationContext'
import { AvatarUpload } from '../../../components/user/AvatarUpload'
import { SocialAccountBinding } from '../../../components/user/SocialAccountBinding'
import { walletApi, WalletConnection } from '../../../lib/api/wallet.api'
import { userApi } from '../../../lib/api/user.api'

export default function UserProfile() {
  const { user, isAuthenticated, updateUser, isLoading } = useUser()
  const router = useRouter()
  const toast = useToast()
  const { t } = useLocalization()
  const [isEditing, setIsEditing] = useState(false)
  const [wallets, setWallets] = useState<WalletConnection[]>([])
  const [walletLoading, setWalletLoading] = useState(false)
  const [email, setEmail] = useState(user?.email || '')
  const [nickname, setNickname] = useState(user?.nickname || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user) {
      router.push('/')
    }
  }, [isAuthenticated, user, router, isLoading])

  const loadWallets = useCallback(async () => {
    try {
      setWalletLoading(true)
      const data = await walletApi.list()
      setWallets(data)
    } catch (error: any) {
      console.error('加载钱包列表失败:', error)
      toast.error(error.message || t('profile.errors.loadWalletsFailed'))
    } finally {
      setWalletLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (isAuthenticated) {
      loadWallets()
    }
  }, [isAuthenticated, loadWallets])

  useEffect(() => {
    if (user) {
      setEmail(user.email || '')
      setNickname(user.nickname || '')
      setBio(user.bio || '')
    }
  }, [user])

  const handleSave = async () => {
    if (!isEditing) {
      setIsEditing(true)
      return
    }

    setIsSaving(true)
    try {
      const updatedUser = await userApi.updateProfile({
        email: email || undefined,
        nickname: nickname || undefined,
        bio: bio || undefined,
      })
      
      // 更新用户上下文
      if (updateUser) {
        updateUser({
          email: updatedUser.email,
          nickname: updatedUser.nickname,
          bio: updatedUser.bio,
        })
      }
      
      toast.success(t('profile.success.updateProfile'))
      setIsEditing(false)
    } catch (error: any) {
      console.error('更新用户信息失败:', error)
      let errorMessage = error.message || t('profile.errors.updateFailed')
      
      if (error.message?.includes('已存在') || error.message?.includes('already exists')) {
        errorMessage = t('profile.errors.emailExists')
      } else if (error.message?.includes('Conflict')) {
        errorMessage = t('profile.errors.emailRegistered')
      }
      
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUnbindWallet = async (walletId: string) => {
    if (!confirm(t('profile.confirm.unbindWallet'))) {
      return
    }
    try {
      await walletApi.remove(walletId)
      toast.success(t('profile.success.walletUnbound'))
      await loadWallets()
    } catch (error: any) {
      console.error('解绑钱包失败:', error)
      toast.error(error.message || t('profile.errors.unbindFailed'))
    }
  }

  const handleSetDefaultWallet = async (walletId: string) => {
    try {
      await walletApi.setDefault(walletId)
      toast.success(t('profile.success.setDefaultWallet'))
      await loadWallets()
    } catch (error: any) {
      console.error('设置默认钱包失败:', error)
      toast.error(error.message || t('profile.errors.setDefaultFailed'))
    }
  }

  const formatWalletName = (type: string) => {
    const mapping: Record<string, string> = {
      metamask: 'MetaMask',
      walletconnect: 'WalletConnect',
      phantom: 'Phantom',
      okx: 'OKX Wallet',
    }
    return mapping[type] || type
  }

  const formatChainName = (chain: string) => {
    const mapping: Record<string, string> = {
      evm: 'EVM',
      solana: 'Solana',
    }
    return mapping[chain] || chain
  }

  const formatAddress = (addr?: string) => {
    if (!addr) return '--'
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (isLoading) {
    return (
      <DashboardLayout userType="user">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <DashboardLayout userType="user">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? t('common.saving') : isEditing ? t('common.save') : t('common.edit')}
            </button>
          </div>

          {/* Avatar Upload */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              {t('profile.avatar.label')}
            </label>
            <AvatarUpload size="lg" />
          </div>

          {/* AX ID */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AX ID
            </label>
            <div className="flex items-center space-x-3">
              <div className="flex-1 bg-gray-50 px-4 py-3 rounded-lg">
                <div className="font-mono text-sm text-gray-900">{user.agentrixId}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('profile.agentrixId.description')}
                </div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(user.agentrixId)
                  toast.success(t('profile.agentrixId.copySuccess'))
                }}
                className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700"
              >
                {t('common.copy')}
              </button>
            </div>
          </div>

          {/* 基本信息 */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.basicInfo.title')}</h2>
            
            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.basicInfo.email')}
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder={t('profile.basicInfo.emailPlaceholder')}
                />
              ) : (
                <div className="px-4 py-2 bg-gray-50 rounded-lg">
                  {user.email || (
                    <span className="text-gray-400">{t('profile.basicInfo.emailNotBound')}</span>
                  )}
                </div>
              )}
            </div>

            {/* Nickname */}
            {isEditing && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('profile.basicInfo.nickname')}
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder={t('profile.basicInfo.nicknamePlaceholder')}
                />
              </div>
            )}

            {/* Bio */}
            {isEditing && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('profile.basicInfo.bio')}
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder={t('profile.basicInfo.bioPlaceholder')}
                />
              </div>
            )}

            {/* 创建时间 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profile.basicInfo.createdAt')}
              </label>
              <div className="px-4 py-2 bg-gray-50 rounded-lg">
                {new Date(user.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>
          </div>

          {/* 绑定的钱包 */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t('profile.wallets.title')}</h2>
              <button
                onClick={() => router.push('/auth/login?mode=wallet&bind=true')}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {t('profile.wallets.bindNew')}
              </button>
            </div>
            {walletLoading ? (
              <div className="space-y-3">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg animate-pulse"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div>
                        <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 w-48 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : wallets.length > 0 ? (
              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                        {formatWalletName(wallet.walletType).charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 flex items-center space-x-2">
                          <span>{formatWalletName(wallet.walletType)}</span>
                          <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full text-gray-600">
                            {formatChainName(wallet.chain)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                          {formatAddress(wallet.walletAddress)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {t('profile.wallets.boundTime')}{new Date(wallet.connectedAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {wallet.isDefault && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          {t('profile.wallets.default')}
                        </span>
                      )}
                      {!wallet.isDefault && (
                        <button
                          onClick={() => handleSetDefaultWallet(wallet.id)}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          {t('profile.wallets.setDefault')}
                        </button>
                      )}
                      <button
                        onClick={() => handleUnbindWallet(wallet.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                      >
                        {t('profile.wallets.unbind')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>{t('profile.wallets.empty')}</p>
                <button
                  onClick={() => router.push('/auth/login?mode=wallet&bind=true')}
                  className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  {t('profile.wallets.goToBind')}
                </button>
              </div>
            )}
          </div>

          {/* 绑定的社交账号 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.social.title')}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {t('profile.social.description')}
            </p>
            <SocialAccountBinding />
          </div>

          {/* KYC状态 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.kyc.title')}</h2>
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${
                user.kycStatus === 'approved' ? 'bg-green-500' :
                user.kycStatus === 'pending' ? 'bg-yellow-500' :
                'bg-gray-400'
              }`}></div>
              <div>
                <div className="font-medium text-gray-900">
                  {user.kycStatus === 'approved' ? t('profile.kyc.status.verified') :
                   user.kycStatus === 'pending' ? t('profile.kyc.status.verifying') :
                   t('profile.kyc.status.notVerified')}
                </div>
                <div className="text-sm text-gray-500">
                  {t('profile.kyc.levelLabel')}{user.kycLevel === 'verified' ? t('profile.kyc.level.verified') :
                            user.kycLevel === 'basic' ? t('profile.kyc.level.basic') : t('profile.kyc.level.none')}
                </div>
              </div>
              <div className="ml-auto">
                <button
                  onClick={() => router.push('/app/user/kyc')}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {user.kycStatus === 'approved' ? t('profile.kyc.viewVerification') : t('profile.kyc.startVerification')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

