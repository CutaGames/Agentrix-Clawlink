/**
 * WebSocket Hook with Auto-Reconnect + Dual-Server Failover
 * 
 * Primary: Tokyo | Backup: Singapore
 * Auto-switches server on connection failure
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { serverFailover } from '../lib/api';

export interface WebSocketOptions {
  userId?: string;
  token?: string;
  autoConnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempts: number;
  serverName: string;
}

export function useHqWebSocket(options: WebSocketOptions = {}) {
  const {
    userId,
    token,
    autoConnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempts: 0,
    serverName: serverFailover.serverName,
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const failoverAttemptedRef = useRef(false);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('[HQ-WebSocket] Already connected');
      return;
    }

    const wsUrl = serverFailover.currentWsUrl;
    console.log(`[HQ-WebSocket] Connecting to ${serverFailover.serverName}: ${wsUrl}`);
    setState(prev => ({ ...prev, connecting: true, error: null, serverName: serverFailover.serverName }));

    const socket = io(`${wsUrl}/hq`, {
      transports: ['websocket', 'polling'],
      reconnection: false, // We manage reconnection ourselves
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log(`[HQ-WebSocket] Connected to ${serverFailover.serverName}:`, socket.id);
      failoverAttemptedRef.current = false;
      setState({ connected: true, connecting: false, error: null, reconnectAttempts: 0, serverName: serverFailover.serverName });

      if (userId) {
        socket.emit('auth', { userId, token });
      }
    });

    socket.on('connected', (data: any) => {
      console.log('[HQ-WebSocket] Server confirmed connection:', data);
    });

    socket.on('auth:success', (data: any) => {
      console.log('[HQ-WebSocket] Auth successful:', data.userId);
    });

    socket.on('disconnect', (reason: string) => {
      console.log('[HQ-WebSocket] Disconnected:', reason);
      setState(prev => ({ ...prev, connected: false }));

      if (reason !== 'io client disconnect') {
        attemptReconnect();
      }
    });

    socket.on('connect_error', (error: Error) => {
      console.error(`[HQ-WebSocket] Connection error on ${serverFailover.serverName}:`, error.message);
      setState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error.message,
      }));

      // Try failover to backup server before normal reconnect
      if (!failoverAttemptedRef.current) {
        failoverAttemptedRef.current = true;
        const switched = serverFailover.switchToBackup();
        if (switched) {
          console.warn(`[HQ-WebSocket] Failing over to ${serverFailover.serverName}`);
          socket.disconnect();
          // Connect to new server immediately
          setTimeout(() => connect(), 500);
          return;
        }
      }

      attemptReconnect();
    });

    socketRef.current = socket;
  }, [userId, token]);

  const attemptReconnect = useCallback(() => {
    setState(prev => {
      if (prev.reconnectAttempts >= maxReconnectAttempts) {
        console.log('[HQ-WebSocket] Max reconnect attempts reached');
        // Reset failover flag so next manual connect can try other server
        failoverAttemptedRef.current = false;
        return { ...prev, error: 'Max reconnect attempts reached' };
      }

      const nextAttempt = prev.reconnectAttempts + 1;
      console.log(`[HQ-WebSocket] Reconnecting in ${reconnectDelay}ms (attempt ${nextAttempt}/${maxReconnectAttempts})`);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectDelay);

      return { ...prev, reconnectAttempts: nextAttempt };
    });
  }, [connect, reconnectDelay, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState({ connected: false, connecting: false, error: null, reconnectAttempts: 0, serverName: serverFailover.serverName });
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('[HQ-WebSocket] Cannot emit, not connected');
    }
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect]);

  return {
    ...state,
    socket: socketRef.current,
    connect,
    disconnect,
    emit,
    on,
  };
}
