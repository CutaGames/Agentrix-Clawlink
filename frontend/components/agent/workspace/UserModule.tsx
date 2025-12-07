import { useState, useCallback, useEffect } from 'react'
import { useUser } from '../../../contexts/UserContext'
import { useLocalization } from '../../../contexts/LocalizationContext'
import { useWeb3 } from '../../../contexts/Web3Context'
import { paymentApi } from '../../../lib/api/payment.api'
import { walletApi } from '../../../lib/api/wallet.api'

interface UserModuleProps {
  onCommand?: (command: string, data?: any) => any
}

/**
 * 用户功能模块
 * 集成支付历史、钱包管理、KYC、订单跟踪等功能
 */
export function UserModule({ onCommand }: UserModuleProps) {
  const { t } = useLocalization()
  const { user } = useUser()
  const { connectedWallets } = useWeb3()
  const [activeTab, setActiveTab] = useState<'payments' | 'wallets' | 'kyc' | 'orders'>('payments')
  const [payments, setPayments] = useState<any[]>([])
  const [wallets, setWallets] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadPayments = useCallback(async () => {
    setLoading(true)
    try {
      // 尝试调用支付历史API
      const payments = await paymentApi.getUserAgentPayments()
      setPayments(
        payments.map((p: any) => ({
          id: p.id || `pay_${Date.now()}`,
          amount: p.amount || 0,
          currency: p.currency || 'CNY',
          status: p.status || 'completed',
          description: p.description || '支付',
          createdAt: p.createdAt || new Date().toISOString(),
        })),
      )
    } catch (error: any) {
      console.error('加载支付历史失败:', error)
      // 如果API失败，使用mock数据作为fallback
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        setPayments([])
      } else {
        setPayments([
          {
            id: 'pay_001',
            amount: 99.00,
            currency: 'CNY',
            status: 'completed',
            description: 'X402协议支付演示',
            createdAt: new Date().toISOString(),
          },
        ])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const loadWallets = useCallback(async () => {
    setLoading(true)
    try {
      const data = await walletApi.list()
      setWallets(data || [])
    } catch (error) {
      console.error('加载钱包失败:', error)
      setWallets(connectedWallets.map(w => ({
        id: w.id,
        type: w.type,
        address: w.address,
        balance: w.balance,
      })))
    } finally {
      setLoading(false)
    }
  }, [connectedWallets])

  useEffect(() => {
    if (activeTab === 'payments') {
      loadPayments()
    } else if (activeTab === 'wallets') {
      loadWallets()
    }
  }, [activeTab, loadPayments, loadWallets])

  // 处理命令
  useEffect(() => {
    if (onCommand) {
      const handleCommand = (command: string) => {
        const result = onCommand(command)
        if (result?.view === 'user') {
          if (command.includes('支付') || command.includes('payment')) {
            setActiveTab('payments')
          } else if (command.includes('钱包') || command.includes('wallet')) {
            setActiveTab('wallets')
          } else if (command.includes('kyc') || command.includes('认证')) {
            setActiveTab('kyc')
          } else if (command.includes('订单') || command.includes('order')) {
            setActiveTab('orders')
          }
        }
      }
      // 可以在这里监听命令
    }
  }, [onCommand])

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* 标签页 */}
      <div className="border-b border-white/10 bg-slate-900/50 px-6">
        <div className="flex space-x-1">
          {[
            { key: 'payments' as const, label: { zh: '支付历史', en: 'Payment History' } },
            { key: 'wallets' as const, label: { zh: '钱包管理', en: 'Wallet Management' } },
            { key: 'kyc' as const, label: { zh: 'KYC认证', en: 'KYC Verification' } },
            { key: 'orders' as const, label: { zh: '订单跟踪', en: 'Order Tracking' } },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t({ zh: '支付历史', en: 'Payment History' })}</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                {t({ zh: '导出', en: 'Export' })}
              </button>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                {t({ zh: '暂无支付记录', en: 'No payment records' })}
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{payment.description || payment.id}</p>
                        <p className="text-sm text-slate-400">
                          {new Date(payment.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {payment.currency} {payment.amount}
                        </p>
                        <p className={`text-sm ${
                          payment.status === 'completed' ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {payment.status === 'completed' ? t({ zh: '已完成', en: 'Completed' }) : t({ zh: '处理中', en: 'Processing' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'wallets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t({ zh: '钱包管理', en: 'Wallet Management' })}</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                {t({ zh: '添加钱包', en: 'Add Wallet' })}
              </button>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : wallets.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                {t({ zh: '暂未绑定钱包', en: 'No wallets connected' })}
              </div>
            ) : (
              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <div key={wallet.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{wallet.type}</p>
                        <p className="text-sm text-slate-400 font-mono">{wallet.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{wallet.balance || '0'}</p>
                        <button className="text-sm text-blue-400 hover:text-blue-300 mt-2">
                          {t({ zh: '管理', en: 'Manage' })}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'kyc' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">{t({ zh: 'KYC认证', en: 'KYC Verification' })}</h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <div className="text-center space-y-4">
                <div className="text-4xl mb-4">
                  {user?.kycLevel === 'verified' ? '✅' : '⏳'}
                </div>
                <p className="text-lg font-semibold">
                  {user?.kycLevel === 'verified'
                    ? t({ zh: 'KYC认证已完成', en: 'KYC Verification Completed' })
                    : t({ zh: 'KYC认证未完成', en: 'KYC Verification Not Completed' })}
                </p>
                {user?.kycLevel !== 'verified' && (
                  <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                    {t({ zh: '开始认证', en: 'Start Verification' })}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">{t({ zh: '订单跟踪', en: 'Order Tracking' })}</h3>
            <div className="text-center py-12 text-slate-400">
              {t({ zh: '订单功能开发中...', en: 'Order feature under development...' })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

