import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramBotService } from '../telegram/telegram-bot.service';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly telegramBot: TelegramBotService,
  ) {}

  async sendTelegramMessage(chatId: number, message: string) {
    if (!chatId || !message) {
      throw new Error('chatId and message are required');
    }
    await this.telegramBot.sendMessage(chatId, message, { parseMode: 'HTML' });
    return { success: true };
  }

  async sendDiscordMessage(payload: { channelId?: string; message: string; webhookUrl?: string }) {
    const { channelId, message, webhookUrl } = payload;
    if (!message) {
      throw new Error('message is required');
    }

    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Discord webhook error: ${text}`);
      }
      return { success: true };
    }

    const botToken = this.configService.get('DISCORD_BOT_TOKEN');
    if (!botToken) {
      throw new Error('DISCORD_BOT_TOKEN not configured');
    }
    if (!channelId) {
      throw new Error('channelId is required when webhookUrl is not provided');
    }

    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${botToken}`,
      },
      body: JSON.stringify({ content: message }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Discord API error: ${text}`);
    }

    return { success: true };
  }

  async postToX(text: string) {
    if (!text) {
      throw new Error('text is required');
    }

    const accessToken = this.configService.get('X_USER_ACCESS_TOKEN') || this.configService.get('X_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('X_USER_ACCESS_TOKEN not configured');
    }

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const textRes = await response.text();
      throw new Error(`X API error: ${textRes}`);
    }

    const data = await response.json();
    return { success: true, data };
  }

  async createGitHubIssue(payload: { repo?: string; title: string; body?: string; labels?: string[] }) {
    const token = this.configService.get('GITHUB_TOKEN');
    if (!token) {
      throw new Error('GITHUB_TOKEN not configured');
    }

    const repo = payload.repo || this.configService.get('GITHUB_REPO');
    if (!repo) {
      throw new Error('GITHUB_REPO not configured');
    }

    const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({
        title: payload.title,
        body: payload.body,
        labels: payload.labels,
      }),
    });

    if (!response.ok) {
      const textRes = await response.text();
      throw new Error(`GitHub API error: ${textRes}`);
    }

    const data = await response.json();
    return { success: true, data };
  }

  async createGitHubComment(payload: { repo?: string; issueNumber: number; body: string }) {
    const token = this.configService.get('GITHUB_TOKEN');
    if (!token) {
      throw new Error('GITHUB_TOKEN not configured');
    }

    const repo = payload.repo || this.configService.get('GITHUB_REPO');
    if (!repo) {
      throw new Error('GITHUB_REPO not configured');
    }

    const response = await fetch(`https://api.github.com/repos/${repo}/issues/${payload.issueNumber}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({ body: payload.body }),
    });

    if (!response.ok) {
      const textRes = await response.text();
      throw new Error(`GitHub API error: ${textRes}`);
    }

    const data = await response.json();
    return { success: true, data };
  }

  getStatus() {
    return {
      telegram: !!this.configService.get('TELEGRAM_BOT_TOKEN'),
      discord: !!this.configService.get('DISCORD_BOT_TOKEN'),
      x: !!(this.configService.get('X_USER_ACCESS_TOKEN') || this.configService.get('X_ACCESS_TOKEN')),
      github: !!this.configService.get('GITHUB_TOKEN'),
    };
  }
}
