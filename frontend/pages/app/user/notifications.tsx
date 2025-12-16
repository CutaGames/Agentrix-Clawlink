import Head from 'next/head'
import { useState } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useLocalization } from '../../../contexts/LocalizationContext'

interface NotificationSetting {
  id: string
  name: string
  description: string
  email: boolean
  push: boolean
  sms: boolean
}

export default function UserNotifications() {
  const { t } = useLocalization()
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'payment',
      name: t('notifications.payment.name'),
      description: t('notifications.payment.description'),
      email: true,
      push: true,
      sms: false,
    },
    {
      id: 'subscription',
      name: t('notifications.subscription.name'),
      description: t('notifications.subscription.description'),
      email: true,
      push: true,
      sms: false,
    },
    {
      id: 'security',
      name: t('notifications.security.name'),
      description: t('notifications.security.description'),
      email: true,
      push: true,
      sms: true,
    },
  ])

  const updateSetting = (id: string, type: 'email' | 'push' | 'sms', value: boolean) => {
    setSettings(settings.map(s => 
      s.id === id ? { ...s, [type]: value } : s
    ))
  }

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>{t('notifications.title')} - {t('userCenter.title')}</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('notifications.title')}</h1>
          <p className="text-gray-600 mt-1">{t('notifications.description')}</p>
        </div>

        <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
          {settings.map((setting) => (
            <div key={setting.id} className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{setting.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setting.email}
                    onChange={(e) => updateSetting(setting.id, 'email', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{t('notifications.methods.email')}</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setting.push}
                    onChange={(e) => updateSetting(setting.id, 'push', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{t('notifications.methods.push')}</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setting.sms}
                    onChange={(e) => updateSetting(setting.id, 'sms', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{t('notifications.methods.sms')}</span>
                </label>
              </div>
            </div>
          ))}
          <div className="p-6 bg-gray-50">
            <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              {t('notifications.save')}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
