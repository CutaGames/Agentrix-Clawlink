/**
 * Remote Control Page
 * 
 * 远程控制页面 - Telegram & WebSocket 状态
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface TelegramStatus {
  connected: boolean;
  botUsername?: string;
  activeSessions: number;
}

interface WebSocketStatus {
  connected: boolean;
  onlineClients: number;
  namespace: string;
}

interface Alert {
  level: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
}

export default function RemotePage() {
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus>({ connected: false, activeSessions: 0 });
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>({ connected: false, onlineClients: 0, namespace: '/hq' });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [alertForm, setAlertForm] = useState({ level: 'info', title: '', message: '' });
  const [sending, setSending] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_HQ_API_URL || 'http://57.182.89.146:8080/api';
  const WS_URL = process.env.NEXT_PUBLIC_HQ_WS_URL || 'http://localhost:3005';

  useEffect(() => {
    fetchStatus();

    // 连接 WebSocket
    const newSocket = io(`${WS_URL}/hq`, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setWsStatus(prev => ({ ...prev, connected: true }));
    });

    newSocket.on('disconnect', () => {
      setWsStatus(prev => ({ ...prev, connected: false }));
    });

    newSocket.on('alert', (data: Alert) => {
      setAlerts(prev => [{ ...data, timestamp: new Date().toISOString() }, ...prev].slice(0, 50));
    });

    newSocket.on('agent:status', (data: any) => {
      // 可以在这里处理 Agent 状态变化
      console.log('Agent status:', data);
    });

    setSocket(newSocket);

    // 每 30 秒刷新状态
    const interval = setInterval(fetchStatus, 30000);

    return () => {
      newSocket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const fetchStatus = async () => {
    try {
      // Telegram 状态
      const telegramRes = await fetch(`${API_BASE}/hq/telegram/health`);
      const telegramData = await telegramRes.json();
      setTelegramStatus({
        connected: telegramData.status === 'ok',
        botUsername: telegramData.botUsername,
        activeSessions: telegramData.activeSessions || 0,
      });
    } catch (error) {
      setTelegramStatus({ connected: false, activeSessions: 0 });
    }

    try {
      // WebSocket 状态
      const wsRes = await fetch(`${API_BASE}/hq/websocket/status`);
      const wsData = await wsRes.json();
      if (wsData.success) {
        setWsStatus(prev => ({ ...prev, ...wsData.data }));
      }
    } catch (error) {
      console.error('Failed to fetch WS status:', error);
    }
  };

  const sendAlert = async () => {
    if (!alertForm.title || !alertForm.message) return;
    
    setSending(true);
    try {
      await fetch(`${API_BASE}/hq/telegram/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertForm),
      });
      
      // 添加到本地列表
      setAlerts(prev => [{
        ...alertForm,
        level: alertForm.level as Alert['level'],
        timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 50));
      
      // 清空表单
      setAlertForm({ level: 'info', title: '', message: '' });
    } catch (error) {
      console.error('Failed to send alert:', error);
    } finally {
      setSending(false);
    }
  };

  const levelColors: Record<string, string> = {
    info: 'bg-blue-100 text-blue-800 border-blue-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    error: 'bg-red-100 text-red-800 border-red-300',
  };

  const levelIcons: Record<string, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '🚨',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📱 远程控制</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Telegram Bot 和 WebSocket 实时通信</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Telegram Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              📲 Telegram Bot
            </h2>
            <span className={`px-3 py-1 rounded-full text-sm ${
              telegramStatus.connected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {telegramStatus.connected ? '🟢 已连接' : '🔴 未连接'}
            </span>
          </div>

          <div className="space-y-3">
            {telegramStatus.botUsername && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Bot 用户名</span>
                <span className="text-gray-900 dark:text-white">@{telegramStatus.botUsername}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">活跃会话</span>
              <span className="text-gray-900 dark:text-white">{telegramStatus.activeSessions}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm">
            <p className="font-medium mb-2">如何配置 Telegram Bot:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>在 Telegram 中找 @BotFather</li>
              <li>发送 /newbot 创建机器人</li>
              <li>复制 token 到 .env</li>
              <li>重启 HQ 后端</li>
            </ol>
          </div>
        </div>

        {/* WebSocket Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              🔌 WebSocket
            </h2>
            <span className={`px-3 py-1 rounded-full text-sm ${
              wsStatus.connected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {wsStatus.connected ? '🟢 已连接' : '🔴 未连接'}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">命名空间</span>
              <span className="text-gray-900 dark:text-white">{wsStatus.namespace}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">在线客户端</span>
              <span className="text-gray-900 dark:text-white">{wsStatus.onlineClients}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm">
            <p className="font-medium mb-2">WebSocket 事件:</p>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li>• agent:status - Agent 状态变化</li>
              <li>• task:progress - 任务进度更新</li>
              <li>• chat:response - 聊天响应</li>
              <li>• alert - 告警通知</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Send Alert */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📢 发送告警通知
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              级别
            </label>
            <select
              value={alertForm.level}
              onChange={e => setAlertForm(prev => ({ ...prev, level: e.target.value }))}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="info">ℹ️ 信息</option>
              <option value="warning">⚠️ 警告</option>
              <option value="error">🚨 错误</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              标题
            </label>
            <input
              type="text"
              value={alertForm.title}
              onChange={e => setAlertForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="告警标题"
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              内容
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={alertForm.message}
                onChange={e => setAlertForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="告警内容"
                className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                onClick={sendAlert}
                disabled={sending || !alertForm.title || !alertForm.message}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {sending ? '发送中...' : '发送'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alert History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📋 告警历史
        </h2>

        {alerts.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            暂无告警记录
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-auto">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${levelColors[alert.level]}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {levelIcons[alert.level]} {alert.title}
                  </span>
                  <span className="text-xs opacity-75">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-sm">{alert.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
