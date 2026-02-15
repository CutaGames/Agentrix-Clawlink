/**
 * Agent Selector Component
 * 
 * Agent 选择器 - 从 AgentChat.tsx 拆分
 */

'use client';

import { useMemo } from 'react';

export interface AgentOption {
  code: string;
  name: string;
  icon: string;
  description: string;
}

export const FALLBACK_AGENTS: AgentOption[] = [
  { code: 'ARCHITECT-01', name: '架构师', icon: '🏛️', description: 'Claude Opus 4.6 - 系统架构设计' },
  { code: 'CODER-01', name: 'Coder', icon: '💻', description: 'Claude Sonnet 4.5 - 代码实现' },
  { code: 'GROWTH-01', name: '增长负责人', icon: '📈', description: 'Claude Haiku 4.5 - 增长策略' },
  { code: 'BD-01', name: 'BD 负责人', icon: '🌍', description: 'Claude Haiku 4.5 - 生态发展' },
  { code: 'SOCIAL-01', name: '社媒运营', icon: '📱', description: 'Gemini 2.5 Flash - 社交媒体' },
  { code: 'CONTENT-01', name: '内容创作', icon: '✍️', description: 'Gemini 2.5 Flash - 内容策划' },
  { code: 'SUPPORT-01', name: '客户成功', icon: '🎯', description: 'Gemini 2.5 Flash - 客户支持' },
  { code: 'SECURITY-01', name: '安全审计', icon: '🔒', description: 'Gemini 2.5 Flash - 安全审计' },
];

export const AGENT_META: Record<string, { icon: string; description: string }> = FALLBACK_AGENTS.reduce(
  (acc, agent) => {
    acc[agent.code] = { icon: agent.icon, description: agent.description };
    return acc;
  },
  {} as Record<string, { icon: string; description: string }>
);

interface AgentSelectorProps {
  agents: AgentOption[];
  selected: AgentOption;
  onSelect: (agent: AgentOption) => void;
  lastModel?: string | null;
}

export function AgentSelector({ agents, selected, onSelect, lastModel }: AgentSelectorProps) {
  return (
    <div className="bg-gray-800/80 border-b border-gray-700 px-2 py-1.5">
      <div className="flex gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600">
        {agents.map(agent => (
          <button
            key={agent.code}
            className={`flex-shrink-0 px-2 py-1 rounded text-[11px] transition-colors ${
              selected.code === agent.code
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700/60 text-gray-400 hover:bg-gray-600 hover:text-gray-200'
            }`}
            onClick={() => onSelect(agent)}
            title={`${agent.name} - ${agent.description}`}
          >
            <span className="mr-0.5">{agent.icon}</span>
            {agent.name}
          </button>
        ))}
      </div>
      {lastModel && (
        <div className="mt-0.5 text-[9px] text-gray-500 truncate">
          {lastModel}
        </div>
      )}
    </div>
  );
}
