"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useHQStore } from '@/lib/store';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export interface DashboardStats {
  revenue24h: number;
  revenueChange: number;
  activeAgents: number;
  totalAgents: number;
  activeMerchants: number;
  newMerchants24h: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  systemHealth: 'HEALTHY' | 'DEGRADED' | 'DOWN';
}

export interface DashboardAlert {
  id: string;
  type: 'risk' | 'biz' | 'sys' | 'ops';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface AgentStatus {
  id: string;
  name: string;
  role: string;
  status: 'running' | 'idle' | 'paused' | 'error';
  currentTask?: string;
  progress?: number;
  lastActive: string;
}

interface UseRealtimeOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onAlert?: (alert: DashboardAlert) => void;
}

/**
 * HQ Realtime WebSocket Hook (Phase 4 - Automation)
 * 
 * 提供实时数据订阅能力：
 * - 自动连接/重连
 * - Dashboard 统计实时更新
 * - Agent 状态实时更新
 * - 告警实时通知
 */
export function useRealtime(options: UseRealtimeOptions = {}) {
  const { autoConnect = true, onConnect, onDisconnect, onAlert } = options;
  
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(`${WS_URL}/hq`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('[HQ WebSocket] Connected');
      setIsConnected(true);
      onConnect?.();

      // Subscribe to updates
      socket.emit('subscribe:alerts');
      socket.emit('subscribe:agents');
    });

    socket.on('disconnect', () => {
      console.log('[HQ WebSocket] Disconnected');
      setIsConnected(false);
      onDisconnect?.();
    });

    // Dashboard stats updates
    socket.on('dashboard:stats', (data: DashboardStats) => {
      setStats(data);
      setLastUpdate(new Date());
    });

    // Agent status updates
    socket.on('agents:status', (data: AgentStatus[]) => {
      setAgents(data);
      setLastUpdate(new Date());
    });

    socket.on('agent:update', (agent: AgentStatus) => {
      setAgents(prev => {
        const index = prev.findIndex(a => a.id === agent.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = agent;
          return updated;
        }
        return [...prev, agent];
      });
      setLastUpdate(new Date());
    });

    // Alert updates
    socket.on('dashboard:alerts', (data: DashboardAlert[]) => {
      setAlerts(data);
    });

    socket.on('alert:new', (alert: DashboardAlert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50));
      onAlert?.(alert);
    });

    // Task progress
    socket.on('task:progress', (data: { taskId: string; progress: number; message?: string }) => {
      console.log('[HQ WebSocket] Task progress:', data);
    });

    socket.on('connect_error', (error) => {
      console.error('[HQ WebSocket] Connection error:', error.message);
    });

    socketRef.current = socket;
  }, [onConnect, onDisconnect, onAlert]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Send command to agent
  const sendAgentCommand = useCallback((agentId: string, command: string) => {
    if (socketRef.current?.connected) {
      return new Promise((resolve) => {
        socketRef.current!.emit('agent:command', { agentId, command }, resolve);
      });
    }
    return Promise.reject(new Error('WebSocket not connected'));
  }, []);

  // Ping for connection check
  const ping = useCallback(() => {
    if (socketRef.current?.connected) {
      return new Promise((resolve) => {
        socketRef.current!.emit('ping', {}, resolve);
      });
    }
    return Promise.reject(new Error('WebSocket not connected'));
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    stats,
    agents,
    alerts,
    lastUpdate,
    connect,
    disconnect,
    sendAgentCommand,
    ping,
  };
}

/**
 * Simple connection status hook
 */
export function useRealtimeStatus() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  const { isConnected, connect, disconnect } = useRealtime({
    onConnect: () => setStatus('connected'),
    onDisconnect: () => setStatus('disconnected'),
  });

  useEffect(() => {
    if (!isConnected) {
      setStatus('connecting');
    }
  }, [isConnected]);

  return { status, connect, disconnect };
}
