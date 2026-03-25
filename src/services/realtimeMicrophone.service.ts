import { addVoiceDiagnostic } from './voiceDiagnostics';

type VoiceProcessorType = {
  addFrameListener: (listener: (frame: number[]) => void) => void;
  removeFrameListener: (listener: (frame: number[]) => void) => void;
  addErrorListener: (listener: (error: unknown) => void) => void;
  removeErrorListener: (listener: (error: unknown) => void) => void;
  hasRecordAudioPermission: () => Promise<boolean>;
  start: (frameLength: number, sampleRate: number) => Promise<void>;
  stop: () => Promise<void>;
  isRecording: () => Promise<boolean>;
};

export interface RealtimeMicrophoneCallbacks {
  onFrame: (audioChunk: ArrayBuffer) => void;
  onVolumeChange?: (value: number) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (error: Error) => void;
}

const FRAME_LENGTH = 512;
const SAMPLE_RATE = 16000;
const SPEECH_START_THRESHOLD = 0.12;
const SPEECH_END_THRESHOLD = 0.05;
const SPEECH_END_FRAME_COUNT = 10;

function getVoiceProcessor(): VoiceProcessorType | null {
  try {
    const { VoiceProcessor } = require('@picovoice/react-native-voice-processor');
    return VoiceProcessor?.instance ?? null;
  } catch {
    return null;
  }
}

function toPcmBuffer(frame: number[]): ArrayBuffer {
  const buffer = new ArrayBuffer(frame.length * 2);
  const view = new DataView(buffer);
  for (let index = 0; index < frame.length; index += 1) {
    view.setInt16(index * 2, frame[index] ?? 0, true);
  }
  return buffer;
}

function calculateNormalizedVolume(frame: number[]): number {
  if (!frame.length) {
    return 0;
  }

  let sumSquares = 0;
  for (const sample of frame) {
    sumSquares += sample * sample;
  }

  const rms = Math.sqrt(sumSquares / frame.length) / 32767;
  if (!Number.isFinite(rms) || rms <= 0) {
    return 0;
  }

  const dbfs = 20 * Math.log10(Math.max(rms, 1e-9));
  return Math.min(1, Math.max(0, (dbfs + 60) / 60));
}

export class RealtimeMicrophoneService {
  private callbacks: RealtimeMicrophoneCallbacks;
  private voiceProcessor: VoiceProcessorType | null = null;
  private frameListener: ((frame: number[]) => void) | null = null;
  private errorListener: ((error: unknown) => void) | null = null;
  private running = false;
  private speechActive = false;
  private silentFrameCount = 0;

  constructor(callbacks: RealtimeMicrophoneCallbacks) {
    this.callbacks = callbacks;
  }

  static isAvailable(): boolean {
    return getVoiceProcessor() !== null;
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    const voiceProcessor = getVoiceProcessor();
    if (!voiceProcessor) {
      throw new Error('Realtime microphone processor unavailable');
    }

    const granted = await voiceProcessor.hasRecordAudioPermission();
    if (!granted) {
      throw new Error('Realtime microphone permission denied');
    }

    this.voiceProcessor = voiceProcessor;
    this.speechActive = false;
    this.silentFrameCount = 0;

    this.frameListener = (frame: number[]) => {
      const normalizedVolume = calculateNormalizedVolume(frame);
      this.callbacks.onVolumeChange?.(normalizedVolume);

      if (normalizedVolume >= SPEECH_START_THRESHOLD) {
        this.silentFrameCount = 0;
        if (!this.speechActive) {
          this.speechActive = true;
          addVoiceDiagnostic('realtime-mic', 'speech-start', { normalizedVolume });
          this.callbacks.onSpeechStart?.();
        }
      } else if (this.speechActive) {
        if (normalizedVolume <= SPEECH_END_THRESHOLD) {
          this.silentFrameCount += 1;
          if (this.silentFrameCount >= SPEECH_END_FRAME_COUNT) {
            this.speechActive = false;
            this.silentFrameCount = 0;
            addVoiceDiagnostic('realtime-mic', 'speech-end');
            this.callbacks.onSpeechEnd?.();
          }
        } else {
          this.silentFrameCount = 0;
        }
      }

      this.callbacks.onFrame(toPcmBuffer(frame));
    };

    this.errorListener = (error: unknown) => {
      const nextError = error instanceof Error ? error : new Error(String(error));
      addVoiceDiagnostic('realtime-mic', 'error', { message: nextError.message });
      this.callbacks.onError?.(nextError);
    };

    voiceProcessor.addFrameListener(this.frameListener);
    voiceProcessor.addErrorListener(this.errorListener);

    try {
      await voiceProcessor.start(FRAME_LENGTH, SAMPLE_RATE);
      this.running = true;
      addVoiceDiagnostic('realtime-mic', 'start', { frameLength: FRAME_LENGTH, sampleRate: SAMPLE_RATE });
    } catch (error) {
      this.detachListeners();
      this.voiceProcessor = null;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.voiceProcessor) {
      this.running = false;
      return;
    }

    const processor = this.voiceProcessor;
    this.detachListeners();
    this.voiceProcessor = null;
    this.running = false;
    this.speechActive = false;
    this.silentFrameCount = 0;

    try {
      if (await processor.isRecording()) {
        await processor.stop();
      }
    } catch (error) {
      addVoiceDiagnostic('realtime-mic', 'stop-error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  get isRunning(): boolean {
    return this.running;
  }

  private detachListeners() {
    if (this.voiceProcessor && this.frameListener) {
      this.voiceProcessor.removeFrameListener(this.frameListener);
    }
    if (this.voiceProcessor && this.errorListener) {
      this.voiceProcessor.removeErrorListener(this.errorListener);
    }
    this.frameListener = null;
    this.errorListener = null;
  }
}