import { isLiveSpeechRecognitionAvailable, requestLiveSpeechPermissions, startLiveSpeechRecognition } from './liveSpeech.service';
import { addVoiceDiagnostic } from './voiceDiagnostics';
const AGENTRIX_ALIAS_GROUP = [
    'agentrix',
    'agenttrix',
    'agentricks',
    'agentricks',
    'agent tricks',
    'agent tricks',
    'agent rix',
    'agent ricks',
    'agent rigs',
    'agent rigs',
    'agent race',
    'agent trace',
    'agent x',
    'agent ex',
    'a gentrix',
    'a gent tricks',
    'hey agent x',
    'hey agent tricks',
    'hi agent x',
    'agents tricks',
];
function canonicalizeWakeWordText(value) {
    let normalized = normalizeTranscript(value);
    for (const alias of AGENTRIX_ALIAS_GROUP) {
        const normalizedAlias = normalizeTranscript(alias);
        if (!normalizedAlias) {
            continue;
        }
        normalized = normalized.split(normalizedAlias).join('agentrix');
    }
    return normalized;
}
function expandPhraseAliases(phrases) {
    const expanded = new Set();
    for (const phrase of phrases) {
        const trimmedPhrase = phrase.trim();
        if (!trimmedPhrase) {
            continue;
        }
        expanded.add(trimmedPhrase);
        if (/agentrix/i.test(trimmedPhrase)) {
            for (const alias of AGENTRIX_ALIAS_GROUP) {
                expanded.add(trimmedPhrase.replace(/agentrix/gi, alias));
            }
        }
    }
    return Array.from(expanded);
}
function normalizeTranscript(value) {
    return value
        .toLowerCase()
        .replace(/[\s.,!?;:，。！？、'"`~^*()\[\]{}<>|\\/_+-]+/g, '')
        .trim();
}
function findMatchedPhrase(transcript, phrases) {
    const normalizedTranscript = canonicalizeWakeWordText(transcript);
    if (!normalizedTranscript) {
        return null;
    }
    for (const phrase of phrases) {
        const normalizedPhrase = canonicalizeWakeWordText(phrase);
        if (normalizedPhrase && normalizedTranscript.includes(normalizedPhrase)) {
            return phrase;
        }
    }
    return null;
}
export class SpeechWakeWordService {
    constructor() {
        this.controller = null;
        this.config = null;
        this.running = false;
        this.stoppedManually = false;
        this.restartTimer = null;
        this.consecutiveErrors = 0;
        this.lastErrorTime = 0;
    }
    static isAvailable() {
        return isLiveSpeechRecognitionAvailable();
    }
    async init(config) {
        this.config = {
            ...config,
            phrases: expandPhraseAliases(config.phrases.map((item) => item.trim()).filter(Boolean)),
        };
        addVoiceDiagnostic('speech-wake', 'init', { phrases: this.config.phrases, language: this.config.language });
    }
    async start() {
        if (this.running || !this.config) {
            return;
        }
        this.consecutiveErrors = 0;
        this.lastErrorTime = 0;
        if (!SpeechWakeWordService.isAvailable()) {
            addVoiceDiagnostic('speech-wake', 'unavailable');
            this.config.onError?.(new Error('Speech wake word recognition unavailable'));
            return;
        }
        const permission = await requestLiveSpeechPermissions();
        if (!permission?.granted) {
            addVoiceDiagnostic('speech-wake', 'permission-denied');
            this.config.onError?.(new Error('Speech wake word permission denied'));
            return;
        }
        this.stoppedManually = false;
        addVoiceDiagnostic('speech-wake', 'start');
        this.startController();
    }
    startController() {
        if (!this.config || this.controller) {
            return;
        }
        const { language, phrases, onWakeWord, onError } = this.config;
        this.controller = startLiveSpeechRecognition(language, {
            onStart: () => {
                this.running = true;
                addVoiceDiagnostic('speech-wake', 'recognition-start');
            },
            onEnd: () => {
                this.controller = null;
                this.running = false;
                if (this.stoppedManually) {
                    return;
                }
                this.restartTimer = setTimeout(() => {
                    this.restartTimer = null;
                    this.startController();
                }, 400);
            },
            onInterimResult: (transcript) => {
                const matched = findMatchedPhrase(transcript, phrases);
                if (!matched) {
                    return;
                }
                this.stoppedManually = true;
                this.controller?.abort();
                this.controller = null;
                this.running = false;
                addVoiceDiagnostic('speech-wake', 'wake-match-interim', { matched });
                onWakeWord(matched);
            },
            onFinalResult: (transcript) => {
                const matched = findMatchedPhrase(transcript, phrases);
                if (!matched) {
                    return;
                }
                this.stoppedManually = true;
                this.controller?.abort();
                this.controller = null;
                this.running = false;
                addVoiceDiagnostic('speech-wake', 'wake-match-final', { matched });
                onWakeWord(matched);
            },
            onError: (event) => {
                if (event?.error === 'aborted' || event?.error === 'no-speech') {
                    return;
                }
                const now = Date.now();
                if (now - this.lastErrorTime > SpeechWakeWordService.ERROR_WINDOW_MS) {
                    this.consecutiveErrors = 0;
                }
                this.consecutiveErrors++;
                this.lastErrorTime = now;
                addVoiceDiagnostic('speech-wake', 'recognition-error', event);
                if (this.consecutiveErrors >= SpeechWakeWordService.MAX_CONSECUTIVE_ERRORS) {
                    addVoiceDiagnostic('speech-wake', 'too-many-errors-stopping', { count: this.consecutiveErrors });
                    this.stoppedManually = true;
                    try {
                        this.controller?.abort();
                    }
                    catch { }
                    this.controller = null;
                    this.running = false;
                    // Auto-recovery: retry after 15s cooldown
                    this.restartTimer = setTimeout(() => {
                        if (this.config && !this.running) {
                            this.consecutiveErrors = 0;
                            this.lastErrorTime = 0;
                            this.stoppedManually = false;
                            addVoiceDiagnostic('speech-wake', 'auto-recovery-attempt');
                            this.start().catch(() => { });
                        }
                    }, 15000);
                    return;
                }
                onError?.(new Error(event?.message || event?.error || 'Speech wake word error'));
            },
        }, phrases);
    }
    async stop() {
        this.stoppedManually = true;
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = null;
        }
        try {
            this.controller?.abort();
        }
        catch { }
        this.controller = null;
        this.running = false;
        addVoiceDiagnostic('speech-wake', 'stop');
    }
    async release() {
        await this.stop();
        this.config = null;
        addVoiceDiagnostic('speech-wake', 'release');
    }
    get isRunning() {
        return this.running;
    }
    get isInitialized() {
        return this.config !== null;
    }
}
SpeechWakeWordService.MAX_CONSECUTIVE_ERRORS = 3;
SpeechWakeWordService.ERROR_WINDOW_MS = 5000;
