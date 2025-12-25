'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  X,
  Calendar,
  DollarSign,
  TrendingUp,
  Loader2,
  Clock,
  Lock,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useWeb3 } from '@/contexts/Web3Context';

interface SessionManagerProps {
  onClose?: () => void;
}

export function SessionManager({ onClose }: SessionManagerProps) {
  const { isConnected } = useWeb3();
  const { 
    sessions, 
    loading, 
    createSession, 
    revokeSession, 
  } = useSessionManager();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    singleLimit: 10,
    dailyLimit: 100,
    expiryDays: 30,
    agentId: '',
  });

  const handleCreateSession = async () => {
    try {
      await createSession({
        singleLimit: formData.singleLimit,
        dailyLimit: formData.dailyLimit,
        expiryDays: formData.expiryDays,
        agentId: formData.agentId || undefined,
      });
      setShowCreateModal(false);
    } catch (error: any) {
      console.error('Failed to create session:', error);
      alert(error.message || 'Failed to create session');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this authorization? This will also revoke USDT allowance on-chain.')) {
      return;
    }
    try {
      await revokeSession(sessionId);
    } catch (error: any) {
      console.error('Failed to revoke session:', error);
      alert(error.message || 'Failed to revoke session');
    }
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 font-sans">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-6 text-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Agent Authorization</h2>
            <p className="text-indigo-100 text-sm">Manage your X402 Session Keys</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!isConnected || loading}
          className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap size={16} />}
          Create New Session
        </button>
      </div>

      {/* 内容区 */}
      <div className="p-6">
        {loading && sessions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <ShieldCheck className="mx-auto text-slate-300 mb-4" size={48} />
            <div className="text-slate-500 mb-2">No active sessions</div>
            <div className="text-sm text-slate-400">
              Create a session to enable QuickPay for your agents
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:border-indigo-100 transition-all bg-white group"
              >
                <div className="flex justify-between items-start mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 group-hover:scale-110 transition-transform">
                      <ShieldCheck size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {session.agentId || 'Global Agent Policy'}
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-mono rounded uppercase tracking-tight">
                          {session.signer.slice(0, 6)}...{session.signer.slice(-4)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock size={10} />
                        Expires {new Date(session.expiry).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.isActive ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full font-bold border border-emerald-100">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                        ACTIVE
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 text-xs rounded-full font-bold border border-slate-100">
                        REVOKED
                      </div>
                    )}
                    {session.isActive && (
                      <button
                        onClick={() => handleRevokeSession(session.sessionId)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-all"
                        title="Revoke Session"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                    <div className="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Lock size={10} />
                      Single Limit
                    </div>
                    <div className="font-bold text-slate-900">
                      ${session.singleLimit.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                    <div className="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Activity size={10} />
                      Daily Limit
                    </div>
                    <div className="font-bold text-slate-900">
                      ${session.dailyLimit.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                    <div className="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp size={10} />
                      Used Today
                    </div>
                    <div className="font-bold text-indigo-600">
                      ${session.usedToday.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Progress Bar for Daily Limit */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Daily Usage</span>
                    <span>{Math.min(100, (session.usedToday / session.dailyLimit) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        (session.usedToday / session.dailyLimit) > 0.8 ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, (session.usedToday / session.dailyLimit) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建 Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Create New Session</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Single Transaction Limit (USDC)
                </label>
                <input
                  type="number"
                  value={formData.singleLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      singleLimit: Math.max(parseFloat(e.target.value) || 0, 0.0001),
                    })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Daily Total Limit (USDC)
                </label>
                <input
                  type="number"
                  value={formData.dailyLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dailyLimit: Math.max(parseFloat(e.target.value) || 0, 0.001),
                    })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Expiry (Days)
                </label>
                <input
                  type="number"
                  value={formData.expiryDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expiryDays: Math.max(parseInt(e.target.value) || 1, 1),
                    })
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={handleCreateSession}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap size={18} />}
                  Authorize & Create Session
                </button>
                <p className="text-[10px] text-slate-400 mt-3 text-center">
                  This will require a one-time wallet signature and an on-chain transaction to register the session and approve USDT.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
