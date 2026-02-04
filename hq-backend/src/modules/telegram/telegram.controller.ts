/**
 * Telegram Controller
 * 
 * Webhook 和管理 API
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';

@Controller('hq/telegram')
export class TelegramController {
  constructor(private readonly botService: TelegramBotService) {}

  /**
   * Telegram Webhook (可选，替代轮询)
   * POST /api/hq/telegram/webhook
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() update: any) {
    await this.botService.handleWebhookUpdate(update);
    return { ok: true };
  }

  /**
   * 发送告警通知
   * POST /api/hq/telegram/alert
   */
  @Post('alert')
  async sendAlert(
    @Body() body: {
      level: 'info' | 'warning' | 'error';
      title: string;
      message: string;
    },
  ) {
    await this.botService.sendAlert(body.level, body.title, body.message);
    return { success: true };
  }

  /**
   * 发送通知给特定用户
   * POST /api/hq/telegram/notify
   */
  @Post('notify')
  async sendNotification(
    @Body() body: {
      userId: number;
      message: string;
    },
  ) {
    await this.botService.sendNotification(body.userId, body.message);
    return { success: true };
  }

  /**
   * 健康检查
   * GET /api/hq/telegram/health
   */
  @Get('health')
  async health() {
    return {
      status: 'ok',
      service: 'telegram-bot',
    };
  }
}
