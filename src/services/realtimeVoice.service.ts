/**
 * RealtimeVoiceService — WebSocket-based full-duplex voice channel
 *
 * Connects to the backend realtime-voice gateway (`/voice` namespace)
 * for bidirectional audio streaming:
 *   Client → PCM audio chunks → Server → Deepgram STT (stream) → LLM → TTS audio → Client
 *
 * This replaces the serial HTTP path (record→upload→transcribe→SSE→TTS GET)
 * with a persistent WebSocket channel for sub-second round-trip latency.
 */

import { Platform, AppState, type AppStateStatus } from 'react-native';
import { addVoiceDiagnostic } from './voiceDiagnostics';

// ── Types ──────────────────────────────────────────────────

export type RealtimeVoiceState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

export interface RealtimeVoiceCallbacks {
  onStateChange: (state: RealtimeVoiceState) => void;
  /** Partial/interim transcript from STT */
  onInterimTranscript: (text: string) => void;
  /** Final transcript ready to be sent to LLM */
  onFinalTranscript: (text: string) => void;
  /** Agent text response chunk (for display) */
  onAgentTextChunk: (chunk: string) => void;
  /** Agent TTS audio chunk (base64-encoded audio data) */
  onAgentAudioChunk: (audioBase64: string, format: string) => void;
  /** Agent finished responding */
  onAgentResponseEnd: () => void;
  /** Agent started speaking (TTS audio begins) */
  onAgentSpeechStart: () => void;
  /** Tool call notification */
  onToolCall: (toolName: string, status: 'start' | 'end') => void;
  /** Error occurred */
  onError: (error: string) => void;
  /** Connection closed */
  onDisconnect: (reason: string) => void;
}

export interface RealtimeVoiceConfig {
  wsUrl: string;
  token: string;
  instanceId: string;
  language: string;
  modelId?: string;
  agentVoiceId?: string;
}

// ── Service ────────────────────────────────────────────────

export class RealtimeVoiceService {
  private ws: WebSocket | null = null;
  private config: RealtimeVoiceConfig | null = null;
  private callbacks: RealtimeVoiceCallbacks;
  private _state: RealtimeVoiceState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string | null = null;
  private intentionallyClosed = false;
  private appStateSubscription: any = null;

  constructor(callbacks: RealtimeVoiceCallbacks) {
    this.callbacks = callbacks;
  }

  get state(): RealtimeVoiceState {
    return this._state;
  }

  get isConnected(): boolean {
    return this._state !== 'disconnected' && this._state !== 'connecting' && this._state !== 'error';
  }

  // ── Connect ──

  connect(config: RealtimeVoiceConfig): void {
    this.config = config;
    this.intentionallyClosed = false;
    this.reconnectAttempts = 0;
    this.setState('connecting');

    this.setupAppStateListener();
    this.createWebSocket();
  }

