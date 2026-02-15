/**
 * Agent Chat Component (Refactored - Phase 3)
 * 
 * 主组件 - 组合各个拆分的子组件
 * 从 1172 行减少到 ~350 行
 */

'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { hqApi } from '@/lib/api';
import { useTools, type ToolExecution } from '@/hooks/useTools';
import { getToolsSystemPrompt, type ToolCall, readFile as localReadFile, writeFile as localWriteFile, editFile as localEditFile, listDir as localListDir } from '@/lib/tools';
import { useAgents } from '@/hooks/useAgents';
import { useChatStream, type Message } from '@/hooks/useChatStream';
import { AgentSelector, FALLBACK_AGENTS, AGENT_META, type AgentOption } from './AgentSelector';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import type { AttachedFile, GeneratedFile, PermissionRequest } from './ChatMessage';

// 工具执行回调类型
export interface ToolExecutionCallback {
  onFileChange?: (change: {
    type: 'read' | 'write' | 'edit';
    path: string;
    preview?: string;
    success: boolean;
    error?: string;
  }) => void;
  onTerminalOutput?: (output: {
    command: string;
    output: string;
    exitCode?: number;
    cwd?: string;
  }) => void;
  onActivityChange?: (activity: {
    type: string;
    description: string;
    status: 'running' | 'completed' | 'error';
  }) => void;
}

interface AgentChatProps {
  workspaceId: string;
  workspaceRootPath?: string;
  currentFile?: string;
  selectedCode?: string;
  onOpenFile?: (path: string) => void;
  callbacks?: ToolExecutionCallback;
}

function getWorkspaceToolsPrompt(workspaceRootPath?: string): string {
  const base = getToolsSystemPrompt();
  if (!workspaceRootPath) return base;
  return `${base}

## 当前工作区
 工作目录: ${workspaceRootPath}
 请使用以上目录下的绝对路径或相对路径
 当路径不在工作目录下时，请改写为工作目录内路径`;
}

// Session type for multi-session support
interface ChatSession {
  id: string;
  name: string;
  agentCode: string;
  messages: Message[];
  totalTokens: number;
  createdAt: number;
}

