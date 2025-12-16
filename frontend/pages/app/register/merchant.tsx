import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useUser } from '../../../contexts/UserContext'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useLocalization } from '../../../contexts/LocalizationContext'

export default function RegisterMerchant() {
  const router = useRouter()
  const { user, registerRole } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { t } = useLocalization()
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
      await registerRole('merchant', {
        businessName: formData.merchantName,
        businessType: formData.businessType,
        contactInfo: {
          address: formData.address,
          phone: formData.phone
        },
        businessInfo: {
          taxId: formData.taxId
        }
      })
      router.push('/app/merchant')
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
        <p>{t({ zh: '请先登录', en: 'Please log in first' })}</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{t({ zh: '注册成为商家', en: 'Register as Merchant' })} - Agentrix</title>
      </Head>
      <DashboardLayout userType="user">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t({ zh: '注册成为商家', en: 'Register as Merchant' })}</h1>
            <p className="text-gray-600">{t({ zh: '在Agentrix上销售商品，接受AI Agent推荐带来的订单', en: 'Sell products on Agentrix and accept orders recommended by AI Agents' })}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t({ zh: '商家名称', en: 'Merchant Name' })} *
                </label>
                <input
                  type="text"
                  value={formData.merchantName}
                  onChange={(e) => setFormData({...formData, merchantName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t({ zh: '例如：联想官方旗舰店', en: 'e.g., Lenovo Official Store' })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t({ zh: '经营类型', en: 'Business Type' })} *
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => setFormData({...formData, businessType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{t({ zh: '选择类型', en: 'Select Type' })}</option>
                  <option value="electronics">{t({ zh: '电子产品', en: 'Electronics' })}</option>
                  <option value="clothing">{t({ zh: '服装服饰', en: 'Clothing & Fashion' })}</option>
                  <option value="food">{t({ zh: '餐饮食品', en: 'Food & Beverage' })}</option>
                  <option value="service">{t({ zh: '服务类', en: 'Services' })}</option>
                  <option value="other">{t({ zh: '其他', en: 'Other' })}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t({ zh: '联系地址', en: 'Contact Address' })}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t({ zh: '商家地址', en: 'Merchant Address' })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t({ zh: '联系电话', en: 'Contact Phone' })}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t({ zh: '联系电话', en: 'Contact Phone' })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t({ zh: '税务登记号', en: 'Tax ID' })}
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t({ zh: '税务登记号（可选）', en: 'Tax ID (Optional)' })}
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">{t({ zh: '成为商家的优势', en: 'Benefits of Becoming a Merchant' })}</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• {t({ zh: '接受AI Agent推荐的订单', en: 'Accept orders recommended by AI Agents' })}</li>
                  <li>• {t({ zh: '管理商品和订单', en: 'Manage products and orders' })}</li>
                  <li>• {t({ zh: '设置分润比例', en: 'Set profit-sharing ratios' })}</li>
                  <li>• {t({ zh: '查看销售数据和结算', en: 'View sales data and settlements' })}</li>
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
