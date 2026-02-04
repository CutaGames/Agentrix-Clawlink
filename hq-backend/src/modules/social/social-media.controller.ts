/**
 * Social Media Controller
 * 
 * API endpoints for social media management
 */

import { Controller, Post, Get, Body, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SocialMediaService, TwitterService } from './social-media.service';
import { EmailService } from './email.service';

@ApiTags('Social Media')
@Controller('hq/social')
export class SocialMediaController {
  private readonly logger = new Logger(SocialMediaController.name);

  constructor(
    private readonly socialMedia: SocialMediaService,
    private readonly twitter: TwitterService,
    private readonly emailService: EmailService,
  ) {}

  // ========== 跨平台发布 ==========

  @Post('publish')
  @ApiOperation({ summary: '发布内容到多个平台' })
  async publishContent(
    @Body() body: { content: string; platforms?: ('telegram' | 'twitter' | 'discord')[] },
  ) {
    this.logger.log(`Publishing to platforms: ${body.platforms?.join(', ') || 'all'}`);
    return this.socialMedia.publishToAll(body.content, body.platforms);
  }

  // ========== Twitter 操作 ==========

  @Post('twitter/tweet')
  @ApiOperation({ summary: '发送推文' })
  async tweet(@Body() body: { content: string; replyToId?: string }) {
    return this.twitter.tweet(body.content, body.replyToId);
  }

  @Post('twitter/like')
  @ApiOperation({ summary: '点赞推文' })
  async likeTweet(@Body() body: { tweetId: string }) {
    await this.twitter.like(body.tweetId);
    return { success: true };
  }

  @Post('twitter/retweet')
  @ApiOperation({ summary: '转发推文' })
  async retweet(@Body() body: { tweetId: string }) {
    await this.twitter.retweet(body.tweetId);
    return { success: true };
  }

  @Get('twitter/search')
  @ApiOperation({ summary: '搜索推文' })
  async searchTweets(@Query('q') query: string, @Query('limit') limit: string = '10') {
    return this.twitter.searchTweets(query, parseInt(limit));
  }

  @Get('twitter/influencer')
  @ApiOperation({ summary: '获取大V最新推文' })
  async getInfluencerTweets(@Query('handle') handle: string, @Query('limit') limit: string = '10') {
    return this.twitter.getInfluencerTweets(handle, parseInt(limit));
  }

  // ========== 互动策略 ==========

  @Post('engage')
  @ApiOperation({ summary: '与大V互动' })
  async engageWithInfluencer(
    @Body() body: { 
      handle: string; 
      strategy: 'like' | 'retweet' | 'reply'; 
      replyContent?: string;
    },
  ) {
    await this.socialMedia.engageWithInfluencer(body.handle, body.strategy, body.replyContent);
    return { success: true, message: `Engaged with @${body.handle}` };
  }

  // ========== 监控 ==========

  @Get('monitor')
  @ApiOperation({ summary: '监控关键词' })
  async monitorKeywords(@Query('keywords') keywords: string) {
    const keywordList = keywords.split(',').map(k => k.trim());
    return this.socialMedia.monitorKeywords(keywordList);
  }

  // ========== 状态检查 ==========

  @Get('status')
  @ApiOperation({ summary: '检查各平台连接状态' })
  async getStatus() {
    const emailStatus = this.emailService.getStatus();
    return {
      telegram: {
        configured: !!process.env.TELEGRAM_BOT_TOKEN,
        channel: process.env.TELEGRAM_CHANNEL || null,
      },
      twitter: {
        configured: !!process.env.TWITTER_API_KEY,
      },
      discord: {
        configured: !!process.env.DISCORD_BOT_TOKEN,
        announceChannel: process.env.DISCORD_ANNOUNCE_CHANNEL || null,
      },
      email: emailStatus,
    };
  }

  // ========== 邮件操作 ==========

  @Post('email/send')
  @ApiOperation({ summary: '发送邮件' })
  async sendEmail(@Body() body: { to: string | string[]; subject: string; html: string }) {
    const success = await this.emailService.sendEmail(body);
    return { success };
  }

  @Post('email/welcome')
  @ApiOperation({ summary: '发送欢迎邮件' })
  async sendWelcomeEmail(@Body() body: { to: string; userName: string }) {
    const success = await this.emailService.sendWelcomeEmail(body.to, body.userName);
    return { success };
  }

  @Post('email/marketing')
  @ApiOperation({ summary: '发送营销邮件' })
  async sendMarketingEmail(
    @Body() body: { recipients: string[]; subject: string; content: string },
  ) {
    return this.emailService.sendMarketingEmail(body.recipients, body.subject, body.content);
  }

  @Post('email/alert')
  @ApiOperation({ summary: '发送告警邮件' })
  async sendAlertEmail(@Body() body: { to: string | string[]; alertType: string; message: string }) {
    const success = await this.emailService.sendAlertEmail(body.to, body.alertType, body.message);
    return { success };
  }
}
