"use client";

import React, { useState } from 'react';
import { agentDefinitions } from '@/lib/strategic-plan';

interface Command {
  id: string;
  from: 'ceo' | 'architect';
  to: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'received' | 'executing' | 'completed';
}

interface CommandCenterProps {
  onSendCommand?: (to: string, content: string) => void;
  selectedAgentId?: string;
  compact?: boolean;
}

const statusIcons = {
  sent: '📤',
  received: '📥',
  executing: '⚡',
  completed: '✅',
};

// Mock command history
const mockCommands: Command[] = [
  {
    id: 'cmd-1',
    from: 'ceo',
    to: 'ARCHITECT-01',
    content: '升级 HQ Console 界面，添加战略计划看板',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    status: 'executing',
  },
  {
    id: 'cmd-2',
    from: 'architect',
    to: 'DEV-01',
    content: '准备接手前端组件开发任务',
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    status: 'received',
  },
];

export function CommandCenter({ onSendCommand, selectedAgentId, compact = false }: CommandCenterProps) {
  const [targetAgent, setTargetAgent] = useState(selectedAgentId || 'ARCHITECT-01');
  const [commandText, setCommandText] = useState('');
  const [commands, setCommands] = useState<Command[]>(mockCommands);

  const handleSend = () => {
    if (!commandText.trim()) return;
    
    const newCommand: Command = {
      id: `cmd-${Date.now()}`,
      from: 'ceo',
      to: targetAgent,
      content: commandText,
      timestamp: new Date().toISOString(),
      status: 'sent',
    };
    
    setCommands(prev => [newCommand, ...prev]);
    onSendCommand?.(targetAgent, commandText);
    setCommandText('');
    
    // Simulate status update
    setTimeout(() => {
      setCommands(prev => 
        prev.map(cmd => 
          cmd.id === newCommand.id ? { ...cmd, status: 'received' as const } : cmd
        )
      );
    }, 1000);
  };

  const quickCommands = [
    { label: '📊 状态报告', command: '请汇报当前工作状态和进展' },
    { label: '🎯 今日计划', command: '请制定今日工作计划' },
    { label: '⚠️ 问题反馈', command: '请汇报当前遇到的问题和阻碍' },
    { label: '💡 建议方案', command: '请针对当前任务提出优化建议' },
  ];

  if (compact) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-3">📡 指令中心</h3>
        <div className="flex gap-2 mb-3">
          <select
            value={targetAgent}
            onChange={(e) => setTargetAgent(e.target.value)}
            className="flex-shrink-0 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
          >
            <option value="all">全体 Agent</option>
            {agentDefinitions.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入指令..."
            className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm text-white placeholder-gray-500"
          />
          <button
            onClick={handleSend}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white"
          >
            发送
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">📡 指令中心</h2>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-gray-400">系统在线</span>
        </div>
      </div>

      {/* Command Input */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-gray-400">发送至:</label>
          <select
            value={targetAgent}
            onChange={(e) => setTargetAgent(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          >
            <option value="all">📢 全体 Agent</option>
            <option value="ARCHITECT-01">🏛️ ARCHITECT-01 (首席架构师)</option>
            {agentDefinitions.filter(a => a.id !== 'ARCHITECT-01').map(agent => (
              <option key={agent.id} value={agent.id}>🤖 {agent.name} ({agent.role})</option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-3">
          <textarea
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入指令... (Enter 发送, Shift+Enter 换行)"
            rows={3}
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 resize-none"
          />
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSend}
              disabled={!commandText.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
            >
              发送指令
            </button>
            <button
              className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium transition-colors"
            >
              🛑 紧急停止
            </button>
          </div>
        </div>
      </div>

      {/* Quick Commands */}
      <div className="mb-6">
        <h3 className="text-sm text-gray-400 mb-3">快捷指令</h3>
        <div className="flex flex-wrap gap-2">
          {quickCommands.map((qc, i) => (
            <button
              key={i}
              onClick={() => setCommandText(qc.command)}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm text-white transition-colors"
            >
              {qc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Command History */}
      <div>
        <h3 className="text-sm text-gray-400 mb-3">指令历史</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {commands.map(cmd => (
            <div key={cmd.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{statusIcons[cmd.status]}</span>
                  <span className="text-sm text-gray-400">
                    {cmd.from === 'ceo' ? '👔 CEO' : '🏛️ ARCHITECT'} → {cmd.to === 'all' ? '全体' : cmd.to}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(cmd.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-white">{cmd.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
