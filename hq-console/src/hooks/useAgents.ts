"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { AgentStatus, getAgentStatuses, sendAgentCommand, chatWithAgent, chatWithAgentStream, hqApi } from '@/lib/api';
import { getToolsSystemPrompt, parseToolCalls, executeToolCall, ToolCall } from '@/lib/tools';
import { isToolAllowed } from '@/lib/agent-permissions';

// Storage key prefix for chat history
const CHAT_STORAGE_PREFIX = 'hq_chat_history_';

// Helper to get chat history from localStorage
function getChatHistory(agentId: string): Array<{ role: string; content: string; timestamp?: string }> {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_PREFIX + agentId);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Helper to save chat history to localStorage
function saveChatHistory(agentId: string, messages: Array<{ role: string; content: string; timestamp?: string }>) {
  if (typeof window === 'undefined') return;
  try {
    // Keep only last 50 messages per agent
    const toSave = messages.slice(-50);
    localStorage.setItem(CHAT_STORAGE_PREFIX + agentId, JSON.stringify(toSave));
  } catch {
    console.warn('Failed to save chat history to localStorage');
  }
}

// Mock data for development
const mockAgents: AgentStatus[] = [
  {
    id: 'S01',
    code: 'SALES-01',
    name: 'Sales-01',
    role: 'Twitter Growth',
    status: 'running',
    currentTask: 'Analyzing trending hashtags for #AI_Agents. Generating 5 draft tweets.',
    progress: 45,
    lastActive: new Date().toISOString(),
  },
  {
    id: 'D02',
    code: 'DEV-02',
    name: 'Dev-02',
    role: 'Bug Fixer',
    status: 'paused',
    currentTask: 'Waiting for code review on PR #221 (Fix Payment Timeout).',
    progress: undefined,
    lastActive: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'H01',
    code: 'HQ-CORE',
    name: 'HQ-Core',
    role: 'System',
    status: 'running',
    currentTask: 'Optimizing database indexes for session_logs table.',
    progress: 78,
    lastActive: new Date().toISOString(),
  },
  {
    id: 'M01',
    code: 'MARKET-01',
    name: 'Market-01',
    role: 'Market Research',
    status: 'idle',
    currentTask: undefined,
    progress: undefined,
    lastActive: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
  },
  {
    id: 'C01',
    code: 'CONTENT-01',
    name: 'Content-01',
    role: 'Content Writer',
    status: 'error',
    currentTask: 'Failed: API rate limit exceeded.',
    progress: undefined,
    lastActive: new Date(Date.now() - 15 * 60000).toISOString(),
  },
];

