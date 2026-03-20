import { Logger } from '@nestjs/common';
import * as WebSocket from 'ws';
import type {
  RealtimeVoiceAdapter,
  RealtimeVoiceSession,
  RealtimeVoiceCallbacks,
} from './voice-provider.interface';

/**
 * Gemini Live Adapter — End-to-end realtime voice via Gemini 2.0 Live API.
 *
 * Protocol: WebSocket bidirectional audio streaming
 * - Client sends PCM16 audio chunks
 * - Server returns audio chunks + text + tool calls
 * - Supports barge-in (server detects user speech and stops)
 *
 * Requires: GEMINI_API_KEY env variable
 * Model: gemini-2.0-flash-live-001 (or configurable)
 *
 * Free tier: ~15 requests/min, sufficient for development/testing.
 *
 * Reference: https://ai.google.dev/api/multimodal-live
 */

const GEMINI_LIVE_WS_BASE = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

interface GeminiLiveConfig {
  model?: string;
  voice?: string;   // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'
  lang?: string;
  sampleRate?: number;
}

export class GeminiLiveAdapter implements RealtimeVoiceAdapter {
  readonly name = 'gemini-live';
  private readonly logger = new Logger(GeminiLiveAdapter.name);
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || '';
  }

  get isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async createSession(
    systemPrompt: string,
    callbacks: RealtimeVoiceCallbacks,
    options?: { model?: string; voice?: string; lang?: string },
  ): Promise<RealtimeVoiceSession> {
    if (!this.apiKey) throw new Error('Gemini API key not configured');

    const model = options?.model || process.env.GEMINI_LIVE_MODEL || 'gemini-2.0-flash-live-001';
    const voice = options?.voice || 'Puck';
    const sampleRate = 24000; // Gemini Live outputs 24kHz PCM

    const wsUrl = `${GEMINI_LIVE_WS_BASE}?key=${this.apiKey}`;

    const ws = new WebSocket(wsUrl);
    let closed = false;
    let setupSent = false;

    // ── WebSocket handlers ──

    ws.on('open', () => {
      this.logger.debug('Gemini Live WebSocket connected');

      // Send setup message
      const setupMessage = {
        setup: {
          model: `models/${model}`,
          generationConfig: {
            responseModalities: ['AUDIO', 'TEXT'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice,
                },
              },
            },
          },
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          tools: this.buildToolDeclarations(),
        },
      };

      ws.send(JSON.stringify(setupMessage));
      setupSent = true;
    });

    ws.on('message', (rawData: Buffer) => {
      if (closed) return;

      try {
        const msg = JSON.parse(rawData.toString('utf8'));
        this.handleServerMessage(msg, callbacks);
      } catch (err) {
        this.logger.warn('Failed to parse Gemini Live message', err);
      }
    });

    ws.on('error', (err) => {
      if (!closed) {
        this.logger.error('Gemini Live WebSocket error:', err);
        callbacks.onError?.(err as Error);
      }
    });

    ws.on('close', (code, reason) => {
      closed = true;
      this.logger.debug(`Gemini Live WebSocket closed: ${code} ${reason}`);
      callbacks.onSessionEnd?.();
    });

    // ── Session interface ──

    return {
      sendAudio: (chunk: Buffer) => {
        if (closed || ws.readyState !== WebSocket.OPEN || !setupSent) return;

        // Gemini expects base64-encoded PCM audio in realtimeInput
        const message = {
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: `audio/pcm;rate=${sampleRate}`,
                data: chunk.toString('base64'),
              },
            ],
          },
        };

        ws.send(JSON.stringify(message));
      },

      sendText: (text: string, role: 'user' | 'system' = 'user') => {
        if (closed || ws.readyState !== WebSocket.OPEN) return;

        const message = {
          clientContent: {
            turns: [
              {
                role: role === 'system' ? 'model' : 'user',
                parts: [{ text }],
              },
            ],
            turnComplete: true,
          },
        };

        ws.send(JSON.stringify(message));
      },

      interrupt: () => {
        if (closed || ws.readyState !== WebSocket.OPEN) return;
        // Gemini Live doesn't have explicit interrupt — sending new audio triggers barge-in
        // We can send an empty client content to signal turn end
        this.logger.debug('Interrupt requested');
      },

      close: () => {
        closed = true;
        try { ws.close(); } catch {}
      },
    };
  }

  // ── Message Handling ──

  private handleServerMessage(msg: any, callbacks: RealtimeVoiceCallbacks): void {
    // Setup complete
    if (msg.setupComplete) {
      this.logger.debug('Gemini Live setup complete');
      return;
    }

    // Server content (text and/or audio)
    if (msg.serverContent) {
      const content = msg.serverContent;

      // Model turn parts
      if (content.modelTurn?.parts) {
        for (const part of content.modelTurn.parts) {
          // Text response
          if (part.text) {
            callbacks.onAgentText?.(part.text, !!content.turnComplete);
          }

          // Audio response (inline data)
          if (part.inlineData?.mimeType?.startsWith('audio/')) {
            const audioData = Buffer.from(part.inlineData.data, 'base64');
            callbacks.onAgentAudio?.(audioData);
          }
        }
      }

      // Turn complete signal
      if (content.turnComplete) {
        callbacks.onAgentAudioEnd?.();
      }

      // Interrupted (user barge-in detected by server)
      if (content.interrupted) {
        this.logger.debug('Gemini detected user barge-in');
        callbacks.onAgentAudioEnd?.();
      }
    }

    // Tool call
    if (msg.toolCall) {
      const functionCalls = msg.toolCall.functionCalls || [];
      for (const call of functionCalls) {
        callbacks.onToolCall?.(call.name, call.args || {});
      }
    }

    // Tool call cancellation (barge-in during tool execution)
    if (msg.toolCallCancellation) {
      this.logger.debug('Tool call cancelled by barge-in');
    }
  }

  /**
   * Build tool declarations for Gemini Live.
   * These enable the voice model to call agent tools.
   */
  private buildToolDeclarations(): any[] {
    // Base tools that all voice sessions can use
    return [
      {
        functionDeclarations: [
          {
            name: 'search_web',
            description: 'Search the web for current information',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
              },
              required: ['query'],
            },
          },
          {
            name: 'execute_agent_skill',
            description: 'Execute an agent skill or capability',
            parameters: {
              type: 'object',
              properties: {
                skillName: { type: 'string', description: 'Name of the skill to execute' },
                parameters: { type: 'object', description: 'Skill parameters' },
              },
              required: ['skillName'],
            },
          },
          {
            name: 'set_reminder',
            description: 'Set a reminder or timer',
            parameters: {
              type: 'object',
              properties: {
                message: { type: 'string', description: 'Reminder message' },
                delaySeconds: { type: 'number', description: 'Seconds until reminder' },
              },
              required: ['message'],
            },
          },
        ],
      },
    ];
  }
}
