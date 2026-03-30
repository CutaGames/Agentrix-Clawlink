import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoiceService } from './voice.service';
import { edgeTTS, resolveEdgeVoice } from './adapters/edge-tts.adapter';
import { DeepgramSTTAdapter } from './adapters/deepgram-stt.adapter';
import { GeminiLiveAdapter, type GeminiTier } from './adapters/gemini-live.adapter';
import type { StreamingSTTSession, RealtimeVoiceSession as GeminiSession } from './adapters/voice-provider.interface';
import { OpenClawProxyService } from '../openclaw-proxy/openclaw-proxy.service';
import { UserProviderConfig } from '../../entities/user-provider-config.entity';

/**
 * RealtimeVoiceGateway — WebSocket gateway for bidirectional voice streaming.
 *
 * Protocol (Socket.IO namespace /voice):
 *
 * Client → Server:
 *   voice:session:start  { sessionId, lang, voiceId?, duplexMode? }
 *   voice:audio:chunk    { sessionId, audio: Buffer (PCM/opus) }
 *   voice:audio:end      { sessionId }
 *   voice:tts:request    { sessionId, text, voice?, lang? }
 *   voice:session:end    { sessionId }
 *
 * Server → Client:
 *   voice:session:ready  { sessionId }
 *   voice:stt:interim    { sessionId, transcript }
 *   voice:stt:final      { sessionId, transcript, lang }
 *   voice:tts:chunk      { sessionId, audio: Buffer (mp3) }
 *   voice:tts:end        { sessionId }
 *   voice:error          { sessionId, error, code? }
 *   voice:session:ended  { sessionId }
 */

interface AuthenticatedVoiceSocket extends Socket {
  userId?: string;
}

interface VoiceSession {
  userId: string;
  socketId: string;
  sessionId: string;
  instanceId: string;
  lang: string;
  voiceId?: string;
  model?: string;
  duplexMode: boolean;
  audioChunks: Buffer[];
  streamingSession: StreamingSTTSession | null;
  currentResponseAbort: AbortController | null;
  responseGeneration: number;
  ttsSentenceBuffer: string;
  ttsQueue: Promise<void>;
  lastFinalTranscript: string;
  lastFinalAt: number;
  createdAt: number;
  activeStreamingToken: symbol | null;
  ignoredStreamingTokens: Set<symbol>;
  pendingStreamingEnd: {
    token: symbol;
    settled: boolean;
    resolve: (receivedFinal: boolean) => void;
    timeout: NodeJS.Timeout;
  } | null;
  /** Stores the last streaming final transcript (for non-duplex race recovery) */
  streamingFinalText: string;
  streamingFinalToken: symbol | null;
  /** Gemini Live end-to-end session (when enabled) */
  geminiSession: GeminiSession | null;
  useGeminiLive: boolean;
}

