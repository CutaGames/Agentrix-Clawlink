import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useWeb3 } from '../../../contexts/Web3Context'
import { useLocalization } from '../../../contexts/LocalizationContext'

interface Wallet {
  id: string
  type: string
  address: string
  chain: string
  balance?: string
  isDefault: boolean
}

export default function UserWallets() {
  const { t } = useLocalization()
  const { connectedWallets, defaultWallet, connect, disconnect, setDefault } = useWeb3()
  const [wallets, setWallets] = useState<Wallet[]>([])

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

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>{t('wallets.title')} - {t('userCenter.title')}</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('wallets.title')}</h1>
            <p className="text-gray-600 mt-1">{t('wallets.description')}</p>
          </div>
          <button
            onClick={() => handleConnect('metamask')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {t('wallets.connect')}
          </button>
        </div>

        {wallets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-4xl mb-4">👛</div>
            <p className="text-gray-600 mb-4">{t('wallets.empty')}</p>
            <button
              onClick={() => handleConnect('metamask')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              {t('wallets.connect')}
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
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">{t('wallets.default')}</span>
                  )}
                </div>
                <div className="space-y-2 mb-4">
                  <div className="text-sm">
                    <span className="text-gray-600">{t('wallets.chain')}:</span>{' '}
                    <span className="font-medium text-gray-900 capitalize">{wallet.chain}</span>
                  </div>
                  {wallet.balance && (
                    <div className="text-sm">
                      <span className="text-gray-600">{t('wallets.balance')}:</span>{' '}
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
                      {t('wallets.setDefault')}
                    </button>
                  )}
                  <button
                    onClick={() => handleDisconnect(wallet.id)}
                    className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm"
                  >
                    {t('wallets.disconnect')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