function generateSessionId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function AgentChat({ workspaceId, workspaceRootPath, currentFile, selectedCode, onOpenFile, callbacks }: AgentChatProps) {
  // localStorage keys
  const sessionsKey = `hq_ws_sessions_${workspaceId}`;
  const activeSessionKey = `hq_ws_active_session_${workspaceId}`;

  // Load sessions from localStorage
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(sessionsKey);
      if (stored) {
        const parsed: ChatSession[] = JSON.parse(stored);
        return parsed.map(s => ({
          ...s,
          messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
        }));
      }
    } catch {}
    // Migrate from old single-session format
    try {
      const oldKey = `hq_workspace_chat_${workspaceId}`;
      const oldMessages = localStorage.getItem(oldKey);
      const oldAgent = localStorage.getItem(`${oldKey}_agent`);
      if (oldMessages) {
        const msgs = JSON.parse(oldMessages).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
        const agent = oldAgent ? JSON.parse(oldAgent) : FALLBACK_AGENTS[1];
        const migrated: ChatSession = {
          id: generateSessionId(),
          name: `${agent.name} Session`,
          agentCode: agent.code,
          messages: msgs,
          totalTokens: 0,
          createdAt: Date.now(),
        };
        // Clean up old keys
        localStorage.removeItem(oldKey);
        localStorage.removeItem(`${oldKey}_agent`);
        return [migrated];
      }
    } catch {}
    return [];
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(activeSessionKey);
      if (stored) return stored;
    } catch {}
    return null;
  });

  // Derive current session
  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || null;
  const messages = currentSession?.messages || [];
  const totalTokens = currentSession?.totalTokens || 0;

  const [input, setInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentOption>(() => {
    if (typeof window === 'undefined') return FALLBACK_AGENTS[1];
    // Restore from current session's agent
    try {
      const storedSessionId = localStorage.getItem(activeSessionKey);
      const storedSessions = localStorage.getItem(sessionsKey);
      if (storedSessions && storedSessionId) {
        const parsed: ChatSession[] = JSON.parse(storedSessions);
        const active = parsed.find(s => s.id === storedSessionId);
        if (active) {
          const matched = FALLBACK_AGENTS.find(a => a.code === active.agentCode);
          if (matched) return matched;
        }
      }
    } catch {}
    return FALLBACK_AGENTS[1];
  });
  const [lastModel, setLastModel] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [pendingPermissions, setPendingPermissions] = useState<PermissionRequest[]>([]);
  const [iterationLimitInfo, setIterationLimitInfo] = useState<{ count: number } | null>(null);
  const iterationLimitResolverRef = useRef<((choice: 'continue' | 'summarize') => void) | null>(null);
  const [showContinue, setShowContinue] = useState(false);
  
  const { agents: backendAgents } = useAgents();
  const { executeTool } = useTools();

  // Track the effective session ID (use ref so setMessages always targets the latest)
  const effectiveSessionIdRef = useRef<string | null>(activeSessionId || sessions[0]?.id || null);
  useEffect(() => {
    effectiveSessionIdRef.current = activeSessionId || sessions[0]?.id || null;
  }, [activeSessionId, sessions]);

  // Helper: update messages in the current session
  const setMessages = useCallback((updater: Message[] | ((prev: Message[]) => Message[])) => {
    const targetId = effectiveSessionIdRef.current;
    setSessions(prev => prev.map(s => {
      if (s.id !== targetId) return s;
      const newMessages = typeof updater === 'function' ? updater(s.messages) : updater;
      return { ...s, messages: newMessages };
    }));
  }, []);

  // Helper: update totalTokens in the current session
  const setTotalTokens = useCallback((updater: number | ((prev: number) => number)) => {
    const targetId = effectiveSessionIdRef.current;
    setSessions(prev => prev.map(s => {
      if (s.id !== targetId) return s;
      const newTokens = typeof updater === 'function' ? updater(s.totalTokens) : updater;
      return { ...s, totalTokens: newTokens };
    }));
  }, []);

  // Persist sessions to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessions.length > 0) {
        localStorage.setItem(sessionsKey, JSON.stringify(sessions));
      } else {
        localStorage.removeItem(sessionsKey);
      }
    } catch {}
  }, [sessions, sessionsKey]);

  // Persist active session id
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (activeSessionId) {
        localStorage.setItem(activeSessionKey, activeSessionId);
      } else {
        localStorage.removeItem(activeSessionKey);
      }
    } catch {}
  }, [activeSessionId, activeSessionKey]);

  // Build a context summary from all existing sessions so new sessions aren't "amnesiac"
  const buildCrossSessionContext = useCallback((): Message | null => {
    const allSessions = sessions.filter(s => s.messages.length > 0);
    if (allSessions.length === 0) return null;

    const summaryParts: string[] = [];
    for (const s of allSessions) {
      const agentName = FALLBACK_AGENTS.find(a => a.code === s.agentCode)?.name || s.agentCode;
      // Take key messages: first user message + last 2 exchanges
      const userMsgs = s.messages.filter(m => m.role === 'user');
      const firstTopic = userMsgs[0]?.content?.slice(0, 200) || '';
      const recentExchanges = s.messages.slice(-4).map(m => {
        const preview = m.content.length > 300 ? m.content.slice(0, 300) + '...' : m.content;
        return `  [${m.role}]: ${preview}`;
      }).join('\n');

      summaryParts.push(
        `### Session "${s.name}" (${agentName}, ${s.messages.length} messages)\n` +
        `Topic: ${firstTopic}\n` +
        `Recent:\n${recentExchanges}`
      );
    }

    return {
      id: 'cross-session-ctx',
      role: 'assistant' as const,
      content: `[CONTEXT FROM PREVIOUS SESSIONS]\nBelow is a summary of conversations from other sessions in this workspace. Use this context to maintain continuity.\n\n${summaryParts.join('\n\n---\n\n')}`,
      timestamp: new Date(),
    };
  }, [sessions]);

  // Create a new session (returns the new session for immediate use)
  const createSession = useCallback((agentCode: string, name?: string): ChatSession => {
    const agent = FALLBACK_AGENTS.find(a => a.code === agentCode) || FALLBACK_AGENTS[1];

    // Build cross-session context so the new session has memory of prior conversations
    const contextMsg = buildCrossSessionContext();
    const initialMessages: Message[] = contextMsg ? [contextMsg] : [];

    const session: ChatSession = {
      id: generateSessionId(),
      name: name || `${agent.name} ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
      agentCode,
      messages: initialMessages,
      totalTokens: 0,
      createdAt: Date.now(),
    };
    setSessions(prev => [...prev, session]);
    setActiveSessionId(session.id);
    effectiveSessionIdRef.current = session.id; // Update ref immediately for same-tick setMessages calls
    setShowContinue(false);
    return session;
  }, [buildCrossSessionContext]);

  // Switch to a session
  const switchSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    setActiveSessionId(sessionId);
    effectiveSessionIdRef.current = sessionId;
    setShowContinue(false);
    // Update selected agent to match session's agent
    const agent = FALLBACK_AGENTS.find(a => a.code === session.agentCode);
    if (agent) setSelectedAgent(agent);
  }, [sessions]);

  // Delete a session
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== sessionId);
      // If we deleted the active session, switch to the last remaining one
      if (activeSessionId === sessionId) {
        const next = remaining[remaining.length - 1];
        setActiveSessionId(next?.id || null);
        if (next) {
          const agent = FALLBACK_AGENTS.find(a => a.code === next.agentCode);
          if (agent) setSelectedAgent(agent);
        }
      }
      return remaining;
    });
    setShowContinue(false);
  }, [activeSessionId]);

  // Path normalization utilities
  const normalizeWorkspacePath = useCallback((inputPath?: string) => {
    if (!inputPath) return inputPath;
    if (!workspaceRootPath) return inputPath;

    const normalizedInput = inputPath.replace(/\\/g, '/');
    const normalizedRoot = workspaceRootPath.replace(/\\/g, '/');
    
    if (!normalizedInput.startsWith('/')) {
      return `${normalizedRoot}/${normalizedInput}`;
    }
    if (normalizedInput.startsWith(normalizedRoot)) {
      return normalizedInput;
    }

    const repoName = normalizedRoot.split('/').filter(Boolean).pop();
    if (repoName) {
      const repoMarker = `/${repoName}/`;
      const repoIndex = normalizedInput.indexOf(repoMarker);
      if (repoIndex !== -1) {
        return `${normalizedRoot}/${normalizedInput.slice(repoIndex + repoMarker.length)}`;
      }
    }

    const knownRoots = [
      '/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website',
      'D:/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website',
    ];

    for (const root of knownRoots) {
      if (normalizedInput.startsWith(root)) {
        return `${normalizedRoot}/${normalizedInput.slice(root.length)}`;
      }
    }

    const altMarker = '/Agentrix-website/';
    if (normalizedInput.includes(altMarker)) {
      const tail = normalizedInput.split(altMarker)[1];
      return `${normalizedRoot}/${tail}`;
    }

    return normalizedInput;
  }, [workspaceRootPath]);

  const normalizeWorkspaceSubPath = useCallback((inputPath?: string) => {
    if (!inputPath) return '';
    if (!workspaceRootPath) return inputPath.replace(/\\/g, '/');
    const normalizedRoot = workspaceRootPath.replace(/\\/g, '/');
    const absolute = normalizeWorkspacePath(inputPath)?.replace(/\\/g, '/');
    if (absolute?.startsWith(normalizedRoot)) {
      return absolute.slice(normalizedRoot.length).replace(/^\/+/, '');
    }
    return absolute || '';
  }, [normalizeWorkspacePath, workspaceRootPath]);

  // Tool execution wrapper for workspace files
  const executeWorkspaceToolCall = useCallback(async (call: ToolCall): Promise<ToolExecution> => {
    const timestamp = new Date().toISOString();
    const baseParams = call.params || {};
    const normalizedParams: Record<string, any> = {
      ...baseParams,
      filePath: baseParams.filePath || baseParams.path,
      path: baseParams.path || baseParams.filePath,
    };

    const executionBase: ToolExecution = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tool: call.tool,
      params: normalizedParams,
      status: 'running',
      timestamp,
    };

    const isWorkspaceFileTool = ['read_file', 'write_file', 'edit_file', 'list_dir'].includes(call.tool);
    const isLocalWorkspace = Boolean(workspaceRootPath && (workspaceRootPath.startsWith('local://') || /^([A-Za-z]:\\|\/mnt\/)/.test(workspaceRootPath)));
    if (!isWorkspaceFileTool || !workspaceId) {
      return executeTool(call);
    }

    if (isLocalWorkspace && workspaceRootPath?.startsWith('local://')) {
      return { ...executionBase, status: 'error', error: 'Local handle workspaces do not support tool file operations yet.' };
    }

    if (isLocalWorkspace) {
      try {
        switch (call.tool) {
          case 'read_file': {
            const filePath = normalizeWorkspacePath(normalizedParams.filePath);
            if (!filePath) throw new Error('filePath is required');
            const data = await localReadFile(filePath);
            return { ...executionBase, status: 'success', result: { ...data, filePath } };
          }
          case 'write_file': {
            const filePath = normalizeWorkspacePath(normalizedParams.filePath);
            if (!filePath) throw new Error('filePath is required');
            const content = normalizedParams.content ?? '';
            const data = await localWriteFile(filePath, content, { createIfNotExists: true });
            return { ...executionBase, status: 'success', result: { ...data, filePath } };
          }
          case 'edit_file': {
            const filePath = normalizeWorkspacePath(normalizedParams.filePath);
            if (!filePath) throw new Error('filePath is required');
            const oldString = normalizedParams.oldString ?? '';
            const newString = normalizedParams.newString ?? '';
            if (!oldString) throw new Error('oldString is required');
            const data = await localEditFile(filePath, oldString, newString, { backup: true });
            return { ...executionBase, status: 'success', result: { ...data, filePath } };
          }
          case 'list_dir': {
            const dirPath = normalizeWorkspacePath(normalizedParams.path || workspaceRootPath || '');
            if (!dirPath) throw new Error('path is required');
            const data = await localListDir(dirPath, { recursive: false, maxDepth: 1 });
            return { ...executionBase, status: 'success', result: data };
          }
          default:
            return executeTool(call);
        }
      } catch (error: any) {
        return { ...executionBase, status: 'error', error: error.message || 'Tool execution failed' };
      }
    }

    try {
      switch (call.tool) {
        case 'read_file': {
          const filePath = normalizeWorkspacePath(normalizedParams.filePath);
          if (!filePath) throw new Error('filePath is required');
          const data = await hqApi.readFile(workspaceId, filePath);
          return { ...executionBase, status: 'success', result: { ...data, filePath } };
        }
        case 'write_file': {
          const filePath = normalizeWorkspacePath(normalizedParams.filePath);
          if (!filePath) throw new Error('filePath is required');
          const content = normalizedParams.content ?? '';
          await hqApi.saveFile(workspaceId, filePath, content);
          return {
            ...executionBase,
            status: 'success',
            result: { success: true, filePath, bytesWritten: String(content).length },
          };
        }
        case 'edit_file': {
          const filePath = normalizeWorkspacePath(normalizedParams.filePath);
          if (!filePath) throw new Error('filePath is required');
          const oldString = normalizedParams.oldString ?? '';
          const newString = normalizedParams.newString ?? '';
          if (!oldString) throw new Error('oldString is required');
          const current = await hqApi.readFile(workspaceId, filePath);
          if (!current.content.includes(oldString)) {
            throw new Error('oldString not found in file');
          }
          const updated = current.content.replace(oldString, newString);
          await hqApi.saveFile(workspaceId, filePath, updated);
          return { ...executionBase, status: 'success', result: { success: true, filePath, replaced: true } };
        }
        case 'list_dir': {
          const dirPath = normalizeWorkspaceSubPath(normalizedParams.path || '');
          const data = await hqApi.getFileTree(workspaceId, dirPath || undefined);
          const items = (data || []).map(item => ({
            name: item.name,
            path: item.path,
            type: item.type,
          }));
          return { ...executionBase, status: 'success', result: { path: dirPath, items, count: items.length } };
        }
        default:
          return executeTool(call);
      }
    } catch (error: any) {
      return { ...executionBase, status: 'error', error: error.message || 'Tool execution failed' };
    }
  }, [executeTool, normalizeWorkspacePath, normalizeWorkspaceSubPath, workspaceId]);

  const executeToolCalls = useCallback(async (calls: ToolCall[]) => {
    const results: ToolExecution[] = [];
    for (const call of calls) {
      results.push(await executeWorkspaceToolCall(call));
    }
    return { results };
  }, [executeWorkspaceToolCall]);

  // Streaming update handler: upsert a streaming placeholder message in real-time
  const handleStreamingUpdate = useCallback((msgId: string, content: string) => {
    setMessages(prev => {
      const existing = prev.find(m => m.id === msgId);
      if (existing) {
        return prev.map(m => m.id === msgId ? { ...m, content } : m);
      }
      // Insert streaming placeholder
      return [...prev, {
        id: msgId,
        role: 'assistant' as const,
        content,
        timestamp: new Date(),
      }];
    });
  }, []);

  // Iteration limit confirmation handler
  const handleIterationLimitReached = useCallback((iterationCount: number): Promise<'continue' | 'summarize'> => {
    return new Promise((resolve) => {
      setIterationLimitInfo({ count: iterationCount });
      iterationLimitResolverRef.current = (choice: 'continue' | 'summarize') => {
        setIterationLimitInfo(null);
        iterationLimitResolverRef.current = null;
        resolve(choice);
      };
    });
  }, []);

  // Use chat stream hook
  const { loading, thinkingDuration, sendMessage, stopGeneration } = useChatStream({
    onToolExecute: executeToolCalls,
    buildSystemPrompt: getWorkspaceToolsPrompt,
    callbacks,
    onStreamingUpdate: handleStreamingUpdate,
    onIterationLimitReached: handleIterationLimitReached,
  });

  // Agent options from backend
  const agentOptions = useMemo(() => {
    if (!backendAgents || backendAgents.length === 0) return FALLBACK_AGENTS;
    return backendAgents.map(agent => {
      const meta = AGENT_META[agent.code] || { icon: '🤖', description: agent.role || 'AI Agent' };
      return {
        code: agent.code,
        name: agent.name || agent.code,
        icon: meta.icon,
        description: meta.description,
      };
    });
  }, [backendAgents]);

  // Update selected agent when options change
  useEffect(() => {
    if (agentOptions.length === 0) return;
    setSelectedAgent(prev => {
      const matched = agentOptions.find(agent => agent.code === prev.code);
      if (matched) return matched;
      return agentOptions.find(agent => agent.code === 'CODER-01') || agentOptions[0];
    });
  }, [agentOptions]);

  // Handle agent selection: switch to existing session for that agent or create new one
  const handleAgentSelect = useCallback((agent: AgentOption) => {
    setSelectedAgent(agent);
    // Find existing session for this agent
    const existingSession = sessions.find(s => s.agentCode === agent.code);
    if (existingSession) {
      setActiveSessionId(existingSession.id);
    } else {
      createSession(agent.code);
    }
    setShowContinue(false);
  }, [sessions, createSession]);

  // Send message handler
  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachedFiles.length === 0) || loading) return;

    // Auto-create session if none exists
    if (!currentSession) {
      createSession(selectedAgent.code);
    }

    // Build message with attachments
    let fullContent = input.trim();
    const attachmentsCopy = [...attachedFiles];

    if (attachmentsCopy.length > 0) {
      fullContent += attachmentsCopy.map(f => {
        if (f.content) {
          return `\n\n[Attached File: ${f.name}]\n\`\`\`\n${f.content.slice(0, 10000)}\n\`\`\``;
        } else if (f.preview) {
          return `\n\n[Attached Image: ${f.name}]`;
        }
        return `\n\n[Attached: ${f.name}]`;
      }).join('');
    }

    // Add context
    if (currentFile) {
      fullContent += `\n\n[Current File: ${currentFile}]`;
    }
    if (selectedCode) {
      fullContent += `\n\n[Selected Code]\n\`\`\`\n${selectedCode}\n\`\`\``;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachments: attachmentsCopy.length > 0 ? attachmentsCopy : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachedFiles([]);

    const result = await sendMessage({
      agentCode: selectedAgent.code,
      conversationHistory: messages,
      userContent: fullContent,
      workspaceRootPath,
    });

    if (result) {
      // Replace streaming placeholder with final message (which has toolExecutions etc.)
      setMessages(prev => {
        const hasPlaceholder = prev.some(m => m.id === result.message.id);
        if (hasPlaceholder) {
          return prev.map(m => m.id === result.message.id ? result.message : m);
        }
        return [...prev, result.message];
      });
      if (result.model) setLastModel(result.model);
      if (result.message.tokenUsage) {
        setTotalTokens(prev => prev + result.message.tokenUsage!.totalTokens);
      }
      // Show Continue button if response was truncated
      setShowContinue(!!result.isTruncated);
    }
  }, [input, attachedFiles, loading, currentFile, selectedCode, selectedAgent, messages, workspaceRootPath, sendMessage, currentSession, createSession]);

  // Continue truncated response
  const handleContinue = useCallback(async () => {
    if (loading) return;
    setShowContinue(false);

    const result = await sendMessage({
      agentCode: selectedAgent.code,
      conversationHistory: messages,
      userContent: 'Continue',
      workspaceRootPath,
    });

    if (result) {
      setMessages(prev => {
        const hasPlaceholder = prev.some(m => m.id === result.message.id);
        if (hasPlaceholder) {
          return prev.map(m => m.id === result.message.id ? result.message : m);
        }
        return [...prev, result.message];
      });
      if (result.model) setLastModel(result.model);
      if (result.message.tokenUsage) {
        setTotalTokens(prev => prev + result.message.tokenUsage!.totalTokens);
      }
      setShowContinue(!!result.isTruncated);
    }
  }, [loading, sendMessage, selectedAgent, messages, workspaceRootPath]);

  // Clear conversation (clears current session's messages)
  const handleClear = useCallback(() => {
    setMessages([]);
    setAttachedFiles([]);
    setTotalTokens(0);
    setShowContinue(false);
  }, [setMessages, setTotalTokens]);

  // Handle file attachments
  const handleFilesAttach = useCallback((files: AttachedFile[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
  }, []);

  const handleFileRemove = useCallback((id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Handle permissions
  const handlePermissionApprove = useCallback(async (permId: string) => {
    const perm = pendingPermissions.find(p => p.id === permId);
    if (!perm) return;

    setPendingPermissions(prev =>
      prev.map(p => p.id === permId ? { ...p, status: 'approved' as const } : p)
    );

    try {
      const toolCall: ToolCall = { tool: perm.tool, params: perm.params };
      const result = await executeTool(toolCall);

      const toolResultMessage: Message = {
        id: Date.now().toString(),
        role: 'tool',
        content: result.status === 'success'
          ? `✅ ${perm.tool} 执行成功:\n\`\`\`\n${JSON.stringify(result.result, null, 2)}\n\`\`\``
          : `❌ ${perm.tool} 执行失败: ${result.error}`,
        timestamp: new Date(),
        toolExecutions: [result],
      };
      setMessages(prev => [...prev, toolResultMessage]);
    } catch (error) {
      console.error('Tool execution failed:', error);
    }

    setTimeout(() => {
      setPendingPermissions(prev => prev.filter(p => p.id !== permId));
    }, 2000);
  }, [pendingPermissions, executeTool]);

  const handlePermissionDeny = useCallback((permId: string) => {
    const perm = pendingPermissions.find(p => p.id === permId);
    if (!perm) return;

    setPendingPermissions(prev =>
      prev.map(p => p.id === permId ? { ...p, status: 'denied' as const } : p)
    );

    const deniedMessage: Message = {
      id: Date.now().toString(),
      role: 'tool',
      content: `🚫 用户拒绝了 ${perm.tool} 操作的权限请求`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, deniedMessage]);

    setTimeout(() => {
      setPendingPermissions(prev => prev.filter(p => p.id !== permId));
    }, 2000);
  }, [pendingPermissions]);

  // Save generated file
  const handleSaveFile = async (file: GeneratedFile) => {
    if (!file.content) return;

    try {
      const response = await fetch('/api/tools/write-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: file.path.startsWith('/') ? file.path : `/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website/${file.path}`,
          content: file.content,
        }),
      });

      if (response.ok) {
        alert(`File saved: ${file.name}`);
        onOpenFile?.(file.path);
      } else {
        alert('Failed to save file');
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save file');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Agent Selector */}
      <AgentSelector
        agents={agentOptions}
        selected={selectedAgent}
        onSelect={handleAgentSelect}
        lastModel={lastModel}
      />

      {/* Session Bar */}
      <div className="bg-gray-900/80 border-b border-gray-700/60 px-1.5 py-1 flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600">
        {sessions.map(s => {
          const isActive = s.id === (currentSession?.id);
          return (
            <div
              key={s.id}
              className={`group flex items-center gap-1 px-2 py-0.5 rounded text-[10px] cursor-pointer flex-shrink-0 transition-colors ${
                isActive
                  ? 'bg-blue-600/80 text-white'
                  : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
              onClick={() => switchSession(s.id)}
            >
              <span className="truncate max-w-[100px]" title={s.name}>{s.name}</span>
              <span className="text-[8px] opacity-60">({s.messages.length})</span>
              {sessions.length > 1 && (
                <button
                  className="ml-0.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                  title="Delete session"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        <button
          className="flex-shrink-0 px-1.5 py-0.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded text-xs transition-colors"
          onClick={() => createSession(selectedAgent.code)}
          title="New session"
        >
          +
        </button>
      </div>

      {/* Message List */}
      <ChatMessageList
        messages={messages}
        loading={loading}
        selectedAgent={selectedAgent}
        pendingPermissions={pendingPermissions}
        currentFile={currentFile}
        selectedCode={selectedCode}
        onOpenFile={onOpenFile}
        onSaveFile={handleSaveFile}
        onPermissionApprove={handlePermissionApprove}
        onPermissionDeny={handlePermissionDeny}
      />

      {/* Iteration Limit Confirmation */}
      {iterationLimitInfo && (
        <div className="px-3 py-3 bg-amber-900/40 border-t border-amber-600/50 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-300 text-sm">
            <span className="text-lg">⚠️</span>
            <span>已执行 <strong>{iterationLimitInfo.count}</strong> 轮工具调用，是否继续？</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => iterationLimitResolverRef.current?.('continue')}
              className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition-colors"
            >
              继续执行 (+10轮)
            </button>
            <button
              onClick={() => iterationLimitResolverRef.current?.('summarize')}
              className="flex-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-md transition-colors"
            >
              生成报告
            </button>
          </div>
        </div>
      )}

      {/* Continue Button - shown when AI response was truncated */}
      {showContinue && !loading && (
        <div className="px-3 py-2 bg-blue-900/30 border-t border-blue-600/40 flex items-center gap-2">
          <span className="text-blue-300 text-xs flex-1">Response was cut off</span>
          <button
            onClick={handleContinue}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition-colors font-medium"
          >
            Continue
          </button>
        </div>
      )}

      {/* Token Usage Bar */}
      {totalTokens > 0 && (
        <div className="px-3 py-1 bg-gray-800/60 border-t border-gray-700/50 flex items-center justify-between text-[10px] text-gray-500">
          <span>Tokens: ~{totalTokens.toLocaleString()}</span>
          <span>{messages.filter(m => m.role === 'assistant').length} responses</span>
        </div>
      )}

      {/* Input Area */}
      <ChatInput
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        onStop={stopGeneration}
        onClear={handleClear}
        loading={loading}
        messageCount={messages.length}
        agentName={selectedAgent.name}
        attachedFiles={attachedFiles}
        onFilesAttach={handleFilesAttach}
        onFileRemove={handleFileRemove}
      />
    </div>
  );
}
