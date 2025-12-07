import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { merchantApi } from '../../../lib/api/merchant.api'
import { useToast } from '../../../contexts/ToastContext'

export default function MerchantMultiChainAccounts() {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    setLoading(true)
    try {
      const data = await merchantApi.getMultiChainSummary()
      setSummary(data)
    } catch (error: any) {
      console.error('加载多链账户失败:', error)
      showToast('error', '加载多链账户失败')
    } finally {
      setLoading(false)
    }
  }

  const getChainIcon = (chain: string) => {
    const icons: Record<string, string> = {
      ethereum: '⛓️',
      solana: '🔷',
      bsc: '🟡',
      polygon: '🟣',
    }
    return icons[chain.toLowerCase()] || '🔗'
  }

  const getChainName = (chain: string) => {
    const names: Record<string, string> = {
      ethereum: 'Ethereum',
      solana: 'Solana',
      bsc: 'BSC',
      polygon: 'Polygon',
    }
    return names[chain.toLowerCase()] || chain
  }

  return (
    <DashboardLayout userType="merchant">
      <Head>
        <title>多链账户 - 商家中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">多链账户</h1>
          <p className="text-gray-600 mt-1">查看和管理您的多链账户余额</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : summary ? (
          <>
            {/* 总览卡片 */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <p className="text-sm opacity-90 mb-2">总余额</p>
              <p className="text-3xl font-bold mb-1">
                ${summary.totalBalanceUSD?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm opacity-75">
                最后更新: {new Date(summary.lastUpdated).toLocaleString('zh-CN')}
              </p>
            </div>

            {/* 账户列表 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {summary.accounts?.map((account: any) => (
                <div key={`${account.chain}_${account.currency}`} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getChainIcon(account.chain)}</span>
                      <div>
                        <p className="font-semibold text-gray-900">{getChainName(account.chain)}</p>
                        <p className="text-sm text-gray-500">{account.currency}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">余额</span>
                      <span className="text-lg font-bold text-gray-900">
                        {account.balance.toFixed(2)} {account.currency}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">地址</span>
                      <span className="text-gray-700 font-mono text-xs">
                        {account.address?.substring(0, 8)}...{account.address?.substring(account.address.length - 6)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      更新: {new Date(account.lastUpdated).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(!summary.accounts || summary.accounts.length === 0) && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">暂无多链账户数据</p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">加载失败</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

