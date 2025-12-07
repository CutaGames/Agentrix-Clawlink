import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useUser } from '../../../contexts/UserContext'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

export default function RegisterMerchant() {
  const router = useRouter()
  const { user, registerRole } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    merchantName: '',
    businessType: '',
    address: '',
    phone: '',
    taxId: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await registerRole('merchant')
      router.push('/app/merchant')
    } catch (error) {
      console.error('注册失败:', error)
      alert('注册失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>请先登录</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>注册成为商家 - Agentrix</title>
      </Head>
      <DashboardLayout userType="user">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">注册成为商家</h1>
            <p className="text-gray-600">在Agentrix上销售商品，接受AI Agent推荐带来的订单</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  商家名称 *
                </label>
                <input
                  type="text"
                  value={formData.merchantName}
                  onChange={(e) => setFormData({...formData, merchantName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：联想官方旗舰店"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  经营类型 *
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => setFormData({...formData, businessType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">选择类型</option>
                  <option value="electronics">电子产品</option>
                  <option value="clothing">服装服饰</option>
                  <option value="food">餐饮食品</option>
                  <option value="service">服务类</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  联系地址
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="商家地址"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  联系电话
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="联系电话"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  税务登记号
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="税务登记号（可选）"
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">成为商家的优势</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• 接受AI Agent推荐的订单</li>
                  <li>• 管理商品和订单</li>
                  <li>• 设置分润比例</li>
                  <li>• 查看销售数据和结算</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? '注册中...' : '确认注册'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}
