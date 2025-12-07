import Head from 'next/head'
import { useState } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

export default function UserSecurity() {
  const [kycLevel, setKycLevel] = useState<'NONE' | 'BASIC' | 'VERIFIED' | 'ENHANCED'>('BASIC')
  const [dailyLimit, setDailyLimit] = useState(10000)
  const [monthlyLimit, setMonthlyLimit] = useState(100000)
  const [devices, setDevices] = useState([
    { id: '1', name: 'iPhone 15 Pro', lastActive: '2025-01-15T10:00:00Z', current: true },
    { id: '2', name: 'MacBook Pro', lastActive: '2025-01-14T15:00:00Z', current: false },
  ])

  const getKycStatus = () => {
    const status: Record<string, { text: string; color: string }> = {
      NONE: { text: '未认证', color: 'text-gray-600 bg-gray-50' },
      BASIC: { text: '基础认证', color: 'text-blue-600 bg-blue-50' },
      VERIFIED: { text: '已验证', color: 'text-green-600 bg-green-50' },
      ENHANCED: { text: '增强认证', color: 'text-purple-600 bg-purple-50' },
    }
    return status[kycLevel] || status.NONE
  }

  const removeDevice = (id: string) => {
    if (confirm('确定要移除这个设备吗？')) {
      setDevices(devices.filter(d => d.id !== id))
    }
  }

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>安全设置 - 用户中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">安全设置</h1>
          <p className="text-gray-600 mt-1">管理您的账户安全和交易限额</p>
        </div>

        {/* KYC状态 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">KYC认证状态</h2>
          <div className="flex items-center justify-between">
            <div>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getKycStatus().color}`}>
                {getKycStatus().text}
              </span>
              <p className="text-sm text-gray-600 mt-2">
                {kycLevel === 'NONE' && '请完成KYC认证以提升交易限额'}
                {kycLevel === 'BASIC' && '基础认证已完成，可进行小额交易'}
                {kycLevel === 'VERIFIED' && '已验证，可进行大额交易'}
                {kycLevel === 'ENHANCED' && '增强认证，无交易限制'}
              </p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {kycLevel === 'NONE' ? '开始认证' : '升级认证'}
            </button>
          </div>
        </div>

        {/* 交易限额 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">交易限额</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">每日限额 (¥)</label>
              <input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">每月限额 (¥)</label>
              <input
                type="number"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              保存设置
            </button>
          </div>
        </div>

        {/* 设备管理 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">已登录设备</h2>
          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{device.name}</span>
                    {device.current && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">当前设备</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    最后活跃: {new Date(device.lastActive).toLocaleString('zh-CN')}
                  </p>
                </div>
                {!device.current && (
                  <button
                    onClick={() => removeDevice(device.id)}
                    className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    移除
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
