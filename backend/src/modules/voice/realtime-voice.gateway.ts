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
import { VoiceService } from './voice.service';
import { edgeTTS, resolveEdgeVoice } from './adapters/edge-tts.adapter';
import { DeepgramSTTAdapter } from './adapters/deepgram-stt.adapter';
import type { StreamingSTTSession } from './adapters/voice-provider.interface';
import { OpenClawProxyService } from '../openclaw-proxy/openclaw-proxy.service';

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
}

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

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly voiceService: VoiceService,
    @Inject(forwardRef(() => OpenClawProxyService))
    private readonly openClawProxyService: OpenClawProxyService,
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
    };

    this.sessions.set(sessionId, session);
    client.join(`voice:${sessionId}`);

    await this.initializeStreamingSession(session, client);

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
    @MessageBody() data: { sessionId: string; audio: Buffer | ArrayBuffer },
  ) {
    const session = this.getSession(data.sessionId, client);
    if (!session) return;

    const chunk = Buffer.isBuffer(data.audio)
      ? data.audio
      : Buffer.from(data.audio);

    if (session.streamingSession) {
      session.streamingSession.write(chunk);
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

    if (session.streamingSession) {
      session.streamingSession.end();
      session.streamingSession = null;
      session.audioChunks = [];
      await this.initializeStreamingSession(session, client);
      return;
    }

    if (session.audioChunks.length === 0) {
      client.emit('voice:error', { sessionId: data.sessionId, error: 'No audio data received' });
      return;
    }

    const audioBuffer = Buffer.concat(session.audioChunks);
    session.audioChunks = []; // Clear for next turn

    try {
      // Transcribe using the voice service (respects STT provider order)
      const result = await this.voiceService.transcribe(
        audioBuffer,
        'audio/webm',
        'voice.webm',
        session.lang,
      );

      const transcript = result?.transcript || '';

      if (transcript) {
        client.emit('voice:stt:final', {
          sessionId: data.sessionId,
          transcript,
          lang: session.lang,
        });
        client.emit('voice:transcript:final', {
          sessionId: data.sessionId,
          text: transcript,
          lang: session.lang,
        });
      } else {
        client.emit('voice:stt:final', {
          sessionId: data.sessionId,
          transcript: '',
          lang: session.lang,
        });
      }
    } catch (error: any) {
      this.logger.error(`STT error for session ${data.sessionId}: ${error.message}`);
      client.emit('voice:error', {
        sessionId: data.sessionId,
        error: 'Transcription failed',
        code: 'STT_ERROR',
      });
    }
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

  private async initializeStreamingSession(
    session: VoiceSession,
    client: AuthenticatedVoiceSocket,
  ): Promise<void> {
    if (!this.streamingAdapter.isAvailable) {
      return;
    }

    try {
      session.streamingSession?.abort();
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
      this.logger.warn(`Failed to initialize streaming STT for session ${session.sessionId}: ${error.message}`);
    }
  }

  private interruptSessionResponse(client: AuthenticatedVoiceSocket, session: VoiceSession) {
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

    const isChinese = session.lang === 'zh' || /[\u4e00-\u9fff]/.test(sentence);
    const voice = resolveEdgeVoice(session.voiceId, isChinese);
    const audioBuffer = await edgeTTS(sentence, { voice });

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
