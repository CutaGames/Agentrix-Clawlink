/**
 * Voice Connection Manager — Long conversation stability.
 *
 * Handles:
 * 1. WebSocket keepalive (ping/pong heartbeat)
 * 2. Automatic reconnection with exponential backoff
 * 3. Session context compression for long conversations
 * 4. Network state monitoring (online/offline transitions)
 * 5. Graceful degradation on poor networks
 *
 * Used by both mobile (React Native) and desktop voice sessions.
 */
import { AppState } from 'react-native';
export class VoiceConnectionManager {
    constructor(config, callbacks) {
        this.ws = null;
        this.state = 'disconnected';
        // Keepalive
        this.pingTimer = null;
        this.pongTimeout = null;
        this.lastPongTime = 0;
        // Reconnection
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.intentionalClose = false;
        // Context compression
        this.turnCount = 0;
        this.conversationHistory = [];
        // Network monitoring
        this.appStateSubscription = null;
        this.networkCheckTimer = null;
        this.config = {
            pingIntervalMs: 25000,
            maxReconnectAttempts: 10,
            contextCompressionThreshold: 50,
            ...config,
        };
        this.callbacks = callbacks;
    }
    // ── Lifecycle ──
    connect() {
        if (this.state === 'connected' || this.state === 'connecting')
            return;
        this.intentionalClose = false;
        this.state = 'connecting';
        this.createWebSocket();
        this.startNetworkMonitoring();
    }
    disconnect() {
        this.intentionalClose = true;
        this.cleanup();
        this.state = 'disconnected';
        this.callbacks.onDisconnected?.('user_initiated');
    }
    /**
     * Send a message through the WebSocket.
     */
    send(event, data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return false;
        }
        try {
            this.ws.send(JSON.stringify({ event, data }));
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Send binary data (audio chunks).
     */
    sendBinary(data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN)
            return false;
        try {
            this.ws.send(data);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Record a conversation turn for context management.
     */
    addTurn(role, text) {
        this.conversationHistory.push({ role, text, timestamp: Date.now() });
        this.turnCount++;
        if (this.turnCount >= (this.config.contextCompressionThreshold || 50)) {
            this.compressContext();
        }
    }
    get connectionState() {
        return this.state;
    }
    get isConnected() {
        return this.state === 'connected';
    }
    get latencyMs() {
        if (this.lastPongTime === 0)
            return -1;
        return Date.now() - this.lastPongTime;
    }
    // ── WebSocket ──
    createWebSocket() {
        try {
            const url = new URL(this.config.wsUrl);
            url.searchParams.set('token', this.config.token);
            if (this.config.sessionId) {
                url.searchParams.set('sessionId', this.config.sessionId);
            }
            this.ws = new WebSocket(url.toString());
            this.ws.onopen = () => {
                this.state = 'connected';
                this.reconnectAttempts = 0;
                this.startPingLoop();
                this.callbacks.onConnected?.(!!this.config.sessionId);
            };
            this.ws.onmessage = (event) => {
                this.handleMessage(event.data);
            };
            this.ws.onclose = (event) => {
                this.stopPingLoop();
                if (this.intentionalClose) {
                    this.state = 'disconnected';
                    return;
                }
                this.callbacks.onDisconnected?.(event.reason || `code:${event.code}`);
                this.attemptReconnect();
            };
            this.ws.onerror = () => {
                // onclose will follow
            };
        }
        catch (err) {
            console.error('[VoiceConn] WebSocket creation failed:', err);
            this.attemptReconnect();
        }
    }
    handleMessage(rawData) {
        // Handle pong
        if (rawData === 'pong' || rawData === '__pong__') {
            this.lastPongTime = Date.now();
            if (this.pongTimeout) {
                clearTimeout(this.pongTimeout);
                this.pongTimeout = null;
            }
            return;
        }
        // Handle binary (audio from server)
        if (rawData instanceof ArrayBuffer) {
            this.callbacks.onMessage?.('voice:tts:chunk', rawData);
            return;
        }
        // Handle JSON messages
        try {
            const msg = JSON.parse(rawData);
            if (msg.event) {
                this.callbacks.onMessage?.(msg.event, msg.data);
            }
        }
        catch {
            // Ignore parse errors
        }
    }
    // ── Keepalive ──
    startPingLoop() {
        this.stopPingLoop();
        const interval = this.config.pingIntervalMs || 25000;
        this.pingTimer = setInterval(() => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN)
                return;
            try {
                this.ws.send('__ping__');
            }
            catch {
                return;
            }
            // Expect pong within 10 seconds
            this.pongTimeout = setTimeout(() => {
                console.warn('[VoiceConn] Pong timeout — connection may be dead');
                // Force close to trigger reconnect
                try {
                    this.ws?.close(4000, 'pong_timeout');
                }
                catch { }
            }, 10000);
        }, interval);
    }
    stopPingLoop() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = null;
        }
    }
    // ── Reconnection ──
    attemptReconnect() {
        const maxAttempts = this.config.maxReconnectAttempts || 10;
        if (this.intentionalClose || this.reconnectAttempts >= maxAttempts) {
            this.state = 'disconnected';
            this.callbacks.onReconnectFailed?.();
            return;
        }
        this.state = 'reconnecting';
        this.reconnectAttempts++;
        // Exponential backoff: 1s, 2s, 4s, 8s, ... capped at 30s
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
        this.callbacks.onReconnecting?.(this.reconnectAttempts, maxAttempts);
        this.reconnectTimer = setTimeout(() => {
            this.createWebSocket();
        }, delay);
    }
    // ── Context Compression ──
    /**
     * Compress conversation context to prevent memory/token overflow.
     * Keeps first 2 turns (system context) + last 20 turns.
     * Summarizes middle turns into a compact note.
     */
    compressContext() {
        const history = this.conversationHistory;
        if (history.length < 30)
            return;
        const originalCount = history.length;
        // Keep first 2 (initial context) + last 20
        const head = history.slice(0, 2);
        const tail = history.slice(-20);
        const middle = history.slice(2, -20);
        // Create a summary of compressed turns
        const summaryTurn = {
            role: 'system',
            text: `[Context compressed: ${middle.length} earlier turns summarized. Topics discussed: ${this.extractTopics(middle).join(', ')}]`,
            timestamp: Date.now(),
        };
        this.conversationHistory = [...head, summaryTurn, ...tail];
        this.turnCount = this.conversationHistory.length;
        this.callbacks.onContextCompressed?.(originalCount, this.conversationHistory.length);
    }
    extractTopics(turns) {
        // Simple keyword extraction — in production, use LLM summarization
        const allText = turns.map((t) => t.text).join(' ');
        const words = allText.split(/\s+/).filter((w) => w.length > 4);
        const freq = new Map();
        for (const word of words) {
            const lower = word.toLowerCase().replace(/[^a-z\u4e00-\u9fff]/g, '');
            if (!lower)
                continue;
            freq.set(lower, (freq.get(lower) || 0) + 1);
        }
        return Array.from(freq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
    }
    // ── Network Monitoring ──
    startNetworkMonitoring() {
        // Monitor app state (background/foreground)
        this.appStateSubscription = AppState.addEventListener('change', (state) => {
            if (state === 'active' && this.state === 'disconnected' && !this.intentionalClose) {
                // Returned from background — try to reconnect
                this.reconnectAttempts = 0;
                this.attemptReconnect();
            }
        });
        // Periodic connectivity check
        this.networkCheckTimer = setInterval(() => {
            if (this.state === 'connected' && this.ws?.readyState !== WebSocket.OPEN) {
                // WebSocket claims connected but socket is actually closed
                this.state = 'disconnected';
                this.attemptReconnect();
            }
        }, 15000);
    }
    // ── Cleanup ──
    cleanup() {
        this.stopPingLoop();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.networkCheckTimer) {
            clearInterval(this.networkCheckTimer);
            this.networkCheckTimer = null;
        }
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
            this.appStateSubscription = null;
        }
        if (this.ws) {
            try {
                this.ws.close(1000, 'cleanup');
            }
            catch { }
            this.ws = null;
        }
    }
}
