/**
 * Social Media Controller
 * 
 * API endpoints for social media operations
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SocialMediaService } from './social-media.service';

interface SendTweetDto {
  text: string;
}

interface SendDiscordDto {
  channelId: string;
  content: string;
  embed?: {
    title?: string;
    description?: string;
    color?: number;
    fields?: { name: string; value: string; inline?: boolean }[];
  };
}

interface SendTelegramDto {
  text: string;
  chatId?: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

interface SendEmailDto {
  to: string | string[];
  subject: string;
  body: string;
  html?: boolean;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

@ApiTags('Social Media')
@Controller('hq/social')
export class SocialMediaController {
  private readonly logger = new Logger(SocialMediaController.name);

  constructor(private readonly socialService: SocialMediaService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get social media service status' })
  getStatus() {
    return {
      success: true,
      services: this.socialService.getStatus(),
    };
  }

  // ============================================
  // Twitter/X
  // ============================================

  @Post('twitter/tweet')
  @ApiOperation({ summary: 'Post a tweet' })
  async postTweet(@Body() body: SendTweetDto) {
    this.logger.log(`Posting tweet: ${body.text.substring(0, 50)}...`);
    const result = await this.socialService.postTweet(body.text);
    return {
      success: result.success,
      data: result.success ? { tweetId: result.tweetId } : undefined,
      error: result.error,
    };
  }

  @Get('twitter/timeline')
  @ApiOperation({ summary: 'Get Twitter timeline' })
  async getTimeline() {
    const tweets = await this.socialService.getTwitterTimeline(20);
    return {
      success: true,
      data: tweets,
    };
  }

  // ============================================
  // Discord
  // ============================================

  @Post('discord/message')
  @ApiOperation({ summary: 'Send a Discord message' })
  async sendDiscordMessage(@Body() body: SendDiscordDto) {
    this.logger.log(`Sending Discord message to ${body.channelId}`);
    const result = await this.socialService.sendDiscordMessage(
      body.channelId,
      body.content,
      { embed: body.embed }
    );
    return {
      success: result.success,
      data: result.success ? { messageId: result.messageId } : undefined,
      error: result.error,
    };
  }

  @Get('discord/guilds')
  @ApiOperation({ summary: 'Get Discord guilds' })
  async getDiscordGuilds() {
    const guilds = await this.socialService.getDiscordGuilds();
    return {
      success: true,
      data: guilds,
    };
  }

  // ============================================
  // Telegram
  // ============================================

  @Post('telegram/message')
  @ApiOperation({ summary: 'Send a Telegram message' })
  async sendTelegramMessage(@Body() body: SendTelegramDto) {
    this.logger.log(`Sending Telegram message`);
    const result = await this.socialService.sendTelegramMessage(
      body.text,
      body.chatId,
      { parseMode: body.parseMode }
    );
    return {
      success: result.success,
      data: result.success ? { messageId: result.messageId } : undefined,
      error: result.error,
    };
  }

  // ============================================
  // Email
  // ============================================

  @Post('email/send')
  @ApiOperation({ summary: 'Send an email' })
  async sendEmail(@Body() body: SendEmailDto) {
    this.logger.log(`Sending email to ${Array.isArray(body.to) ? body.to.join(',') : body.to}`);
    const result = await this.socialService.sendEmail(
      body.to,
      body.subject,
      body.body,
      {
        html: body.html,
        cc: body.cc,
        bcc: body.bcc,
        replyTo: body.replyTo,
      }
    );
    return {
      success: result.success,
      data: result.success ? { messageId: result.messageId } : undefined,
      error: result.error,
    };
  }

  @Get('email/verify')
  @ApiOperation({ summary: 'Verify email SMTP connection' })
  async verifyEmail() {
    const connected = await this.socialService.verifyEmailConnection();
    return {
      success: true,
      connected,
    };
  }
}
