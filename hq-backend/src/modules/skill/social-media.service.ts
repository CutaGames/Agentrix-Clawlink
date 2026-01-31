/**
 * Social Media Service
 * 
 * Provides actual API integration for social media platforms:
 * - Twitter/X
 * - Discord
 * - Telegram
 * - Email (SMTP)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface TwitterCredentials {
  apiKey: string;
  apiKeySecret: string;
  accessToken: string;
  accessTokenSecret: string;
  clientId: string;
}

interface TweetResult {
  success: boolean;
  tweetId?: string;
  error?: string;
}

interface DiscordMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class SocialMediaService {
  private readonly logger = new Logger(SocialMediaService.name);
  
  // Twitter/X credentials
  private twitterCreds: TwitterCredentials | null = null;
  
  // Discord bot token
  private discordToken: string | null = null;
  
  // Telegram credentials (reuse from TelegramBotService)
  private telegramToken: string | null = null;
  private telegramChatId: string | null = null;
  
  // Email SMTP
  private emailTransporter: nodemailer.Transporter | null = null;
  private emailFrom: string;

  constructor(private configService: ConfigService) {
    this.initializeCredentials();
  }

  private initializeCredentials(): void {
    // Twitter/X
    const twitterApiKey = this.configService.get<string>('TWITTER_API_KEY');
    if (twitterApiKey) {
      this.twitterCreds = {
        apiKey: twitterApiKey,
        apiKeySecret: this.configService.get<string>('TWITTER_APIKEY_SECRET', ''),
        accessToken: this.configService.get<string>('TWITTER_ACCESS_TOKEN', ''),
        accessTokenSecret: this.configService.get<string>('TWITTER_ACCESS_TOKEN_SECRET', ''),
        clientId: this.configService.get<string>('TWITTER_CLIENT_ID', ''),
      };
      this.logger.log('✅ Twitter/X credentials configured');
    } else {
      this.logger.warn('⚠️ Twitter/X credentials not configured');
    }

    // Discord
    this.discordToken = this.configService.get<string>('DISCORD_TOKEN') || null;
    if (this.discordToken) {
      this.logger.log('✅ Discord token configured');
    } else {
      this.logger.warn('⚠️ Discord token not configured');
    }

    // Telegram
    this.telegramToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || null;
    this.telegramChatId = this.configService.get<string>('TELEGRAM_CHAT_ID') || null;
    if (this.telegramToken) {
      this.logger.log('✅ Telegram bot configured');
    }

    // Email SMTP
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
    if (smtpUser && smtpPassword) {
      this.emailTransporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST', 'smtp.zoho.com'),
        port: parseInt(this.configService.get<string>('SMTP_PORT', '465')),
        secure: true,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });
      this.emailFrom = smtpUser;
      this.logger.log('✅ Email SMTP configured');
    } else {
      this.logger.warn('⚠️ Email SMTP not configured');
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    twitter: boolean;
    discord: boolean;
    telegram: boolean;
    email: boolean;
  } {
    return {
      twitter: !!this.twitterCreds,
      discord: !!this.discordToken,
      telegram: !!this.telegramToken,
      email: !!this.emailTransporter,
    };
  }

  // ============================================
  // Twitter/X API
  // ============================================

  /**
   * Post a tweet
   * Uses Twitter API v2
   */
  async postTweet(text: string): Promise<TweetResult> {
    if (!this.twitterCreds) {
      return { success: false, error: 'Twitter credentials not configured' };
    }

    if (text.length > 280) {
      return { success: false, error: 'Tweet exceeds 280 characters' };
    }

    try {
      // For Twitter API v2, we need OAuth 1.0a signature
      // This is a simplified implementation - for production, use a library like 'twitter-api-v2'
      const { TwitterApi } = await import('twitter-api-v2');
      
      const client = new TwitterApi({
        appKey: this.twitterCreds.apiKey,
        appSecret: this.twitterCreds.apiKeySecret,
        accessToken: this.twitterCreds.accessToken,
        accessSecret: this.twitterCreds.accessTokenSecret,
      });

      const result = await client.v2.tweet(text);
      this.logger.log(`✅ Tweet posted: ${result.data.id}`);
      
      return {
        success: true,
        tweetId: result.data.id,
      };
    } catch (error: any) {
      this.logger.error(`❌ Tweet failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get Twitter timeline (for context)
   */
  async getTwitterTimeline(count: number = 10): Promise<any[]> {
    if (!this.twitterCreds) {
      return [];
    }

    try {
      const { TwitterApi } = await import('twitter-api-v2');
      
      const client = new TwitterApi({
        appKey: this.twitterCreds.apiKey,
        appSecret: this.twitterCreds.apiKeySecret,
        accessToken: this.twitterCreds.accessToken,
        accessSecret: this.twitterCreds.accessTokenSecret,
      });

      const me = await client.v2.me();
      const timeline = await client.v2.userTimeline(me.data.id, { max_results: count });
      
      return timeline.data?.data || [];
    } catch (error: any) {
      this.logger.error(`Failed to get timeline: ${error.message}`);
      return [];
    }
  }

  // ============================================
  // Discord API
  // ============================================

  /**
   * Send a message to a Discord channel
   */
  async sendDiscordMessage(channelId: string, content: string, options?: {
    embed?: {
      title?: string;
      description?: string;
      color?: number;
      fields?: { name: string; value: string; inline?: boolean }[];
    };
  }): Promise<DiscordMessageResult> {
    if (!this.discordToken) {
      return { success: false, error: 'Discord token not configured' };
    }

    try {
      const body: any = { content };
      
      if (options?.embed) {
        body.embeds = [{
          title: options.embed.title,
          description: options.embed.description,
          color: options.embed.color || 0x5865F2, // Discord blurple
          fields: options.embed.fields,
        }];
      }

      const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${this.discordToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Discord API error');
      }

      const data = await response.json();
      this.logger.log(`✅ Discord message sent: ${data.id}`);
      
      return {
        success: true,
        messageId: data.id,
      };
    } catch (error: any) {
      this.logger.error(`❌ Discord message failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get Discord guilds (servers) the bot is in
   */
  async getDiscordGuilds(): Promise<any[]> {
    if (!this.discordToken) {
      return [];
    }

    try {
      const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: {
          'Authorization': `Bot ${this.discordToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get guilds');
      }

      return await response.json();
    } catch (error: any) {
      this.logger.error(`Failed to get Discord guilds: ${error.message}`);
      return [];
    }
  }

  // ============================================
  // Telegram API
  // ============================================

  /**
   * Send a Telegram message
   */
  async sendTelegramMessage(
    text: string,
    chatId?: string,
    options?: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disableNotification?: boolean;
    }
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    if (!this.telegramToken) {
      return { success: false, error: 'Telegram bot not configured' };
    }

    const targetChatId = chatId || this.telegramChatId;
    if (!targetChatId) {
      return { success: false, error: 'No chat ID provided' };
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text,
          parse_mode: options?.parseMode || 'HTML',
          disable_notification: options?.disableNotification || false,
        }),
      });

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.description || 'Telegram API error');
      }

      this.logger.log(`✅ Telegram message sent: ${data.result.message_id}`);
      
      return {
        success: true,
        messageId: data.result.message_id,
      };
    } catch (error: any) {
      this.logger.error(`❌ Telegram message failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ============================================
  // Email API
  // ============================================

  /**
   * Send an email
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    body: string,
    options?: {
      html?: boolean;
      cc?: string | string[];
      bcc?: string | string[];
      replyTo?: string;
    }
  ): Promise<EmailResult> {
    if (!this.emailTransporter) {
      return { success: false, error: 'Email SMTP not configured' };
    }

    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: this.emailFrom,
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        [options?.html ? 'html' : 'text']: body,
      };

      if (options?.cc) {
        mailOptions.cc = Array.isArray(options.cc) ? options.cc.join(',') : options.cc;
      }
      if (options?.bcc) {
        mailOptions.bcc = Array.isArray(options.bcc) ? options.bcc.join(',') : options.bcc;
      }
      if (options?.replyTo) {
        mailOptions.replyTo = options.replyTo;
      }

      const result = await this.emailTransporter.sendMail(mailOptions);
      this.logger.log(`✅ Email sent: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error: any) {
      this.logger.error(`❌ Email failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify email connection
   */
  async verifyEmailConnection(): Promise<boolean> {
    if (!this.emailTransporter) {
      return false;
    }

    try {
      await this.emailTransporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
