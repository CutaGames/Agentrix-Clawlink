/**
 * useChatHistory Hook
 * 
 * 管理聊天历史的持久化 - 与后端 ChatSession 集成
 * 支持会话恢复、历史加载、自动保存
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { hqApi } from '@/lib/api';
import type { Message } from '@/hooks/useChatStream';

export interface ChatSession {
  id: string;
  agentCode: string;
  userId?: string;
  mode: 'workspace' | 'staff' | 'general';
  workingDir?: string;
  title?: string;
  messages: Message[];
  context?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
}

interface UseChatHistoryOptions {
  agentCode: string;
  workspaceRootPath?: string;
  autoSave?: boolean;
  autoSaveDelay?: number; // ms
}

export function useChatHistory(options: UseChatHistoryOptions) {
  const { agentCode, workspaceRootPath, autoSave = true, autoSaveDelay = 2000 } = options;
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesRef = useRef<Message[]>([]);

  /**
   * 加载 Agent 的历史会话列表
   */
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hqApi.getAgentSessions(agentCode, 20);
      setSessions(data);
    } catch (err: any) {
      console.error('[useChatHistory] Failed to load sessions:', err);
      setError(err?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [agentCode]);

  /**
   * 加载特定会话的详情
   */
  const loadSession = useCallback(async (sessionId: string): Promise<Message[]> => {
    try {
      setLoading(true);
      setError(null);
      const session = await hqApi.getSession(sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      setCurrentSessionId(session.id);
      
      // Convert backend messages to frontend Message format
      const messages: Message[] = session.messages.map((msg: any, index: number) => ({
        id: `${sessionId}-${index}`,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        agentCode: msg.role === 'assistant' ? agentCode : undefined,
        toolExecutions: msg.toolCalls?.map((tc: any) => ({
          id: `${sessionId}-${index}-${tc.tool}`,
          tool: tc.tool,
          params: tc.params,
          status: tc.status,
          result: tc.result,
          error: tc.error,
          timestamp: msg.timestamp || new Date().toISOString(),
        })) || [],
      }));

      messagesRef.current = messages;
      return messages;
    } catch (err: any) {
      console.error('[useChatHistory] Failed to load session:', err);
      setError(err?.message || 'Failed to load session');
      return [];
    } finally {
      setLoading(false);
    }
  }, [agentCode]);

  /**
   * 创建新会话
   */
  const createSession = useCallback(async (
    mode: 'workspace' | 'staff' | 'general' = 'workspace',
    initialMessage?: string
  ): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await hqApi.unifiedChat({
        agentCode,
        message: initialMessage || 'Hello',
        mode,
        workingDir: workspaceRootPath,
      });

      setCurrentSessionId(response.sessionId);
      await loadSessions(); // Refresh session list
      return response.sessionId;
    } catch (err: any) {
      console.error('[useChatHistory] Failed to create session:', err);
      setError(err?.message || 'Failed to create session');
      return null;
    } finally {
      setLoading(false);
    }
  }, [agentCode, workspaceRootPath, loadSessions]);

  /**
   * 保存消息到当前会话 (manual)
   */
  const saveMessages = useCallback(async (messages: Message[]): Promise<boolean> => {
    if (!currentSessionId) {
      console.warn('[useChatHistory] No active session, skipping save');
      return false;
    }

    try {
      // Backend unified-chat API automatically saves messages
      // So we just need to make sure we're using the session
      messagesRef.current = messages;
      return true;
    } catch (err: any) {
      console.error('[useChatHistory] Failed to save messages:', err);
      setError(err?.message || 'Failed to save messages');
      return false;
    }
  }, [currentSessionId]);

  /**
   * Auto-save messages with debounce
   */
  const autoSaveMessages = useCallback((messages: Message[]) => {
    if (!autoSave || !currentSessionId) return;

    messagesRef.current = messages;

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new timer
    saveTimerRef.current = setTimeout(() => {
      saveMessages(messages);
    }, autoSaveDelay);
  }, [autoSave, autoSaveDelay, currentSessionId, saveMessages]);

  /**
   * 删除会话
   */
  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      // Note: Need to implement DELETE endpoint in API
      // await hqApi.deleteSession(sessionId);
      
      if (sessionId === currentSessionId) {
        setCurrentSessionId(null);
        messagesRef.current = [];
      }
      
      await loadSessions(); // Refresh list
      return true;
    } catch (err: any) {
      console.error('[useChatHistory] Failed to delete session:', err);
      setError(err?.message || 'Failed to delete session');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentSessionId, loadSessions]);

  /**
   * 清空当前会话 (开始新对话)
   */
  const clearSession = useCallback(() => {
    setCurrentSessionId(null);
    messagesRef.current = [];
  }, []);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return {
    currentSessionId,
    sessions,
    loading,
    error,
    loadSessions,
    loadSession,
    createSession,
    saveMessages,
    autoSaveMessages,
    deleteSession,
    clearSession,
  };
}
