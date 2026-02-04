/**
 * Agents Page
 * 
 * Agent 管理和监控页面
 */
'use client';

import { useState, useEffect } from 'react';
import { getModelForAgent } from '@/lib/api';
import {
  MODEL_PRESETS,
  PROVIDER_OPTIONS,
  AIProvider,
  AgentModelOverride,
  getEffectiveModelId,
} from '@/lib/agent-models';
import {
  TOOL_PERMISSION_KEYS,
  ToolPermissions,
  ToolPermissionKey,
  getAgentToolPermissions,
  setAgentToolPermissions,
  getToolPermissionLabel,
  isToolAllowed,
} from '@/lib/agent-permissions';
import { getToolsSystemPrompt, parseToolCalls } from '@/lib/tools';
import { useTools } from '@/hooks/useTools';

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
  config?: {
    modelProvider?: AIProvider;
    modelId?: string;
    modelPreference?: string;
  };
}

const demoAgents: Agent[] = [
  {
    id: 'ARCH-01',
    name: '首席架构师',
    code: 'ARCH-01',
    role: 'architect',
    status: 'idle',
    currentTask: '正在等待新的架构任务。',
    progress: 0,
  },
  {
    id: 'CODER-01',
    name: '高级开发工程师',
    code: 'CODER-01',
    role: 'coder',
    status: 'running',
    currentTask: '修复 HQ 控制台编译问题。',
    progress: 64,
  },
  {
    id: 'BD-01',
    name: '全球生态发展负责人',
    code: 'BD-01',
    role: 'bd',
    status: 'running',
    currentTask: '整理合作伙伴名单与对接计划。',
    progress: 38,
  },
  {
    id: 'ANALY-01',
    name: 'Business Analyst',
    code: 'ANALY-01',
    role: 'analyst',
    status: 'idle',
    currentTask: '准备周报与 KPI 追踪。',
    progress: 0,
  },
];

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

