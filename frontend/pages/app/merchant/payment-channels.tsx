import Head from 'next/head'
import { useState } from 'react'

interface PaymentChannel {
  id: string
  name: string
  type: 'fiat' | 'crypto' | 'x402'
  enabled: boolean
  fee: number
  minAmount: number
  maxAmount: number
  supportedCurrencies: string[]
}

export default function PaymentChannels() {
  const [channels, setChannels] = useState<PaymentChannel[]>([
    {
      id: 'stripe',
      name: 'Stripe',
      type: 'fiat',
      enabled: true,
      fee: 2.9,
      minAmount: 0.5,
      maxAmount: 10000,
      supportedCurrencies: ['USD', 'EUR', 'GBP'],
    },
    {
      id: 'apple_pay',
      name: 'Apple Pay',
      type: 'fiat',
      enabled: true,
      fee: 2.9,
      minAmount: 0.5,
      maxAmount: 10000,
      supportedCurrencies: ['USD', 'EUR', 'GBP'],
    },
    {
      id: 'crypto',
      name: '加密货币',
      type: 'crypto',
      enabled: true,
      fee: 1.0,
      minAmount: 1,
      maxAmount: 100000,
      supportedCurrencies: ['USDC', 'USDT', 'ETH'],
    },
    {
      id: 'x402',
      name: 'X402协议',
      type: 'x402',
      enabled: true,
      fee: 0.5,
      minAmount: 0.1,
      maxAmount: 1000,
      supportedCurrencies: ['USDC'],
    },
  ])

  const toggleChannel = (id: string) => {
    setChannels(channels.map(ch => ch.id === id ? { ...ch, enabled: !ch.enabled } : ch))
  }

  return (
    <>
      <Head>
        <title>支付渠道配置 - 商户中心</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">支付渠道配置</h1>
            <p className="text-gray-600">管理您的支付方式和设置</p>
          </div>

          <div className="space-y-6">
            {channels.map((channel) => (
              <div key={channel.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl">
                      {channel.type === 'fiat' ? '💳' : channel.type === 'crypto' ? '👛' : '⚡'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{channel.name}</h3>
                      <p className="text-sm text-gray-600">
                        {channel.type === 'fiat' ? '法币支付' : channel.type === 'crypto' ? '加密货币' : 'X402协议'}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channel.enabled}
                      onChange={() => toggleChannel(channel.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {channel.enabled && (
                  <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">手续费 (%)</label>
                      <input
                        type="number"
                        value={channel.fee}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">最小金额</label>
                      <input
                        type="number"
                        value={channel.minAmount}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">最大金额</label>
                      <input
                        type="number"
                        value={channel.maxAmount}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">支持货币</label>
                      <input
                        type="text"
                        value={channel.supportedCurrencies.join(', ')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              保存配置
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

