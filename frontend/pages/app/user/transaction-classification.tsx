import Head from 'next/head'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { userAgentApi, type TransactionClassification } from '../../../lib/api/user-agent.api'
import { useToast } from '../../../contexts/ToastContext'

interface CategoryStatistics {
  [category: string]: number;
}

export default function TransactionClassificationPage() {
  const [classifications, setClassifications] = useState<TransactionClassification[]>([])
  const [statistics, setStatistics] = useState<CategoryStatistics>({})
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    loadStatistics()
  }, [])

  const loadStatistics = async () => {
    setLoading(true)
    try {
      const stats = await userAgentApi.getCategoryStatistics()
      setStatistics(stats)
    } catch (error: any) {
      console.error('加载分类统计失败:', error)
      showToast('error', '加载分类统计失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClassifyTransaction = async (paymentId: string) => {
    try {
      const classification = await userAgentApi.classifyTransaction(paymentId)
      setClassifications([...classifications, classification])
      showToast('success', '交易分类成功')
      // 重新加载统计
      await loadStatistics()
    } catch (error: any) {
      console.error('分类交易失败:', error)
      showToast('error', '分类交易失败')
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      shopping: 'bg-blue-100 text-blue-800',
      food: 'bg-orange-100 text-orange-800',
      entertainment: 'bg-purple-100 text-purple-800',
      transportation: 'bg-green-100 text-green-800',
      bills: 'bg-red-100 text-red-800',
      healthcare: 'bg-pink-100 text-pink-800',
      education: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800',
    }
    return colors[category] || colors.other
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      shopping: '购物',
      food: '餐饮',
      entertainment: '娱乐',
      transportation: '交通',
      bills: '账单',
      healthcare: '医疗',
      education: '教育',
      other: '其他',
    }
    return labels[category] || category
  }

  const getTotalTransactions = () => {
    return Object.values(statistics).reduce((sum, count) => sum + count, 0)
  }

  const getCategoryPercentage = (count: number) => {
    const total = getTotalTransactions()
    return total > 0 ? ((count / total) * 100).toFixed(1) : '0'
  }

  const categories = Object.entries(statistics).sort((a, b) => b[1] - a[1])

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>交易分类 - 用户中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">交易分类</h1>
          <p className="text-gray-600 mt-1">查看和管理您的交易分类统计</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <>
            {/* 分类统计概览 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">分类统计</h2>
              
              {categories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  还没有交易分类数据
                </div>
              ) : (
                <div className="space-y-4">
                  {categories.map(([category, count]) => {
                    const percentage = getCategoryPercentage(count)
                    const isSelected = selectedCategory === category
                    
                    return (
                      <div
                        key={category}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedCategory(isSelected ? null : category)}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(category)}`}>
                              {getCategoryLabel(category)}
                            </span>
                            <span className="text-sm text-gray-600">
                              {count} 笔交易
                            </span>
                          </div>
                          <span className="text-lg font-semibold text-gray-900">
                            {percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              getCategoryColor(category).split(' ')[0]
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {categories.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">总交易数</span>
                    <span className="text-lg font-bold text-gray-900">
                      {getTotalTransactions()} 笔
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 分类详情（如果选择了分类） */}
            {selectedCategory && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {getCategoryLabel(selectedCategory)} 详情
                  </h2>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="text-gray-600">
                  <p>该分类共有 <strong>{statistics[selectedCategory]}</strong> 笔交易</p>
                  <p className="mt-2">占比: <strong>{getCategoryPercentage(statistics[selectedCategory])}%</strong></p>
                </div>
              </div>
            )}

            {/* 分类方法说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">分类方法</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex items-start">
                  <span className="font-medium mr-2">• 规则引擎:</span>
                  <span>基于交易描述、商家信息等规则自动分类</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium mr-2">• 机器学习:</span>
                  <span>使用AI模型分析交易模式进行分类</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium mr-2">• 手动分类:</span>
                  <span>您可以手动调整交易分类</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

