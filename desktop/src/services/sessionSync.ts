/**
 * Cross-device session synchronization service.
 *
 * Connects to the backend WebSocket gateway (`/ws`) to exchange
 * chat session events between desktop and mobile clients.
 *
 * Protocol:
 *   - "session:sync"     — push a session snapshot (messages, metadata)
 *   - "session:updated"  — receive notification that a session changed on another device
 *   - "session:list"     — request the latest session index across all devices
 *   - "session:list:res" — response with merged session index
 */

import { API_BASE, apiFetch, type ChatMessage } from "./store";

// ─── Types ─────────────────────────────────────────────

export interface SyncSessionMeta {
  sessionId: string;
  title: string;
  messageCount: number;
  updatedAt: number;
  deviceId: string;
  deviceType: "desktop" | "mobile" | "web";
}

export interface SyncSessionSnapshot {
  sessionId: string;
  messages: ChatMessage[];
  meta: SyncSessionMeta;
}

type SyncEventHandler = {
  onSessionUpdated?: (snapshot: SyncSessionSnapshot) => void;
  onSessionListReceived?: (sessions: SyncSessionMeta[]) => void;
  onConnectionChange?: (connected: boolean) => void;
};

// ─── WebSocket Sync Client ─────────────────────────────

const WS_BASE = API_BASE.replace(/^http/, "ws").replace(/\/api\/?$/, "/ws");

let _socket: WebSocket | null = null;
let _handlers: SyncEventHandler = {};
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let _token: string | null = null;
let _deviceId: string = "";
let _connected = false;
let _intentionalClose = false;

function getDeviceId(): string {
  if (_deviceId) return _deviceId;
  let id = localStorage.getItem("agentrix_desktop_device_id");
  if (!id) {
    id = `desktop-${crypto.randomUUID()}`;
    localStorage.setItem("agentrix_desktop_device_id", id);
  }
  _deviceId = id;
  return id;
}

export function isSessionSyncConnected(): boolean {
  return _connected;
}

export function initSessionSync(token: string, handlers: SyncEventHandler) {
  _token = token;
  _handlers = handlers;
  _intentionalClose = false;
  connect();
}

export function destroySessionSync() {
  _intentionalClose = true;
  if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
  if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
  if (_socket) {
    _socket.close();
    _socket = null;
  }
  _connected = false;
}

function connect() {
  if (_socket?.readyState === WebSocket.OPEN || _socket?.readyState === WebSocket.CONNECTING) return;
  if (!_token) return;

  try {
    _socket = new WebSocket(`${WS_BASE}?token=${encodeURIComponent(_token)}`);
  } catch {
    scheduleReconnect();
    return;
  }

  _socket.onopen = () => {
    _connected = true;
    _handlers.onConnectionChange?.(true);
    // Announce device presence
    send("device:announce", { deviceId: getDeviceId(), deviceType: "desktop", platform: navigator.platform });
    // Start heartbeat (every 25s to keep WS alive)
    if (_heartbeatTimer) clearInterval(_heartbeatTimer);
    _heartbeatTimer = setInterval(() => send("ping", {}), 25000);
  };

  _socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleMessage(data);
    } catch { /* non-JSON frame, ignore */ }
  };

  _socket.onclose = () => {
    _connected = false;
    _handlers.onConnectionChange?.(false);
    if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
    if (!_intentionalClose) scheduleReconnect();
  };

  _socket.onerror = () => {
    // onclose will fire after this
  };
}

function scheduleReconnect() {
  if (_reconnectTimer) return;
  _reconnectTimer = setTimeout(() => {
    _reconnectTimer = null;
    connect();
  }, 3000);
}

function send(event: string, payload: any) {
  if (_socket?.readyState === WebSocket.OPEN) {
    _socket.send(JSON.stringify({ event, data: payload }));
  }
}

function handleMessage(msg: { event?: string; data?: any }) {
  if (!msg.event) return;
  switch (msg.event) {
    case "session:updated": {
      const snapshot = msg.data as SyncSessionSnapshot;
      // Don't echo our own changes back
      if (snapshot?.meta?.deviceId !== getDeviceId()) {
        _handlers.onSessionUpdated?.(snapshot);
      }
      break;
    }
    case "session:list:res": {
      const sessions = msg.data?.sessions as SyncSessionMeta[] | undefined;
      if (sessions) _handlers.onSessionListReceived?.(sessions);
      break;
    }
  }
}

// ─── Public sync operations ────────────────────────────

/** Push a session snapshot to the server for other devices */
export function pushSessionSync(sessionId: string, messages: ChatMessage[], title: string) {
  send("session:sync", {
    sessionId,
    messages: messages.slice(-80), // max 80 msgs
    meta: {
      sessionId,
      title,
      messageCount: messages.length,
      updatedAt: Date.now(),
      deviceId: getDeviceId(),
      deviceType: "desktop",
    },
  } satisfies SyncSessionSnapshot);
}

/** Request the session index from all connected devices */
export function requestSessionList() {
  send("session:list", { deviceId: getDeviceId() });
}

// ─── REST fallback for sync (when WS not available) ────

/** POST session snapshot to backend for storage */
export async function pushSessionViaRest(token: string, sessionId: string, messages: ChatMessage[], title: string) {
  const firstUser = messages.find(m => m.role === "user");
  await apiFetch(`${API_BASE}/desktop-sync/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      deviceId: getDeviceId(),
      sessionId,
      title: title || firstUser?.content?.slice(0, 50) || "Untitled",
      messages: messages.slice(-80),
      updatedAt: Date.now(),
    }),
  }).catch(() => {}); // best-effort
}

/** GET session list from backend (REST fallback) */
export async function fetchSessionsViaRest(token: string): Promise<SyncSessionMeta[]> {
  try {
    const res = await apiFetch(`${API_BASE}/desktop-sync/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.sessions) ? data.sessions : (Array.isArray(data) ? data : []);
  } catch {
    return [];
  }
}

/** GET a specific session's messages from backend */
export async function fetchSessionMessagesViaRest(token: string, sessionId: string): Promise<ChatMessage[]> {
  try {
    const res = await apiFetch(`${API_BASE}/desktop-sync/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.messages) ? data.messages : [];
  } catch {
    return [];
  }
}
