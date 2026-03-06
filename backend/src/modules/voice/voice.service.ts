import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  private transcribeClient: TranscribeClient;
  private s3Client: S3Client;
  private readonly REGION = process.env.AWS_REGION || 'us-east-1';
  private readonly BUCKET = process.env.AWS_TRANSCRIBE_BUCKET || 'agentrix-voice-transcribe';

  constructor() {
    this.transcribeClient = new TranscribeClient({ region: this.REGION });
    this.s3Client = new S3Client({ region: this.REGION });
  }

  /**
   * Transcribe audio buffer using AWS Transcribe.
   * Falls back to OpenAI Whisper if AWS fails.
   */
  async transcribe(
    buffer: Buffer,
    mimetype: string,
    originalName: string,
  ): Promise<{ transcript: string }> {
    const ext = originalName?.split('.').pop() || 'm4a';
    const jobName = `transcribe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const s3Key = `voice-input/${jobName}.${ext}`;

    // Map MIME types to AWS Transcribe media formats
    const mediaFormatMap: Record<string, string> = {
      'audio/m4a': 'mp4', 'audio/mp4': 'mp4', 'audio/x-m4a': 'mp4',
      'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
      'audio/wav': 'wav', 'audio/x-wav': 'wav',
      'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/flac': 'flac',
    };
    const mediaFormat = mediaFormatMap[mimetype] || 'mp4';

    try {
      // 1. Upload audio to S3
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: mimetype || 'audio/mp4',
      }));

      // 2. Start transcription job (auto-detect language)
      await this.transcribeClient.send(new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        LanguageCode: 'en-US',
        IdentifyMultipleLanguages: true,
        LanguageOptions: ['en-US', 'zh-CN', 'ja-JP', 'ko-KR', 'es-US'],
        Media: { MediaFileUri: `s3://${this.BUCKET}/${s3Key}` },
        MediaFormat: mediaFormat as any,
        OutputBucketName: this.BUCKET,
        OutputKey: `voice-output/${jobName}.json`,
      }));

      // 3. Poll for completion (max ~30s)
      let transcript = '';
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const jobResult = await this.transcribeClient.send(
          new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }),
        );
        const status = jobResult.TranscriptionJob?.TranscriptionJobStatus;
        if (status === 'COMPLETED') {
          try {
            const outputObj = await this.s3Client.send(new GetObjectCommand({
              Bucket: this.BUCKET, Key: `voice-output/${jobName}.json`,
            }));
            const body = await outputObj.Body?.transformToString();
            if (body) {
              const parsed = JSON.parse(body);
              transcript = parsed?.results?.transcripts?.[0]?.transcript || '';
            }
          } catch (fetchErr: any) {
            this.logger.warn(`Failed to fetch transcript: ${fetchErr.message}`);
          }
          break;
        }
        if (status === 'FAILED') {
          throw new Error(jobResult.TranscriptionJob?.FailureReason || 'Transcription failed');
        }
      }

      // 4. Cleanup S3 (best-effort)
      this.cleanupS3(s3Key, `voice-output/${jobName}.json`).catch(() => {});

      return { transcript: transcript || '' };
    } catch (err: any) {
      this.logger.error('AWS Transcribe failed', err?.message);
      // Fallback to OpenAI Whisper
      if (process.env.OPENAI_API_KEY) {
        try {
          return await this.whisperFallback(buffer, originalName);
        } catch (whisperErr: any) {
          this.logger.error('Whisper fallback also failed', whisperErr?.message);
        }
      }
      throw new BadRequestException(`Transcription failed: ${err?.message}`);
    }
  }

  private async whisperFallback(buffer: Buffer, originalName: string): Promise<{ transcript: string }> {
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
        file: fileStream as any, model: 'whisper-1', response_format: 'text',
      });
      return { transcript: typeof response === 'string' ? response : (response as any).text || '' };
    } finally {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
    }
  }

  private async cleanupS3(...keys: string[]) {
    for (const key of keys) {
      try { await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.BUCKET, Key: key })); } catch (_) {}
    }
  }
}
