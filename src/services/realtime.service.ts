/**
 * Real-time service for ClawLink
 * Uses Server-Sent Events for chat streaming + pseudo-push polling for notifications.
 */
import { API_BASE } from '../config/env';
import { useNotificationStore } from '../stores/notificationStore';

type ChunkCallback = (chunk: string) => void;
type DoneCallback = () => void;
type ErrorCallback = (err: string) => void;

interface StreamChatOptions {
  instanceId: string;
  message: string;
  sessionId?: string;
  token: string;
  onChunk: ChunkCallback;
  onDone: DoneCallback;
  onError: ErrorCallback;
}

/**
 * Stream a chat response from the backend proxy using the Fetch SSE pattern.
 * Returns an AbortController so the caller can cancel.
 */
export function streamProxyChatSSE(opts: StreamChatOptions): AbortController {
  const ac = new AbortController();

  (async () => {
    const url = `${API_BASE}/openclaw/proxy/${opts.instanceId}/stream`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opts.token}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ message: opts.message, sessionId: opts.sessionId }),
        signal: ac.signal,
      });

      if (!resp.ok) {
        opts.onError(`HTTP ${resp.status}`);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) { opts.onError('No response stream'); return; }
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (data === '[DONE]') {
              opts.onDone();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) opts.onChunk(parsed.chunk);
              else if (parsed.error) { opts.onError(parsed.error); return; }
            } catch {
              // Raw text chunk
              if (data) opts.onChunk(data);
            }
          }
        }
      }
      opts.onDone();
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      opts.onError(err?.message ?? 'Stream error');
    }
  })();

  return ac;
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification polling (lightweight alternative to WebSocket for notifications)
// ─────────────────────────────────────────────────────────────────────────────

let pollingTimer: ReturnType<typeof setInterval> | null = null;
let lastPollTime = 0;

export function startNotificationPolling(token: string, intervalMs = 30_000) {
  stopNotificationPolling();
  pollingTimer = setInterval(() => pollNotifications(token), intervalMs);
  // Immediate first poll
  pollNotifications(token);
}

export function stopNotificationPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

async function pollNotifications(token: string) {
  try {
    const since = lastPollTime > 0 ? `&since=${lastPollTime}` : '';
    const resp = await fetch(`${API_BASE}/notifications/recent?limit=10${since}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return;
    const data = await resp.json();
    const items: any[] = data.notifications ?? data ?? [];
    const { addNotification } = useNotificationStore.getState();
    for (const item of items) {
      addNotification({
        type: item.type ?? 'system',
        title: item.title ?? 'Notification',
        body: item.body ?? item.message ?? '',
        data: item.data,
      });
    }
    lastPollTime = Date.now();
  } catch {
    // Silently ignore poll errors
  }
}

export function resetPollingTimestamp() {
  lastPollTime = 0;
}
