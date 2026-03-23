import { isLiveSpeechRecognitionAvailable, requestLiveSpeechPermissions, startLiveSpeechRecognition, type LiveSpeechController } from './liveSpeech.service';
import { addVoiceDiagnostic } from './voiceDiagnostics';

export interface SpeechWakeWordConfig {
  phrases: string[];
  language: string;
  onWakeWord: (phrase: string) => void;
  onError?: (error: Error) => void;
}

function normalizeTranscript(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s.,!?;:，。！？、'"`~^*()\[\]{}<>|\\/_+-]+/g, '')
    .trim();
}

function findMatchedPhrase(transcript: string, phrases: string[]): string | null {
  const normalizedTranscript = normalizeTranscript(transcript);
  if (!normalizedTranscript) {
    return null;
  }

  for (const phrase of phrases) {
    const normalizedPhrase = normalizeTranscript(phrase);
    if (normalizedPhrase && normalizedTranscript.includes(normalizedPhrase)) {
      return phrase;
    }
  }

  return null;
}

export class SpeechWakeWordService {
  private controller: LiveSpeechController | null = null;
  private config: SpeechWakeWordConfig | null = null;
  private running = false;
  private stoppedManually = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private consecutiveErrors = 0;
  private lastErrorTime = 0;
  private static readonly MAX_CONSECUTIVE_ERRORS = 3;
  private static readonly ERROR_WINDOW_MS = 5000;

  static isAvailable(): boolean {
    return isLiveSpeechRecognitionAvailable();
  }

  async init(config: SpeechWakeWordConfig): Promise<void> {
    this.config = {
      ...config,
      phrases: config.phrases.map((item) => item.trim()).filter(Boolean),
    };
    addVoiceDiagnostic('speech-wake', 'init', { phrases: this.config.phrases, language: this.config.language });
  }

  async start(): Promise<void> {
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

  private startController() {
    if (!this.config || this.controller) {
      return;
    }

    const { language, phrases, onWakeWord, onError } = this.config;

    this.controller = startLiveSpeechRecognition(
      language,
      {
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
            try { this.controller?.abort(); } catch {}
            this.controller = null;
            this.running = false;
            return;
          }
          onError?.(new Error(event?.message || event?.error || 'Speech wake word error'));
        },
      },
      phrases,
    );
  }

  async stop(): Promise<void> {
    this.stoppedManually = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    try { this.controller?.abort(); } catch {}
    this.controller = null;
    this.running = false;
    addVoiceDiagnostic('speech-wake', 'stop');
  }

  async release(): Promise<void> {
    await this.stop();
    this.config = null;
    addVoiceDiagnostic('speech-wake', 'release');
  }

  get isRunning(): boolean {
    return this.running;
  }

  get isInitialized(): boolean {
    return this.config !== null;
  }
}