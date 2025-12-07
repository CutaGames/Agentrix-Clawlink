import Head from 'next/head'
import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useSessionManager } from '@/hooks/useSessionManager'
import { useToast } from '@/contexts/ToastContext'

const statusBadge = {
  active: 'text-green-600 bg-green-50',
  revoked: 'text-red-600 bg-red-50',
  expired: 'text-gray-600 bg-gray-100',
}

export default function UserAuthorizations() {
  const { sessions, loading, error, revokeSession, loadSessions } = useSessionManager()
  const { showToast } = useToast()
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  const sessionList = useMemo(() => sessions || [], [sessions])

  const handleRevoke = async (sessionId: string) => {
    if (!sessionId || !confirm('确定要撤销这个QuickPay授权吗？撤销后需重新授权才能继续使用。')) {
      return
    }
    try {
      setRevokingId(sessionId)
      await revokeSession(sessionId)
      showToast?.('success', '授权已撤销，并同步取消USDT授权')
    } catch (err: any) {
      console.error('撤销授权失败:', err)
      showToast?.('error', err?.message || '撤销授权失败，请稍后重试')
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <DashboardLayout userType="user">
      <Head>
        <title>授权管理 - 用户中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">授权管理</h1>
          <p className="text-gray-600 mt-1">
            查看并管理 QuickPay / Session Key 授权状态，支持即时撤销
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : sessionList.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-4xl mb-4">🔐</div>
            <p className="text-gray-600">暂无 QuickPay 授权，点击支付时会提示创建。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessionList.map((session) => (
              <div key={session.sessionId} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-4xl">⚡</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            QuickPay Session
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              session.isActive ? statusBadge.active : statusBadge.revoked
                            }`}
                          >
                            {session.isActive ? '活跃' : '已撤销'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono">
                          {session.sessionId}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <span className="font-medium">Session Key:</span>{' '}
                        <span className="font-mono text-xs">
                          {session.signer.slice(0, 8)}...{session.signer.slice(-6)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">单笔限额:</span> $
                        {parseFloat(
                          typeof session.singleLimit === 'string'
                            ? session.singleLimit
                            : String(session.singleLimit ?? 0),
                        ).toFixed(4)}
                      </div>
                      <div>
                        <span className="font-medium">每日限额:</span> $
                        {parseFloat(
                          typeof session.dailyLimit === 'string'
                            ? session.dailyLimit
                            : String(session.dailyLimit ?? 0),
                        ).toFixed(4)}
                      </div>
                      <div>
                        <span className="font-medium">到期时间:</span>{' '}
                        {new Date(session.expiry).toLocaleDateString('zh-CN')}
                      </div>
                      {session.agentId && (
                        <div>
                          <span className="font-medium">关联 Agent:</span> {session.agentId}
                        </div>
                      )}
                    </div>
                  </div>
                  {session.isActive && (
                    <button
                      onClick={() => handleRevoke(session.sessionId)}
                      disabled={revokingId === session.sessionId}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      {revokingId === session.sessionId ? '撤销中...' : '撤销授权'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
