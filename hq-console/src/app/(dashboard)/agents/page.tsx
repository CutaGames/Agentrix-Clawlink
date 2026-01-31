/**
 * Agents Page
 * 
 * Agent 管理和监控页面
 */
'use client';

import { useState, useEffect } from 'react';

interface Skill {
  code: string;
  name: string;
  category: string;
}

interface Agent {
  id: string;
  name: string;
  code: string;
  role: string;
  type?: string;
  status: string;
  currentTask?: string;
  progress?: number;
  description?: string;
  skills?: Skill[];
}

const statusConfig: Record<string, { color: string; bg: string; icon: string }> = {
  idle: { color: 'text-green-600', bg: 'bg-green-100', icon: '🟢' },
  running: { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: '🟡' },
  paused: { color: 'text-blue-600', bg: 'bg-blue-100', icon: '⏸️' },
  error: { color: 'text-red-600', bg: 'bg-red-100', icon: '🔴' },
  offline: { color: 'text-gray-600', bg: 'bg-gray-100', icon: '⚫' },
};

const roleIcons: Record<string, string> = {
  architect: '🏗️',
  coder: '💻',
  growth: '📈',
  bd: '🤝',
  analyst: '📊',
  support: '🎧',
  risk: '⚠️',
  finance: '💰',
  custom: '🤖',
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_HQ_API_URL || 'http://localhost:3005/api';

  useEffect(() => {
    fetchAgents();
    fetchSkills();
    
    // 每 10 秒刷新一次状态
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_BASE}/hq/agents`);
      const data = await res.json();
      if (data.success) {
        setAgents(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSkills = async () => {
    try {
      const res = await fetch(`${API_BASE}/hq/skills/available/list`);
      const data = await res.json();
      if (data.success) {
        setAvailableSkills(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch skills:', error);
    }
  };

  const fetchAgentSkills = async (agentId: string) => {
    try {
      const res = await fetch(`${API_BASE}/hq/skills/agent/${agentId}`);
      const data = await res.json();
      if (data.success && selectedAgent) {
        setSelectedAgent({ ...selectedAgent, skills: data.data });
      }
    } catch (error) {
      console.error('Failed to fetch agent skills:', error);
    }
  };

  const selectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setChatHistory([]);
    fetchAgentSkills(agent.id);
  };

  const sendMessage = async () => {
    if (!selectedAgent || !chatMessage.trim()) return;

    const userMessage = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/hq/cli/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          message: userMessage,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'error', content: data.message || 'Failed' }]);
      }
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'error', content: `Error: ${error}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🤖 Agent 管理</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">管理和监控 AI Agent 状态</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Agent 列表</h2>
          
          {agents.map(agent => {
            const status = statusConfig[agent.status] || statusConfig.offline;
            return (
              <div
                key={agent.id}
                onClick={() => selectAgent(agent)}
                className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow cursor-pointer transition hover:shadow-lg ${
                  selectedAgent?.id === agent.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{roleIcons[agent.role] || '🤖'}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{agent.name}</h3>
                      <code className="text-xs text-gray-500">{agent.code}</code>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${status.bg} ${status.color}`}>
                    {status.icon} {agent.status}
                  </span>
                </div>

                {agent.currentTask && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    📝 {agent.currentTask.substring(0, 50)}...
                  </div>
                )}

                {agent.progress !== undefined && agent.progress > 0 && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${agent.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{agent.progress}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Agent Detail & Chat */}
        <div className="lg:col-span-2">
          {selectedAgent ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-full flex flex-col">
              {/* Agent Header */}
              <div className="p-4 border-b dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{roleIcons[selectedAgent.role] || '🤖'}</span>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedAgent.name}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedAgent.description || `${selectedAgent.role} agent`}
                    </p>
                  </div>
                </div>

                {/* Skills */}
                {selectedAgent.skills && selectedAgent.skills.length > 0 && (
                  <div className="mt-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">技能: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedAgent.skills.map(skill => (
                        <span 
                          key={skill.code}
                          className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                        >
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Area */}
              <div className="flex-1 p-4 overflow-auto space-y-3 min-h-[300px] max-h-[400px]">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    💬 开始与 {selectedAgent.name} 对话
                  </div>
                ) : (
                  chatHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : msg.role === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        <pre className="whitespace-pre-wrap text-sm font-sans">{msg.content}</pre>
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                      <span className="animate-pulse">⏳ 思考中...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t dark:border-gray-700">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={e => setChatMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="输入消息..."
                    className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={chatLoading || !chatMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">
              <span className="text-4xl">👈</span>
              <p className="mt-4">选择一个 Agent 开始交互</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
