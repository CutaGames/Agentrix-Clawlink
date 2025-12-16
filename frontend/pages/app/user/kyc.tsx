import Head from 'next/head'
import { useState } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useUser } from '../../../contexts/UserContext'
import { KYCLevel } from '../../../types/user'
import { useLocalization } from '../../../contexts/LocalizationContext'

export default function UserKYC() {
  const { user, updateKYC } = useUser()
  const [selectedLevel, setSelectedLevel] = useState<KYCLevel>('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { t } = useLocalization()

  const kycLevels = [
    {
      level: 'basic' as KYCLevel,
      name: t({ zh: '初级KYC', en: 'Basic KYC' }),
      description: t({ zh: '基础身份验证，适用于小额交易', en: 'Basic identity verification for small transactions' }),
      features: [
        t({ zh: '身份信息验证', en: 'Identity verification' }),
        t({ zh: '手机号验证', en: 'Phone verification' }),
        t({ zh: '邮箱验证', en: 'Email verification' })
      ],
      limit: t({ zh: '单笔限额: ¥1,000 | 日限额: ¥5,000', en: 'Per transaction: ¥1,000 | Daily: ¥5,000' })
    },
    {
      level: 'verified' as KYCLevel,
      name: t({ zh: '第三方KYC', en: 'Third-party KYC' }),
      description: t({ zh: '完整的第三方KYC验证，适用于大额交易', en: 'Complete third-party KYC verification for large transactions' }),
      features: [
        t({ zh: '身份信息验证', en: 'Identity verification' }),
        t({ zh: '人脸识别', en: 'Facial recognition' }),
        t({ zh: '证件上传', en: 'Document upload' }),
        t({ zh: '地址验证', en: 'Address verification' }),
        t({ zh: '第三方认证', en: 'Third-party authentication' })
      ],
      limit: t({ zh: '单笔限额: 无限制 | 日限额: 无限制', en: 'Per transaction: Unlimited | Daily: Unlimited' })
    }
  ]

  const handleSubmitKYC = async (level: KYCLevel) => {
    setIsSubmitting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      updateKYC(level, 'pending')
      alert(t({ zh: 'KYC申请已提交，审核中...', en: 'KYC application submitted, under review...' }))
    } catch (error) {
      console.error('KYC提交失败:', error)
      alert(t({ zh: '提交失败，请重试', en: 'Submission failed, please try again' }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">{t({ zh: '已通过', en: 'Approved' })}</span>
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">{t({ zh: '审核中', en: 'Pending' })}</span>
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">{t({ zh: '已拒绝', en: 'Rejected' })}</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">{t({ zh: '未认证', en: 'Not Verified' })}</span>
    }
  }

  return (
    <>
      <Head>
        <title>{t({ zh: 'KYC认证', en: 'KYC Verification' })} - Agentrix</title>
      </Head>
      <DashboardLayout userType="user">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t({ zh: 'KYC身份认证', en: 'KYC Identity Verification' })}</h1>
            <p className="text-gray-600">{t({ zh: '一次认证，全平台通用。通过KYC认证后，您可以在Agentrix的所有支付通道中使用已验证的身份', en: 'One verification, universal across all platforms. After KYC verification, you can use your verified identity across all Agentrix payment channels' })}</p>
          </div>

          {user && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t({ zh: '当前认证状态', en: 'Current Verification Status' })}</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t({ zh: '认证等级', en: 'Verification Level' })}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {user.kycLevel === 'none' ? t({ zh: '未认证', en: 'Not Verified' }) : user.kycLevel === 'basic' ? t({ zh: '初级KYC', en: 'Basic KYC' }) : t({ zh: '第三方KYC', en: 'Third-party KYC' })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t({ zh: '认证状态', en: 'Verification Status' })}</p>
                  {getStatusBadge(user.kycStatus)}
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">{t({ zh: '统一身份桥层', en: 'Unified Identity Bridge' })}</h3>
            <p className="text-blue-700 text-sm mb-4">
              {t({ zh: '通过Agentrix的统一身份认证，您只需完成一次KYC验证，即可在所有支付通道中使用已验证的身份。', en: 'With Agentrix unified identity verification, you only need to complete KYC verification once to use your verified identity across all payment channels.' })}
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold text-blue-900 mb-1">{t({ zh: '用户', en: 'Users' })}</p>
                <p className="text-blue-700">{t({ zh: '仅需一次验证', en: 'One-time verification' })}</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900 mb-1">{t({ zh: '商户/Agent', en: 'Merchants/Agents' })}</p>
                <p className="text-blue-700">{t({ zh: '无需处理合规', en: 'No compliance handling' })}</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900 mb-1">{t({ zh: 'Provider', en: 'Providers' })}</p>
                <p className="text-blue-700">{t({ zh: '获取合规凭证', en: 'Get compliance credentials' })}</p>
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
                        {t({ zh: '已认证', en: 'Verified' })}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSubmitKYC(kyc.level)}
                        disabled={isSubmitting || (user?.kycLevel === kyc.level && user?.kycStatus === 'pending')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? t({ zh: '提交中...', en: 'Submitting...' }) : user?.kycLevel === kyc.level && user?.kycStatus === 'pending' ? t({ zh: '审核中', en: 'Under Review' }) : t({ zh: '申请认证', en: 'Apply for Verification' })}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">{t({ zh: 'Tokenized KYC凭证', en: 'Tokenized KYC Credentials' })}</h3>
            <p className="text-purple-700 text-sm">
              {t({ zh: '通过Agentrix认证后，您将获得一个Tokenized KYC凭证，可以在所有支持的支付通道中使用，无需重复验证。', en: 'After Agentrix verification, you will receive a Tokenized KYC credential that can be used across all supported payment channels without repeated verification.' })}
            </p>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}
