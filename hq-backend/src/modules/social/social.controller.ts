import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SocialService } from './social.service';

@ApiTags('Social')
@Controller('hq/social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('health')
  @ApiOperation({ summary: '社交平台配置状态' })
  async health() {
    return this.socialService.getStatus();
  }

  @Post('telegram/send')
  @ApiOperation({ summary: '发送 Telegram 消息' })
  async sendTelegram(@Body() body: { chatId: number; message: string }) {
    return this.socialService.sendTelegramMessage(body.chatId, body.message);
  }

  @Post('discord/send')
  @ApiOperation({ summary: '发送 Discord 消息' })
  async sendDiscord(
    @Body()
    body: {
      channelId?: string;
      webhookUrl?: string;
      message: string;
    },
  ) {
    return this.socialService.sendDiscordMessage(body);
  }

  @Post('x/post')
  @ApiOperation({ summary: '发布 X 动态' })
  async postToX(@Body() body: { text: string }) {
    return this.socialService.postToX(body.text);
  }

  @Post('github/issue')
  @ApiOperation({ summary: '创建 GitHub Issue' })
  async createGitHubIssue(
    @Body()
    body: {
      repo?: string;
      title: string;
      body?: string;
      labels?: string[];
    },
  ) {
    return this.socialService.createGitHubIssue(body);
  }

  @Post('github/comment')
  @ApiOperation({ summary: '创建 GitHub Issue 评论' })
  async createGitHubComment(
    @Body()
    body: {
      repo?: string;
      issueNumber: number;
      body: string;
    },
  ) {
    return this.socialService.createGitHubComment(body);
  }
}