const PCM_SAMPLE_RATE = 16000;
const PCM_CHANNEL_COUNT = 1;
const PCM_BITS_PER_SAMPLE = 16;
const STREAMING_FINALIZATION_TIMEOUT_MS = 2000;

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/voice',
  maxHttpBufferSize: 1e7, // 10MB for audio data
})
export class RealtimeVoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeVoiceGateway.name);
  private sessions = new Map<string, VoiceSession>();
  private readonly streamingAdapter = new DeepgramSTTAdapter();
  private readonly geminiAdapter = new GeminiLiveAdapter();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly voiceService: VoiceService,
    @Inject(forwardRef(() => OpenClawProxyService))
    private readonly openClawProxyService: OpenClawProxyService,
    @InjectRepository(UserProviderConfig)
    private readonly providerConfigRepo: Repository<UserProviderConfig>,
  ) {}

  // ── Connection Lifecycle ─────────────────────────────────

  async handleConnection(client: AuthenticatedVoiceSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token?.toString() ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Voice client ${client.id} rejected: no token`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.userId = payload.sub || payload.id;
      client.join(`user:${client.userId}`);
      this.logger.log(`Voice client connected: ${client.id} (user: ${client.userId})`);
    } catch (error) {
      this.logger.error(`Voice client ${client.id} auth failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedVoiceSocket) {
    // Clean up any sessions for this socket
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.socketId === client.id) {
        session.geminiSession?.close?.();
        session.streamingSession?.abort();
        session.currentResponseAbort?.abort();
        this.sessions.delete(sessionId);
        this.logger.debug(`Cleaned up voice session ${sessionId} on disconnect`);
      }
    }
    this.logger.log(`Voice client disconnected: ${client.id}`);
  }

  // ── Session Management ───────────────────────────────────

  @SubscribeMessage('voice:session:start')
  async handleSessionStart(
    @ConnectedSocket() client: AuthenticatedVoiceSocket,
    @MessageBody() data: { sessionId?: string; instanceId?: string; lang?: string; voiceId?: string; duplexMode?: boolean; model?: string },
  ) {
    if (!client.userId) {
      client.emit('voice:error', { error: 'Not authenticated' });
      return;
    }

    if (!data.instanceId) {
      client.emit('voice:error', { error: 'Missing instanceId' });
      return;
    }

    const sessionId = data.sessionId || `vs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const session: VoiceSession = {
      userId: client.userId,
      socketId: client.id,
      sessionId,
      instanceId: data.instanceId,
      lang: data.lang || 'en',
      voiceId: data.voiceId,
      model: data.model,
      duplexMode: data.duplexMode ?? false,
      audioChunks: [],
      streamingSession: null,
      currentResponseAbort: null,
      responseGeneration: 0,
      ttsSentenceBuffer: '',
      ttsQueue: Promise.resolve(),
      lastFinalTranscript: '',
      lastFinalAt: 0,
      createdAt: Date.now(),
      activeStreamingToken: null,
      ignoredStreamingTokens: new Set<symbol>(),
      pendingStreamingEnd: null,
      streamingFinalText: '',
      streamingFinalToken: null,
      geminiSession: null,
      useGeminiLive: false,
    };

    this.sessions.set(sessionId, session);
    client.join(`voice:${sessionId}`);

    // Try Gemini Live for end-to-end voice — only for platform users without custom API
    const hasCustomProvider = await this.providerConfigRepo.count({ where: { userId: client.userId, isActive: true } }) > 0;
    if (!hasCustomProvider && this.geminiAdapter.isAvailable && data.duplexMode !== false) {
      try {
        await this.initializeGeminiLiveSession(session, client);
      } catch (err: any) {
        this.logger.warn(`Gemini Live init failed, falling back to Deepgram+OpenClaw: ${err.message}`);
        session.useGeminiLive = false;
        session.geminiSession = null;
      }
    }

    // Fall back to traditional Deepgram STT pipeline
    if (!session.useGeminiLive) {
      await this.initializeStreamingSession(session, client);
    }

    this.logger.debug(`Voice session started: ${sessionId} (user: ${client.userId}, lang: ${session.lang}, duplex: ${session.duplexMode})`);

    client.emit('voice:session:ready', { sessionId, instanceId: session.instanceId });
  }

  @SubscribeMessage('voice:session:end')
  handleSessionEnd(
    @ConnectedSocket() client: AuthenticatedVoiceSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    const session = this.getSession(data.sessionId, client);
    if (!session) return;

    session.geminiSession?.close?.();
    session.streamingSession?.abort();
    session.currentResponseAbort?.abort();
    this.sessions.delete(data.sessionId);
    client.leave(`voice:${data.sessionId}`);
    client.emit('voice:session:ended', { sessionId: data.sessionId });
    this.logger.debug(`Voice session ended: ${data.sessionId}`);
  }

  @SubscribeMessage('voice:text')
  async handleVoiceText(
    @ConnectedSocket() client: AuthenticatedVoiceSocket,
    @MessageBody() data: { sessionId: string; text: string; model?: string },
  ) {
    const session = this.getSession(data.sessionId, client);
    if (!session) {
      return;
    }

    const text = String(data.text || '').trim();
    if (!text) {
      client.emit('voice:error', { sessionId: data.sessionId, error: 'Empty text' });
      return;
    }

    this.logger.debug(`voice:text received for session ${data.sessionId} (instance: ${session.instanceId})`);

    session.model = data.model || session.model;

    // Route text to Gemini Live when active
    if (session.useGeminiLive && session.geminiSession) {
      session.geminiSession.sendText(text);
      return;
    }

    await this.startAgentResponse(client, session, text);
  }

  @SubscribeMessage('voice:interrupt')
  handleVoiceInterrupt(
    @ConnectedSocket() client: AuthenticatedVoiceSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    const session = this.getSession(data.sessionId, client);
    if (!session) {
      return;
    }

    this.interruptSessionResponse(client, session);
  }

  // ── Audio Streaming (Client → Server) ────────────────────

  @SubscribeMessage('voice:audio:chunk')
  handleAudioChunk(
    @ConnectedSocket() client: AuthenticatedVoiceSocket,
    @MessageBody() data: { sessionId: string; audio: unknown },
  ) {
    const session = this.getSession(data.sessionId, client);
    if (!session) return;

    const chunk = this.normalizeAudioChunk(data.audio);
    if (!chunk || chunk.length === 0) {
      client.emit('voice:error', {
        sessionId: data.sessionId,
        error: 'Invalid audio payload received',
        code: 'INVALID_AUDIO_PAYLOAD',
      });
      return;
    }

    // Route to Gemini Live if active
    if (session.useGeminiLive && session.geminiSession) {
      session.geminiSession.sendAudio(chunk);
      return;
    }

    if (session.streamingSession) {
      session.streamingSession.write(chunk);
      session.audioChunks.push(chunk);
      return;
    }

    session.audioChunks.push(chunk);
  }

  @SubscribeMessage('voice:audio:end')
  async handleAudioEnd(
    @ConnectedSocket() client: AuthenticatedVoiceSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    const session = this.getSession(data.sessionId, client);
    if (!session) {
      return;
    }

    // Gemini Live manages turn detection itself — audio:end is a no-op
    if (session.useGeminiLive && session.geminiSession) {
      return;
    }

    if (session.streamingSession) {
      const endingStreamingSession = session.streamingSession;
      const endingToken = session.activeStreamingToken;

      session.streamingSession = null;
      session.activeStreamingToken = null;

      const finalReceived = endingToken
        ? await this.awaitStreamingTurnFinalization(session, endingToken, () => endingStreamingSession.end())
        : false;

      // Non-duplex: check if streaming already delivered a final (race recovery)
      const storedFinal = session.streamingFinalText;
      const storedToken = session.streamingFinalToken;
      session.streamingFinalText = '';
      session.streamingFinalToken = null;

      if (finalReceived || (storedToken === endingToken && storedFinal)) {
        // Streaming gave us a valid transcript — use it directly
        const transcript = storedFinal;
        session.audioChunks = [];
        await this.initializeStreamingSession(session, client);
        if (!session.duplexMode && transcript) {
          await this.startAgentResponse(client, session, transcript);
        }
        return;
      }

      if (session.audioChunks.length > 0) {
        this.logger.warn(
          `Streaming final transcript timed out for session ${session.sessionId}; falling back to buffered PCM transcription`,
        );
        if (endingToken) {
          session.ignoredStreamingTokens.add(endingToken);
        }
        await this.processBufferedAudioTurn(client, session, data.sessionId);
      }

      session.audioChunks = [];
      await this.initializeStreamingSession(session, client);
      return;
    }

    if (session.audioChunks.length === 0) {
      client.emit('voice:error', { sessionId: data.sessionId, error: 'No audio data received' });
      return;
    }

    await this.processBufferedAudioTurn(client, session, data.sessionId);
  }

  // ── TTS Streaming (Server → Client) ──────────────────────

  @SubscribeMessage('voice:tts:request')
  async handleTTSRequest(
    @ConnectedSocket() client: AuthenticatedVoiceSocket,
    @MessageBody() data: { sessionId: string; text: string; voice?: string; lang?: string },
  ) {
    const session = this.getSession(data.sessionId, client);
    if (!session) return;

    if (!data.text?.trim()) {
      client.emit('voice:error', { sessionId: data.sessionId, error: 'Empty text' });
      return;
    }

    const isChinese = (data.lang || session.lang) === 'zh' ||
      /[\u4e00-\u9fff]/.test(data.text);
    const voice = resolveEdgeVoice(data.voice || session.voiceId, isChinese);

    try {
      const audioBuffer = await edgeTTS(data.text, { voice });

      // Send in chunks (16KB each) for streaming playback
      const CHUNK_SIZE = 16 * 1024;
      for (let offset = 0; offset < audioBuffer.length; offset += CHUNK_SIZE) {
        const chunk = audioBuffer.subarray(offset, offset + CHUNK_SIZE);
        client.emit('voice:tts:chunk', {
          sessionId: data.sessionId,
          audio: chunk,
          offset,
          total: audioBuffer.length,
        });
      }

      client.emit('voice:tts:end', { sessionId: data.sessionId });
    } catch (error: any) {
      this.logger.error(`TTS error for session ${data.sessionId}: ${error.message}`);
      client.emit('voice:error', {
        sessionId: data.sessionId,
        error: 'TTS synthesis failed',
        code: 'TTS_ERROR',
      });
    }
  }

  // ── Helpers ──────────────────────────────────────────────

  private getSession(sessionId: string, client: AuthenticatedVoiceSocket): VoiceSession | null {
    if (!sessionId) {
      client.emit('voice:error', { error: 'Missing sessionId' });
      return null;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      client.emit('voice:error', { sessionId, error: 'Session not found' });
      return null;
    }

    if (session.userId !== client.userId) {
      client.emit('voice:error', { sessionId, error: 'Unauthorized' });
      return null;
    }

    return session;
  }

  /** Get active session count (for monitoring) */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  // ── Gemini Live End-to-End Session ────────────────────────

  private async initializeGeminiLiveSession(
    session: VoiceSession,
    client: AuthenticatedVoiceSocket,
  ): Promise<void> {
    const systemPrompt =
      `You are Agentrix, a helpful AI voice assistant. ` +
      `Respond naturally and concisely in ${session.lang === 'zh' ? 'Chinese' : 'English'}. ` +
      `For simple questions (weather, time, greetings, quick Q&A), answer directly. ` +
      `For complex tasks (coding, analysis, multi-step reasoning, planning), ` +
      `call the route_to_backend tool with the full user request.`;

    session.geminiSession = await this.geminiAdapter.createSession(
      systemPrompt,
      {
        onTranscript: (text, isFinal) => {
          if (isFinal) {
            client.emit('voice:stt:final', {
              sessionId: session.sessionId,
              transcript: text,
              lang: session.lang,
              provider: 'gemini-live',
            });
          } else {
            client.emit('voice:stt:interim', {
              sessionId: session.sessionId,
              transcript: text,
            });
          }
        },
        onAgentText: (text, isFinal) => {
          client.emit('voice:agent:text', {
            sessionId: session.sessionId,
            chunk: text,
          });
          if (isFinal) {
            client.emit('voice:agent:end', { sessionId: session.sessionId });
          }
        },
        onAgentAudio: (chunk) => {
          // Gemini returns 24kHz PCM — send to client as base64
          client.emit('voice:agent:audio', {
            sessionId: session.sessionId,
            audio: chunk.toString('base64'),
            format: 'pcm24k',
            text: '',
          });
        },
        onAgentAudioEnd: () => {
          client.emit('voice:agent:end', { sessionId: session.sessionId });
        },
        onToolCall: async (toolName, args) => {
          if (toolName === 'route_to_backend') {
            // Complexity routing: forward to Haiku/Sonnet via OpenClaw proxy
            this.logger.log(`Gemini routed complex task (${args.complexity}): "${(args.transcript || '').slice(0, 80)}"`);

            // Close Gemini audio output for this turn, use traditional TTS for the response
            session.geminiSession?.interrupt?.();

            // Route through OpenClaw proxy (user's configured model)
            await this.startAgentResponse(client, session, args.transcript || '');
          } else {
            this.logger.log(`Gemini tool call: ${toolName}(${JSON.stringify(args).slice(0, 100)})`);
          }
        },
        onError: (err) => {
          this.logger.error(`Gemini Live session error: ${err.message}`);
          // Fall back to traditional pipeline
          session.useGeminiLive = false;
          session.geminiSession = null;
          this.initializeStreamingSession(session, client).catch(() => {});
          client.emit('voice:error', {
            sessionId: session.sessionId,
            error: 'Voice session degraded to standard mode',
            code: 'GEMINI_FALLBACK',
          });
        },
        onSessionEnd: () => {
          this.logger.debug(`Gemini Live session ended for ${session.sessionId}`);
          session.geminiSession = null;
          session.useGeminiLive = false;
        },
      },
      { lang: session.lang, voice: session.voiceId },
    );

    session.useGeminiLive = true;
    this.logger.log(`Gemini Live session initialized for ${session.sessionId}`);
  }

  private async initializeStreamingSession(
    session: VoiceSession,
    client: AuthenticatedVoiceSocket,
  ): Promise<void> {
    if (!this.streamingAdapter.isAvailable) {
      this.logger.warn(
        `Streaming STT unavailable for session ${session.sessionId}; falling back to turn-based PCM transcription`,
      );
      return;
    }

    try {
      const streamingToken = Symbol(`stream-${session.sessionId}-${Date.now()}`);
      session.streamingSession?.abort();
      session.activeStreamingToken = streamingToken;
      session.streamingSession = await this.streamingAdapter.createStreamingSession(
        {
          lang: session.lang,
          encoding: 'linear16',
          sampleRate: 16000,
        },
        {
          onInterim: (transcript) => {
            client.emit('voice:stt:interim', {
              sessionId: session.sessionId,
              transcript,
              lang: session.lang,
            });
            client.emit('voice:transcript:interim', {
              sessionId: session.sessionId,
              text: transcript,
              lang: session.lang,
            });
          },
          onFinal: (result) => {
            if (session.ignoredStreamingTokens.has(streamingToken)) {
              session.ignoredStreamingTokens.delete(streamingToken);
              this.resolvePendingStreamingTurn(session, streamingToken, false);
              return;
            }

            const normalizedTranscript = (result.text || '').trim();
            client.emit('voice:stt:final', {
              sessionId: session.sessionId,
              transcript: normalizedTranscript,
              lang: result.lang || session.lang,
              provider: result.provider,
            });
            client.emit('voice:transcript:final', {
              sessionId: session.sessionId,
              text: normalizedTranscript,
              lang: result.lang || session.lang,
              provider: result.provider,
            });

            this.resolvePendingStreamingTurn(session, streamingToken, Boolean(normalizedTranscript));
            session.audioChunks = [];

            // Store streaming final for non-duplex handleAudioEnd recovery
            if (normalizedTranscript) {
              session.streamingFinalText = normalizedTranscript;
              session.streamingFinalToken = streamingToken;
            }

            if (!session.duplexMode || !normalizedTranscript) {
              return;
            }

            const now = Date.now();
            if (
              normalizedTranscript === session.lastFinalTranscript
              && now - session.lastFinalAt < 2000
            ) {
              this.logger.debug(`Skipping duplicate duplex final transcript for session ${session.sessionId}`);
              return;
            }

            session.lastFinalTranscript = normalizedTranscript;
            session.lastFinalAt = now;
            void this.startAgentResponse(client, session, normalizedTranscript);
          },
          onError: (error) => {
            this.logger.warn(`Streaming STT error for session ${session.sessionId}: ${error.message}`);
            session.streamingSession = null;
            this.resolvePendingStreamingTurn(session, streamingToken, false);
            client.emit('voice:error', {
              sessionId: session.sessionId,
              error: 'Streaming transcription failed',
              code: 'STREAMING_STT_ERROR',
            });
          },
        },
      );
    } catch (error: any) {
      session.streamingSession = null;
      session.activeStreamingToken = null;
      this.logger.warn(`Failed to initialize streaming STT for session ${session.sessionId}: ${error.message}`);
    }
  }

  private async awaitStreamingTurnFinalization(
    session: VoiceSession,
    token: symbol,
    closeStream: () => void,
  ): Promise<boolean> {
    if (session.pendingStreamingEnd?.token === token && !session.pendingStreamingEnd.settled) {
      return new Promise<boolean>((resolve) => resolve(false));
    }

    return await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        this.resolvePendingStreamingTurn(session, token, false);
      }, STREAMING_FINALIZATION_TIMEOUT_MS);

      session.pendingStreamingEnd = {
        token,
        settled: false,
        resolve,
        timeout,
      };

      closeStream();
    });
  }

  private resolvePendingStreamingTurn(
    session: VoiceSession,
    token: symbol,
    receivedFinal: boolean,
  ) {
    const pending = session.pendingStreamingEnd;
    if (!pending || pending.token !== token || pending.settled) {
      return;
    }

    pending.settled = true;
    clearTimeout(pending.timeout);
    session.pendingStreamingEnd = null;
    pending.resolve(receivedFinal);
  }

  private async processBufferedAudioTurn(
    client: AuthenticatedVoiceSocket,
    session: VoiceSession,
    sessionId: string,
  ): Promise<void> {
    const audioBuffer = Buffer.concat(session.audioChunks);
    session.audioChunks = [];

    try {
      const wavBuffer = this.wrapPcm16AsWav(audioBuffer);
      const result = await this.voiceService.transcribe(
        wavBuffer,
        'audio/wav',
        'voice.wav',
        session.lang,
      );

      const transcript = result?.transcript || '';

      if (transcript) {
        client.emit('voice:stt:final', {
          sessionId,
          transcript,
          lang: session.lang,
        });
        client.emit('voice:transcript:final', {
          sessionId,
          text: transcript,
          lang: session.lang,
        });

        await this.startAgentResponse(client, session, transcript);
      } else {
        client.emit('voice:stt:final', {
          sessionId,
          transcript: '',
          lang: session.lang,
        });
      }
    } catch (error: any) {
      this.logger.error(`STT error for session ${sessionId}: ${error.message}`);
      // Emit a non-fatal error so the client stays connected and can retry
      client.emit('voice:stt:final', {
        sessionId,
        transcript: '',
        lang: session.lang,
        error: 'transcription_failed',
      });
    }
  }

  private normalizeAudioChunk(audio: unknown): Buffer | null {
    if (!audio) {
      return null;
    }

    if (Buffer.isBuffer(audio)) {
      return audio;
    }

    if (audio instanceof Uint8Array) {
      return Buffer.from(audio);
    }

    if (audio instanceof ArrayBuffer) {
      return Buffer.from(audio);
    }

    if (ArrayBuffer.isView(audio)) {
      return Buffer.from(audio.buffer, audio.byteOffset, audio.byteLength);
    }

    if (Array.isArray(audio)) {
      return Buffer.from(audio);
    }

    if (
      typeof audio === 'object'
      && audio !== null
      && (audio as { type?: string }).type === 'Buffer'
      && Array.isArray((audio as { data?: unknown }).data)
    ) {
      return Buffer.from((audio as { data: number[] }).data);
    }

    return null;
  }

  private wrapPcm16AsWav(pcmBuffer: Buffer): Buffer {
    const header = Buffer.alloc(44);
    const byteRate = PCM_SAMPLE_RATE * PCM_CHANNEL_COUNT * (PCM_BITS_PER_SAMPLE / 8);
    const blockAlign = PCM_CHANNEL_COUNT * (PCM_BITS_PER_SAMPLE / 8);

    header.write('RIFF', 0, 'ascii');
    header.writeUInt32LE(36 + pcmBuffer.length, 4);
    header.write('WAVE', 8, 'ascii');
    header.write('fmt ', 12, 'ascii');
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(PCM_CHANNEL_COUNT, 22);
    header.writeUInt32LE(PCM_SAMPLE_RATE, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(PCM_BITS_PER_SAMPLE, 34);
    header.write('data', 36, 'ascii');
    header.writeUInt32LE(pcmBuffer.length, 40);

    return Buffer.concat([header, pcmBuffer]);
  }

  private interruptSessionResponse(client: AuthenticatedVoiceSocket, session: VoiceSession) {
    // Interrupt Gemini Live audio output if active
    session.geminiSession?.interrupt?.();

    const hadActiveResponse = !!session.currentResponseAbort;
    session.currentResponseAbort?.abort();
    session.currentResponseAbort = null;
    session.responseGeneration += 1;
    session.ttsSentenceBuffer = '';
    if (hadActiveResponse) {
      client.emit('voice:agent:end', {
        sessionId: session.sessionId,
        interrupted: true,
      });
    }
  }

  private async startAgentResponse(
    client: AuthenticatedVoiceSocket,
    session: VoiceSession,
    text: string,
  ): Promise<void> {
    this.interruptSessionResponse(client, session);

    const generation = session.responseGeneration;
    const abortController = new AbortController();
    session.currentResponseAbort = abortController;
    session.ttsSentenceBuffer = '';

    this.logger.debug(`Starting realtime agent response for session ${session.sessionId} (instance: ${session.instanceId})`);

    try {
      await this.openClawProxyService.streamChatToCallbacks(
        session.userId,
        session.instanceId,
        {
          message: text,
          sessionId: session.sessionId,
          model: session.model,
          voiceId: session.voiceId,
        },
        {
          signal: abortController.signal,
          onMeta: async (meta) => {
            this.logger.debug(`voice:meta for session ${session.sessionId}: ${JSON.stringify(meta)}`);
            client.emit('voice:meta', {
              sessionId: session.sessionId,
              ...meta,
            });
          },
          onChunk: async (chunk) => {
            if (abortController.signal.aborted || generation !== session.responseGeneration) {
              return;
            }
            this.logger.debug(`voice:agent:text chunk for session ${session.sessionId}: ${chunk.slice(0, 80)}`);
            client.emit('voice:agent:text', {
              sessionId: session.sessionId,
              chunk,
            });
            this.queueSentenceTts(client, session, chunk, false, generation);
          },
          onDone: async () => {
            if (abortController.signal.aborted || generation !== session.responseGeneration) {
              return;
            }
            this.logger.debug(`voice:agent:end for session ${session.sessionId}`);
            this.queueSentenceTts(client, session, '', true, generation);
            await session.ttsQueue.catch(() => undefined);
            if (generation === session.responseGeneration) {
              client.emit('voice:agent:end', { sessionId: session.sessionId });
            }
          },
        },
      );
    } catch (error: any) {
      if (abortController.signal.aborted) {
        return;
      }
      this.logger.error(`Realtime agent response failed for session ${session.sessionId}: ${error.message}`);
      client.emit('voice:error', {
        sessionId: session.sessionId,
        error: error.message || 'Realtime agent response failed',
        code: 'VOICE_AGENT_RESPONSE_ERROR',
      });
    } finally {
      if (session.currentResponseAbort === abortController) {
        session.currentResponseAbort = null;
      }
    }
  }

  private queueSentenceTts(
    client: AuthenticatedVoiceSocket,
    session: VoiceSession,
    incomingText: string,
    flush: boolean,
    generation: number,
  ) {
    if (generation !== session.responseGeneration) {
      return;
    }

    if (incomingText) {
      session.ttsSentenceBuffer += incomingText;
    }

    const sentenceRegex = /[^。！？.!?\n]+[。！？.!?\n]+/g;
    const segments = (session.ttsSentenceBuffer.match(sentenceRegex) || [])
      .map((item) => item.trim())
      .filter(Boolean);

    if (segments.length > 0) {
      session.ttsSentenceBuffer = session.ttsSentenceBuffer.slice((session.ttsSentenceBuffer.match(sentenceRegex) || []).join('').length);
    }

    if (flush) {
      const remainder = session.ttsSentenceBuffer.trim();
      if (remainder) {
        segments.push(remainder);
      }
      session.ttsSentenceBuffer = '';
    }

    for (const sentence of segments) {
      session.ttsQueue = session.ttsQueue
        .then(() => this.emitSentenceAudio(client, session, sentence, generation))
        .catch((error) => {
          this.logger.warn(`Realtime TTS queue error for session ${session.sessionId}: ${error.message}`);
        });
    }
  }

  private async emitSentenceAudio(
    client: AuthenticatedVoiceSocket,
    session: VoiceSession,
    sentence: string,
    generation: number,
  ): Promise<void> {
    if (!sentence || generation !== session.responseGeneration) {
      return;
    }

    // Strip markdown formatting before TTS — **bold**, *italic*, `code`, #headers, []() links
    const cleanSentence = sentence
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_~`#>|]/g, '')
      .trim();

    if (!cleanSentence) {
      return;
    }

    const isChinese = session.lang === 'zh' || /[\u4e00-\u9fff]/.test(cleanSentence);
    const voice = resolveEdgeVoice(session.voiceId, isChinese);
    const audioBuffer = await edgeTTS(cleanSentence, { voice });

    if (generation !== session.responseGeneration) {
      return;
    }

    client.emit('voice:agent:speech:start', {
      sessionId: session.sessionId,
      text: sentence,
    });
    client.emit('voice:agent:audio', {
      sessionId: session.sessionId,
      audio: audioBuffer.toString('base64'),
      format: 'mp3',
      text: sentence,
    });
  }
}
