import Head from 'next/head'
import { useState } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useLocalization } from '../../../contexts/LocalizationContext'
import { SessionManager } from '../../../components/payment/SessionManager'

export default function UserSecurity() {
  const { t } = useLocalization()
  const [kycLevel, setKycLevel] = useState<'NONE' | 'BASIC' | 'VERIFIED' | 'ENHANCED'>('BASIC')
  const [dailyLimit, setDailyLimit] = useState(10000)
  const [monthlyLimit, setMonthlyLimit] = useState(100000)
  const [devices, setDevices] = useState([
    { id: '1', name: 'iPhone 15 Pro', lastActive: '2025-01-15T10:00:00Z', current: true },
    { id: '2', name: 'MacBook Pro', lastActive: '2025-01-14T15:00:00Z', current: false },
  ])

  const getKycStatus = () => {
    const status: Record<string, { text: string; color: string }> = {
      NONE: { text: t('security.kyc.none'), color: 'text-gray-600 bg-gray-50' },
      BASIC: { text: t('security.kyc.basic'), color: 'text-blue-600 bg-blue-50' },
      VERIFIED: { text: t('security.kyc.verified'), color: 'text-green-600 bg-green-50' },
      ENHANCED: { text: t('security.kyc.enhanced'), color: 'text-purple-600 bg-purple-50' },
    }
    return status[kycLevel] || status.NONE
  }

  const removeDevice = (id: string) => {
    if (confirm(t('security.device.confirmRemove'))) {
      setDevices(devices.filter(d => d.id !== id))
    }
  }

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>{t('security.title')} - {t('userCenter.title')}</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('security.title')}</h1>
          <p className="text-gray-600 mt-1">{t('security.description')}</p>
        </div>

        {/* KYC状态 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('security.kyc.title')}</h2>
          <div className="flex items-center justify-between">
            <div>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getKycStatus().color}`}>
                {getKycStatus().text}
              </span>
              <p className="text-sm text-gray-600 mt-2">
                {kycLevel === 'NONE' && t('security.kyc.noneDesc')}
                {kycLevel === 'BASIC' && t('security.kyc.basicDesc')}
                {kycLevel === 'VERIFIED' && t('security.kyc.verifiedDesc')}
                {kycLevel === 'ENHANCED' && t('security.kyc.enhancedDesc')}
              </p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {kycLevel === 'NONE' ? t('security.kyc.start') : t('security.kyc.upgrade')}
            </button>
          </div>
        </div>

        {/* 交易限额 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('security.limits.title')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('security.limits.daily')} (¥)</label>
              <input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('security.limits.monthly')} (¥)</label>
              <input
                type="number"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              {t('security.limits.save')}
            </button>
          </div>
        </div>

        {/* 设备管理 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('security.devices.title')}</h2>
          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{device.name}</span>
                    {device.current && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">{t('security.devices.current')}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('security.devices.lastActive')}: {new Date(device.lastActive).toLocaleString('zh-CN')}
                  </p>
                </div>
                {!device.current && (
                  <button
                    onClick={() => removeDevice(device.id)}
                    className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    {t('security.devices.remove')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 代理授权管理 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('security.agentAuth.title') || 'Agent Authorizations'}</h2>
          <p className="text-sm text-gray-600 mb-6">
            {t('security.agentAuth.description') || 'Manage your agent authorizations for gasless and quick payments.'}
          </p>
          <SessionManager />
        </div>
      </div>
    </DashboardLayout>
  )
}