  private createWebSocket(): void {
    if (!this.config) return;
    const { wsUrl, token, instanceId, language, modelId, agentVoiceId } = this.config;

    const params = new URLSearchParams({
      token,
      instanceId,
      lang: language,
    });
    if (modelId) params.set('model', modelId);
    if (agentVoiceId) params.set('voice', agentVoiceId);

    const url = `${wsUrl}?${params.toString()}`;

    try {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        addVoiceDiagnostic('realtime-voice', 'ws-connected');
        this.reconnectAttempts = 0;
        this.setState('connected');
        this.startPing();

        // Start a voice session
        this.sendJSON({
          event: 'voice:session:start',
          data: {
            instanceId: this.config!.instanceId,
            language: this.config!.language,
            model: this.config!.modelId,
            voice: this.config!.agentVoiceId,
          },
        });
      };

      this.ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          this.handleTextMessage(event.data);
        } else if (event.data instanceof ArrayBuffer) {
          this.handleBinaryMessage(event.data);
        }
      };

      this.ws.onerror = (event: any) => {
        addVoiceDiagnostic('realtime-voice', 'ws-error', event?.message || 'unknown');
        this.callbacks.onError(event?.message || 'WebSocket error');
      };

      this.ws.onclose = (event) => {
        addVoiceDiagnostic('realtime-voice', 'ws-closed', {
          code: event.code,
          reason: event.reason,
          intentional: this.intentionallyClosed,
        });
        this.stopPing();

        if (this.intentionallyClosed) {
          this.setState('disconnected');
          this.callbacks.onDisconnect('intentional');
        } else {
          this.attemptReconnect();
        }
      };
    } catch (err: any) {
      addVoiceDiagnostic('realtime-voice', 'ws-create-failed', err?.message);
      this.setState('error');
      this.callbacks.onError(err?.message || 'Failed to create WebSocket');
    }
  }

  // ── Message Handling ──

  private handleTextMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw);
      const event = msg.event || msg.type;

      switch (event) {
        case 'voice:session:ready':
          this.sessionId = msg.data?.sessionId || null;
          addVoiceDiagnostic('realtime-voice', 'session-ready', { sessionId: this.sessionId });
          break;

        case 'voice:transcript:interim':
          this.setState('listening');
          this.callbacks.onInterimTranscript(msg.data?.text || '');
          break;

        case 'voice:transcript:final':
          this.setState('thinking');
          this.callbacks.onFinalTranscript(msg.data?.text || '');
          break;

        case 'voice:agent:text':
          this.callbacks.onAgentTextChunk(msg.data?.chunk || msg.data?.text || '');
          break;

        case 'voice:agent:speech:start':
          this.setState('speaking');
          this.callbacks.onAgentSpeechStart();
          break;

        case 'voice:agent:audio':
          this.callbacks.onAgentAudioChunk(msg.data?.audio || '', msg.data?.format || 'mp3');
          break;

        case 'voice:agent:end':
          this.callbacks.onAgentResponseEnd();
          // Back to listening in duplex mode
          this.setState('listening');
          break;

        case 'voice:tool:start':
          this.callbacks.onToolCall(msg.data?.tool || '', 'start');
          break;

        case 'voice:tool:end':
          this.callbacks.onToolCall(msg.data?.tool || '', 'end');
          break;

        case 'voice:error':
          this.callbacks.onError(msg.data?.message || 'Server voice error');
          break;

        case 'pong':
          // Keep-alive acknowledged
          break;
      }
    } catch {
      // Non-JSON message — ignore
    }
  }

  private handleBinaryMessage(data: ArrayBuffer): void {
    // Binary audio data from server (TTS audio chunks)
    const base64 = arrayBufferToBase64(data);
    this.callbacks.onAgentAudioChunk(base64, 'pcm');
  }

  // ── Send Audio ──

  /** Send raw PCM audio chunk from microphone to server for streaming STT */
  sendAudio(pcmData: ArrayBuffer | Uint8Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(pcmData);
    } catch {
      // Socket may have closed between check and send
    }
  }

  /** Send text message (typed input or corrected transcript) */
  sendText(text: string): void {
    this.sendJSON({
      event: 'voice:text',
      data: { text, sessionId: this.sessionId },
    });
    this.setState('thinking');
  }

  /** Notify server that user interrupted (barge-in) */
  sendInterrupt(): void {
    this.sendJSON({ event: 'voice:interrupt' });
  }

  /** Start listening — tells server to begin STT stream processing */
  startListening(): void {
    this.sendJSON({ event: 'voice:listen:start', data: { language: this.config?.language } });
    this.setState('listening');
  }

  /** Stop listening — tells server to finalize current STT */
  stopListening(): void {
    this.sendJSON({ event: 'voice:listen:stop' });
  }

  // ── Disconnect ──

  disconnect(): void {
    this.intentionallyClosed = true;
    this.cleanupReconnect();
    this.stopPing();
    this.removeAppStateListener();

    if (this.ws) {
      try {
        this.ws.close(1000, 'user disconnect');
      } catch {}
      this.ws = null;
    }
    this.sessionId = null;
    this.setState('disconnected');
  }

  // ── Reconnect ──

  private attemptReconnect(): void {
    if (this.intentionallyClosed || this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState('disconnected');
      this.callbacks.onDisconnect(
        this.reconnectAttempts >= this.maxReconnectAttempts ? 'max_attempts' : 'closed',
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 15000);
    addVoiceDiagnostic('realtime-voice', 'reconnect-attempt', {
      attempt: this.reconnectAttempts,
      delay,
    });

    this.setState('connecting');
    this.reconnectTimer = setTimeout(() => {
      this.createWebSocket();
    }, delay);
  }

  private cleanupReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ── Keep-alive ──

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.sendJSON({ event: 'ping' });
    }, 25000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // ── App State ──

  private setupAppStateListener(): void {
    this.removeAppStateListener();
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private removeAppStateListener(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  private handleAppStateChange = (nextState: AppStateStatus): void => {
    if (nextState === 'active' && this._state === 'disconnected' && !this.intentionallyClosed) {
      // App came back to foreground — try reconnecting
      this.reconnectAttempts = 0;
      this.createWebSocket();
    }
  };

  // ── Helpers ──

  private setState(state: RealtimeVoiceState): void {
    if (state === this._state) return;
    this._state = state;
    this.callbacks.onStateChange(state);
  }

  private sendJSON(obj: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(obj));
    } catch {}
  }
}

// ── Utility ──

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8 = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < uint8.byteLength; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}
