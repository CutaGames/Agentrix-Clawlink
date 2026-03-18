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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { VoiceService } from './voice.service';
import { edgeTTS, resolveEdgeVoice } from './adapters/edge-tts.adapter';
import { DeepgramSTTAdapter } from './adapters/deepgram-stt.adapter';
import type { StreamingSTTSession } from './adapters/voice-provider.interface';

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
  lang: string;
  voiceId?: string;
  duplexMode: boolean;
  audioChunks: Buffer[];
  streamingSession: StreamingSTTSession | null;
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
    @MessageBody() data: { sessionId: string; lang?: string; voiceId?: string; duplexMode?: boolean },
  ) {
    if (!client.userId) {
      client.emit('voice:error', { error: 'Not authenticated' });
      return;
    }

    const sessionId = data.sessionId || `vs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const session: VoiceSession = {
      userId: client.userId,
      socketId: client.id,
      sessionId,
      lang: data.lang || 'en',
      voiceId: data.voiceId,
      duplexMode: data.duplexMode ?? false,
      audioChunks: [],
      streamingSession: null,
      createdAt: Date.now(),
    };

    this.sessions.set(sessionId, session);
    client.join(`voice:${sessionId}`);

    await this.initializeStreamingSession(session, client);

    this.logger.debug(`Voice session started: ${sessionId} (user: ${client.userId}, lang: ${session.lang}, duplex: ${session.duplexMode})`);

    client.emit('voice:session:ready', { sessionId });
  }

  @SubscribeMessage('voice:session:end')
  handleSessionEnd(
    @ConnectedSocket() client: AuthenticatedVoiceSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    const session = this.getSession(data.sessionId, client);
    if (!session) return;

    session.streamingSession?.abort();
    this.sessions.delete(data.sessionId);
    client.leave(`voice:${data.sessionId}`);
    client.emit('voice:session:ended', { sessionId: data.sessionId });
    this.logger.debug(`Voice session ended: ${data.sessionId}`);
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
        { lang: session.lang },
        {
          onInterim: (transcript) => {
            client.emit('voice:stt:interim', {
              sessionId: session.sessionId,
              transcript,
              lang: session.lang,
            });
          },
          onFinal: (result) => {
            client.emit('voice:stt:final', {
              sessionId: session.sessionId,
              transcript: result.text,
              lang: result.lang || session.lang,
              provider: result.provider,
            });
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
}
