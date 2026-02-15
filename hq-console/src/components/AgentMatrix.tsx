"use client";

import React from 'react';
import { useAgents } from '@/hooks/useAgents';
import { agentDefinitions } from '@/lib/strategic-plan';

interface AgentTask {
  id: string;
  title: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
}

interface AgentWithTasks {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  status: 'active' | 'standby' | 'busy' | 'error' | 'offline';
  currentTask?: AgentTask;
  taskQueue?: AgentTask[];
  lastActive?: string;
}

const statusConfig = {
  active: { color: 'bg-green-500', pulse: true, label: '活跃' },
  standby: { color: 'bg-yellow-500', pulse: false, label: '待命' },
  busy: { color: 'bg-blue-500', pulse: true, label: '忙碌' },
  error: { color: 'bg-red-500', pulse: true, label: '异常' },
  offline: { color: 'bg-gray-500', pulse: false, label: '离线' },
};

interface AgentMatrixProps {
  agents?: AgentWithTasks[];
  onSelectAgent?: (agentId: string) => void;
  selectedAgentId?: string;
  compact?: boolean;
}

// Map backend status to UI status
function mapStatus(backendStatus: string): AgentWithTasks['status'] {
  switch (backendStatus) {
    case 'running': return 'busy';
    case 'idle': return 'standby';
    case 'paused': return 'standby';
    case 'error': return 'error';
    default: return 'standby';
  }
}

// Role-based capabilities and descriptions
const roleMetadata: Record<string, { description: string; capabilities: string[] }> = {
  architect: { description: '总体规划、技术决策、团队协调', capabilities: ['架构设计', '代码审查', '任务分配', '技术指导'] },
  coder: { description: '功能开发、Bug修复、代码实现', capabilities: ['前端开发', '后端开发', 'API开发', '测试'] },
  analyst: { description: '数据分析、业务洞察、市场研究', capabilities: ['数据分析', '市场调研', '竞品分析', '报告'] },
  growth: { description: '用户增长、营销策略、转化优化', capabilities: ['增长策略', '用户获取', '转化优化', 'A/B测试'] },
  bd: { description: '商务拓展、合作伙伴、生态建设', capabilities: ['商务谈判', '合作拓展', '生态建设', '收入分析'] },
  social: { description: '社交媒体运营、内容分发、社区管理', capabilities: ['Twitter运营', '社区管理', '内容分发', '互动'] },
  content: { description: '文案撰写、文档编写、品牌内容', capabilities: ['文案撰写', '技术文档', '社交内容', '品牌故事'] },
  support: { description: '客户支持、问题解决、用户满意度', capabilities: ['客户沟通', '问题诊断', '满意度', '反馈'] },
  security: { description: '安全审计、风险评估、合规检查', capabilities: ['安全审计', '漏洞扫描', '合规检查', '风险评估'] },
  legal: { description: '法律合规、合同审查、知识产权', capabilities: ['合同审查', '合规咨询', '知识产权', '风险管理'] },
  devrel: { description: '开发者关系、技术布道、社区建设', capabilities: ['技术布道', '开发者社区', 'SDK文档', '技术分享'] },
};

export function AgentMatrix({ onSelectAgent, selectedAgentId, compact = false }: AgentMatrixProps) {
  const { agents: backendAgents } = useAgents();

  // Build agents from backend data, falling back to static definitions
  const agents: AgentWithTasks[] = React.useMemo(() => {
    if (backendAgents && backendAgents.length > 0) {
      return backendAgents.map(ba => {
        const meta = roleMetadata[ba.role] || { description: ba.role || 'AI Agent', capabilities: [] };
        return {
          id: ba.code,
          name: ba.name || ba.code,
          role: ba.role || 'agent',
          description: meta.description,
          capabilities: meta.capabilities,
          status: mapStatus(ba.status),
          currentTask: ba.currentTask ? {
            id: 'current',
            title: ba.currentTask,
            status: 'running' as const,
            progress: ba.progress || 0,
          } : undefined,
        };
      });
    }
    // Fallback to static definitions
    return agentDefinitions.map(agent => ({ ...agent }));
  }, [backendAgents]);

  const activeCount = agents.filter(a => a.status === 'active' || a.status === 'busy').length;
  const totalCount = agents.length;

  if (compact) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">🤖 Agent 团队</h3>
          <span className="text-sm text-gray-400">{activeCount}/{totalCount} 活跃</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {agents.map(agent => {
            const config = statusConfig[agent.status];
            return (
              <button
                key={agent.id}
                onClick={() => onSelectAgent?.(agent.id)}
                className={`p-2 rounded-lg border transition-all ${
                  selectedAgentId === agent.id 
                    ? 'border-blue-500 bg-blue-500/20' 
                    : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
                  <span className="text-xs text-white truncate">{agent.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">🤖 Agent 团队状态</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {Object.entries(statusConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${config.color}`} />
                <span className="text-xs text-gray-400">{config.label}</span>
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-400">
            <span className="text-green-400 font-bold">{activeCount}</span>/{totalCount} 活跃
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => {
          const config = statusConfig[agent.status];
          const isSelected = selectedAgentId === agent.id;
          
          return (
            <button
              key={agent.id}
              onClick={() => onSelectAgent?.(agent.id)}
              className={`text-left p-4 rounded-lg border transition-all ${
                isSelected 
                  ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50' 
                  : 'border-gray-600 bg-gray-800 hover:border-gray-500 hover:bg-gray-750'
              }`}
            >
              {/* Agent Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg">
                      🤖
                    </div>
                    <span 
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} 
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{agent.name}</h3>
                    <p className="text-xs text-gray-400">{agent.role}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs text-white ${config.color}`}>
                  {config.label}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">{agent.description}</p>

              {/* Current Task */}
              {agent.currentTask ? (
                <div className="bg-gray-900 rounded p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">当前任务</span>
                    <span className="text-xs text-blue-400">{agent.currentTask.progress}%</span>
                  </div>
                  <p className="text-sm text-white truncate mb-2">{agent.currentTask.title}</p>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                      style={{ width: `${agent.currentTask.progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 rounded p-3 mb-3">
                  <p className="text-sm text-gray-500 text-center">暂无任务</p>
                </div>
              )}

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.slice(0, 3).map((cap, i) => (
                  <span key={i} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                    {cap}
                  </span>
                ))}
                {agent.capabilities.length > 3 && (
                  <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400">
                    +{agent.capabilities.length - 3}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
