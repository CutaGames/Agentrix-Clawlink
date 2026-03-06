import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  AudioStream,
  MediaEncoding,
  LanguageCode,
} from '@aws-sdk/client-transcribe-streaming';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly REGION = process.env.AWS_REGION || 'us-east-1';

  /**
   * Transcribe audio buffer.
   * Strategy: convert to PCM WAV → AWS Transcribe Streaming (no S3 needed)
   * Fallback: OpenAI Whisper if configured.
   */
  async transcribe(
    buffer: Buffer,
    mimetype: string,
    originalName: string,
  ): Promise<{ transcript: string }> {
    // Try AWS Transcribe Streaming (needs only transcribe:StartStreamTranscription)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        const result = await this.transcribeStreaming(buffer, mimetype, originalName);
        if (result.transcript) return result;
      } catch (err: any) {
        this.logger.error(`AWS Transcribe Streaming failed: ${err.message}`);
      }
    }

    // Fallback: OpenAI Whisper
    if (process.env.OPENAI_API_KEY) {
      try {
        return await this.whisperFallback(buffer, originalName);
      } catch (err: any) {
        this.logger.error(`Whisper fallback failed: ${err.message}`);
      }
    }

    this.logger.warn('No transcription service available');
    throw new BadRequestException(
      'Voice transcription is not configured. Set AWS credentials or OPENAI_API_KEY.',
    );
  }

  /**
   * AWS Transcribe Streaming — sends audio directly over HTTP/2, no S3 needed.
   * Requires audio in PCM 16-bit LE format at 16000 Hz sample rate.
   */
  private async transcribeStreaming(
    buffer: Buffer,
    mimetype: string,
    originalName: string,
  ): Promise<{ transcript: string }> {
    // Convert input audio to 16kHz 16-bit PCM WAV using ffmpeg
    const pcmBuffer = await this.convertToPcm(buffer, mimetype, originalName);

    const client = new TranscribeStreamingClient({
      region: this.REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Create audio stream generator — send chunks of ~8KB
    const CHUNK_SIZE = 8192;
    async function* audioStream(): AsyncGenerator<AudioStream> {
      for (let offset = 0; offset < pcmBuffer.length; offset += CHUNK_SIZE) {
        yield {
          AudioEvent: {
            AudioChunk: pcmBuffer.subarray(offset, offset + CHUNK_SIZE),
          },
        };
      }
    }

    // Detect likely language from app context (default: multi-language)
    const command = new StartStreamTranscriptionCommand({
      LanguageCode: LanguageCode.EN_US,
      MediaEncoding: MediaEncoding.PCM,
      MediaSampleRateHertz: 16000,
      AudioStream: audioStream(),
    });

    const response = await client.send(command);

    // Collect transcript from streaming results
    let transcript = '';
    if (response.TranscriptResultStream) {
      for await (const event of response.TranscriptResultStream) {
        if (event.TranscriptEvent?.Transcript?.Results) {
          for (const result of event.TranscriptEvent.Transcript.Results) {
            if (!result.IsPartial && result.Alternatives?.[0]?.Transcript) {
              transcript += result.Alternatives[0].Transcript + ' ';
            }
          }
        }
      }
    }

    return { transcript: transcript.trim() };
  }

  /**
   * Convert audio buffer to 16kHz 16-bit LE PCM using ffmpeg.
   * If ffmpeg is not available, try to pass raw buffer (works for WAV).
   */
  private async convertToPcm(
    buffer: Buffer,
    mimetype: string,
    originalName: string,
  ): Promise<Buffer> {
    const ext = originalName?.split('.').pop() || 'm4a';
    const tmpInput = path.join(os.tmpdir(), `voice_in_${Date.now()}.${ext}`);
    const tmpOutput = path.join(os.tmpdir(), `voice_out_${Date.now()}.pcm`);

    try {
      fs.writeFileSync(tmpInput, buffer);
      execSync(
        `ffmpeg -y -i "${tmpInput}" -ar 16000 -ac 1 -f s16le "${tmpOutput}" 2>/dev/null`,
        { timeout: 15000 },
      );
      const pcm = fs.readFileSync(tmpOutput);
      return pcm;
    } catch (err: any) {
      this.logger.warn(`ffmpeg conversion failed: ${err.message}, using raw buffer`);
      // If input is already WAV, strip the 44-byte header to get raw PCM
      if (mimetype?.includes('wav') || ext === 'wav') {
        return buffer.subarray(44);
      }
      // Otherwise return raw and let Transcribe try to handle it
      return buffer;
    } finally {
      try { fs.unlinkSync(tmpInput); } catch (_) {}
      try { fs.unlinkSync(tmpOutput); } catch (_) {}
    }
  }

  /**
   * Fallback: OpenAI Whisper API
   */
  private async whisperFallback(
    buffer: Buffer,
    originalName: string,
  ): Promise<{ transcript: string }> {
    const OpenAI = require('openai').default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
    const ext = originalName?.split('.').pop() || 'm4a';
    const tmpPath = path.join(os.tmpdir(), `voice_${Date.now()}.${ext}`);
    try {
      fs.writeFileSync(tmpPath, buffer);
      const fileStream = fs.createReadStream(tmpPath);
      const response = await openai.audio.transcriptions.create({
        file: fileStream as any,
        model: 'whisper-1',
        response_format: 'text',
      });
      return {
        transcript:
          typeof response === 'string'
            ? response
            : (response as any).text || '',
      };
    } finally {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
    }
  }
}
