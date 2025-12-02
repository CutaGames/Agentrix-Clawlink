import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

interface Webhook {
  id: string
  url: string
  events: string[]
  status: 'active' | 'inactive'
  lastTriggered?: string
  secret: string
}

interface WebhookLog {
  id: string
  webhookId: string
  event: string
  status: 'success' | 'failed'
  responseCode?: number
  triggeredAt: string
}

export default function MerchantWebhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newWebhook, setNewWebhook] = useState({ url: '', events: [] as string[] })

  const loadWebhooks = useCallback(async () => {
    try {
      const { webhookApi } = await import('../../../lib/api/webhook.api')
      const webhooks = await webhookApi.getWebhooks()
      setWebhooks(webhooks.map((w: any) => ({
        id: w.id,
        url: w.url,
        events: w.events || [],
        status: w.active ? 'active' : 'inactive',
        lastTriggered: w.lastTriggered,
        secret: w.secret ? `${w.secret.substring(0, 10)}...` : 'whsec_***',
      })))
    } catch (error) {
      console.error('加载Webhook配置失败:', error)
      setWebhooks([])
    }
  }, [])

  const loadLogs = useCallback(async () => {
    try {
      const { webhookApi } = await import('../../../lib/api/webhook.api')
      const webhookIds = webhooks.map(w => w.id)
      
      if (webhookIds.length === 0) {
        setLogs([])
        return
      }

      const allLogs: WebhookLog[] = []
      for (const webhookId of webhookIds) {
        try {
          const events = await webhookApi.getEvents(webhookId, 10)
          allLogs.push(...events.map((e: any): WebhookLog => ({
            id: e.id,
            webhookId: e.configId,
            event: e.eventType,
            status: (e.status === 'delivered' ? 'success' : 'failed') as 'success' | 'failed',
            responseCode: e.status === 'delivered' ? 200 : undefined,
            triggeredAt: e.createdAt,
          })))
        } catch (error) {
          console.error(`加载Webhook ${webhookId} 事件失败:`, error)
        }
      }

      setLogs(allLogs.sort((a, b) => 
        new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
      ))
    } catch (error) {
      console.error('加载Webhook日志失败:', error)
      setLogs([])
    }
  }, [webhooks])

  useEffect(() => {
    loadWebhooks()
  }, [loadWebhooks])

  useEffect(() => {
    if (webhooks.length > 0) {
      loadLogs()
    }
  }, [webhooks, loadLogs])

  const addWebhook = async () => {
    try {
      const { webhookApi } = await import('../../../lib/api/webhook.api')
      await webhookApi.create({
        url: newWebhook.url,
        events: newWebhook.events,
      })
      
      await loadWebhooks()
      setShowAddModal(false)
      setNewWebhook({ url: '', events: [] })
    } catch (error: any) {
      console.error('创建Webhook失败:', error)
      alert(error.message || '创建Webhook失败，请重试')
    }
  }

  const testWebhook = (id: string) => {
    alert(`测试Webhook: ${id}`)
  }

  return (
    <DashboardLayout userType="merchant">
      <Head>
        <title>Webhook配置 - 商户中心</title>
      </Head>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Webhook配置</h1>
            <p className="text-gray-600 mt-1">配置支付事件通知</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            添加Webhook
          </button>
        </div>

        {/* Webhook列表 */}
        <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{webhook.url}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      webhook.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {webhook.status === 'active' ? '活跃' : '未激活'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">事件:</span> {webhook.events.join(', ')}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">密钥:</span> {webhook.secret}
                  </div>
                  {webhook.lastTriggered && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">最后触发:</span>{' '}
                      {new Date(webhook.lastTriggered).toLocaleString('zh-CN')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => testWebhook(webhook.id)}
                  className="ml-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  测试
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Webhook日志 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Webhook日志</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">事件</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">响应码</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">触发时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{log.event}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status === 'success' ? '成功' : '失败'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{log.responseCode || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(log.triggeredAt).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 添加Webhook模态框 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">添加Webhook</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                  <input
                    type="url"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://api.example.com/webhooks"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">订阅事件</label>
                  <div className="space-y-2">
                    {['payment.completed', 'payment.failed', 'payment.refunded', 'order.created'].map((event) => (
                      <label key={event} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newWebhook.events.includes(event)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewWebhook({ ...newWebhook, events: [...newWebhook.events, event] })
                            } else {
                              setNewWebhook({ ...newWebhook, events: newWebhook.events.filter(e => e !== event) })
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{event}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={addWebhook}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    添加
                  </button>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
