import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { userAgentApi, type Budget } from '../../../lib/api/user-agent.api'
import { useToast } from '../../../contexts/ToastContext'
import { useLocalization } from '../../../contexts/LocalizationContext'

export default function UserBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { showToast } = useToast()
  const { t } = useLocalization()

  // 创建预算表单状态
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    period: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    category: '',
  })

  useEffect(() => {
    loadBudgets()
  }, [])

  const loadBudgets = async () => {
    setLoading(true)
    try {
      const data = await userAgentApi.getBudgets()
      setBudgets(data)
    } catch (error: any) {
      console.error('加载预算失败:', error)
      showToast('error', t('budgets.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newBudget = await userAgentApi.createBudget({
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        period: formData.period,
        category: formData.category || undefined,
      })
      setBudgets([...budgets, newBudget])
      setShowCreateModal(false)
      setFormData({ amount: '', currency: 'USD', period: 'monthly', category: '' })
      showToast('success', t('budgets.success.created'))
    } catch (error: any) {
      console.error('创建预算失败:', error)
      showToast('error', t('budgets.errors.createFailed'))
    }
  }

  const getPeriodLabel = (period: string) => {
    const labels: Record<string, string> = {
      daily: t('budgets.periods.daily'),
      weekly: t('budgets.periods.weekly'),
      monthly: t('budgets.periods.monthly'),
      yearly: t('budgets.periods.yearly'),
    }
    return labels[period] || period
  }

  const getUsagePercentage = (budget: Budget) => {
    if (!budget.spent || !budget.amount) return 0
    return Math.min((budget.spent / budget.amount) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>{t('budgets.pageTitle')}</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('budgets.title')}</h1>
            <p className="text-gray-600 mt-1">{t('budgets.description')}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('budgets.actions.create')}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : budgets.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-4xl mb-4">💰</div>
            <p className="text-gray-600 mb-4">{t('budgets.empty')}</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('budgets.actions.createFirst')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((budget) => {
              const usagePercentage = getUsagePercentage(budget)
              return (
                <div key={budget.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {budget.category || t('budgets.labels.general')}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {getPeriodLabel(budget.period)}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600">
                      {budget.currency}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">{t('budgets.labels.used')}</span>
                      <span className="font-medium">
                        {budget.spent?.toFixed(2) || '0.00'} / {budget.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getUsageColor(usagePercentage)}`}
                        style={{ width: `${usagePercentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {usagePercentage.toFixed(1)}% {t('budgets.labels.used')}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <span className="font-medium">{t('budgets.labels.amount')}:</span>{' '}
                      {budget.amount.toFixed(2)} {budget.currency}
                    </div>
                    <div>
                      <span className="font-medium">{t('budgets.labels.remaining')}:</span>{' '}
                      {budget.remaining?.toFixed(2) || budget.amount.toFixed(2)} {budget.currency}
                    </div>
                    {(budget as any).alertThreshold && (
                      <div>
                        <span className="font-medium">{t('budgets.labels.alertThreshold')}:</span>{' '}
                        {(budget as any).alertThreshold}%
                      </div>
                    )}
                  </div>

                  {usagePercentage >= 90 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">
                        {t('budgets.warnings.nearLimit')}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 创建预算模态框 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">{t('budgets.modal.title')}</h2>
              <form onSubmit={handleCreateBudget} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('budgets.form.amount')}
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="USD">USD</option>
                      <option value="CNY">CNY</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('budgets.form.period')}
                  </label>
                  <select
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">{t('budgets.periods.daily')}</option>
                    <option value="weekly">{t('budgets.periods.weekly')}</option>
                    <option value="monthly">{t('budgets.periods.monthly')}</option>
                    <option value="yearly">{t('budgets.periods.yearly')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('budgets.form.category')}
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('budgets.form.categoryPlaceholder')}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t('budgets.actions.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

