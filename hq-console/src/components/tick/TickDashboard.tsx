/**
 * Tick Dashboard Component
 * 
 * Agent自主执行监控仪表盘
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Clock, CheckCircle, XCircle, AlertTriangle, PlayCircle, Brain, Zap, Shield, Share2, TrendingUp, Users, Wrench, BookOpen } from 'lucide-react';
import { hqApi } from '@/lib/api';

export interface TickExecution {
  id: string;
  agentId: string;
  type: 'scheduled' | 'manual' | 'triggered';
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  tasksExecuted: number;
  errors?: string[];
  logs?: string[];
}

export interface TickStats {
  totalExecutions: number;
  successRate: number;
  avgDuration: number;
  lastExecution?: Date;
  nextExecution?: Date;
}

// Tab type for dashboard sections
type DashboardTab = 'tick' | 'metrics' | 'learning' | 'pipelines';

export const TickDashboard: React.FC = () => {
  const [executions, setExecutions] = useState<TickExecution[]>([]);
  const [stats, setStats] = useState<TickStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<TickExecution | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('tick');

  // Phase 4: Metrics state
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [commStats, setCommStats] = useState<any>(null);

  // Phase 5: Learning state
  const [skillProfiles, setSkillProfiles] = useState<any[]>([]);
  const [learningSummary, setLearningSummary] = useState<any>(null);
  const [shareHistory, setShareHistory] = useState<any[]>([]);

  // Phase 3: Pipeline state
  const [pipelineTemplates, setPipelineTemplates] = useState<any[]>([]);
  const [activePipelines, setActivePipelines] = useState<any[]>([]);

  useEffect(() => {
    loadTickData();
    const interval = setInterval(loadTickData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load Phase 4/5 data when tab changes
  useEffect(() => {
    if (activeTab === 'metrics') loadMetricsData();
    if (activeTab === 'learning') loadLearningData();
    if (activeTab === 'pipelines') loadPipelineData();
  }, [activeTab]);

  const loadTickData = async () => {
    try {
      const [execsData, statsData] = await Promise.all([
        hqApi.getTickExecutions({ limit: 50 }),
        hqApi.getTickStats(7),
      ]);

      const mappedExecutions: TickExecution[] = execsData.executions.map(exec => ({
        id: exec.id,
        agentId: exec.tickId,
        type: exec.triggeredBy === 'cron' ? 'scheduled' : exec.triggeredBy === 'manual' ? 'manual' : 'triggered',
        status: exec.status,
        startTime: new Date(exec.startTime),
        endTime: exec.endTime ? new Date(exec.endTime) : undefined,
        duration: exec.durationMs,
        tasksExecuted: exec.tasksProcessed,
        errors: exec.status === 'failed' ? ['Tick execution failed'] : undefined,
        logs: exec.actionsPlanned,
      }));

      const mappedStats: TickStats = {
        totalExecutions: statsData.totalExecutions,
        successRate: statsData.successRate,
        avgDuration: statsData.avgDuration,
        lastExecution: statsData.lastExecution ? new Date(statsData.lastExecution) : undefined,
        nextExecution: statsData.nextExecution ? new Date(statsData.nextExecution) : undefined,
      };

      setExecutions(mappedExecutions);
      setStats(mappedStats);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load tick data:', error);
      setLoading(false);
    }
  };

  const loadMetricsData = async () => {
    try {
      const [metrics, comm] = await Promise.all([
        hqApi.getSystemMetrics().catch(() => null),
        hqApi.getCommunicationStats().catch(() => null),
      ]);
      if (metrics) setSystemMetrics(metrics);
      if (comm) setCommStats(comm);
    } catch (e) { console.error('Failed to load metrics:', e); }
  };

  const loadLearningData = async () => {
    try {
      const [profiles, summary, history] = await Promise.all([
        hqApi.getTeamSkillProfiles().catch(() => []),
        hqApi.getTeamLearningSummary().catch(() => null),
        hqApi.getShareHistory(20).catch(() => []),
      ]);
      setSkillProfiles(Array.isArray(profiles) ? profiles : []);
      if (summary) setLearningSummary(summary);
      setShareHistory(Array.isArray(history) ? history : []);
    } catch (e) { console.error('Failed to load learning data:', e); }
  };

  const loadPipelineData = async () => {
    try {
      const [templates, active] = await Promise.all([
        hqApi.getPipelineTemplates().catch(() => []),
        hqApi.getActivePipelines().catch(() => []),
      ]);
      setPipelineTemplates(Array.isArray(templates) ? templates : []);
      setActivePipelines(Array.isArray(active) ? active : []);
    } catch (e) { console.error('Failed to load pipeline data:', e); }
  };

  const triggerManualTick = async (agentId?: string) => {
    try {
      await hqApi.triggerTick(agentId);
      await loadTickData();
    } catch (error) {
      console.error('Failed to trigger tick:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-400" size={16} />;
      case 'failed':
        return <XCircle className="text-red-400" size={16} />;
      case 'running':
        return <Activity className="text-blue-400 animate-pulse" size={16} />;
      default:
        return <AlertTriangle className="text-yellow-400" size={16} />;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">🤖 Agent System Dashboard</h1>
            <p className="text-gray-400">Tick · Metrics · Learning · Pipelines</p>
          </div>
          <button
            onClick={() => triggerManualTick()}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <PlayCircle size={18} />
            Trigger Manual Tick
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
          {([
            { key: 'tick', label: 'Tick System', icon: <Activity size={16} /> },
            { key: 'metrics', label: 'Metrics & Health', icon: <TrendingUp size={16} /> },
            { key: 'learning', label: 'Learning & Skills', icon: <Brain size={16} /> },
            { key: 'pipelines', label: 'Pipelines', icon: <Zap size={16} /> },
          ] as { key: DashboardTab; label: string; icon: React.ReactNode }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ===== TICK TAB ===== */}
        {activeTab === 'tick' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Activity size={18} />
                <span className="text-sm">Total Executions</span>
              </div>
              <div className="text-3xl font-bold text-white">{stats.totalExecutions}</div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <CheckCircle size={18} />
                <span className="text-sm">Success Rate</span>
              </div>
              <div className="text-3xl font-bold text-green-400">
                {(stats.successRate * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Clock size={18} />
                <span className="text-sm">Avg Duration</span>
              </div>
              <div className="text-3xl font-bold text-white">
                {formatDuration(stats.avgDuration)}
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Clock size={18} />
                <span className="text-sm">Next Tick</span>
              </div>
              <div className="text-lg font-bold text-blue-400">
                {stats.nextExecution ? formatTimeAgo(stats.nextExecution) : 'N/A'}
              </div>
            </div>
          </div>
        )}

        {/* Executions Table */}
        {activeTab === 'tick' && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Recent Executions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tick</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Start Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tasks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {executions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{exec.agentId}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${exec.type === 'scheduled' ? 'bg-blue-500/20 text-blue-400' : exec.type === 'manual' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                          {exec.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(exec.status)}
                          <span className="text-sm text-gray-300">{exec.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatTimeAgo(exec.startTime)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatDuration(exec.duration)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{exec.tasksExecuted}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button onClick={() => setSelectedExecution(exec)} className="text-blue-400 hover:text-blue-300 text-sm">View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Execution Details Modal */}
        {selectedExecution && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Execution Details</h3>
                <button
                  onClick={() => setSelectedExecution(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4 text-sm">
                <div><span className="text-gray-400">Tick ID:</span><span className="ml-2 text-white font-medium">{selectedExecution.agentId}</span></div>
                <div><span className="text-gray-400">Type:</span><span className="ml-2 text-white">{selectedExecution.type}</span></div>
                <div><span className="text-gray-400">Status:</span><span className="ml-2 text-white">{selectedExecution.status}</span></div>
                <div><span className="text-gray-400">Start:</span><span className="ml-2 text-white">{selectedExecution.startTime.toLocaleString()}</span></div>
                {selectedExecution.endTime && <div><span className="text-gray-400">End:</span><span className="ml-2 text-white">{selectedExecution.endTime.toLocaleString()}</span></div>}
                <div><span className="text-gray-400">Tasks:</span><span className="ml-2 text-white font-medium">{selectedExecution.tasksExecuted}</span></div>
                {selectedExecution.logs && selectedExecution.logs.length > 0 && (
                  <div>
                    <div className="text-gray-400 mb-2">Logs:</div>
                    <div className="bg-gray-900 rounded p-3 max-h-60 overflow-y-auto">
                      {selectedExecution.logs.map((log, i) => <div key={i} className="text-gray-300 font-mono text-xs mb-1">{log}</div>)}
                    </div>
                  </div>
                )}
                {selectedExecution.errors && selectedExecution.errors.length > 0 && (
                  <div>
                    <div className="text-red-400 mb-2">Errors:</div>
                    <div className="bg-red-900/20 border border-red-700 rounded p-3">
                      {selectedExecution.errors.map((err, i) => <div key={i} className="text-red-300 text-xs mb-1">{err}</div>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== METRICS TAB (Phase 4) ===== */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* System Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Shield size={18} />
                  <span className="text-sm">System Health</span>
                </div>
                <div className="text-2xl font-bold text-green-400">
                  {systemMetrics?.systemHealth || 'HEALTHY'}
                </div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <TrendingUp size={18} />
                  <span className="text-sm">Task Success Rate</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {systemMetrics?.taskSuccessRate != null ? `${(systemMetrics.taskSuccessRate * 100).toFixed(1)}%` : 'N/A'}
                </div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Users size={18} />
                  <span className="text-sm">Active Agents</span>
                </div>
                <div className="text-2xl font-bold text-blue-400">
                  {systemMetrics?.activeAgents ?? 'N/A'} / {systemMetrics?.totalAgents ?? '?'}
                </div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Share2 size={18} />
                  <span className="text-sm">Messages Sent</span>
                </div>
                <div className="text-2xl font-bold text-purple-400">
                  {commStats?.totalMessages ?? 'N/A'}
                </div>
              </div>
            </div>

            {/* Agent Metrics Table */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Agent Performance Metrics</h2>
                <button
                  onClick={async () => { const r = await hqApi.triggerAutoHeal(); alert(JSON.stringify(r, null, 2)); }}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  <Wrench size={14} />
                  Auto-Heal
                </button>
              </div>
              <div className="p-4">
                {systemMetrics?.agentMetrics && Array.isArray(systemMetrics.agentMetrics) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {systemMetrics.agentMetrics.map((am: any) => (
                      <div key={am.agentCode} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-white">{am.agentCode}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${am.healthScore > 0.7 ? 'bg-green-600' : am.healthScore > 0.4 ? 'bg-yellow-600' : 'bg-red-600'}`}>
                            Health: {((am.healthScore || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-400">
                          <div className="flex justify-between"><span>Tasks Completed</span><span className="text-white">{am.tasksCompleted ?? 0}</span></div>
                          <div className="flex justify-between"><span>Success Rate</span><span className="text-white">{am.successRate != null ? `${(am.successRate * 100).toFixed(0)}%` : 'N/A'}</span></div>
                          <div className="flex justify-between"><span>Avg Response</span><span className="text-white">{am.avgResponseTime ? `${(am.avgResponseTime / 1000).toFixed(1)}s` : 'N/A'}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No agent metrics available yet. Trigger a tick to generate metrics.</p>
                )}
              </div>
            </div>

            {/* Communication Stats */}
            {commStats && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                <h2 className="text-lg font-bold text-white mb-4">Communication Stats (Phase 2)</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-gray-400">Total Messages</span><div className="text-xl font-bold text-white">{commStats.totalMessages ?? 0}</div></div>
                  <div><span className="text-gray-400">Delegations</span><div className="text-xl font-bold text-blue-400">{commStats.totalDelegations ?? 0}</div></div>
                  <div><span className="text-gray-400">Help Requests</span><div className="text-xl font-bold text-yellow-400">{commStats.totalHelpRequests ?? 0}</div></div>
                  <div><span className="text-gray-400">Broadcasts</span><div className="text-xl font-bold text-purple-400">{commStats.totalBroadcasts ?? 0}</div></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== LEARNING TAB (Phase 5) ===== */}
        {activeTab === 'learning' && (
          <div className="space-y-6">
            {/* Learning Summary */}
            {learningSummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-2"><Brain size={18} /><span className="text-sm">Total Learnings</span></div>
                  <div className="text-2xl font-bold text-white">{learningSummary.totalLearnings ?? 0}</div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-2"><BookOpen size={18} /><span className="text-sm">Skills Learned</span></div>
                  <div className="text-2xl font-bold text-blue-400">{learningSummary.totalSkills ?? 0}</div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-2"><Share2 size={18} /><span className="text-sm">Knowledge Shared</span></div>
                  <div className="text-2xl font-bold text-green-400">{learningSummary.totalShared ?? 0}</div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-2"><TrendingUp size={18} /><span className="text-sm">Improvement Rate</span></div>
                  <div className="text-2xl font-bold text-purple-400">{learningSummary.improvementRate != null ? `${(learningSummary.improvementRate * 100).toFixed(0)}%` : 'N/A'}</div>
                </div>
              </div>
            )}

            {/* Skill Profiles */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Agent Skill Profiles</h2>
              </div>
              <div className="p-4">
                {skillProfiles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {skillProfiles.map((profile: any, idx: number) => (
                      <div key={idx} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-white">{profile.agentCode}</span>
                          <span className="text-xs text-gray-400">Level {profile.level ?? '?'}</span>
                        </div>
                        {profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0 ? (
                          <div className="space-y-2">
                            {profile.skills.slice(0, 5).map((skill: any, si: number) => (
                              <div key={si}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-400">{skill.name || skill.skill}</span>
                                  <span className="text-white">{skill.proficiency != null ? `${(skill.proficiency * 100).toFixed(0)}%` : ''}</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-1.5">
                                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(skill.proficiency || 0) * 100}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-xs">No skills recorded yet</p>
                        )}
                        {profile.strengths && profile.strengths.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {profile.strengths.slice(0, 3).map((s: string, si: number) => (
                              <span key={si} className="text-[10px] px-1.5 py-0.5 bg-green-900/30 text-green-400 rounded">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No skill profiles available yet. Agent learning data will appear after tasks are completed.</p>
                )}
              </div>
            </div>

            {/* Knowledge Sharing History */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Knowledge Sharing History</h2>
              </div>
              <div className="p-4">
                {shareHistory.length > 0 ? (
                  <div className="space-y-3">
                    {shareHistory.map((entry: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 bg-gray-900/30 rounded-lg p-3">
                        <Share2 size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-white">{entry.fromAgent}</span>
                            <span className="text-gray-500">→</span>
                            <span className="text-blue-400">{entry.toAgent || 'Team'}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 truncate">{entry.knowledge || entry.content || 'Knowledge shared'}</p>
                          {entry.timestamp && <span className="text-[10px] text-gray-600">{new Date(entry.timestamp).toLocaleString()}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No knowledge sharing events yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== PIPELINES TAB (Phase 3) ===== */}
        {activeTab === 'pipelines' && (
          <div className="space-y-6">
            {/* Active Pipelines */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Active Pipelines</h2>
              </div>
              <div className="p-4">
                {activePipelines.length > 0 ? (
                  <div className="space-y-3">
                    {activePipelines.map((pipeline: any, idx: number) => (
                      <div key={idx} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white">{pipeline.name || pipeline.template}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${pipeline.status === 'running' ? 'bg-blue-600' : pipeline.status === 'completed' ? 'bg-green-600' : 'bg-gray-600'}`}>
                            {pipeline.status}
                          </span>
                        </div>
                        {pipeline.currentStep && <p className="text-sm text-gray-400">Step: {pipeline.currentStep}</p>}
                        {pipeline.progress != null && (
                          <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pipeline.progress}%` }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No active pipelines. Start one from the templates below.</p>
                )}
              </div>
            </div>

            {/* Pipeline Templates */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Pipeline Templates</h2>
              </div>
              <div className="p-4">
                {pipelineTemplates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pipelineTemplates.map((tpl: any, idx: number) => (
                      <div key={idx} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                        <h3 className="font-medium text-white mb-1">{tpl.name || tpl.id}</h3>
                        <p className="text-xs text-gray-400 mb-3">{tpl.description || 'Collaboration pipeline'}</p>
                        {tpl.steps && <p className="text-xs text-gray-500 mb-3">{tpl.steps.length || '?'} steps</p>}
                        <button
                          onClick={async () => {
                            try {
                              await hqApi.startPipeline(tpl.id || tpl.name);
                              loadPipelineData();
                            } catch (e: any) { alert(e.message); }
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 rounded transition-colors"
                        >
                          Start Pipeline
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No pipeline templates available. Configure templates in the backend.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
