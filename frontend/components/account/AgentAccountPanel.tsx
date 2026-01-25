'use client';

import React, { useState } from 'react';
import { 
  Bot, 
  Plus, 
  Play, 
  Pause, 
  Settings, 
  Shield,
  Wallet,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronRight,
  Zap,
  Activity,
  Lock,
  ArrowUpRight,
  Trash2,
  MoreVertical,
  Terminal,
  Clock,
  Layout
} from 'lucide-react';
import { useAgentAccounts } from '../../contexts/AgentAccountContext';
import { useLocalization } from '../../contexts/LocalizationContext';
import { AgentAccount, RiskLevel } from '../../lib/api/agent-account.api';

// 风险等级配置
const riskLevelConfig: Record<RiskLevel, { color: string; bgColor: string; label: string }> = {
  low: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', label: 'Low Risk' },
  medium: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', label: 'Medium' },
  high: { color: 'text-orange-400', bgColor: 'bg-orange-500/10', label: 'High' },
  critical: { color: 'text-red-400', bgColor: 'bg-red-500/10', label: 'CRITICAL' },
};

// 状态配置
const statusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  draft: { color: 'text-slate-400', bgColor: 'bg-slate-800', label: 'Draft' },
  active: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', label: 'LIVE' },
  suspended: { color: 'text-amber-400', bgColor: 'bg-amber-500/20', label: 'PAUSED' },
  revoked: { color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'REVOKED' },
};

interface AgentStatCardProps {
  label: string;
  value: string | number;
  icon: any;
  subValue?: string;
  color?: string;
}

const AgentStatCard: React.FC<AgentStatCardProps> = ({ label, value, icon: Icon, subValue, color = "text-blue-400" }) => (
  <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4">
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
        <Icon size={18} />
      </div>
      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">{label}</span>
    </div>
    <div className="text-2xl font-mono font-bold text-white">{value}</div>
    {subValue && <div className="text-[10px] text-slate-500 mt-1">{subValue}</div>}
  </div>
);

