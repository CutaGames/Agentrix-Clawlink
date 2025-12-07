import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

interface ErrorLog {
  id: string
  level: 'error' | 'warning' | 'info'
  message: string
  category: string
  timestamp: string
  details?: string
}

export default function AgentErrorLogs() {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all')

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      const allLogs: ErrorLog[] = [
        {
          id: 'log_001',
          level: 'error',
          message: '支付API调用失败',
          category: 'payment',
          timestamp: '2025-01-15T10:30:00Z',
          details: 'Network timeout after 30s',
        },
        {
          id: 'log_002',
          level: 'warning',
          message: '商品搜索返回空结果',
          category: 'search',
          timestamp: '2025-01-15T09:15:00Z',
        },
        {
          id: 'log_003',
          level: 'info',
          message: '订单创建成功',
          category: 'order',
          timestamp: '2025-01-15T08:00:00Z',
        },
      ]
      setLogs(
        filter === 'all' ? allLogs : allLogs.filter(l => l.level === filter)
      )
    } catch (error) {
      console.error('加载错误日志失败:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      error: 'text-red-600 bg-red-50',
      warning: 'text-yellow-600 bg-yellow-50',
      info: 'text-blue-600 bg-blue-50',
    }
    return colors[level] || 'text-gray-600 bg-gray-50'
  }

  return (
    <DashboardLayout userType="agent">
      <Head>
        <title>错误日志 - Agent中心</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">错误日志</h1>
            <p className="text-gray-600 mt-1">查看Agent运行错误和警告</p>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">全部</option>
            <option value="error">错误</option>
            <option value="warning">警告</option>
            <option value="info">信息</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
            {logs.map((log) => (
              <div key={log.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(log.level)}`}>
                        {log.level === 'error' ? '错误' :
                         log.level === 'warning' ? '警告' : '信息'}
                      </span>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                        {log.category}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{log.message}</p>
                    {log.details && (
                      <p className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded mt-2">
                        {log.details}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(log.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

