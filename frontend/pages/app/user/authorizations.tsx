import Head from 'next/head'
import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useSessionManager } from '@/hooks/useSessionManager'
import { useToast } from '@/contexts/ToastContext'
import { agentAuthorizationApi, AgentAuthorization } from '../../../lib/api/agent-authorization.api'
import { quickPayGrantApi, type QuickPayGrant } from '../../../lib/api/quick-pay-grant.api'

const statusBadge = {
  active: 'text-green-600 bg-green-50',
  revoked: 'text-red-600 bg-red-50',
  expired: 'text-gray-600 bg-gray-100',
}

type TabType = 'payment' | 'agent'

export default function UserAuthorizations() {
  const { sessions, loading: sessionsLoading, error: sessionsError, revokeSession, loadSessions } = useSessionManager()
  const { showToast } = useToast()
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('payment')
  
  // QuickPay Grants
  const [grants, setGrants] = useState<QuickPayGrant[]>([])
  const [grantsLoading, setGrantsLoading] = useState(false)
  
  // Agent Authorizations
  const [agentAuths, setAgentAuths] = useState<AgentAuthorization[]>([])
  const [agentAuthsLoading, setAgentAuthsLoading] = useState(false)

  useEffect(() => {
    loadSessions()
    loadGrants()
  }, [])
  
  useEffect(() => {
    if (activeTab === 'agent') {
      loadAgentAuths()
    }
  }, [activeTab])

  const loadGrants = async () => {
    setGrantsLoading(true)
    try {
      const data = await quickPayGrantApi.getMyGrants()
      setGrants(data)
    } catch (error: any) {
      console.error('加载QuickPay授权失败:', error)
    } finally {
      setGrantsLoading(false)
    }
  }
  
  const loadAgentAuths = async () => {
    setAgentAuthsLoading(true)
    try {
      const data = await agentAuthorizationApi.getAuthorizations()
      setAgentAuths(data)
    } catch (error: any) {
      console.error('加载Agent授权失败:', error)
    } finally {
      setAgentAuthsLoading(false)
    }
  }

  const sessionList = useMemo(() => sessions || [], [sessions])

  const handleRevokeSession = async (sessionId: string) => {
    if (!sessionId || !confirm('确定要撤销这个QuickPay授权吗？撤销后需重新授权才能继续使用。')) {
      return
    }
    try {
      setRevokingId(sessionId)
      await revokeSession(sessionId)
      showToast?.('success', '授权已撤销')
    } catch (err: any) {
      console.error('撤销授权失败:', err)
      showToast?.('error', err?.message || '撤销授权失败')
    } finally {
      setRevokingId(null)
    }
  }
  
  const handleRevokeGrant = async (grantId: string) => {
    if (!confirm('确定要撤销这个授权吗？')) return
    try {
      setRevokingId(grantId)
      await quickPayGrantApi.revoke(grantId)
      showToast?.('success', '授权已撤销')
      loadGrants()
    } catch (error: any) {
      console.error('撤销授权失败:', error)
      showToast?.('error', '撤销授权失败')
    } finally {
      setRevokingId(null)
    }
  }
  
  const handleRevokeAgentAuth = async (id: string) => {
    if (!confirm('确定要撤销这个Agent授权吗？')) return
    try {
      setRevokingId(id)
      await agentAuthorizationApi.revokeAuthorization(id)
      showToast?.('success', '授权已撤销')
      loadAgentAuths()
    } catch (error: any) {
      console.error('撤销授权失败:', error)
      showToast?.('error', '撤销授权失败')
    } finally {
      setRevokingId(null)
    }
  }

  const getAgentAuthStatus = (auth: AgentAuthorization): 'active' | 'expired' | 'revoked' => {
    if (!auth.isActive) return 'revoked'
    if (auth.expiry && new Date(auth.expiry) < new Date()) return 'expired'
    return 'active'
  }

  const isLoading = activeTab === 'payment' ? (sessionsLoading || grantsLoading) : agentAuthsLoading

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>授权管理 - 用户中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">授权管理</h1>
          <p className="text-gray-600 mt-1">
            统一管理支付授权和Agent授权
          </p>
        </div>

        {/* Tab 切换 */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('payment')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payment'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💳 支付授权
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
                {sessionList.length + grants.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('agent')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'agent'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🤖 Agent授权
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
                {agentAuths.length}
              </span>
            </button>
          </nav>
        </div>

        {sessionsError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {sessionsError}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : activeTab === 'payment' ? (
          /* 支付授权列表 */
          <div className="space-y-6">
            {/* QuickPay Sessions */}
            {sessionList.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">⚡ QuickPay Sessions</h3>
                <div className="space-y-4">
                  {sessionList.map((session) => (
                    <div key={session.sessionId} className="bg-white rounded-lg shadow p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">Session Key</h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              session.isActive ? statusBadge.active : statusBadge.revoked
                            }`}>
                              {session.isActive ? '活跃' : '已撤销'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-mono mb-2">
                            {session.signer.slice(0, 8)}...{session.signer.slice(-6)}
                          </p>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>单笔限额: ${parseFloat(String(session.singleLimit ?? 0)).toFixed(2)}</div>
                            <div>每日限额: ${parseFloat(String(session.dailyLimit ?? 0)).toFixed(2)}</div>
                            <div>到期: {new Date(session.expiry).toLocaleDateString('zh-CN')}</div>
                          </div>
                        </div>
                        {session.isActive && (
                          <button
                            onClick={() => handleRevokeSession(session.sessionId)}
                            disabled={revokingId === session.sessionId}
                            className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                          >
                            {revokingId === session.sessionId ? '撤销中...' : '撤销'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* QuickPay Grants */}
            {grants.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">🎫 QuickPay Grants</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {grants.map((grant) => (
                    <div key={grant.id} className="bg-white rounded-lg shadow p-4">
                      <div className="flex justify-between items-start mb-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          grant.status === 'active' ? statusBadge.active :
                          grant.status === 'revoked' ? statusBadge.revoked : statusBadge.expired
                        }`}>
                          {grant.status === 'active' ? '活跃' : grant.status === 'revoked' ? '已撤销' : '已过期'}
                        </span>
                        {grant.status === 'active' && (
                          <button
                            onClick={() => handleRevokeGrant(grant.id)}
                            disabled={revokingId === grant.id}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            撤销
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>单笔限额: ${grant.permissions?.maxAmount || '无限制'}</div>
                        <div>每日限额: ${grant.permissions?.maxDailyAmount || '无限制'}</div>
                        <div>有效期至: {grant.expiresAt ? new Date(grant.expiresAt).toLocaleDateString('zh-CN') : '永久'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sessionList.length === 0 && grants.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-4xl mb-4">🔐</div>
                <p className="text-gray-600">暂无支付授权，点击支付时会提示创建。</p>
              </div>
            )}
          </div>
        ) : (
          /* Agent授权列表 */
          <div className="space-y-4">
            {agentAuths.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-4xl mb-4">🤖</div>
                <p className="text-gray-600">暂无Agent授权，通过Agent发起支付时会自动创建。</p>
              </div>
            ) : (
              agentAuths.map((auth) => {
                const status = getAgentAuthStatus(auth)
                return (
                  <div key={auth.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">Agent #{auth.agentId.slice(0, 8)}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge[status]}`}>
                            {status === 'active' ? '活跃' : status === 'expired' ? '已过期' : '已撤销'}
                          </span>
                          <span className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded">
                            {auth.authorizationType === 'erc8004' ? 'ERC8004' : auth.authorizationType === 'mpc' ? 'MPC' : 'API Key'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono mb-2">
                          Agent ID: {auth.agentId}
                        </p>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>单笔限额: {auth.singleLimit ? `$${auth.singleLimit}` : '不限制'}</div>
                          <div>每日限额: {auth.dailyLimit ? `$${auth.dailyLimit}` : '不限制'}</div>
                          {auth.expiry && (
                            <div>有效期至: {new Date(auth.expiry).toLocaleDateString('zh-CN')}</div>
                          )}
                        </div>
                      </div>
                      {status === 'active' && (
                        <button
                          onClick={() => handleRevokeAgentAuth(auth.id)}
                          disabled={revokingId === auth.id}
                          className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        >
                          {revokingId === auth.id ? '撤销中...' : '撤销'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
