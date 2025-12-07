import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useUser } from '../../../contexts/UserContext'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

export default function RegisterAgent() {
  const router = useRouter()
  const { user, registerRole } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    agentName: '',
    description: '',
    website: '',
    category: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await registerRole('agent')
      router.push('/app/agent')
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
        <title>注册成为Agent - Agentrix</title>
      </Head>
      <DashboardLayout userType="user">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">注册成为Agent</h1>
            <p className="text-gray-600">成为Agentrix Agent，为用户推荐商品并获得收益</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent名称 *
                </label>
                <input
                  type="text"
                  value={formData.agentName}
                  onChange={(e) => setFormData({...formData, agentName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如：AI购物助手"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="描述您的Agent功能和特点"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  网站/链接
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择分类</option>
                  <option value="shopping">购物推荐</option>
                  <option value="finance">金融服务</option>
                  <option value="travel">旅行预订</option>
                  <option value="food">餐饮外卖</option>
                  <option value="other">其他</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">成为Agent的优势</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 为用户推荐商品并获得佣金</li>
                  <li>• 访问完整的Agent工具和API</li>
                  <li>• 查看详细的收益数据和分析</li>
                  <li>• 管理用户支付授权</li>
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
