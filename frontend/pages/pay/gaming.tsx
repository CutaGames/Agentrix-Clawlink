import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { usePayment } from '../../contexts/PaymentContext'

export default function GamingPayment() {
  const router = useRouter()
  const { startPayment } = usePayment()
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [items] = useState([
    {
      id: 'item_001',
      name: '能量药水 x10',
      price: '¥2.5',
      image: '🧪',
      description: '恢复100点生命值',
      category: '消耗品'
    },
    {
      id: 'item_002',
      name: '黄金宝箱',
      price: '¥9.9',
      image: '📦',
      description: '随机获得稀有道具',
      category: '宝箱'
    },
    {
      id: 'item_003',
      name: '传说武器',
      price: '¥29.9',
      image: '⚔️',
      description: '攻击力+50，永久有效',
      category: '装备'
    },
    {
      id: 'item_004',
      name: 'VIP会员（7天）',
      price: '¥19.9',
      image: '👑',
      description: '经验值+50%，每日奖励',
      category: '会员'
    },
  ])

  const handlePayment = (item: any) => {
    const paymentRequest = {
      id: 'pay_game_' + Date.now(),
      amount: item.price,
      currency: 'CNY',
      description: item.name,
      merchant: '游戏商城',
      metadata: {
        paymentType: 'gaming',
        itemId: item.id,
        itemCategory: item.category,
        isOnChain: true,
        useX402: parseFloat(item.price.replace('¥', '')) <= 10, // 小额使用X402
      },
      createdAt: new Date().toISOString()
    }
    startPayment(paymentRequest)
  }

  return (
    <>
      <Head>
        <title>游戏内购 - Agentrix</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎮</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">游戏商城</h1>
            <p className="text-gray-600">购买道具、装备、会员，提升游戏体验</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow"
              >
                <div className="text-center mb-4">
                  <div className="text-6xl mb-4">{item.image}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{item.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                  <span className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs">
                    {item.category}
                  </span>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">价格</span>
                    <span className="text-2xl font-bold text-gray-900">{item.price}</span>
                  </div>
                  {parseFloat(item.price.replace('¥', '')) <= 10 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-4">
                      <p className="text-xs text-blue-700 text-center">
                        ⚡ 使用X402协议，Gas费降低40%
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => handlePayment(item)}
                    className="w-full bg-pink-500 text-white py-3 rounded-lg font-semibold hover:bg-pink-600 transition-colors"
                  >
                    立即购买
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 游戏支付优势 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">游戏支付优势</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl mb-2">⚡</div>
                <div className="font-semibold text-gray-900">微支付优化</div>
                <div className="text-sm text-gray-600">X402协议降低Gas成本</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🚀</div>
                <div className="font-semibold text-gray-900">快速到账</div>
                <div className="text-sm text-gray-600">3-5秒确认，立即到账</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">💳</div>
                <div className="font-semibold text-gray-900">多种支付</div>
                <div className="text-sm text-gray-600">法币On-ramp转币</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

