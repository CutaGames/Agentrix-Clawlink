/**
 * RealtimeVoiceService — Socket.IO-based duplex voice control channel.
 *
 * The mobile client keeps local STT for low-friction microphone capture,
 * then pushes final transcripts to the backend voice gateway for streaming
 * agent text + sentence-level TTS responses.
 */
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { addVoiceDiagnostic } from './voiceDiagnostics';
import { isVoiceUiE2EEnabled, setVoiceUiE2ERealtimeBridge } from '../testing/e2e';
function toSocketBufferLike(audio) {
    const bytes = audio instanceof Uint8Array
        ? audio
        : new Uint8Array(audio);
    return {
        type: 'Buffer',
        data: Array.from(bytes),
    };
}
export class RealtimeVoiceService {
    constructor(callbacks) {
        this.socket = null;
        this.config = null;
        this._state = 'disconnected';
        this.sessionId = null;
        this.intentionallyClosed = false;
        this.appStateSubscription = null;
        this.pendingTexts = [];
        this.e2eCleanup = null;
        this.handleAppStateChange = (nextState) => {
            if (nextState !== 'active' || this.intentionallyClosed || !this.config) {
                return;
            }
            if (!this.socket || this.socket.disconnected) {
                this.createSocket();
            }
        };
        this.callbacks = callbacks;
    }
    get state() {
        return this._state;
    }
    get isConnected() {
        return !!this.socket?.connected && !!this.sessionId && this._state !== 'error';
    }
    connect(config) {
        this.config = config;
        this.intentionallyClosed = false;
        this.pendingTexts = [];
        this.setupAppStateListener();
        this.createSocket();
    }
    createSocket() {
        if (!this.config) {
            return;
        }
        if (isVoiceUiE2EEnabled() && typeof window !== 'undefined') {
            this.setupE2ERealtimeChannel();
            return;
        }
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        this.setState('connecting');
        const socket = io(this.config.wsUrl, {
            transports: ['websocket'],
            auth: { token: this.config.token },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 8000,
            timeout: 10000,
            forceNew: true,
        });
        this.socket = socket;
        socket.on('connect', () => {
            addVoiceDiagnostic('realtime-voice', 'socket-connected', { id: socket.id });
            this.setState('connecting');
            this.startSession();
        });
        socket.on('disconnect', (reason) => {
            addVoiceDiagnostic('realtime-voice', 'socket-disconnected', { reason, intentional: this.intentionallyClosed });
            this.sessionId = null;
            this.pendingTexts = [];
            if (this.intentionallyClosed) {
                this.setState('disconnected');
                this.callbacks.onDisconnect('intentional');
                return;
            }
            this.setState('disconnected');
            this.callbacks.onDisconnect(reason);
        });
        socket.on('connect_error', (error) => {
            addVoiceDiagnostic('realtime-voice', 'socket-connect-error', { error: error.message });
            this.setState('error');
            this.callbacks.onError(error.message || 'Realtime voice connect failed');
        });
        socket.on('voice:session:ready', (payload) => {
            this.sessionId = payload?.sessionId || null;
            addVoiceDiagnostic('realtime-voice', 'session-ready', { sessionId: this.sessionId });
            this.setState('connected');
            this.flushPendingTexts();
        });
        socket.on('voice:transcript:interim', (payload) => {
            this.setState('listening');
            this.callbacks.onInterimTranscript(payload?.text || '');
        });
        socket.on('voice:stt:interim', (payload) => {
            this.setState('listening');
            this.callbacks.onInterimTranscript(payload?.transcript || '');
        });
        socket.on('voice:transcript:final', (payload) => {
            this.setState('thinking');
            this.callbacks.onFinalTranscript(payload?.text || '');
        });
        socket.on('voice:stt:final', (payload) => {
            this.setState('thinking');
            this.callbacks.onFinalTranscript(payload?.transcript || '');
        });
        socket.on('voice:meta', (payload) => {
            addVoiceDiagnostic('realtime-voice', 'meta', payload || {});
        });
        socket.on('voice:agent:text', (payload) => {
            this.setState('thinking');
            this.callbacks.onAgentTextChunk(payload?.chunk || payload?.text || '');
        });
        socket.on('voice:agent:speech:start', () => {
            this.setState('speaking');
            this.callbacks.onAgentSpeechStart();
        });
        socket.on('voice:agent:audio', (payload) => {
            this.setState('speaking');
            this.callbacks.onAgentAudioChunk(payload?.audio || '', payload?.format || 'mp3');
        });
        socket.on('voice:agent:end', () => {
            this.setState('connected');
            this.callbacks.onAgentResponseEnd();
        });
        socket.on('voice:tool:start', (payload) => {
            this.callbacks.onToolCall(payload?.tool || '', 'start');
        });
        socket.on('voice:tool:end', (payload) => {
            this.callbacks.onToolCall(payload?.tool || '', 'end');
        });
        socket.on('voice:error', (payload) => {
            const error = payload?.error || 'Realtime voice error';
            addVoiceDiagnostic('realtime-voice', 'socket-error-event', { error });
            this.callbacks.onError(error);
        });
    }
    setupE2ERealtimeChannel() {
        this.e2eCleanup?.();
        this.socket = null;
        this.sessionId = 'e2e-realtime-session';
        this.setState('connecting');
        const handleFinalTranscript = (text) => {
            this.setState('thinking');
            this.callbacks.onFinalTranscript(text);
        };
        const handleAssistantChunk = (chunk) => {
            this.setState('thinking');
            this.callbacks.onAgentTextChunk(chunk);
        };
        const handleAssistantEnd = () => {
            this.setState('connected');
            this.callbacks.onAgentResponseEnd();
        };
        const handleError = (error) => {
            this.setState('error');
            this.callbacks.onError(error || 'Realtime voice error');
        };
        setVoiceUiE2ERealtimeBridge({
            onFinalTranscript: handleFinalTranscript,
            onAssistantChunk: handleAssistantChunk,
            onAssistantEnd: handleAssistantEnd,
            onError: handleError,
        });
        this.e2eCleanup = () => {
            setVoiceUiE2ERealtimeBridge(null);
        };
        addVoiceDiagnostic('realtime-voice', 'session-ready', { sessionId: this.sessionId, mode: 'e2e' });
        this.setState('connected');
        this.flushPendingTexts();
    }
    startSession() {
        if (!this.socket || !this.config) {
            return;
        }
        this.socket.emit('voice:session:start', {
            sessionId: this.sessionId || undefined,
            instanceId: this.config.instanceId,
            lang: this.config.language,
            voiceId: this.config.agentVoiceId,
            duplexMode: true,
            model: this.config.modelId,
        });
    }
    sendText(text) {
        if (!this.socket || !this.sessionId) {
            if (text.trim()) {
                this.pendingTexts.push(text);
                addVoiceDiagnostic('realtime-voice', 'queue-text-until-ready', {
                    queuedCount: this.pendingTexts.length,
                });
            }
            return;
        }
        this.setState('thinking');
        this.socket.emit('voice:text', {
            sessionId: this.sessionId,
            text,
            model: this.config?.modelId,
        });
    }
    sendInterrupt() {
        if (!this.socket || !this.sessionId) {
            return;
        }
        this.socket.emit('voice:interrupt', { sessionId: this.sessionId });
    }
    sendAudioChunk(audio) {
        if (!this.socket || !this.sessionId) {
            return;
        }
        this.socket.emit('voice:audio:chunk', {
            sessionId: this.sessionId,
            audio: toSocketBufferLike(audio),
        });
    }
    endAudioInput() {
        if (!this.socket || !this.sessionId) {
            return;
        }
        this.socket.emit('voice:audio:end', { sessionId: this.sessionId });
    }
    startListening() {
        this.setState('listening');
    }
    stopListening() {
        if (this._state === 'listening') {
            this.setState('connected');
        }
    }
    disconnect() {
        this.intentionallyClosed = true;
        this.removeAppStateListener();
        this.e2eCleanup?.();
        this.e2eCleanup = null;
        if (this.socket) {
            if (this.sessionId) {
                this.socket.emit('voice:session:end', { sessionId: this.sessionId });
            }
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        this.sessionId = null;
        this.pendingTexts = [];
        this.setState('disconnected');
    }
    flushPendingTexts() {
        if (!this.sessionId || !this.pendingTexts.length) {
            return;
        }
        const queued = [...this.pendingTexts];
        this.pendingTexts = [];
        for (const text of queued) {
            this.sendText(text);
        }
    }
    setupAppStateListener() {
        this.removeAppStateListener();
        this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    }
    removeAppStateListener() {
        this.appStateSubscription?.remove();
        this.appStateSubscription = null;
    }
    setState(state) {
        if (this._state === state)
            return;
        this._state = state;
        this.callbacks.onStateChange(state);
    }
}