const SpendingProgress = ({ spent, limit }: { spent: number, limit: number }) => {
  const percent = Math.min(100, (spent / limit) * 100);
  const color = percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-amber-500' : 'bg-blue-500';
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold text-slate-500">
        <span>BUDGET BURN</span>
        <span>${spent.toLocaleString()} / ${limit.toLocaleString()}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

interface AgentAccountCardProps {
  agent: AgentAccount;
  onActivate: () => void;
  onSuspend: () => void;
  onResume: () => void;
  onSettings: () => void;
  onAuthorizations: () => void;
}

const AgentAccountCardV2: React.FC<AgentAccountCardProps> = ({
  agent,
  onActivate,
  onSuspend,
  onResume,
  onSettings,
  onAuthorizations
}) => {
  const status = statusConfig[agent.status];
  const risk = riskLevelConfig[agent.riskLevel];
  
  return (
    <div className="bg-[#0f172a] border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all group relative overflow-hidden">
      {/* Background Pulse if active */}
      {agent.status === 'active' && (
        <div className="absolute top-0 right-0 p-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Bot size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{agent.name}</h3>
            <div className="flex items-center gap-2 mt-1">
               <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${status.bgColor} ${status.color}`}>
                 {status.label}
               </span>
               <span className="text-[10px] text-slate-500 font-mono">ID: {agent.agentUniqueId.slice(0, 8)}</span>
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all">
          <MoreVertical size={20} />
        </button>
      </div>

      <div className="space-y-4 mb-6">
         <SpendingProgress spent={agent.spentToday} limit={agent.spendingLimits.daily} />
         
         <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
               <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Risk Score</div>
               <div className={`text-sm font-bold ${risk.color}`}>{agent.creditScore} <span className="text-[10px] opacity-60">({risk.label})</span></div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
               <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">AutoPay</div>
               <div className={`text-sm font-bold ${agent.autoPayEnabled ? 'text-blue-400' : 'text-slate-500'}`}>
                 {agent.autoPayEnabled ? 'Enabled' : 'Disabled'}
               </div>
            </div>
         </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={onAuthorizations}
          className="flex-[1.5] py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
        >
          <Terminal size={14} /> CONTROL HUB
        </button>
        <button 
          onClick={onSettings}
          className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
        >
          <Settings size={14} /> POLICY
        </button>
        {agent.status === 'active' ? (
           <button onClick={onSuspend} className="p-2.5 bg-white/5 hover:bg-orange-500/20 text-slate-400 hover:text-orange-400 rounded-xl transition-all">
             <Pause size={18} />
           </button>
        ) : (
           <button onClick={onActivate} className="p-2.5 bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 rounded-xl transition-all">
             <Play size={18} />
           </button>
        )}
      </div>
    </div>
  );
};

interface AgentAccountPanelProps {
  onCreateAgent?: () => void;
  activeView?: 'agents' | 'authorizations' | 'autopay';
}

const AgentAccountPanel: React.FC<AgentAccountPanelProps> = ({ 
  onCreateAgent,
  activeView: initialActiveView = 'agents' 
}) => {
  const { 
    agentAccounts, 
    activeAgents, 
    loading, 
    error,
    activateAgent,
    suspendAgent,
    resumeAgent 
  } = useAgentAccounts();

  const [activeView, setActiveView] = useState(initialActiveView);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeView) {
      case 'authorizations':
        return (
          <div className="space-y-6">
            {/* 授权概览 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <CheckCircle size={16} />
                  <span className="text-xs font-bold uppercase">Active</span>
                </div>
                <div className="text-2xl font-bold text-white">3</div>
                <div className="text-[10px] text-slate-500">Active authorizations</div>
              </div>
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <Clock size={16} />
                  <span className="text-xs font-bold uppercase">Pending</span>
                </div>
                <div className="text-2xl font-bold text-white">1</div>
                <div className="text-[10px] text-slate-500">Awaiting approval</div>
              </div>
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertTriangle size={16} />
                  <span className="text-xs font-bold uppercase">Revoked</span>
                </div>
                <div className="text-2xl font-bold text-white">2</div>
                <div className="text-[10px] text-slate-500">Last 30 days</div>
              </div>
            </div>

            {/* 授权列表 */}
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <h3 className="text-sm font-bold text-white">Service Authorizations</h3>
                <p className="text-xs text-slate-500 mt-1">Manage permissions granted to external services and agents</p>
              </div>
              <div className="divide-y divide-white/5">
                {/* Authorization Item 1 */}
                <div className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <Bot size={20} className="text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-white">Market Data Agent</div>
                        <div className="text-xs text-slate-500">Read access to portfolio data</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase">Active</span>
                      <button className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-colors">
                        Revoke
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-500">
                    <span>Granted: Jan 15, 2026</span>
                    <span>•</span>
                    <span>Expires: Never</span>
                    <span>•</span>
                    <span>Scope: Read-only</span>
                  </div>
                </div>

                {/* Authorization Item 2 */}
                <div className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <Zap size={20} className="text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-white">Trading Bot Alpha</div>
                        <div className="text-xs text-slate-500">Execute trades up to $100/day</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase">Active</span>
                      <button className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-colors">
                        Revoke
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-500">
                    <span>Granted: Jan 10, 2026</span>
                    <span>•</span>
                    <span>Expires: Feb 10, 2026</span>
                    <span>•</span>
                    <span>Scope: Trade, Transfer</span>
                  </div>
                </div>

                {/* Authorization Item 3 - Pending */}
                <div className="p-4 hover:bg-white/5 transition-colors bg-amber-500/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                        <Shield size={20} className="text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-white">Risk Monitor Service</div>
                        <div className="text-xs text-slate-500">Requesting: Full account monitoring</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full uppercase">Pending</span>
                      <button className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors">
                        Approve
                      </button>
                      <button className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-colors">
                        Deny
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 添加新授权按钮 */}
            <button className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-slate-400 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2">
              <Plus size={18} />
              Grant New Authorization
            </button>
          </div>
        );

      case 'autopay':
        return (
          <div className="space-y-6">
            {/* AutoPay 全局开关 */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                    <Zap size={28} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">AutoPay Global Setting</h3>
                    <p className="text-sm text-slate-400">Enable trust-less automated payments for your agents</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-emerald-400 font-bold">ENABLED</span>
                  <button className="w-14 h-8 bg-emerald-500 rounded-full relative transition-colors">
                    <div className="absolute right-1 top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all" />
                  </button>
                </div>
              </div>
            </div>

            {/* AutoPay 规则列表 */}
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">AutoPay Rules</h3>
                  <p className="text-xs text-slate-500 mt-1">Configure automatic payment rules for recurring transactions</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 transition-colors flex items-center gap-2">
                  <Plus size={14} /> Add Rule
                </button>
              </div>

              <div className="divide-y divide-white/5">
                {/* Rule 1 */}
                <div className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                        <Zap size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-white">API Subscription Fee</div>
                        <div className="text-xs text-slate-500">Auto-renew monthly subscription</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">ACTIVE</span>
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <Settings size={16} className="text-slate-400" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase mb-1">Amount</div>
                      <div className="text-sm font-bold text-white">$29.99</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase mb-1">Frequency</div>
                      <div className="text-sm font-bold text-white">Monthly</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase mb-1">Max/Period</div>
                      <div className="text-sm font-bold text-white">$29.99</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase mb-1">Next Payment</div>
                      <div className="text-sm font-bold text-blue-400">Feb 1, 2026</div>
                    </div>
                  </div>
                </div>

                {/* Rule 2 */}
                <div className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                        <Bot size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-white">Agent-to-Agent Micro Payments</div>
                        <div className="text-xs text-slate-500">Allow small automated transfers between agents</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">ACTIVE</span>
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <Settings size={16} className="text-slate-400" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase mb-1">Max Single</div>
                      <div className="text-sm font-bold text-white">$5.00</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase mb-1">Daily Limit</div>
                      <div className="text-sm font-bold text-white">$50.00</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase mb-1">Used Today</div>
                      <div className="text-sm font-bold text-emerald-400">$12.50</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase mb-1">Tx Count</div>
                      <div className="text-sm font-bold text-white">8</div>
                    </div>
                  </div>
                </div>

                {/* Rule 3 - Paused */}
                <div className="p-4 hover:bg-white/5 transition-colors opacity-60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-500/20 rounded-xl flex items-center justify-center text-slate-400">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-white">DeFi Yield Farming</div>
                        <div className="text-xs text-slate-500">Auto-compound rewards daily</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-slate-500/20 text-slate-400 text-[10px] font-bold rounded-full">PAUSED</span>
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <Play size={16} className="text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 安全提示 */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-amber-400 text-sm">Security Notice</div>
                <p className="text-xs text-slate-400 mt-1">
                  AutoPay rules execute automatically without requiring manual approval. Ensure your spending limits are appropriately configured to prevent unexpected charges.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-8">
            {/* Agent List */}
            {agentAccounts.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-white/5">
                <Bot className="w-16 h-16 mx-auto text-slate-700 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Agents Found</h3>
                <p className="text-slate-400 mb-8 max-w-xs mx-auto">Create your first autonomous agent account to start participating in the AI ecosystem.</p>
                <button 
                  onClick={onCreateAgent}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20"
                >
                  Create Your First Agent
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {agentAccounts.map(agent => (
                  <AgentAccountCardV2
                    key={agent.id}
                    agent={agent}
                    onActivate={() => activateAgent(agent.id)}
                    onSuspend={() => suspendAgent(agent.id)}
                    onResume={() => resumeAgent(agent.id)}
                    onSettings={() => {
                      setSelectedAgentId(agent.id);
                      setShowSettingsModal(true);
                    }}
                    onAuthorizations={() => {
                      setSelectedAgentId(agent.id);
                      setShowAuthModal(true);
                    }}
                  />
                ))}
              </div>
            )}

            {/* Real-time Logs / Console */}
            {agentAccounts.length > 0 && (
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                       <Activity size={14} className="text-blue-400" /> Executive Execution Stream
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE SYNCING
                    </div>
                 </div>
                 <div className="bg-black border border-white/5 rounded-2xl p-6 font-mono text-xs space-y-3 shadow-inner">
                    <div className="flex gap-3">
                       <span className="text-slate-600">14:10:02</span>
                       <span className="text-blue-400 font-bold">[SYS]</span>
                       <span className="text-slate-300">Initialized &quot;{agentAccounts[0].name}&quot; kernel environment.</span>
                    </div>
                    <div className="flex gap-3">
                       <span className="text-slate-600">14:10:05</span>
                       <span className="text-purple-400 font-bold">[X402]</span>
                       <span className="text-slate-300">Requesting Auth Token for Resource: &quot;Global Market Data&quot;</span>
                    </div>
                    <div className="flex gap-3">
                       <span className="text-slate-600">14:10:08</span>
                       <span className="text-emerald-400 font-bold">[PAY]</span>
                       <span className="text-slate-300">Internal Transfer: 0.10 USDC authorized via AutoPay.</span>
                    </div>
                    <div className="flex gap-3 opacity-50">
                       <span className="text-slate-600">14:10:12</span>
                       <span className="text-slate-400 font-bold">[IDE]</span>
                       <span className="text-slate-500">Awaiting next task sequence...</span>
                    </div>
                 </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-4">
      {/* Header with Stats */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-8">
           <div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Agent Accounts</h2>
              <p className="text-slate-400 text-sm mt-1">Manage budget, risk, and cross-agent coordination</p>
           </div>
           <button 
              onClick={onCreateAgent}
              className="px-6 py-3 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-100 transition-all shadow-xl flex items-center gap-2"
           >
              <Plus size={18} /> Deploy Agent
           </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <AgentStatCard label="Live Agents" value={activeAgents.length} icon={Activity} color="text-emerald-400" />
           <AgentStatCard label="Total Spending" value={`$${agentAccounts.reduce((s,a) => s + (a.spentToday || 0), 0)}`} icon={TrendingUp} color="text-blue-400" subValue="LAST 24H" />
           <AgentStatCard label="Fleet Budget" value={`$${agentAccounts.reduce((s,a) => s + (a.spendingLimits.daily || 0), 0)}`} icon={Shield} color="text-purple-400" subValue="AGGREGATED" />
           <AgentStatCard label="Security Node" value="Active" icon={Lock} color="text-emerald-400" />
        </div>
      </div>

      <div className="flex gap-6 mb-8 border-b border-white/5 pb-2">
         {[
           { id: 'agents', label: 'MY AGENTS', icon: Layout },
           { id: 'authorizations', label: 'AUTHORIZATIONS', icon: Shield },
           { id: 'autopay', label: 'AUTO-PAY POLICY', icon: Zap },
         ].map(tab => (
           <button 
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`flex items-center gap-2 px-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative ${activeView === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
           >
              <tab.icon size={12} /> {tab.label}
              {activeView === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />}
           </button>
         ))}
      </div>

      {renderContent()}
    </div>
  );
};

export default AgentAccountPanel;
