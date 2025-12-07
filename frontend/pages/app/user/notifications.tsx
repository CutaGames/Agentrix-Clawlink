import Head from 'next/head'
import { useState } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

interface NotificationSetting {
  id: string
  name: string
  description: string
  email: boolean
  push: boolean
  sms: boolean
}

export default function UserNotifications() {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'payment',
      name: '支付通知',
      description: '支付成功、失败、退款等通知',
      email: true,
      push: true,
      sms: false,
    },
    {
      id: 'subscription',
      name: '订阅提醒',
      description: '订阅续费、到期提醒',
      email: true,
      push: true,
      sms: false,
    },
    {
      id: 'security',
      name: '安全通知',
      description: '登录、授权、限额变更等安全相关通知',
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
        <title>通知设置 - 用户中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">通知设置</h1>
          <p className="text-gray-600 mt-1">管理您的通知偏好设置</p>
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
                  <span className="text-sm text-gray-700">邮件通知</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setting.push}
                    onChange={(e) => updateSetting(setting.id, 'push', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">推送通知</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setting.sms}
                    onChange={(e) => updateSetting(setting.id, 'sms', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">短信通知</span>
                </label>
              </div>
            </div>
          ))}
          <div className="p-6 bg-gray-50">
            <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              保存设置
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
