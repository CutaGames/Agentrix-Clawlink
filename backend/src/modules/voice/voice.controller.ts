import { Controller, Post, Get, Query, Res, UseInterceptors, UploadedFile, UseGuards, BadRequestException } from '@nestjs/common';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VoiceService } from './voice.service';

@ApiTags('Voice')
@Controller('voice')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Get('tts')
  async synthesizeTTS(
    @Query('text') text: string,
    @Query('lang') lang: string,
    @Query('voice') requestedVoice: string,
    @Res() res: Response,
  ) {
    if (!text) throw new BadRequestException('Text is required');
    try {
      const polly = new PollyClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: process.env.AWS_ACCESS_KEY_ID ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        } : undefined,
      });

      // Auto-detect language from text content if not specified
      const isChinese = lang === 'zh' || (!lang && /[\u4e00-\u9fff]/.test(text));
      let voiceId = isChinese ? 'Zhiyu' : 'Matthew';
      
      // If a specific voice is requested, map it logically for Polly
      if (requestedVoice) {
        // We'll treat our "alloy, echo..." as conceptual mappings to Polly, or allow direct Polly IDs.
        const voiceMap: Record<string, any> = {
          alloy: { en: 'Matthew', zh: 'Zhiyu' },     // fallback mapped to default
          echo: { en: 'Stephen', zh: 'Zhiqiang' },   // male alternative
          fable: { en: 'Kendra', zh: 'Zhiyu' },      // female alt
          onyx: { en: 'Kevin', zh: 'Zhiqiang' },     // male deep
          nova: { en: 'Ruth', zh: 'Zhiyu' },         // female warm
          shimmer: { en: 'Salli', zh: 'Zhiyu' }      // female bright
        };
        const mapping = voiceMap[requestedVoice.toLowerCase()];
        if (mapping) {
          voiceId = isChinese ? mapping.zh : mapping.en;
        } else {
          // If they pass an exact Polly voice ID like "Joanna", respect it
          voiceId = requestedVoice;
        }
      }

      const languageCode = isChinese ? 'cmn-CN' : 'en-US';

      try {
        const command = new SynthesizeSpeechCommand({
          Engine: 'neural',
          VoiceId: voiceId,
          LanguageCode: languageCode,
          OutputFormat: 'mp3',
          Text: text,
        });
        const response = await polly.send(command);
        if (response.AudioStream) {
           res.set({
            'Content-Type': 'audio/mpeg',
            'Transfer-Encoding': 'chunked'
          });
          (response.AudioStream as any).pipe(res);
        } else {
          throw new Error('No audio stream returned');
        }
      } catch (err: any) {
        if (err.name === 'ValidationException') {
          const fallbackCommand = new SynthesizeSpeechCommand({
            Engine: 'standard',
            VoiceId: voiceId,
            LanguageCode: languageCode,
            OutputFormat: 'mp3',
            Text: text,
          });
          const response = await polly.send(fallbackCommand);
          if (response.AudioStream) {
             res.set({
              'Content-Type': 'audio/mpeg',
              'Transfer-Encoding': 'chunked'
            });
            (response.AudioStream as any).pipe(res);
          } else {
            throw new Error('No audio stream returned on fallback');
          }
        } else {
          throw err;
        }
      }
    } catch (error) {
      console.error('TTS Synthesis error', error);
      res.status(500).json({ message: 'TTS Synthesis failed' });
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
