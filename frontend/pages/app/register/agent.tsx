import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useUser } from '../../../contexts/UserContext'
import { useLocalization } from '../../../contexts/LocalizationContext'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

export default function RegisterAgent() {
  const router = useRouter()
  const { user, registerRole } = useUser()
  const { t } = useLocalization()
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
      alert(t({ zh: '注册失败，请重试', en: 'Registration failed, please try again' }))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t({ zh: '请先登录', en: 'Please login first' })}</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{t({ zh: '注册成为Agent - Agentrix', en: 'Register as Agent - Agentrix' })}</title>
      </Head>
      <DashboardLayout userType="user">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t({ zh: '注册成为Agent', en: 'Register as Agent' })}</h1>
            <p className="text-gray-600">{t({ zh: '成为AX Agent，为用户推荐商品并获得收益', en: 'Become an AX Agent, recommend products to users and earn commissions' })}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t({ zh: 'Agent名称 *', en: 'Agent Name *' })}
                </label>
                <input
                  type="text"
                  value={formData.agentName}
                  onChange={(e) => setFormData({...formData, agentName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t({ zh: '例如：AI购物助手', en: 'Example: AI Shopping Assistant' })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t({ zh: '描述', en: 'Description' })}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder={t({ zh: '描述您的Agent功能和特点', en: 'Describe your Agent features and characteristics' })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t({ zh: '网站/链接', en: 'Website/Link' })}
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
                  {t({ zh: '分类', en: 'Category' })}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t({ zh: '选择分类', en: 'Select Category' })}</option>
                  <option value="shopping">{t({ zh: '购物推荐', en: 'Shopping Recommendations' })}</option>
                  <option value="finance">{t({ zh: '金融服务', en: 'Financial Services' })}</option>
                  <option value="travel">{t({ zh: '旅行预订', en: 'Travel Booking' })}</option>
                  <option value="food">{t({ zh: '餐饮外卖', en: 'Food Delivery' })}</option>
                  <option value="other">{t({ zh: '其他', en: 'Other' })}</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">{t({ zh: '成为Agent的优势', en: 'Benefits of Becoming an Agent' })}</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• {t({ zh: '为用户推荐商品并获得佣金', en: 'Recommend products to users and earn commissions' })}</li>
                  <li>• {t({ zh: '访问完整的Agent工具和API', en: 'Access to complete Agent tools and APIs' })}</li>
                  <li>• {t({ zh: '查看详细的收益数据和分析', en: 'View detailed earnings data and analytics' })}</li>
                  <li>• {t({ zh: '管理用户支付授权', en: 'Manage user payment authorizations' })}</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  {t({ zh: '取消', en: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? t({ zh: '注册中...', en: 'Registering...' }) : t({ zh: '确认注册', en: 'Confirm Registration' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}