export function useAgents() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAgentStatuses();
      setAgents(data);
      setError(null);
    } catch (e) {
      console.error('Failed to fetch agent statuses:', e);
      setAgents(mockAgents);
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    // Refresh every 10 minutes for agent status
    const interval = setInterval(fetchAgents, 600000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}

export function useAgentChat(agentId: string | null) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string; timestamp?: string; toolCalls?: ToolCall[] }>>([]);
  const [sending, setSending] = useState(false);
  const [artifact, setArtifact] = useState<string | null>(null);
  const [workingStatus, setWorkingStatus] = useState<string | null>(null);
  const [toolExecutions, setToolExecutions] = useState<Array<{ tool: string; status: string; result?: any }>>([]);
  const [lastModel, setLastModel] = useState<string | null>(null);
  const prevAgentIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Load chat history when agent changes
  useEffect(() => {
    if (agentId && agentId !== prevAgentIdRef.current) {
      const history = getChatHistory(agentId);
      setMessages(history);
      setArtifact(null);
      setWorkingStatus(null);
      setToolExecutions([]);
      setLastModel(null);
      sessionIdRef.current = null;
    }
    prevAgentIdRef.current = agentId;
  }, [agentId]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (agentId && messages.length > 0) {
      saveChatHistory(agentId, messages);
    }
  }, [agentId, messages]);

  // Execute tool calls and get results
  const executeTools = useCallback(async (toolCalls: ToolCall[]): Promise<string> => {
    const results: string[] = [];
    const permissionKey = agentId || 'unknown';

    const blockedCalls = toolCalls.filter(call => !isToolAllowed(permissionKey, call.tool));
    for (const call of blockedCalls) {
      setToolExecutions(prev => [...prev, { tool: call.tool, status: 'error', result: 'Permission denied by UI settings' }]);
      results.push(`[Tool: ${call.tool}]\nError: Permission denied by UI settings`);
    }

    const allowedCalls = toolCalls.filter(call => isToolAllowed(permissionKey, call.tool));

    for (const call of allowedCalls) {
      setToolExecutions(prev => [...prev, { tool: call.tool, status: 'running' }]);
      setWorkingStatus(`Executing ${call.tool}...`);
      
      try {
        const result = await executeToolCall(call);
        setToolExecutions(prev => 
          prev.map(t => t.tool === call.tool && t.status === 'running' 
            ? { ...t, status: result.success ? 'success' : 'error', result: result.result || result.error }
            : t
          )
        );
        
        if (result.success) {
          results.push(`[Tool: ${call.tool}]\nResult: ${JSON.stringify(result.result, null, 2)}`);
        } else {
          results.push(`[Tool: ${call.tool}]\nError: ${result.error}`);
        }
      } catch (e: any) {
        setToolExecutions(prev => 
          prev.map(t => t.tool === call.tool && t.status === 'running' 
            ? { ...t, status: 'error', result: e.message }
            : t
          )
        );
        results.push(`[Tool: ${call.tool}]\nError: ${e.message}`);
      }
    }
    
    return results.join('\n\n');
  }, [agentId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!agentId || sending) return;
    
    const userMessage = { role: 'user', content, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setSending(true);
    setWorkingStatus('Connecting to AI engine...');
    setToolExecutions([]);

    try {
      setWorkingStatus('Processing your request...');
      const toolPrompt = getToolsSystemPrompt();
      let currentMessages = [...messages, userMessage];
      const assistantTimestamp = new Date().toISOString();
      setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: assistantTimestamp }]);

      let responseContent = '';
      let response: any = null;
      try {
        setWorkingStatus('Streaming response...');
        response = await chatWithAgentStream(
          agentId,
          currentMessages,
          { toolPrompt },
          {
            onChunk: (_chunk, full) => {
              responseContent = full;
              setMessages(prev => prev.map(m =>
                m.timestamp === assistantTimestamp && m.role === 'assistant'
                  ? { ...m, content: full }
                  : m
              ));
            },
            onMeta: (meta) => {
              if (meta?.model) setLastModel(meta.model);
            },
          }
        );
      } catch (streamError: any) {
        console.warn('Stream failed, falling back to standard chat:', streamError?.message || streamError, streamError);
        setWorkingStatus('Processing your request...');
        try {
          response = await chatWithAgent(agentId, currentMessages, { toolPrompt });
          responseContent = response.content || response.message || 'OK';
          setMessages(prev => prev.map(m =>
            m.timestamp === assistantTimestamp && m.role === 'assistant'
              ? { ...m, content: responseContent }
              : m
          ));
        } catch (chatError: any) {
          console.warn('Standard chat failed, falling back to unified chat:', chatError?.message || chatError, chatError);
          setWorkingStatus('Switching to unified chat...');
          const unified = await hqApi.unifiedChat({
            agentCode: agentId,
            message: content,
            sessionId: sessionIdRef.current || undefined,
            mode: 'staff',
          });
          responseContent = unified.response || 'OK';
          if (unified.sessionId) sessionIdRef.current = unified.sessionId;
          if (unified.model) setLastModel(unified.model);
          setMessages(prev => prev.map(m =>
            m.timestamp === assistantTimestamp && m.role === 'assistant'
              ? { ...m, content: responseContent }
              : m
          ));
        }
      }

      if (response?.model) setLastModel(response.model);
      
      // Check for tool calls in response
      let toolCalls = parseToolCalls(responseContent);
      let iterationCount = 0;
      const maxIterations = 5; // Prevent infinite loops
      
      while (toolCalls.length > 0 && iterationCount < maxIterations) {
        iterationCount++;
        setWorkingStatus(`Executing tools (${iterationCount}/${maxIterations})...`);
        
        // Execute all tool calls
        const toolResults = await executeTools(toolCalls);
        
        // Add assistant message with tool calls
        const toolCallMessage = { 
          role: 'assistant', 
          content: responseContent,
          timestamp: new Date().toISOString(),
          toolCalls,
        };
        currentMessages = [...currentMessages, toolCallMessage];
        
        // Add tool results as user message (system context)
        const toolResultMessage = {
          role: 'user',
          content: `[Tool Execution Results]\n\n${toolResults}\n\nPlease continue based on these results.`,
          timestamp: new Date().toISOString(),
        };
        currentMessages = [...currentMessages, toolResultMessage];
        
        // Get next response
        setWorkingStatus('Agent processing tool results...');
        try {
          response = await chatWithAgent(agentId, currentMessages, { toolPrompt });
          if (response?.model) setLastModel(response.model);
          responseContent = response.content || response.message || 'OK';
        } catch (toolChatError: any) {
          console.warn('Tool follow-up chat failed, switching to unified chat:', toolChatError?.message || toolChatError);
          const unified = await hqApi.unifiedChat({
            agentCode: agentId,
            message: toolResultMessage.content,
            sessionId: sessionIdRef.current || undefined,
            mode: 'staff',
          });
          responseContent = unified.response || 'OK';
          if (unified.sessionId) sessionIdRef.current = unified.sessionId;
          if (unified.model) setLastModel(unified.model);
        }
        setMessages(prev => prev.map(m =>
          m.timestamp === assistantTimestamp && m.role === 'assistant'
            ? { ...m, content: responseContent }
            : m
        ));
        toolCalls = parseToolCalls(responseContent);
      }
      
      setWorkingStatus(null);
      if (!responseContent) {
        setMessages(prev => prev.map(m =>
          m.timestamp === assistantTimestamp && m.role === 'assistant'
            ? { ...m, content: responseContent || 'OK' }
            : m
        ));
      }
      
      // Check if response contains artifact
      if (response?.artifact) {
        setArtifact(response.artifact);
      }
      if (response?.model) setLastModel(response.model);
    } catch (e: any) {
      console.error('Chat API Error:', e?.message || e, e);
      setWorkingStatus(null);
      let errorMsg = e?.message || 'Failed to connect to AI engine.';
      if (e?.response?.data?.message) {
        errorMsg = e.response.data.message;
      }
      const errResponse = { 
        role: 'assistant', 
        content: `[Error] ${errorMsg}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errResponse]);
    } finally {
      setSending(false);
      setWorkingStatus(null);
    }
  }, [agentId, messages, sending, executeTools]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setArtifact(null);
    setWorkingStatus(null);
    setToolExecutions([]);
    if (agentId) {
      localStorage.removeItem(CHAT_STORAGE_PREFIX + agentId);
    }
  }, [agentId]);

  return { messages, sending, artifact, workingStatus, toolExecutions, sendMessage, clearChat, lastModel };
}
