/**
 * HQ Social Media Management Module
 * 
 * 管理 Telegram、X (Twitter)、Discord 等社交平台
 * 实现自动发帖、互动、获客等功能
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

// ========== 接口定义 ==========

export interface SocialPost {
  id?: string;
  platform: 'telegram' | 'twitter' | 'discord';
  content: string;
  mediaUrls?: string[];
  scheduledAt?: Date;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  engagement?: {
    likes?: number;
    retweets?: number;
    replies?: number;
    views?: number;
  };
  createdAt: Date;
  publishedAt?: Date;
}

export interface SocialAccount {
  platform: 'telegram' | 'twitter' | 'discord';
  accountId: string;
  accountName: string;
  isConnected: boolean;
  credentials?: Record<string, string>;
}

export interface InfluencerTarget {
  platform: 'twitter' | 'discord';
  handle: string;
  name: string;
  followers: number;
  relevanceScore: number; // 0-100 相关度评分
  lastInteractionAt?: Date;
  notes?: string;
}

// ========== Telegram Bot 服务 ==========

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: any; // TelegramBot instance
  
  async onModuleInit() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn('⚠️ Telegram bot token not configured');
      return;
    }
    
    try {
      // 动态导入 node-telegram-bot-api
      const TelegramBot = require('node-telegram-bot-api');
      this.bot = new TelegramBot(token, { polling: true });
      
      this.setupHandlers();
      this.logger.log('✅ Telegram bot initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Telegram bot:', error);
    }
  }
  
  private setupHandlers() {
    if (!this.bot) return;
    
    // 处理 /start 命令
    this.bot.onText(/\/start/, (msg: any) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(chatId, `
🤖 Welcome to Agentrix HQ Bot!

I can help you:
• Get project updates
• Check system status
• Manage your AI agents

Commands:
/status - System status
/agents - List agents
/help - Show help
      `);
    });
    
    // 处理 /status 命令
    this.bot.onText(/\/status/, async (msg: any) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(chatId, `
📊 System Status

🟢 HQ Backend: Online
🟢 AI Engine: Connected
📈 Active Agents: 5
📝 Pending Tasks: 0
      `);
    });
    
    // 处理普通消息 - 转发给 AI
    this.bot.on('message', async (msg: any) => {
      if (msg.text?.startsWith('/')) return; // 忽略命令
      
      const chatId = msg.chat.id;
      // TODO: 调用 AI 服务处理消息
      this.bot.sendMessage(chatId, '🤔 Processing your message...');
    });
  }
  
  async sendMessage(chatId: string | number, text: string): Promise<void> {
    if (!this.bot) {
      throw new Error('Telegram bot not initialized');
    }
    await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  }
  
  async sendToChannel(channelUsername: string, text: string): Promise<void> {
    if (!this.bot) {
      throw new Error('Telegram bot not initialized');
    }
    await this.bot.sendMessage(`@${channelUsername}`, text, { parse_mode: 'Markdown' });
  }
}

// ========== Twitter/X 服务 ==========

@Injectable()
export class TwitterService implements OnModuleInit {
  private readonly logger = new Logger(TwitterService.name);
  private client: any; // TwitterApi instance
  
  async onModuleInit() {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;
    
    if (!apiKey || !apiSecret) {
      this.logger.warn('⚠️ Twitter API credentials not configured');
      return;
    }
    
    try {
      // 动态导入 twitter-api-v2
      const { TwitterApi } = require('twitter-api-v2');
      this.client = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken,
        accessSecret,
      });
      
      this.logger.log('✅ Twitter client initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Twitter client:', error);
    }
  }
  
  async tweet(content: string, replyToId?: string): Promise<any> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }
    
    const params: any = { text: content };
    if (replyToId) {
      params.reply = { in_reply_to_tweet_id: replyToId };
    }
    
    return await this.client.v2.tweet(params);
  }
  
  async retweet(tweetId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }
    const me = await this.client.v2.me();
    await this.client.v2.retweet(me.data.id, tweetId);
  }
  
  async like(tweetId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }
    const me = await this.client.v2.me();
    await this.client.v2.like(me.data.id, tweetId);
  }
  
  async searchTweets(query: string, maxResults: number = 10): Promise<any[]> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }
    
    const result = await this.client.v2.search(query, {
      max_results: maxResults,
      'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
    });
    
    return result.data?.data || [];
  }
  
  async getInfluencerTweets(handle: string, maxResults: number = 10): Promise<any[]> {
    if (!this.client) {
      throw new Error('Twitter client not initialized');
    }
    
    const user = await this.client.v2.userByUsername(handle);
    if (!user.data) return [];
    
    const tweets = await this.client.v2.userTimeline(user.data.id, {
      max_results: maxResults,
      'tweet.fields': ['created_at', 'public_metrics'],
    });
    
    return tweets.data?.data || [];
  }
}

// ========== Discord 服务 ==========

@Injectable()
export class DiscordBotService implements OnModuleInit {
  private readonly logger = new Logger(DiscordBotService.name);
  private client: any; // Discord.js Client
  
  async onModuleInit() {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      this.logger.warn('⚠️ Discord bot token not configured');
      return;
    }
    
    try {
      const { Client, GatewayIntentBits } = require('discord.js');
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
        ],
      });
      
      this.setupHandlers();
      await this.client.login(token);
      this.logger.log('✅ Discord bot initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Discord bot:', error);
    }
  }
  
  private setupHandlers() {
    if (!this.client) return;
    
    this.client.on('ready', () => {
      this.logger.log(`Discord bot logged in as ${this.client.user.tag}`);
    });
    
    this.client.on('messageCreate', async (message: any) => {
      if (message.author.bot) return;
      
      // 响应 !agentrix 命令
      if (message.content.startsWith('!agentrix')) {
        const query = message.content.replace('!agentrix', '').trim();
        if (!query) {
          message.reply('Usage: !agentrix <your question>');
          return;
        }
        
        // TODO: 调用 AI 服务
        message.reply('🤔 Processing your query...');
      }
    });
  }
  
  async sendToChannel(channelId: string, content: string): Promise<void> {
    if (!this.client) {
      throw new Error('Discord client not initialized');
    }
    
    const channel = await this.client.channels.fetch(channelId);
    if (channel?.isTextBased()) {
      await channel.send(content);
    }
  }
}

// ========== 社交媒体管理统一服务 ==========

@Injectable()
export class SocialMediaService {
  private readonly logger = new Logger(SocialMediaService.name);
  
  constructor(
    private readonly telegramBot: TelegramBotService,
    private readonly twitterService: TwitterService,
    private readonly discordBot: DiscordBotService,
  ) {}
  
  // 跨平台发布
  async publishToAll(content: string, platforms?: ('telegram' | 'twitter' | 'discord')[]): Promise<Record<string, any>> {
    const targetPlatforms = platforms || ['telegram', 'twitter', 'discord'];
    const results: Record<string, any> = {};
    
    for (const platform of targetPlatforms) {
      try {
        switch (platform) {
          case 'telegram':
            // 发送到 Telegram 频道
            const tgChannel = process.env.TELEGRAM_CHANNEL;
            if (tgChannel) {
              await this.telegramBot.sendToChannel(tgChannel, content);
              results.telegram = { success: true };
            }
            break;
            
          case 'twitter':
            const tweet = await this.twitterService.tweet(content);
            results.twitter = { success: true, tweetId: tweet.data?.id };
            break;
            
          case 'discord':
            const discordChannel = process.env.DISCORD_ANNOUNCE_CHANNEL;
            if (discordChannel) {
              await this.discordBot.sendToChannel(discordChannel, content);
              results.discord = { success: true };
            }
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to publish to ${platform}:`, error);
        results[platform] = { success: false, error: error.message };
      }
    }
    
    return results;
  }
  
  // 与大 V 互动策略
  async engageWithInfluencer(handle: string, strategy: 'like' | 'retweet' | 'reply', replyContent?: string): Promise<void> {
    // 获取最新推文
    const tweets = await this.twitterService.getInfluencerTweets(handle, 5);
    if (tweets.length === 0) return;
    
    const latestTweet = tweets[0];
    
    switch (strategy) {
      case 'like':
        await this.twitterService.like(latestTweet.id);
        break;
      case 'retweet':
        await this.twitterService.retweet(latestTweet.id);
        break;
      case 'reply':
        if (replyContent) {
          await this.twitterService.tweet(replyContent, latestTweet.id);
        }
        break;
    }
    
    this.logger.log(`Engaged with @${handle} via ${strategy}`);
  }
  
  // 监控关键词
  async monitorKeywords(keywords: string[]): Promise<any[]> {
    const allTweets: any[] = [];
    
    for (const keyword of keywords) {
      const tweets = await this.twitterService.searchTweets(keyword, 20);
      allTweets.push(...tweets.map(t => ({ ...t, keyword })));
    }
    
    return allTweets;
  }
}

// ========== 定时任务服务 ==========

@Injectable()
export class SocialSchedulerService {
  private readonly logger = new Logger(SocialSchedulerService.name);
  
  constructor(private readonly socialMedia: SocialMediaService) {}
  
  // 每天早上 9 点发布日报
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async dailyUpdate() {
    this.logger.log('Running daily social media update...');
    // TODO: 生成日报内容并发布
  }
  
  // 每小时监控关键词
  @Cron(CronExpression.EVERY_HOUR)
  async hourlyMonitoring() {
    const keywords = ['AI agent', 'autonomous AI', 'agentic AI', 'MCP protocol'];
    const tweets = await this.socialMedia.monitorKeywords(keywords);
    this.logger.log(`Found ${tweets.length} relevant tweets`);
    // TODO: 分析并决定是否互动
  }
}
