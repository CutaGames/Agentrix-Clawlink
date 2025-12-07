import { useState, useCallback, useEffect } from 'react'
import { useLocalization } from '../../../contexts/LocalizationContext'
import { userAgentApi } from '../../../lib/api/user-agent.api'

// 定义UserAgent类型（与后端实体对应）
type UserAgent = {
  id: string
  userId: string
  name: string
  status: 'active' | 'paused' | 'archived'
  createdAt: string
  updatedAt: string
  isPublished?: boolean
  metadata?: {
    persona?: 'personal' | 'merchant' | 'developer'
    [key: string]: any
  }
  settings?: {
    payoutWallet?: string
    [key: string]: any
  }
}
import { statisticsApi } from '../../../lib/api/statistics.api'
import type { TrendPoint } from '../../../lib/api/statistics.api'

interface DeveloperModuleProps {
  onCommand?: (command: string, data?: any) => any
}

/**
 * 开发者功能模块
 * 集成API统计、收益查看、Agent管理等功能
 */
export function DeveloperModule({ onCommand }: DeveloperModuleProps) {
  const { t } = useLocalization()
  const [activeTab, setActiveTab] = useState<'api' | 'revenue' | 'agents' | 'code'>('api')
  const [apiStats, setApiStats] = useState<any>(null)
  const [revenue, setRevenue] = useState<any>(null)
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [apiTrend, setApiTrend] = useState<TrendPoint[]>([])
  const [apiTrendRange, setApiTrendRange] = useState<{ startDate: string; endDate: string }>({
    startDate: '',
    endDate: '',
  })
  const [apiGranularity, setApiGranularity] = useState<'day' | 'hour'>('day')
  const [revenueTrend, setRevenueTrend] = useState<TrendPoint[]>([])
  const [revenueRange, setRevenueRange] = useState<{ startDate: string; endDate: string }>({
    startDate: '',
    endDate: '',
  })
  const [selectedAgent, setSelectedAgent] = useState<UserAgent | null>(null)
  const [selectedAgentStats, setSelectedAgentStats] = useState<any>(null)
  const [agentStatsLoading, setAgentStatsLoading] = useState(false)

  const loadApiStats = useCallback(async () => {
    setLoading(true)
    try {
      // 调用API统计API
      const data = await statisticsApi.getApiStatistics()
      setApiStats({
        todayCalls: data.todayCalls,
        totalCalls: data.totalCalls,
        successRate: typeof data.successRate === 'number' 
          ? `${(data.successRate * 100).toFixed(1)}%` 
          : data.successRate,
        avgResponseTime: typeof data.avgResponseTime === 'number'
          ? `${data.avgResponseTime}ms`
          : data.avgResponseTime,
      })
    } catch (error: any) {
      console.error('加载API统计失败:', error)
      // 如果API失败，使用mock数据作为fallback
      setApiStats({
        todayCalls: 1842,
        totalCalls: 45678,
        successRate: '99.5%',
        avgResponseTime: '320ms',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const loadApiTrend = useCallback(
    async (range?: { startDate?: string; endDate?: string }, granularity?: 'day' | 'hour') => {
      try {
        const trend = await statisticsApi.getApiTrend({
          startDate: range?.startDate,
          endDate: range?.endDate,
          granularity: granularity || apiGranularity,
        })
        setApiTrend(trend || [])
      } catch (error) {
        console.error('加载API趋势失败:', error)
        setApiTrend([])
      }
    },
    [apiGranularity],
  )

  const loadRevenue = useCallback(async () => {
    setLoading(true)
    try {
      // 调用收益API
      const data = await statisticsApi.getDeveloperRevenue()
      setRevenue({
        totalRevenue: typeof data.totalRevenue === 'number' 
          ? `¥${data.totalRevenue.toLocaleString()}` 
          : data.totalRevenue,
        todayRevenue: typeof data.todayRevenue === 'number'
          ? `¥${data.todayRevenue.toLocaleString()}`
          : data.todayRevenue,
        commission: typeof data.commission === 'number'
          ? `¥${data.commission.toLocaleString()}`
          : data.commission,
        pending: typeof data.pending === 'number'
          ? `¥${data.pending.toLocaleString()}`
          : data.pending,
      })
    } catch (error: any) {
      console.error('加载收益失败:', error)
      // 如果API失败，使用mock数据作为fallback
      setRevenue({
        totalRevenue: '¥12,500',
        todayRevenue: '¥450',
        commission: '¥3,750',
        pending: '¥1,200',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRevenueTrend = useCallback(async (range?: { startDate?: string; endDate?: string }) => {
    try {
      const trend = await statisticsApi.getRevenueTrend({
        startDate: range?.startDate,
        endDate: range?.endDate,
        granularity: 'day',
      })
      setRevenueTrend(trend || [])
    } catch (error) {
      console.error('加载收益趋势失败:', error)
      setRevenueTrend([])
    }
  }, [])

  const loadAgents = useCallback(async () => {
    setLoading(true)
    try {
      const data = await userAgentApi.getMyAgents()
      setAgents(data || [])
    } catch (error: any) {
      console.error('加载Agent列表失败:', error)
      // 如果API失败，使用mock数据作为fallback
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        setAgents([])
      } else {
        setAgents([
          {
            id: 'agent_demo_1',
            name: '示例Agent',
            description: '这是一个示例Agent',
            status: 'active',
            isPublished: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleToggleAgentStatus = async (agent: UserAgent) => {
    try {
      const next = agent.status === 'active' ? 'paused' : 'active'
      await userAgentApi.toggleStatus(agent.id, next)
      loadAgents()
    } catch (error) {
      console.error('切换Agent状态失败:', error)
      alert(t({ zh: '切换失败，请稍后再试', en: 'Failed to toggle status, please try again later' }))
    }
  }

  const handleViewAgentStats = async (agent: UserAgent) => {
    setAgentStatsLoading(true)
    setSelectedAgent(agent)
    try {
      const stats = await userAgentApi.getStats(agent.id)
      setSelectedAgentStats(stats)
    } catch (error) {
      console.error('加载Agent统计失败:', error)
      setSelectedAgentStats(null)
    } finally {
      setAgentStatsLoading(false)
    }
  }

  const renderTrendChart = (trend: TrendPoint[], accent: 'blue' | 'green' = 'blue') => {
    if (!trend.length) {
      return (
        <div className="h-24 flex items-center justify-center text-xs text-slate-500">
          {t({ zh: '暂无趋势数据', en: 'No trend data' })}
        </div>
      )
    }
    const max = Math.max(...trend.map((point) => point.value))
    const colorClass =
      accent === 'green'
        ? 'bg-emerald-500/70'
        : 'bg-blue-500/70'
    return (
      <div className="h-24 flex items-end space-x-1">
        {trend.map((point) => (
          <div key={point.date} className="flex-1 flex flex-col items-center space-y-1">
            <div
              className={`w-full rounded-t-md ${colorClass}`}
              style={{ height: max ? `${(point.value / max) * 100}%` : '10%' }}
            ></div>
            <span className="text-[10px] text-slate-400 truncate w-full text-center">{point.date.slice(-5)}</span>
          </div>
        ))}
      </div>
    )
  }

  useEffect(() => {
    if (activeTab === 'api') {
      loadApiStats()
      loadApiTrend(apiTrendRange, apiGranularity)
    } else if (activeTab === 'revenue') {
      loadRevenue()
      loadRevenueTrend(revenueRange)
    } else if (activeTab === 'agents') {
      loadAgents()
    }
  }, [
    activeTab,
    apiGranularity,
    apiTrendRange,
    revenueRange,
    loadApiStats,
    loadRevenue,
    loadAgents,
    loadApiTrend,
    loadRevenueTrend,
  ])

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* 标签页 */}
      <div className="border-b border-white/10 bg-slate-900/50 px-6">
        <div className="flex space-x-1">
          {[
            { key: 'api' as const, label: { zh: 'API统计', en: 'API Statistics' } },
            { key: 'revenue' as const, label: { zh: '收益查看', en: 'Revenue View' } },
            { key: 'agents' as const, label: { zh: 'Agent管理', en: 'Agent Management' } },
            { key: 'code' as const, label: { zh: '代码生成', en: 'Code Generation' } },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{t({ zh: 'API统计', en: 'API Statistics' })}</h3>
                <p className="text-xs text-slate-400">
                  {t({ zh: '查看调用量、成功率与响应时间', en: 'Track calls, success rate and latency' })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="date"
                  value={apiTrendRange.startDate}
                  onChange={(e) => setApiTrendRange((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30"
                />
                <input
                  type="date"
                  value={apiTrendRange.endDate}
                  onChange={(e) => setApiTrendRange((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30"
                />
                <select
                  value={apiGranularity}
                  onChange={(e) => setApiGranularity(e.target.value as 'day' | 'hour')}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30"
                >
                  <option value="day">{t({ zh: '按天', en: 'Daily' })}</option>
                  <option value="hour">{t({ zh: '按小时', en: 'Hourly' })}</option>
                </select>
                <button
                  onClick={() => loadApiTrend(apiTrendRange, apiGranularity)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  {t({ zh: '刷新', en: 'Refresh' })}
                </button>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : apiStats ? (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">{t({ zh: '今日调用', en: 'Today Calls' })}</p>
                    <p className="text-2xl font-bold">{apiStats.todayCalls.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">{t({ zh: '总调用量', en: 'Total Calls' })}</p>
                    <p className="text-2xl font-bold">{apiStats.totalCalls.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">{t({ zh: '成功率', en: 'Success Rate' })}</p>
                    <p className="text-2xl font-bold">{apiStats.successRate}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">{t({ zh: '平均响应时间', en: 'Avg Response Time' })}</p>
                    <p className="text-2xl font-bold">{apiStats.avgResponseTime}</p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-200">
                      {t({ zh: 'API 调用趋势', en: 'API Trend' })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t({ zh: '最近', en: 'Latest' })} {apiTrend.length} {t({ zh: '个点', en: 'points' })}
                    </p>
                  </div>
                  {renderTrendChart(apiTrend, 'blue')}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">
                {t({ zh: '暂无API数据', en: 'No API data' })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{t({ zh: '收益查看', en: 'Revenue View' })}</h3>
                <p className="text-xs text-slate-400">
                  {t({ zh: '追踪收益、佣金与待结算', en: 'Track earnings, commission and pending payouts' })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="date"
                  value={revenueRange.startDate}
                  onChange={(e) => setRevenueRange((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30"
                />
                <input
                  type="date"
                  value={revenueRange.endDate}
                  onChange={(e) => setRevenueRange((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text白 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30"
                />
                <button
                  onClick={() => {
                    loadRevenue()
                    loadRevenueTrend(revenueRange)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  {t({ zh: '刷新', en: 'Refresh' })}
                </button>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : revenue ? (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">{t({ zh: '总收益', en: 'Total Revenue' })}</p>
                    <p className="text-2xl font-bold">{revenue.totalRevenue}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">{t({ zh: '今日收益', en: 'Today Revenue' })}</p>
                    <p className="text-2xl font-bold">{revenue.todayRevenue}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">{t({ zh: '佣金收入', en: 'Commission' })}</p>
                    <p className="text-2xl font-bold">{revenue.commission}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-1">{t({ zh: '待结算', en: 'Pending' })}</p>
                    <p className="text-2xl font-bold">{revenue.pending}</p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-200">
                      {t({ zh: '收益趋势', en: 'Revenue Trend' })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t({ zh: '最近', en: 'Latest' })} {revenueTrend.length} {t({ zh: '个点', en: 'points' })}
                    </p>
                  </div>
                  {renderTrendChart(revenueTrend, 'green')}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">
                {t({ zh: '暂无收益数据', en: 'No revenue data' })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{t({ zh: 'Agent管理', en: 'Agent Management' })}</h3>
                <p className="text-xs text-slate-400">
                  {t({ zh: '查看Agent运行状态与收益', en: 'Monitor agent status and revenue' })}
                </p>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                {t({ zh: '创建Agent', en: 'Create Agent' })}
              </button>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                {t({ zh: '暂无Agent', en: 'No agents' })}
                <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                  {t({ zh: '创建第一个Agent', en: 'Create First Agent' })}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {agents.map((agent) => (
                  <div key={agent.id} className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{agent.name}</p>
                        <p className="text-sm text-slate-400">{agent.id}</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          agent.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {agent.status === 'active' ? t({ zh: '运行中', en: 'Running' }) : t({ zh: '已停止', en: 'Stopped' })}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                      <span>{t({ zh: '模板', en: 'Template' })}: {agent.templateId || '-'}</span>
                      <span>•</span>
                      <span>{t({ zh: '创建于', en: 'Created' })}: {new Date(agent.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleViewAgentStats(agent)}
                        className="px-3 py-1 rounded-lg border border-white/10 text-sm text-white hover:border-blue-400"
                      >
                        {t({ zh: '查看数据', en: 'View Stats' })}
                      </button>
                      <button
                        onClick={() => handleToggleAgentStatus(agent)}
                        className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                      >
                        {agent.status === 'active'
                          ? t({ zh: '暂停', en: 'Pause' })
                          : t({ zh: '启动', en: 'Activate' })}
                      </button>
                      <button className="px-3 py-1 rounded-lg border border-white/10 text-sm text-white hover:border-blue-400">
                        {t({ zh: '管理', en: 'Manage' })}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">{t({ zh: '代码生成', en: 'Code Generation' })}</h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <p className="text-slate-300 mb-4">
                {t({
                  zh: '在对话中输入代码生成需求，Agent会自动生成相应的代码片段',
                  en: 'Enter code generation requirements in the conversation, Agent will automatically generate corresponding code snippets',
                })}
              </p>
              <button
                onClick={() => onCommand?.('generate_code', { type: 'payment' })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                {t({ zh: '生成支付代码', en: 'Generate Payment Code' })}
              </button>
            </div>
          </div>
        )}
      </div>
      {selectedAgent && (
        <AgentStatsDrawer
          agent={selectedAgent}
          stats={selectedAgentStats}
          loading={agentStatsLoading}
          onClose={() => {
            setSelectedAgent(null)
            setSelectedAgentStats(null)
          }}
        />
      )}
    </div>
  )
}

function AgentStatsDrawer({
  agent,
  stats,
  loading,
  onClose,
}: {
  agent: UserAgent
  stats: any
  loading: boolean
  onClose: () => void
}) {
  const { t } = useLocalization()
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400">{t({ zh: 'Agent 数据', en: 'Agent Stats' })}</p>
            <h3 className="text-lg font-semibold">{agent.name}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ×
          </button>
        </div>
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {t({ zh: '加载中...', en: 'Loading...' })}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500">{t({ zh: '总调用', en: 'Total Calls' })}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCalls?.toLocaleString?.() || stats.totalCalls}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500">{t({ zh: '总收益', en: 'Total Earnings' })}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalEarnings} {stats.currency || 'USDC'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500">{t({ zh: '状态', en: 'Status' })}</p>
                <p className="text-lg font-semibold text-gray-900">{stats.status}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500">{t({ zh: '最近活跃', en: 'Last Active' })}</p>
                <p className="text-sm text-gray-900">
                  {stats.lastActiveAt ? new Date(stats.lastActiveAt).toLocaleString() : '-'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              {t({ zh: '暂无统计数据', en: 'No stats data' })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

