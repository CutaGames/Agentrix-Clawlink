import { Controller, Post, Get, Query, Res, UseInterceptors, UploadedFile, UseGuards, BadRequestException, Logger } from '@nestjs/common';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VoiceService } from './voice.service';
import { edgeTTSStream, resolveEdgeVoice } from './adapters/edge-tts.adapter';

@ApiTags('Voice')
@Controller('voice')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);

  constructor(private readonly voiceService: VoiceService) {}

  /**
   * TTS provider order: VOICE_TTS_PROVIDER env (default: "edge,polly")
   * - edge: Microsoft Edge TTS (free, 400+ voices, high quality)
   * - polly: AWS Polly Neural (paid, stable fallback)
   */
  private getTTSProviderOrder(): Array<'edge' | 'polly'> {
    const configured = (process.env.VOICE_TTS_PROVIDER || 'edge,polly')
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter((v): v is 'edge' | 'polly' => v === 'edge' || v === 'polly');
    return configured.length > 0 ? configured : ['edge', 'polly'];
  }

  @Get('tts')
  @ApiOperation({ summary: 'Text-to-speech synthesis (Edge TTS default, Polly fallback)' })
  async synthesizeTTS(
    @Query('text') text: string,
    @Query('lang') lang: string,
    @Query('voice') requestedVoice: string,
    @Query('rate') rateParam: string,
    @Res() res: Response,
  ) {
    if (!text) throw new BadRequestException('Text is required');

    // Truncate to prevent abuse
    const truncated = text.slice(0, 2000);
    const isChinese = lang === 'zh' || (!lang && /[\u4e00-\u9fff]/.test(truncated));

    // Convert numeric rate (e.g. "1.2") to Edge TTS percentage format ("+20%")
    let edgeRate: string | undefined;
    if (rateParam) {
      const numeric = parseFloat(rateParam);
      if (!isNaN(numeric) && numeric >= 0.5 && numeric <= 2.0) {
        const pct = Math.round((numeric - 1.0) * 100);
        edgeRate = pct >= 0 ? `+${pct}%` : `${pct}%`;
      }
    }

    for (const provider of this.getTTSProviderOrder()) {
      try {
        if (provider === 'edge') {
          await this.synthesizeWithEdge(truncated, isChinese, requestedVoice, res, edgeRate);
          return;
        }
        if (provider === 'polly' && process.env.AWS_ACCESS_KEY_ID) {
          await this.synthesizeWithPolly(truncated, isChinese, requestedVoice, res);
          return;
        }
      } catch (err: any) {
        this.logger.warn(`TTS provider ${provider} failed: ${err.message}`);
      }
    }

    res.status(500).json({ message: 'All TTS providers failed' });
  }

  /** Edge TTS — free, streaming, high quality */
  private synthesizeWithEdge(
    text: string,
    isChinese: boolean,
    requestedVoice: string | undefined,
    res: Response,
    rate?: string,
  ): Promise<void> {
    const voice = resolveEdgeVoice(requestedVoice, isChinese);
    this.logger.debug(`Edge TTS: voice=${voice}, len=${text.length}, rate=${rate || '+0%'}`);

    return new Promise((resolve, reject) => {
      let headersSent = false;

      edgeTTSStream(
        text,
        { voice, ...(rate ? { rate } : {}) },
        (chunk) => {
          if (!headersSent) {
            res.set({ 'Content-Type': 'audio/mpeg', 'Transfer-Encoding': 'chunked' });
            headersSent = true;
          }
          res.write(chunk);
        },
        () => {
          if (!headersSent) {
            // Edge returned no audio — let fallback handle it
            reject(new Error('Edge TTS returned no audio'));
            return;
          }
          res.end();
          resolve();
        },
        (err) => {
          if (headersSent) {
            // Already streaming — just end
            res.end();
            resolve();
          } else {
            reject(err);
          }
        },
      );
    });
  }

  /** AWS Polly — paid fallback */
  private async synthesizeWithPolly(
    text: string,
    isChinese: boolean,
    requestedVoice: string | undefined,
    res: Response,
  ): Promise<void> {
    const polly = new PollyClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    let voiceId = isChinese ? 'Zhiyu' : 'Matthew';
    if (requestedVoice) {
      const voiceMap: Record<string, Record<string, string>> = {
        alloy:   { en: 'Matthew', zh: 'Zhiyu' },
        echo:    { en: 'Stephen', zh: 'Zhiqiang' },
        fable:   { en: 'Kendra', zh: 'Zhiyu' },
        onyx:    { en: 'Kevin',   zh: 'Zhiqiang' },
        nova:    { en: 'Ruth',    zh: 'Zhiyu' },
        shimmer: { en: 'Salli',   zh: 'Zhiyu' },
      };
      const mapping = voiceMap[requestedVoice.toLowerCase()];
      if (mapping) {
        voiceId = isChinese ? mapping.zh : mapping.en;
      } else {
        voiceId = requestedVoice;
      }
    }

    const languageCode = isChinese ? 'cmn-CN' : 'en-US';

    try {
      const command = new SynthesizeSpeechCommand({
        Engine: 'neural',
        VoiceId: voiceId as any,
        LanguageCode: languageCode,
        OutputFormat: 'mp3',
        Text: text,
      });
      const response = await polly.send(command);
      if (response.AudioStream) {
        res.set({ 'Content-Type': 'audio/mpeg', 'Transfer-Encoding': 'chunked' });
        (response.AudioStream as any).pipe(res);
      } else {
        throw new Error('Polly returned no audio stream');
      }
    } catch (err: any) {
      if (err.name === 'ValidationException') {
        const fallbackCmd = new SynthesizeSpeechCommand({
          Engine: 'standard',
          VoiceId: voiceId as any,
          LanguageCode: languageCode,
          OutputFormat: 'mp3',
          Text: text,
        });
        const response = await polly.send(fallbackCmd);
        if (response.AudioStream) {
          res.set({ 'Content-Type': 'audio/mpeg', 'Transfer-Encoding': 'chunked' });
          (response.AudioStream as any).pipe(res);
        } else {
          throw new Error('Polly standard fallback returned no audio');
        }
      } else {
        throw err;
      }
    }
  }


  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  @ApiOperation({ summary: 'Transcribe audio to text (Chinese + English auto-detect)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        audio: { type: 'string', format: 'binary' },
        lang: { type: 'string', description: 'Language hint: "zh" or "en". Omit for auto-detect.' },
      },
    },
  })
  async transcribe(
    @UploadedFile() file: Express.Multer.File,
    @Query('lang') lang?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No audio file provided. Use field name "audio".');
    }
    return this.voiceService.transcribe(file.buffer, file.mimetype, file.originalname, lang);
  }
}
