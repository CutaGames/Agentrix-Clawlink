/**
 * A2A Task Dashboard Component
 * 
 * Displays agent-to-agent task list with filters, task detail view,
 * and action buttons for the full task lifecycle.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot, Clock, CheckCircle2, XCircle, AlertCircle, ArrowRight,
  Send, Eye, Star, Filter, RefreshCw, Plus, ChevronDown,
  Zap, Shield, Award, TrendingUp, Package, FileText,
  Loader2, ExternalLink, MessageSquare,
} from 'lucide-react';
import { a2aApi, type A2ATask, type A2ATaskStatus, type AgentReputation, type CreateA2ATaskRequest } from '../../lib/api/a2a.api';

// ============ Status Config ============

const STATUS_CONFIG: Record<A2ATaskStatus, { label: string; color: string; icon: any; bgColor: string }> = {
  pending: { label: '待接受', color: 'text-yellow-400', icon: Clock, bgColor: 'bg-yellow-500/10' },
  accepted: { label: '已接受', color: 'text-blue-400', icon: CheckCircle2, bgColor: 'bg-blue-500/10' },
  in_progress: { label: '进行中', color: 'text-cyan-400', icon: Zap, bgColor: 'bg-cyan-500/10' },
  delivered: { label: '已交付', color: 'text-purple-400', icon: Package, bgColor: 'bg-purple-500/10' },
  completed: { label: '已完成', color: 'text-green-400', icon: CheckCircle2, bgColor: 'bg-green-500/10' },
  rejected: { label: '已拒绝', color: 'text-red-400', icon: XCircle, bgColor: 'bg-red-500/10' },
  cancelled: { label: '已取消', color: 'text-gray-400', icon: XCircle, bgColor: 'bg-gray-500/10' },
  expired: { label: '已过期', color: 'text-orange-400', icon: AlertCircle, bgColor: 'bg-orange-500/10' },
  failed: { label: '失败', color: 'text-red-500', icon: AlertCircle, bgColor: 'bg-red-500/10' },
};

const PRIORITY_CONFIG = {
  low: { label: '低', color: 'text-gray-400', dot: 'bg-gray-400' },
  normal: { label: '普通', color: 'text-blue-400', dot: 'bg-blue-400' },
  high: { label: '高', color: 'text-orange-400', dot: 'bg-orange-400' },
  urgent: { label: '紧急', color: 'text-red-400', dot: 'bg-red-400' },
};

const TIER_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  bronze: { label: 'Bronze', color: 'text-amber-600', icon: '🥉' },
  silver: { label: 'Silver', color: 'text-gray-300', icon: '🥈' },
  gold: { label: 'Gold', color: 'text-yellow-400', icon: '🥇' },
  platinum: { label: 'Platinum', color: 'text-cyan-300', icon: '💎' },
  diamond: { label: 'Diamond', color: 'text-purple-300', icon: '👑' },
};

// ============ Sub Components ============

function StatusBadge({ status }: { status: A2ATaskStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.normal;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span className={config.color}>{config.label}</span>
    </span>
  );
}

function ReputationBadge({ reputation }: { reputation: AgentReputation | null }) {
  if (!reputation) return <span className="text-xs text-gray-500">未知</span>;
  const tier = TIER_CONFIG[reputation.tier] || TIER_CONFIG.bronze;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${tier.color}`}>
      <span>{tier.icon}</span>
      <span>{reputation.overallScore}</span>
    </span>
  );
}

function EmptyState({ message, action }: { message: string; action?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
      <Bot className="w-12 h-12 mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
      {action && (
        <button onClick={action} className="mt-3 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition">
          <Plus className="w-3.5 h-3.5 inline mr-1" />创建任务
        </button>
      )}
    </div>
  );
}

// ============ Task Detail Panel ============

function TaskDetailPanel({ task, onClose, onRefresh }: { task: A2ATask; onClose: () => void; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: string) => {
    setLoading(true);
    try {
      switch (action) {
        case 'accept':
          await a2aApi.acceptTask(task.id, task.targetAgentId);
          break;
        case 'cancel':
          await a2aApi.cancelTask(task.id, task.requesterAgentId, '用户取消');
          break;
      }
      onRefresh();
    } catch (e: any) {
      console.error(`Action ${action} failed:`, e);
    } finally {
      setLoading(false);
    }
  };

  const timeline = useMemo(() => {
    const events: Array<{ label: string; time: string | undefined; icon: any; color: string }> = [
      { label: '创建', time: task.createdAt, icon: Plus, color: 'text-gray-400' },
      { label: '接受', time: task.acceptedAt, icon: CheckCircle2, color: 'text-blue-400' },
      { label: '开始', time: task.startedAt, icon: Zap, color: 'text-cyan-400' },
      { label: '交付', time: task.deliveredAt, icon: Package, color: 'text-purple-400' },
      { label: '完成', time: task.completedAt, icon: Star, color: 'text-green-400' },
    ];
    if (task.cancelledAt) {
      events.push({ label: '取消', time: task.cancelledAt, icon: XCircle, color: 'text-red-400' });
    }
    return events.filter(e => e.time);
  }, [task]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-white">{task.title}</h3>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{task.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Agents */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">请求方 Agent</p>
              <p className="text-sm text-white font-mono truncate">{task.requesterAgentId}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">执行方 Agent</p>
              <p className="text-sm text-white font-mono truncate">{task.targetAgentId}</p>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <p className="text-xs text-gray-500 mb-1">描述</p>
              <p className="text-sm text-gray-300 bg-gray-800/50 rounded-lg p-3 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500">优先级</p>
              <PriorityDot priority={task.priority} />
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500">价格</p>
              <p className="text-sm text-white">{task.agreedPrice || task.maxPrice || '-'} {task.currency}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500">截止时间</p>
              <p className="text-sm text-white">{task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}</p>
            </div>
          </div>

          {/* Quality Assessment */}
          {task.qualityAssessment && (
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-2">质量评估</p>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-white">{task.qualityAssessment.score}</div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${task.qualityAssessment.score >= 80 ? 'bg-green-500' : task.qualityAssessment.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${task.qualityAssessment.score}%` }}
                    />
                  </div>
                </div>
              </div>
              {task.qualityAssessment.criteria && (
                <div className="mt-2 space-y-1">
                  {task.qualityAssessment.criteria.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{c.name}</span>
                      <span className="text-gray-300">{c.score}/{c.weight * 100}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Deliverables */}
          {task.deliverables && task.deliverables.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">交付物 ({task.deliverables.length})</p>
              <div className="space-y-2">
                {task.deliverables.map((d, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-400 uppercase">{d.type}</span>
                    </div>
                    <p className="text-sm text-gray-300 font-mono text-xs break-all line-clamp-4">{d.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-xs text-gray-500 mb-2">时间线</p>
            <div className="space-y-2">
              {timeline.map((event, i) => {
                const Icon = event.icon;
                return (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <Icon className={`w-3.5 h-3.5 ${event.color}`} />
                    <span className="text-gray-300">{event.label}</span>
                    <span className="text-gray-500 font-mono ml-auto">
                      {event.time ? new Date(event.time).toLocaleString() : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 p-5 border-t border-gray-700">
          {task.status === 'pending' && (
            <>
              <button
                onClick={() => handleAction('accept')}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 disabled:opacity-50 transition flex items-center justify-center gap-1"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                接受任务
              </button>
              <button
                onClick={() => handleAction('cancel')}
                disabled={loading}
                className="px-4 py-2 bg-gray-700 text-gray-300 text-sm rounded-lg hover:bg-gray-600 disabled:opacity-50 transition"
              >
                取消
              </button>
            </>
          )}
          {(task.status === 'accepted' || task.status === 'in_progress') && (
            <button
              onClick={() => handleAction('cancel')}
              disabled={loading}
              className="px-4 py-2 bg-red-600/20 text-red-400 text-sm rounded-lg hover:bg-red-600/30 disabled:opacity-50 transition"
            >
              取消任务
            </button>
          )}
          <button onClick={onClose} className="ml-auto px-4 py-2 text-gray-400 text-sm hover:text-white transition">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ Create Task Modal ============

function CreateTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<Partial<CreateA2ATaskRequest>>({
    title: '',
    description: '',
    targetAgentId: '',
    requesterAgentId: 'system',
    priority: 'normal',
    currency: 'USDC',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.title || !form.targetAgentId) {
      setError('请填写任务标题和目标 Agent ID');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await a2aApi.createTask(form as CreateA2ATaskRequest);
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">创建 A2A 任务</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">任务标题 *</label>
            <input
              value={form.title || ''}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              placeholder="例如：翻译文档到中文"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">目标 Agent ID *</label>
            <input
              value={form.targetAgentId || ''}
              onChange={e => setForm(f => ({ ...f, targetAgentId: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              placeholder="agent_xxx"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">描述</label>
            <textarea
              value={form.description || ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none resize-none"
              placeholder="详细描述任务要求..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">优先级</label>
              <select
                value={form.priority || 'normal'}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="low">低</option>
                <option value="normal">普通</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">最高价格</label>
              <input
                value={form.maxPrice || ''}
                onChange={e => setForm(f => ({ ...f, maxPrice: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                placeholder="0.00 USDC"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">任务类型</label>
            <input
              value={form.taskType || ''}
              onChange={e => setForm(f => ({ ...f, taskType: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              placeholder="例如：translation, code_review, design"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
        <div className="flex items-center gap-2 p-5 border-t border-gray-700">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 disabled:opacity-50 transition flex items-center justify-center gap-1"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            创建任务
          </button>
          <button onClick={onClose} className="px-4 py-2 text-gray-400 text-sm hover:text-white transition">取消</button>
        </div>
      </div>
    </div>
  );
}

// ============ Reputation Card ============

function ReputationCard({ agentId }: { agentId: string }) {
  const [rep, setRep] = useState<AgentReputation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    a2aApi.getReputation(agentId)
      .then(setRep)
      .catch(() => setRep(null))
      .finally(() => setLoading(false));
  }, [agentId]);

  if (loading) return <div className="animate-pulse bg-gray-800 rounded-lg h-24" />;
  if (!rep) return null;

  const tier = TIER_CONFIG[rep.tier] || TIER_CONFIG.bronze;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{tier.icon}</span>
          <span className={`text-sm font-semibold ${tier.color}`}>{tier.label}</span>
        </div>
        <div className="text-2xl font-bold text-white">{rep.overallScore}<span className="text-xs text-gray-500">/100</span></div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-lg font-semibold text-green-400">{rep.tasksCompleted}</p>
          <p className="text-[10px] text-gray-500">完成</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-white">{rep.avgQualityScore.toFixed(0)}</p>
          <p className="text-[10px] text-gray-500">质量</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-white">{(rep.onTimeRate * 100).toFixed(0)}%</p>
          <p className="text-[10px] text-gray-500">准时</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-red-400">{rep.tasksFailed}</p>
          <p className="text-[10px] text-gray-500">失败</p>
        </div>
      </div>
    </div>
  );
}

// ============ Main Dashboard ============

interface A2ATaskDashboardProps {
  agentId?: string;
  defaultRole?: 'requester' | 'target';
}

export function A2ATaskDashboard({ agentId, defaultRole = 'requester' }: A2ATaskDashboardProps) {
  const [tasks, setTasks] = useState<A2ATask[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<A2ATask | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [role, setRole] = useState<'requester' | 'target'>(defaultRole);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const result = await a2aApi.listTasks({
        agentId,
        role,
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setTasks(result.tasks);
      setTotal(result.total);
    } catch (e) {
      console.error('Failed to load tasks:', e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [agentId, role, statusFilter, page]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const stats = useMemo(() => {
    const pending = tasks.filter(t => t.status === 'pending').length;
    const active = tasks.filter(t => ['accepted', 'in_progress'].includes(t.status)).length;
    const delivered = tasks.filter(t => t.status === 'delivered').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return { pending, active, delivered, completed };
  }, [tasks]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            A2A 任务管理
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Agent-to-Agent 任务委托与协作</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchTasks} className="p-2 text-gray-400 hover:text-white transition" title="刷新">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            创建任务
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '待处理', value: stats.pending, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: '进行中', value: stats.active, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { label: '待审核', value: stats.delivered, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: '已完成', value: stats.completed, color: 'text-green-400', bg: 'bg-green-500/10' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Reputation Card */}
      {agentId && <ReputationCard agentId={agentId} />}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-gray-800 rounded-lg p-0.5">
          {(['requester', 'target'] as const).map(r => (
            <button
              key={r}
              onClick={() => { setRole(r); setPage(1); }}
              className={`px-3 py-1 text-xs rounded-md transition ${role === r ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {r === 'requester' ? '我发起的' : '我接收的'}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">全部状态</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <span className="text-xs text-gray-500 ml-auto">共 {total} 条</span>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-gray-800/50 rounded-xl h-20" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState message="暂无任务" action={() => setShowCreateModal(true)} />
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-blue-500/30 cursor-pointer transition group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-white truncate">{task.title}</h4>
                    <StatusBadge status={task.status} />
                    <PriorityDot priority={task.priority} />
                  </div>
                  <p className="text-xs text-gray-500 truncate">{task.description || '无描述'}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      {role === 'requester' ? task.targetAgentId : task.requesterAgentId}
                    </span>
                    {task.taskType && (
                      <span className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">{task.taskType}</span>
                    )}
                    {(task.agreedPrice || task.maxPrice) && (
                      <span className="text-green-400">{task.agreedPrice || task.maxPrice} {task.currency}</span>
                    )}
                    <span className="ml-auto">{new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition ml-3 mt-1 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 text-xs text-gray-400 bg-gray-800 rounded-lg hover:text-white disabled:opacity-30"
          >
            上一页
          </button>
          <span className="text-xs text-gray-500">第 {page} 页</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page * 20 >= total}
            className="px-3 py-1 text-xs text-gray-400 bg-gray-800 rounded-lg hover:text-white disabled:opacity-30"
          >
            下一页
          </button>
        </div>
      )}

      {/* Modals */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onRefresh={() => { fetchTasks(); setSelectedTask(null); }}
        />
      )}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchTasks}
        />
      )}
    </div>
  );
}
