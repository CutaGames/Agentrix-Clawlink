import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import OpenAI from 'openai';

@Injectable()
export class VoiceService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async transcribeAudio(file: Express.Multer.File): Promise<string> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        // Fallback for demo if no API key is present
        console.warn('OPENAI_API_KEY is not set. Returning dummy transcript.');
        return 'This is a mocked transcription since OpenAI API key is missing.';
      }

      // We need a ReadStream for OpenAI's API
      const fileStream = fs.createReadStream(file.path);
      
      const response = await this.openai.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-1',
      });

      return response.text;
    } catch (error) {
      console.error('Transcription error:', error);
      throw new InternalServerErrorException('Failed to transcribe audio');
    } finally {
      // Clean up the temporary file created by multer
      if (file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.error('Error cleaning up audio file:', e);
        }
      }
    }
  }
}
