import { create } from "zustand";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

export const API_BASE = "https://api.agentrix.top/api";

// Use Tauri HTTP plugin (bypasses CORS) when available, else standard fetch
export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await tauriFetch(url, init as any);
  } catch {
    return await fetch(url, init);
  }
}

export interface ChatAttachment {
  url: string;
  publicUrl: string;
  fileName: string;
  originalName: string;
  mimetype: string;
  size: number;
  kind: 'image' | 'file';
  isImage: boolean;
}

export async function uploadChatAttachment(file: File, token: string): Promise<ChatAttachment> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload/chat-attachment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Upload failed: ${response.status}`);
  }

  const uploaded = await response.json();
  const publicBase = API_BASE.replace(/\/api\/?$/, '');
  return {
    ...uploaded,
    publicUrl: uploaded.url.startsWith('http') ? uploaded.url : `${publicBase}${uploaded.url}`,
  };
}

// ─── Auth Store ────────────────────────────────────────
interface AuthState {
  token: string | null;
  user: any | null;
  isGuest: boolean;
  instances: any[];
  activeInstanceId: string | null;
  loadToken: () => Promise<void>;
  login: (email: string, code: string) => Promise<boolean>;
  sendCode: (email: string) => Promise<boolean>;
  enterGuest: () => void;
  logout: () => void;
  setActiveInstance: (id: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isGuest: false,
  instances: [],
  activeInstanceId: null,

  loadToken: async () => {
    try {
      const stored = localStorage.getItem("agentrix_token");
      if (!stored) return;
      set({ token: stored });
      // Fetch user info (use text+JSON.parse for tauriFetch compat)
      const res = await apiFetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${stored}` },
      });
      const status = res.status;
      if (status === 401 || status === 403) {
        // Token is genuinely invalid — clear it
        console.warn("[loadToken] /auth/me returned", status, "— clearing token");
        localStorage.removeItem("agentrix_token");
        set({ token: null });
        return;
      }
      if (status < 200 || status >= 300) {
        // Server error — keep token, just skip loading user info
        console.warn("[loadToken] /auth/me returned", status, "— keeping token");
        return;
      }
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      set({
        user: data.user || data,
        instances: data.openClawInstances || data.instances || [],
        activeInstanceId:
          data.openClawInstances?.[0]?.id || data.instances?.[0]?.id || null,
      });
    } catch (e) {
      // Offline / parse error — keep token, don't clear
      console.warn("[loadToken] error (keeping token):", e);
    }
  },

  sendCode: async (email: string) => {
    const res = await apiFetch(`${API_BASE}/auth/email/send-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return res.ok;
  },

  login: async (email: string, code: string) => {
    const res = await apiFetch(`${API_BASE}/auth/email/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    if (res.status < 200 || res.status >= 300) return false;
    const text = await res.text();
    if (!text) return false;
    const data = JSON.parse(text);
    const token = data.token || data.access_token;
    if (!token) return false;
    localStorage.setItem("agentrix_token", token);
    set({ token });
    // Fetch full user + instances
    await get().loadToken();
    return true;
  },

  logout: () => {
    localStorage.removeItem("agentrix_token");
    set({ token: null, user: null, isGuest: false, instances: [], activeInstanceId: null });
  },

  enterGuest: () => set({ isGuest: true }),

  setActiveInstance: (id: string) => set({ activeInstanceId: id }),
}));

// ─── Chat API ──────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: ChatAttachment[];
  streaming?: boolean;
  error?: boolean;
  createdAt: number;
}

/** SSE streaming chat via OpenClaw proxy */
export function streamChat(opts: {
  instanceId: string;
  message: string;
  sessionId: string;
  token: string;
  model?: string;
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}): AbortController {
  const ac = new AbortController();
  const url = `${API_BASE}/openclaw/proxy/${opts.instanceId}/stream`;

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.token}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      message: opts.message,
      sessionId: opts.sessionId,
      model: opts.model,
    }),
    signal: ac.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        opts.onError(`HTTP ${res.status}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              opts.onDone();
              return;
            }
            opts.onChunk(data);
          }
        }
      }
      opts.onDone();
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        opts.onError(err.message);
      }
    });

  return ac;
}

/** Direct Claude/Bedrock fallback */
export function streamDirectChat(opts: {
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
  token: string;
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}): AbortController {
  const ac = new AbortController();

  fetch(`${API_BASE}/claude/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.token}`,
    },
    body: JSON.stringify({
      messages: opts.messages,
      sessionId: opts.sessionId,
    }),
    signal: ac.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        opts.onError(`HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      const reply = data.reply || data.content || data.message || "";
      // Simulate streaming for consistency
      const words = reply.split(" ");
      for (let i = 0; i < words.length; i++) {
        opts.onChunk(words[i] + (i < words.length - 1 ? " " : ""));
        await new Promise((r) => setTimeout(r, 30));
      }
      opts.onDone();
    })
    .catch((err) => {
      if (err.name !== "AbortError") opts.onError(err.message);
    });

  return ac;
}

/** Fetch available AI models */
export async function fetchModels(token: string) {
  const res = await fetch(`${API_BASE}/openclaw/models`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

/** Fetch chat history */
export async function fetchHistory(
  instanceId: string,
  sessionId: string,
  token: string,
) {
  const res = await fetch(
    `${API_BASE}/openclaw/proxy/${instanceId}/history?sessionId=${sessionId}&limit=50`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return [];
  return res.json();
}