const TOOLS_SYSTEM_PROMPT = getToolsSystemPrompt();

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [toolPermissions, setToolPermissions] = useState<ToolPermissions | null>(null);
  const [modelOverride, setModelOverride] = useState<AgentModelOverride | null>(null);
  const [modelSelection, setModelSelection] = useState<string>('default');
  const [customModel, setCustomModel] = useState('');
  const [customProvider, setCustomProvider] = useState<AIProvider>('auto');
  const [apiError, setApiError] = useState<string | null>(null);
  const { executeToolsInMessage, formatToolResult } = useTools();

  const API_BASE = process.env.NEXT_PUBLIC_HQ_API_URL || 'http://57.182.89.146:8080/api';

  const buildSystemPrompt = (agent: Agent) => {
    const roleLine = agent.description
      ? `你是 Agentrix HQ 的 ${agent.name}（${agent.code}）。${agent.description}`
      : `你是 Agentrix HQ 的 ${agent.name}（${agent.code}）。请提供专业、可执行的建议。`;
    return `${roleLine}\n\n${TOOLS_SYSTEM_PROMPT}`;
  };

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
      if (Array.isArray(data) && data.length > 0) {
        setAgents(data);
        setApiError(null);
        return;
      }
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setAgents(data.data);
        setApiError(null);
        return;
      }
      setAgents(demoAgents);
      setApiError('HQ 后端无可用数据，已显示演示 Agent 列表。');
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      setAgents(demoAgents);
      setApiError('无法连接 HQ 后端，已显示演示 Agent 列表。');
    } finally {
      setLoading(false);
    }
  };

  const fetchSkills = async () => {
    try {
      const res = await fetch(`${API_BASE}/hq/skills/available/list`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAvailableSkills(data);
        return;
      }
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
      if (Array.isArray(data) && selectedAgent) {
        setSelectedAgent({ ...selectedAgent, skills: data });
      } else if (data.success && selectedAgent) {
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
    const permissionKey = agent.code || agent.id;
    setToolPermissions(getAgentToolPermissions(permissionKey));
    const override = agent.config?.modelId
      ? { provider: agent.config?.modelProvider ?? 'auto', model: agent.config?.modelId }
      : null;
    setModelOverride(override);
    if (!override) {
      setModelSelection('default');
      setCustomModel('');
      setCustomProvider('auto');
      return;
    }
    const preset = MODEL_PRESETS.find(
      (item) => item.model === override.model && item.provider === (override.provider ?? 'auto'),
    );
    if (preset) {
      setModelSelection(preset.id);
      setCustomModel(preset.model);
      setCustomProvider(preset.provider);
    } else {
      setModelSelection('custom');
      setCustomModel(override.model);
      setCustomProvider(override.provider ?? 'auto');
    }
  };

  const applyModelOverride = async (override: AgentModelOverride | null) => {
    if (!selectedAgent) return;
    const payload = override
      ? { provider: override.provider, model: override.model }
      : { clear: true };

    const res = await fetch(`${API_BASE}/hq/agents/${selectedAgent.id}/model`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error('Failed to update agent model');
    }

    const updated = (await res.json()) as Agent;
    setModelOverride(override);
    setSelectedAgent(updated);
    setAgents(prev => prev.map(agent => (agent.id === updated.id ? { ...agent, ...updated } : agent)));
  };

  const handleModelSelection = (value: string, apply = true) => {
    setModelSelection(value);
    if (value === 'default') {
      if (apply) {
        applyModelOverride(null).catch((error) => console.error(error));
      }
      return;
    }
    if (value === 'custom') {
      if (customModel.trim()) {
        if (apply) {
          applyModelOverride({ provider: customProvider, model: customModel.trim() }).catch((error) => console.error(error));
        }
      }
      return;
    }
    const preset = MODEL_PRESETS.find((item) => item.id === value);
    if (preset) {
      setCustomModel(preset.model);
      setCustomProvider(preset.provider);
      if (apply) {
        applyModelOverride({ provider: preset.provider, model: preset.model }).catch((error) => console.error(error));
      }
    }
  };
  const applyCurrentModelSelection = () => {
    if (modelSelection === 'default') {
      applyModelOverride(null).catch((error) => console.error(error));
      return;
    }
    if (modelSelection === 'custom') {
      if (customModel.trim()) {
        applyModelOverride({ provider: customProvider, model: customModel.trim() }).catch((error) => console.error(error));
      }
      return;
    }
    const preset = MODEL_PRESETS.find((item) => item.id === modelSelection);
    if (preset) {
      applyModelOverride({ provider: preset.provider, model: preset.model }).catch((error) => console.error(error));
    }
  };

  const updatePermission = (tool: ToolPermissionKey, allowed: boolean) => {
    if (!selectedAgent) return;
    const permissionKey = selectedAgent.code || selectedAgent.id;
    const current = toolPermissions || getAgentToolPermissions(permissionKey);
    const next: ToolPermissions = { ...current, [tool]: allowed };
    setToolPermissions(next);
    setAgentToolPermissions(permissionKey, next);
  };

  const setAllPermissions = (allowed: boolean) => {
    if (!selectedAgent) return;
    const permissionKey = selectedAgent.code || selectedAgent.id;
    const next = TOOL_PERMISSION_KEYS.reduce((acc, key) => {
      acc[key] = allowed;
      return acc;
    }, {} as ToolPermissions);
    setToolPermissions(next);
    setAgentToolPermissions(permissionKey, next);
  };

  const sendMessage = async () => {
    if (!selectedAgent || !chatMessage.trim()) return;

    const userMessage = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const override = modelOverride;
      const systemPrompt = buildSystemPrompt(selectedAgent);
      const permissionKey = selectedAgent.code || selectedAgent.id;
      const baseModel = getModelForAgent(selectedAgent.code);
      const targetModel = override?.model || baseModel;
      const targetProvider = override?.provider;

      const conversationHistory = chatHistory.map(msg => ({
        role: (msg.role === 'tool' || msg.role === 'error') ? 'assistant' : msg.role,
        content: msg.content,
      }));

      const apiMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory,
        { role: 'user' as const, content: userMessage },
      ];

      const res = await fetch(`${API_BASE}/hq/chat/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          options: {
            model: targetModel,
            provider: targetProvider,
          },
        }),
      });
      const data = await res.json();

      const responseContent = data.content || data.response || data.message || 'OK';
      setChatHistory(prev => [...prev, { role: 'assistant', content: responseContent }]);

      const toolCalls = parseToolCalls(responseContent);
      const allowedToolCalls = toolCalls.filter(tc => isToolAllowed(permissionKey, tc.tool));
      const deniedToolCalls = toolCalls.filter(tc => !isToolAllowed(permissionKey, tc.tool));

      if (deniedToolCalls.length > 0) {
        setChatHistory(prev => [
          ...prev,
          {
            role: 'error',
            content: `⚠️ 以下工具调用被权限策略阻止: ${deniedToolCalls.map(tc => tc.tool).join(', ')}`,
          },
        ]);
      }

      if (allowedToolCalls.length > 0) {
        const toolResults = await executeToolsInMessage(responseContent, allowedToolCalls);
        const toolResultText = toolResults.results
          .map(result => formatToolResult(result))
          .filter(Boolean)
          .join('\n\n');

        if (toolResultText) {
          setChatHistory(prev => [...prev, { role: 'tool', content: toolResultText }]);

          const followUpMessages = [
            { role: 'system' as const, content: systemPrompt },
            ...conversationHistory,
            { role: 'user' as const, content: userMessage },
            { role: 'assistant' as const, content: responseContent },
            { role: 'user' as const, content: `工具执行结果:\n${toolResultText}\n\n请基于结果继续回答。` },
          ];

          const followUpRes = await fetch(`${API_BASE}/hq/chat/completion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: followUpMessages,
              options: {
                model: targetModel,
                provider: targetProvider,
              },
            }),
          });
          const followUpData = await followUpRes.json();
          const followUpContent = followUpData.content || followUpData.response || followUpData.message;
          if (followUpContent) {
            setChatHistory(prev => [...prev, { role: 'assistant', content: followUpContent }]);
          }
        }
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

      {apiError && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          <div className="text-sm font-semibold">数据源提示</div>
          <div className="text-sm mt-1">
            {apiError} 请检查 <span className="font-mono">NEXT_PUBLIC_HQ_API_URL</span>（或 <span className="font-mono">NEXT_PUBLIC_HQ_URL</span>）配置，
            确认指向可访问的 HQ API。
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Agent 列表</h2>

          {agents.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400">
              暂无 Agent 数据。请检查 HQ API 地址配置或后端服务状态。
            </div>
          )}
          
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

                {/* Model & Permissions */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">模型设置</div>
                    <div className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-all">
                      {selectedAgent.code
                        ? getEffectiveModelId(selectedAgent.code, modelOverride)
                        : 'Unknown'}
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">预设模型</label>
                      <select
                        value={modelSelection}
                        onChange={(e) => handleModelSelection(e.target.value, false)}
                        className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm"
                      >
                        <option value="default">默认（按角色映射）</option>
                        {MODEL_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                          </option>
                        ))}
                        <option value="custom">自定义...</option>
                      </select>
                    </div>

                    {modelSelection !== 'custom' && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={applyCurrentModelSelection}
                          className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                          应用
                        </button>
                        {modelOverride && (
                          <button
                            onClick={() => handleModelSelection('default', true)}
                            className="text-xs px-2 py-1 rounded bg-gray-600 text-white hover:bg-gray-700"
                          >
                            恢复默认
                          </button>
                        )}
                      </div>
                    )}

                    {modelSelection === 'custom' && (
                      <div className="mt-3 space-y-2">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Provider</label>
                          <select
                            value={customProvider}
                            onChange={(e) => setCustomProvider(e.target.value as AIProvider)}
                            className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm"
                          >
                            {PROVIDER_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">模型 ID</label>
                          <input
                            value={customModel}
                            onChange={(e) => setCustomModel(e.target.value)}
                            placeholder="例如: gemini-2.5-flash"
                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={applyCurrentModelSelection}
                            className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                          >
                            应用
                          </button>
                          <button
                            onClick={() => handleModelSelection('default', true)}
                            className="text-xs px-2 py-1 rounded bg-gray-600 text-white hover:bg-gray-700"
                          >
                            恢复默认
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">工具权限</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAllPermissions(true)}
                          className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          全开
                        </button>
                        <button
                          onClick={() => setAllPermissions(false)}
                          className="text-xs px-2 py-1 rounded bg-gray-600 text-white hover:bg-gray-700"
                        >
                          全关
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {TOOL_PERMISSION_KEYS.map((tool) => (
                        <label key={tool} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">{getToolPermissionLabel(tool)}</span>
                          <input
                            type="checkbox"
                            checked={(toolPermissions || getAgentToolPermissions(selectedAgent.code || selectedAgent.id))[tool]}
                            onChange={(e) => updatePermission(tool, e.target.checked)}
                            className="h-4 w-4"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
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
