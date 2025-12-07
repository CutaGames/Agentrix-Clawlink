import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { merchantApi } from '../../../lib/api/merchant.api'
import { useToast } from '../../../contexts/ToastContext'

export default function MerchantSettlementConfig() {
  const [rule, setRule] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const { showToast } = useToast()

  const [formData, setFormData] = useState({
    cycle: 'daily',
    currency: 'USD',
    autoConvert: false,
    minSettlementAmount: 100,
  })

  useEffect(() => {
    loadRule()
  }, [])

  const loadRule = async () => {
    setLoading(true)
    try {
      const data = await merchantApi.getSettlementRule()
      setRule(data)
      if (data) {
        setFormData({
          cycle: data.cycle || 'daily',
          currency: data.currency || 'USD',
          autoConvert: data.autoConvert || false,
          minSettlementAmount: data.minSettlementAmount || 100,
        })
      }
    } catch (error: any) {
      console.error('加载结算规则失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await merchantApi.createSettlementRule(formData)
      showToast('success', '结算规则保存成功')
      setShowForm(false)
      loadRule()
    } catch (error: any) {
      console.error('保存结算规则失败:', error)
      showToast('error', '保存结算规则失败')
    } finally {
      setSaving(false)
    }
  }

  const handlePerformSettlement = async () => {
    if (!confirm('确定要执行结算吗？')) return

    try {
      await merchantApi.performSettlement()
      showToast('success', '结算完成')
    } catch (error: any) {
      console.error('执行结算失败:', error)
      showToast('error', '执行结算失败')
    }
  }

  return (
    <DashboardLayout userType="merchant">
      <Head>
        <title>结算配置 - 商家中心</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">结算配置</h1>
            <p className="text-gray-600 mt-1">配置和管理结算规则</p>
          </div>
          <div className="space-x-3">
            {rule && (
              <button
                onClick={handlePerformSettlement}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                执行结算
              </button>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              {showForm ? '取消' : rule ? '编辑' : '创建规则'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <>
            {showForm ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">结算规则配置</h2>
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      结算周期
                    </label>
                    <select
                      value={formData.cycle}
                      onChange={(e) => setFormData({ ...formData, cycle: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="daily">每日</option>
                      <option value="weekly">每周</option>
                      <option value="monthly">每月</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      结算货币
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="USD">USD</option>
                      <option value="CNY">CNY</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      最小结算金额
                    </label>
                    <input
                      type="number"
                      value={formData.minSettlementAmount}
                      onChange={(e) => setFormData({ ...formData, minSettlementAmount: parseFloat(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.autoConvert}
                      onChange={(e) => setFormData({ ...formData, autoConvert: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm text-gray-700">自动货币转换</label>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            ) : rule ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">当前结算规则</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">结算周期</span>
                    <span className="font-medium">
                      {rule.cycle === 'daily' ? '每日' : rule.cycle === 'weekly' ? '每周' : '每月'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">结算货币</span>
                    <span className="font-medium">{rule.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">最小结算金额</span>
                    <span className="font-medium">{rule.minSettlementAmount} {rule.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">自动货币转换</span>
                    <span className="font-medium">{rule.autoConvert ? '是' : '否'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center py-12">
                <p className="text-gray-500 mb-4">暂无结算规则</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  创建规则
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

