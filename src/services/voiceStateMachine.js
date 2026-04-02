/**
 * VoiceStateMachine — Cross-platform unified voice session state machine.
 *
 * This module defines the canonical voice session states and transitions.
 * Both mobile (React Native) and desktop (Tauri/Web) share this definition.
 *
 * States:
 *   idle        → No voice activity
 *   listening   → Microphone active, user may be speaking
 *   thinking    → User finished, waiting for agent response
 *   speaking    → Agent TTS playing
 *   interrupted → User barged in during agent speech
 *   tool_running→ Agent called a tool, voice session stays alive
 *   cooldown    → Brief pause between turns (auto-restart listening in duplex)
 *
 * Events:
 *   ACTIVATE, SPEECH_START, SPEECH_END, FINAL_TRANSCRIPT,
 *   AGENT_RESPONSE_START, AGENT_SPEECH_START, AGENT_SPEECH_END,
 *   BARGE_IN, TOOL_CALL_START, TOOL_CALL_END,
 *   TIMEOUT, ERROR, DEACTIVATE
 */
// ── Transition Table ───────────────────────────────────────
function transition(state, event, duplexMode) {
    const e = event.type;
    switch (state) {
        case 'idle':
            if (e === 'ACTIVATE')
                return { nextState: 'listening', effects: ['START_LISTENING'] };
            break;
        case 'listening':
            if (e === 'FINAL_TRANSCRIPT')
                return { nextState: 'thinking', effects: ['STOP_LISTENING', 'SEND_TRANSCRIPT'] };
            if (e === 'TIMEOUT')
                return duplexMode
                    ? { nextState: 'cooldown', effects: ['STOP_LISTENING'] }
                    : { nextState: 'idle', effects: ['STOP_LISTENING'] };
            if (e === 'ERROR')
                return { nextState: 'idle', effects: ['STOP_LISTENING', 'LOG_ERROR'] };
            if (e === 'DEACTIVATE')
                return { nextState: 'idle', effects: ['STOP_LISTENING'] };
            break;
        case 'thinking':
            if (e === 'AGENT_SPEECH_START')
                return { nextState: 'speaking', effects: ['START_TTS'] };
            if (e === 'AGENT_RESPONSE_START')
                return { nextState: 'thinking', effects: ['NONE'] };
            if (e === 'TOOL_CALL_START')
                return { nextState: 'tool_running', effects: ['NONE'] };
            if (e === 'BARGE_IN')
                return { nextState: 'listening', effects: ['STOP_RESPONSE', 'START_LISTENING'] };
            if (e === 'ERROR')
                return { nextState: 'idle', effects: ['LOG_ERROR'] };
            if (e === 'TIMEOUT')
                return { nextState: 'idle', effects: ['LOG_ERROR'] };
            if (e === 'DEACTIVATE')
                return { nextState: 'idle', effects: ['STOP_RESPONSE'] };
            break;
        case 'speaking':
            if (e === 'BARGE_IN')
                return { nextState: 'interrupted', effects: ['STOP_TTS', 'NOTIFY_BARGE_IN'] };
            if (e === 'AGENT_SPEECH_END')
                return duplexMode
                    ? { nextState: 'cooldown', effects: ['NONE'] }
                    : { nextState: 'idle', effects: ['NONE'] };
            if (e === 'TOOL_CALL_START')
                return { nextState: 'tool_running', effects: ['NONE'] };
            if (e === 'DEACTIVATE')
                return { nextState: 'idle', effects: ['STOP_TTS'] };
            break;
        case 'interrupted':
            // After barge-in: immediately transition to listening
            if (e === 'SPEECH_START' || e === 'ACTIVATE')
                return { nextState: 'listening', effects: ['START_LISTENING'] };
            // Auto-transition if duplex
            if (duplexMode)
                return { nextState: 'listening', effects: ['START_LISTENING'] };
            if (e === 'DEACTIVATE')
                return { nextState: 'idle', effects: ['NONE'] };
            // Default: go to listening in interrupted state
            return { nextState: 'listening', effects: ['START_LISTENING'] };
        case 'tool_running':
            if (e === 'TOOL_CALL_END')
                return { nextState: 'thinking', effects: ['NONE'] };
            if (e === 'AGENT_SPEECH_START')
                return { nextState: 'speaking', effects: ['START_TTS'] };
            if (e === 'BARGE_IN')
                return { nextState: 'listening', effects: ['STOP_TTS', 'START_LISTENING'] };
            if (e === 'DEACTIVATE')
                return { nextState: 'idle', effects: ['STOP_TTS'] };
            break;
        case 'cooldown':
            if (e === 'ACTIVATE' || e === 'SPEECH_START')
                return { nextState: 'listening', effects: ['START_LISTENING'] };
            if (duplexMode)
                return { nextState: 'listening', effects: ['RESUME_LISTENING'] };
            if (e === 'TIMEOUT')
                return { nextState: 'idle', effects: ['NONE'] };
            if (e === 'DEACTIVATE')
                return { nextState: 'idle', effects: ['NONE'] };
            break;
    }
    // No valid transition — stay in current state
    return { nextState: state, effects: ['NONE'] };
}
export class VoiceSessionManager {
    constructor(callbacks) {
        this._state = 'idle';
        this._duplexMode = false;
        this._eventLog = [];
        this._callbacks = callbacks;
    }
    get state() {
        return this._state;
    }
    get duplexMode() {
        return this._duplexMode;
    }
    set duplexMode(value) {
        this._duplexMode = value;
    }
    get eventLog() {
        return this._eventLog;
    }
    /**
     * Dispatch an event to the state machine. Returns the new state.
     */
    dispatch(event) {
        const prevState = this._state;
        const { nextState, effects } = transition(prevState, event, this._duplexMode);
        this._eventLog.push({
            timestamp: Date.now(),
            event,
            from: prevState,
            to: nextState,
        });
        // Trim log to last 100 events
        if (this._eventLog.length > 100) {
            this._eventLog = this._eventLog.slice(-100);
        }
        if (nextState !== prevState) {
            this._state = nextState;
            this._callbacks.onStateChange(nextState, prevState);
        }
        for (const effect of effects) {
            if (effect !== 'NONE') {
                this._callbacks.onEffect(effect, event);
            }
        }
        return this._state;
    }
    /**
     * Force reset to idle.
     */
    reset() {
        const prev = this._state;
        this._state = 'idle';
        if (prev !== 'idle') {
            this._callbacks.onStateChange('idle', prev);
        }
    }
    /**
     * Get recent events for diagnostics.
     */
    getRecentEvents(count = 20) {
        return this._eventLog.slice(-count);
    }
}
