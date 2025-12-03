import Head from 'next/head'
import { useState } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useUser } from '../../../contexts/UserContext'
import { KYCLevel } from '../../../types/user'

export default function MerchantKYC() {
  const { user, updateKYC } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const kycLevels = [
    {
      level: 'basic' as KYCLevel,
      name: '商户基础认证',
      description: '适用于小型商户，基础身份验证',
      features: ['营业执照验证', '法人身份验证', '联系方式验证'],
      limit: '单笔限额: ¥10,000 | 日限额: ¥50,000'
    },
    {
      level: 'verified' as KYCLevel,
      name: '商户高级认证',
      description: '完整的第三方KYC验证，适用于大型商户',
      features: ['营业执照验证', '法人身份验证', '银行账户验证', '税务登记验证', '第三方认证'],
      limit: '单笔限额: 无限制 | 日限额: 无限制'
    }
  ]

  const handleSubmitKYC = async (level: KYCLevel) => {
    setIsSubmitting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      updateKYC(level, 'pending')
      alert('KYC申请已提交，审核中...')
    } catch (error) {
      console.error('KYC提交失败:', error)
      alert('提交失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">已通过</span>
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">审核中</span>
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">已拒绝</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">未认证</span>
    }
  }

  return (
    <>
      <Head>
        <title>KYC认证 - 商家</title>
      </Head>
      <DashboardLayout userType="merchant">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">KYC身份认证</h1>
            <p className="text-gray-600">一次认证，全平台通用。通过KYC认证后，您可以在Agentrix的所有支付通道中使用已验证的身份</p>
          </div>

          {user && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">当前认证状态</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">认证等级</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {user.kycLevel === 'none' ? '未认证' : user.kycLevel === 'basic' ? '商户基础认证' : '商户高级认证'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">认证状态</p>
                  {getStatusBadge(user.kycStatus)}
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">统一身份桥层</h3>
            <p className="text-blue-700 text-sm mb-4">
              商家用户无需单独处理合规，通过Agentrix的统一身份认证即可获取合规凭证。
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold text-blue-900 mb-1">商户</p>
                <p className="text-blue-700">无需处理合规</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900 mb-1">用户</p>
                <p className="text-blue-700">仅需一次验证</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900 mb-1">Provider</p>
                <p className="text-blue-700">获取合规凭证</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {kycLevels.map((kyc) => (
              <div key={kyc.level} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{kyc.name}</h3>
                    <p className="text-gray-600 mb-3">{kyc.description}</p>
                    <div className="space-y-2 mb-4">
                      {kyc.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center text-sm text-gray-700">
                          <span className="text-green-500 mr-2">✓</span>
                          {feature}
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">{kyc.limit}</p>
                  </div>
                  <div>
                    {user?.kycLevel === kyc.level && user?.kycStatus === 'approved' ? (
                      <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium">
                        已认证
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSubmitKYC(kyc.level)}
                        disabled={isSubmitting || (user?.kycLevel === kyc.level && user?.kycStatus === 'pending')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? '提交中...' : user?.kycLevel === kyc.level && user?.kycStatus === 'pending' ? '审核中' : '申请认证'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Tokenized KYC凭证</h3>
            <p className="text-purple-700 text-sm">
              通过Agentrix认证后，您将获得一个Tokenized KYC凭证，可以在所有支持的支付通道中使用，无需重复验证。
            </p>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}
