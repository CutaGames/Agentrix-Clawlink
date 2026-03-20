/**
 * Wake Word Service — Mobile (React Native)
 *
 * Uses Picovoice Porcupine for offline, always-on wake word detection.
 * Supports custom wake words like "Hey Agentrix".
 *
 * Dependencies (must be installed separately):
 *   npm install @picovoice/porcupine-react-native
 *
 * Setup:
 *   1. Get a free Picovoice access key at https://console.picovoice.ai/
 *   2. Train a custom wake word "Hey Agentrix" in the Picovoice console
 *   3. Download the .ppn model files for iOS and Android
 *   4. Set PICOVOICE_ACCESS_KEY in your env or pass it to init()
 *
 * Usage:
 *   const wakeWord = new WakeWordService();
 *   await wakeWord.init({ accessKey: '...', onWakeWord: () => startVoice() });
 *   await wakeWord.start();
 *   // ... later
 *   await wakeWord.stop();
 *   wakeWord.release();
 */

import { Platform } from 'react-native';

// Types for Porcupine (avoids hard dependency at import time)
interface PorcupineManager {
  start(): Promise<void>;
  stop(): Promise<void>;
  delete(): Promise<void>;
}

export type WakeWordCallback = (keywordIndex: number) => void;

export interface WakeWordConfig {
  /** Picovoice access key */
  accessKey: string;
  /** Custom keyword paths (.ppn files bundled in app assets) */
  keywordPaths?: string[];
  /** Built-in keywords to use (e.g. ['picovoice', 'alexa']) */
  builtInKeywords?: string[];
  /** Detection sensitivity (0.0 - 1.0, default 0.5) */
  sensitivity?: number;
  /** Called when wake word is detected */
  onWakeWord: WakeWordCallback;
  /** Called on error */
  onError?: (error: Error) => void;
}

export class WakeWordService {
  private manager: PorcupineManager | null = null;
  private running = false;
  private config: WakeWordConfig | null = null;

  /**
   * Check if Porcupine SDK is available.
   */
  static isAvailable(): boolean {
    try {
      require('@picovoice/porcupine-react-native');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize the wake word engine.
   */
  async init(config: WakeWordConfig): Promise<void> {
    this.config = config;

    if (!WakeWordService.isAvailable()) {
      console.warn('[WakeWord] Porcupine SDK not installed. Wake word detection unavailable.');
      return;
    }

    try {
      const { PorcupineManager: PorcupineManagerClass } = require('@picovoice/porcupine-react-native');

      const detectionCallback = (keywordIndex: number) => {
        config.onWakeWord(keywordIndex);
      };

      const errorCallback = (error: any) => {
        console.error('[WakeWord] Porcupine error:', error);
        config.onError?.(error instanceof Error ? error : new Error(String(error)));
      };

      if (config.keywordPaths && config.keywordPaths.length > 0) {
        // Custom wake words (.ppn files)
        const sensitivities = config.keywordPaths.map(() => config.sensitivity ?? 0.5);
        this.manager = await PorcupineManagerClass.fromKeywordPaths(
          config.accessKey,
          config.keywordPaths,
          detectionCallback,
          errorCallback,
          sensitivities,
        );
      } else {
        // Built-in keywords
        const keywords = config.builtInKeywords || ['picovoice'];
        const sensitivities = keywords.map(() => config.sensitivity ?? 0.5);
        this.manager = await PorcupineManagerClass.fromBuiltInKeywords(
          config.accessKey,
          keywords,
          detectionCallback,
          errorCallback,
          sensitivities,
        );
      }

      console.log('[WakeWord] Porcupine initialized successfully');
    } catch (error: any) {
      console.error('[WakeWord] Failed to initialize Porcupine:', error);
      config.onError?.(error instanceof Error ? error : new Error(error?.message || 'Init failed'));
    }
  }

  /**
   * Start listening for the wake word.
   * Microphone permissions must be granted before calling this.
   */
  async start(): Promise<void> {
    if (!this.manager) {
      console.warn('[WakeWord] Not initialized');
      return;
    }
    if (this.running) return;

    try {
      await this.manager.start();
      this.running = true;
      console.log('[WakeWord] Listening started');
    } catch (error: any) {
      console.error('[WakeWord] Failed to start:', error);
      this.config?.onError?.(error instanceof Error ? error : new Error(error?.message || 'Start failed'));
    }
  }

  /**
   * Stop listening (but keep engine loaded for quick restart).
   */
  async stop(): Promise<void> {
    if (!this.manager || !this.running) return;

    try {
      await this.manager.stop();
      this.running = false;
      console.log('[WakeWord] Listening stopped');
    } catch (error: any) {
      console.error('[WakeWord] Failed to stop:', error);
    }
  }

  /**
   * Release all resources. Call when done with wake word detection.
   */
  async release(): Promise<void> {
    await this.stop();
    if (this.manager) {
      try {
        await this.manager.delete();
      } catch {}
      this.manager = null;
    }
    this.config = null;
    console.log('[WakeWord] Released');
  }

  get isRunning(): boolean {
    return this.running;
  }

  get isInitialized(): boolean {
    return this.manager !== null;
  }
}
