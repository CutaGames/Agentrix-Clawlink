"use client";

import { useState, useEffect, useCallback } from 'react';
import { AgentStatus, getAgentStatuses, sendAgentCommand, chatWithAgent } from '@/lib/api';

// Mock data for development
const mockAgents: AgentStatus[] = [
  {
    id: 'S01',
    name: 'Sales-01',
    role: 'Twitter Growth',
    status: 'running',
    currentTask: 'Analyzing trending hashtags for #AI_Agents. Generating 5 draft tweets.',
    progress: 45,
    lastActive: new Date().toISOString(),
  },
  {
    id: 'D02',
    name: 'Dev-02',
    role: 'Bug Fixer',
    status: 'paused',
    currentTask: 'Waiting for code review on PR #221 (Fix Payment Timeout).',
    progress: undefined,
    lastActive: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'H01',
    name: 'HQ-Core',
    role: 'System',
    status: 'running',
    currentTask: 'Optimizing database indexes for session_logs table.',
    progress: 78,
    lastActive: new Date().toISOString(),
  },
  {
    id: 'M01',
    name: 'Market-01',
    role: 'Market Research',
    status: 'idle',
    currentTask: undefined,
    progress: undefined,
    lastActive: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
  },
  {
    id: 'C01',
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
    // Refresh every 30 seconds for agent status (reduced from 5s to avoid flicker)
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}

export function useAgentChat(agentId: string | null) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [sending, setSending] = useState(false);
  const [artifact, setArtifact] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!agentId || sending) return;
    
    const userMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setSending(true);

    try {
      const response = await chatWithAgent(agentId, [...messages, userMessage]);
      const assistantMessage = { role: 'assistant', content: response.content || response.message || 'OK' };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Check if response contains artifact
      if (response.artifact) {
        setArtifact(response.artifact);
      }
    } catch (e) {
      console.error('Chat API Error:', e);
      let errorMsg = 'Failed to connect to AI engine.';
      if ((e as any).response?.data?.message) {
        errorMsg = (e as any).response.data.message;
      }
      const errResponse = { role: 'assistant', content: `[Error] ${errorMsg}` };
      setMessages(prev => [...prev, errResponse]);
    } finally {
      setSending(false);
    }
  }, [agentId, messages, sending]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setArtifact(null);
  }, []);

  return { messages, sending, artifact, sendMessage, clearChat };
}
