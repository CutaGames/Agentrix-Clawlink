import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { walletApi, WalletConnection } from '../../../lib/api/wallet.api'
import { useLocalization } from '../../../contexts/LocalizationContext'

interface PaymentMethod {
  id: string
  type: 'card' | 'apple_pay' | 'google_pay' | 'crypto'
  name: string
  details: string
  isDefault: boolean
  lastUsed?: string
}

export default function UserPaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [wallets, setWallets] = useState<WalletConnection[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useLocalization()

  useEffect(() => {
    loadMethods()
  }, [])

  const loadMethods = async () => {
    setLoading(true)
    try {
      // 从真实API获取钱包列表
      const walletList = await walletApi.list()
      setWallets(walletList)
      
      // 将钱包转换为支付方式格式
      const walletMethods: PaymentMethod[] = walletList.map(w => ({
        id: w.id,
        type: 'crypto' as const,
        name: `${w.walletType} ${w.walletAddress.slice(0, 6)}...${w.walletAddress.slice(-4)}`,
        details: `${w.chain} 链`,
        isDefault: w.isDefault,
        lastUsed: w.lastUsedAt,
      }))
      
      setMethods(walletMethods)
    } catch (error) {
      console.error('加载支付方式失败:', error)
      setMethods([])
    } finally {
      setLoading(false)
    }
  }

  const setDefault = async (id: string) => {
    try {
      await walletApi.setDefault(id)
      setMethods(methods.map(m => ({ ...m, isDefault: m.id === id })))
    } catch (error) {
      console.error('设置默认支付方式失败:', error)
      alert(t('paymentMethods.setDefaultFailed'))
    }
  }

  const deleteMethod = async (id: string) => {
    if (confirm(t('paymentMethods.confirmDelete'))) {
      try {
        await walletApi.remove(id)
        setMethods(methods.filter(m => m.id !== id))
      } catch (error) {
        console.error('删除支付方式失败:', error)
        alert(t('paymentMethods.deleteFailed'))
      }
    }
  }

  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      card: '💳',
      apple_pay: '🍎',
      google_pay: '📱',
      crypto: '₿',
    }
    return icons[type] || '💳'
  }

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>{t('paymentMethods.pageTitle')} - {t('common.userCenter')}</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('paymentMethods.pageTitle')}</h1>
            <p className="text-gray-600 mt-1">{t('paymentMethods.pageDescription')}</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            {t('paymentMethods.addMethod')}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : methods.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-4xl mb-4">💳</div>
            <p className="text-gray-600 mb-4">{t('paymentMethods.noMethods')}</p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
              {t('paymentMethods.addMethod')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {methods.map((method) => (
              <div key={method.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">{getIcon(method.type)}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{method.name}</h3>
                      <p className="text-sm text-gray-500">{method.details}</p>
                      {method.lastUsed && (
                        <p className="text-xs text-gray-400 mt-1">
                          {t('paymentMethods.lastUsed')}: {new Date(method.lastUsed).toLocaleDateString('zh-CN')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {method.isDefault ? (
                      <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full">{t('paymentMethods.default')}</span>
                    ) : (
                      <button
                        onClick={() => setDefault(method.id)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        {t('paymentMethods.setAsDefault')}
                      </button>
                    )}
                    <button
                      onClick={() => deleteMethod(method.id)}
                      className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      {t('paymentMethods.delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
