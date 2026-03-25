import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RealtimeVoiceGateway } from './realtime-voice.gateway';

describe('RealtimeVoiceGateway', () => {
  function createGateway() {
    const voiceService = {
      transcribe: jest.fn().mockResolvedValue({ transcript: 'test transcript' }),
    };

    const gateway = new RealtimeVoiceGateway(
      {} as JwtService,
      {} as ConfigService,
      voiceService as any,
      {} as any,
    );

    (gateway as any).streamingAdapter = { isAvailable: false };

    return { gateway, voiceService };
  }

  function createSession(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      userId: 'user-1',
      socketId: 'socket-1',
      sessionId: 'session-1',
      instanceId: 'instance-1',
      lang: 'en',
      voiceId: undefined,
      model: undefined,
      duplexMode: false,
      audioChunks: [],
      streamingSession: null,
      currentResponseAbort: null,
      responseGeneration: 0,
      ttsSentenceBuffer: '',
      ttsQueue: Promise.resolve(),
      lastFinalTranscript: '',
      lastFinalAt: 0,
      createdAt: Date.now(),
      ...overrides,
    };
  }

  it('wraps fallback PCM audio as WAV before transcribing', async () => {
    const { gateway, voiceService } = createGateway();
    const client = { userId: 'user-1', emit: jest.fn() } as any;
    const startAgentResponseSpy = jest.spyOn(gateway as any, 'startAgentResponse').mockResolvedValue(undefined);

    (gateway as any).sessions.set('session-1', createSession());

    gateway.handleAudioChunk(client, {
      sessionId: 'session-1',
      audio: Uint8Array.from([0, 1, 2, 3]),
    });

    await gateway.handleAudioEnd(client, { sessionId: 'session-1' });

    expect(voiceService.transcribe).toHaveBeenCalledWith(
      expect.any(Buffer),
      'audio/wav',
      'voice.wav',
      'en',
    );

    const wavBuffer = voiceService.transcribe.mock.calls[0][0] as Buffer;
    expect(wavBuffer.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wavBuffer.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wavBuffer.toString('ascii', 36, 40)).toBe('data');
    expect(wavBuffer.readUInt32LE(40)).toBe(4);
    expect(startAgentResponseSpy).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ sessionId: 'session-1' }),
      'test transcript',
    );
  });

  it('accepts React Native buffer-like audio payloads', () => {
    const { gateway } = createGateway();
    const client = { userId: 'user-1', emit: jest.fn() } as any;

    (gateway as any).sessions.set('session-1', createSession());

    gateway.handleAudioChunk(client, {
      sessionId: 'session-1',
      audio: { type: 'Buffer', data: [1, 2, 3, 4] },
    });

    const session = (gateway as any).sessions.get('session-1');
    expect(session.audioChunks).toHaveLength(1);
    expect(Buffer.isBuffer(session.audioChunks[0])).toBe(true);
    expect(Array.from(session.audioChunks[0].values())).toEqual([1, 2, 3, 4]);
  });
});