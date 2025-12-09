import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState, useEffect } from 'react'
import { useUser } from '../../../contexts/UserContext'
import { merchantApi, type MerchantProfile } from '../../../lib/api/user.api'

export default function MerchantProfilePage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [profile, setProfile] = useState<MerchantProfile>({
    businessName: '',
    businessLicense: '',
    businessDescription: '',
    contactInfo: {
      email: '',
      phone: '',
      address: '',
      website: '',
    },
    businessInfo: {
      registrationDate: '',
      registrationCountry: '',
      taxId: '',
      industry: '',
    },
    documents: [],
  })

  useEffect(() => {
    loadProfile()
  }, [user?.id])

  const loadProfile = async () => {
    try {
      setLoading(true)
      // 使用商户信息API
      const merchantProfile = await merchantApi.getProfile()
      
      setProfile({
        businessName: merchantProfile.businessName || user?.nickname || user?.email || '',
        businessLicense: merchantProfile.businessLicense || '',
        businessDescription: merchantProfile.businessDescription || '',
        contactInfo: {
          email: merchantProfile.contactInfo?.email || user?.email || '',
          phone: merchantProfile.contactInfo?.phone || '',
          address: merchantProfile.contactInfo?.address || '',
          website: merchantProfile.contactInfo?.website || '',
        },
        businessInfo: {
          registrationDate: merchantProfile.businessInfo?.registrationDate ? new Date(merchantProfile.businessInfo.registrationDate).toISOString().split('T')[0] : '',
          registrationCountry: merchantProfile.businessInfo?.registrationCountry || '',
          taxId: merchantProfile.businessInfo?.taxId || '',
          industry: merchantProfile.businessInfo?.industry || '',
        },
        documents: merchantProfile.documents || [],
      })
    } catch (err: any) {
      console.error('加载商户信息失败:', err)
      setError('加载商户信息失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      // 使用商户信息API更新
      await merchantApi.updateProfile({
        businessName: profile.businessName,
        businessLicense: profile.businessLicense,
        businessDescription: profile.businessDescription,
        contactInfo: profile.contactInfo,
        businessInfo: {
          ...profile.businessInfo,
          registrationDate: profile.businessInfo?.registrationDate || undefined,
        },
        documents: profile.documents,
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('保存商户信息失败:', err)
      setError(err.message || '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (file: File, type: 'license' | 'certificate' | 'other') => {
    // TODO: 实现文件上传逻辑
    // 这里应该调用文件上传API，然后更新documents数组
    console.log('上传文件:', file, type)
    // 临时处理：创建本地URL预览
    const url = URL.createObjectURL(file)
    const newDocument = {
      type,
      url,
      uploadedAt: new Date().toISOString(),
    }
    setProfile({
      ...profile,
      documents: [...(profile.documents || []), newDocument],
    })
  }

  if (loading) {
    return (
      <DashboardLayout userType="merchant">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <>
      <Head>
        <title>商户信息 - Agentrix</title>
      </Head>
      <DashboardLayout userType="merchant">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">商户信息管理</h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              商户信息已保存
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本信息 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    商户名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profile.businessName}
                    onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    营业执照号
                  </label>
                  <input
                    type="text"
                    value={profile.businessLicense}
                    onChange={(e) => setProfile({ ...profile, businessLicense: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    商户描述
                  </label>
                  <textarea
                    value={profile.businessDescription}
                    onChange={(e) => setProfile({ ...profile, businessDescription: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="描述您的业务..."
                  />
                </div>
              </div>
            </div>

            {/* 联系信息 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">联系信息</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={profile.contactInfo?.email}
                    onChange={(e) => setProfile({
                      ...profile,
                      contactInfo: { ...profile.contactInfo, email: e.target.value },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    电话
                  </label>
                  <input
                    type="tel"
                    value={profile.contactInfo?.phone}
                    onChange={(e) => setProfile({
                      ...profile,
                      contactInfo: { ...profile.contactInfo, phone: e.target.value },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    地址
                  </label>
                  <input
                    type="text"
                    value={profile.contactInfo?.address}
                    onChange={(e) => setProfile({
                      ...profile,
                      contactInfo: { ...profile.contactInfo, address: e.target.value },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    网站
                  </label>
                  <input
                    type="url"
                    value={profile.contactInfo?.website}
                    onChange={(e) => setProfile({
                      ...profile,
                      contactInfo: { ...profile.contactInfo, website: e.target.value },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://"
                  />
                </div>
              </div>
            </div>

            {/* 企业信息 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">企业信息</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    注册日期
                  </label>
                  <input
                    type="date"
                    value={profile.businessInfo?.registrationDate}
                    onChange={(e) => setProfile({
                      ...profile,
                      businessInfo: { ...profile.businessInfo, registrationDate: e.target.value },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    注册国家
                  </label>
                  <input
                    type="text"
                    value={profile.businessInfo?.registrationCountry}
                    onChange={(e) => setProfile({
                      ...profile,
                      businessInfo: { ...profile.businessInfo, registrationCountry: e.target.value },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    税务登记号
                  </label>
                  <input
                    type="text"
                    value={profile.businessInfo?.taxId}
                    onChange={(e) => setProfile({
                      ...profile,
                      businessInfo: { ...profile.businessInfo, taxId: e.target.value },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    行业
                  </label>
                  <input
                    type="text"
                    value={profile.businessInfo?.industry}
                    onChange={(e) => setProfile({
                      ...profile,
                      businessInfo: { ...profile.businessInfo, industry: e.target.value },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 文档上传 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">相关文档</h2>
              
              <div className="space-y-4">
                {profile.documents && profile.documents.length > 0 && (
                  <div className="space-y-2">
                    {profile.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600">{doc.type}</span>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                            查看文档
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newDocs = [...profile.documents!]
                            newDocs.splice(index, 1)
                            setProfile({ ...profile, documents: newDocs })
                          }}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex space-x-2">
                  <label className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center cursor-pointer hover:bg-gray-50">
                    <span className="text-sm text-gray-700">上传营业执照</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file, 'license')
                      }}
                    />
                  </label>
                  <label className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center cursor-pointer hover:bg-gray-50">
                    <span className="text-sm text-gray-700">上传证书</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file, 'certificate')
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={loadProfile}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </>
  )
}

