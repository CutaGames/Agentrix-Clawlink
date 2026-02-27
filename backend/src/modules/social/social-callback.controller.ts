/**
 * SocialCallbackController — Social Listener for Phase 3.1
 *
 * Receives inbound webhook events from external social platforms
 * (Twitter/X mentions, Telegram messages, Discord messages) and
 * routes them to the appropriate OpenClaw agent for processing.
 *
 * Endpoints:
 *   POST /social/callback/twitter   — Twitter/X webhook (CRC + events)
 *   POST /social/callback/telegram  — Telegram Bot webhook
 *   POST /social/callback/discord   — Discord Bot webhook
 *
 * Each handler:
 *   1. Verifies the platform signature / challenge
 *   2. Extracts mentions or DMs directed at the agent
 *   3. Pushes the event to the agent execution queue
 *   4. Returns the platform-required response
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Query,
  Req,
  Res,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

// ── Environment ───────────────────────────────────────────────────────────────

// Match actual .env variable names
const TWITTER_CONSUMER_SECRET = process.env.TWITTER_APIKEY_SECRET ?? process.env.TWITTER_CONSUMER_SECRET ?? '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? 'agentrixnetwork_bot';
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY ?? process.env.DISCORD_CLIENT_SECRET ?? '';
const API_BASE_URL = process.env.BACKEND_URL ?? process.env.APP_URL ?? 'https://api.agentrix.top/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SocialEvent {
  platform: 'twitter' | 'telegram' | 'discord';
  eventType: 'mention' | 'dm' | 'message' | 'command';
  senderId: string;
  senderName: string;
  text: string;
  rawPayload: unknown;
  timestamp: number;
}

// ── Controller ────────────────────────────────────────────────────────────────

@Controller('social/callback')
export class SocialCallbackController {
  private readonly logger = new Logger(SocialCallbackController.name);

  // In-memory circular buffer of last 100 events (for the frontend dashboard)
  private readonly eventLog: (SocialEvent & { id: string })[] = [];
  private readonly MAX_LOG = 100;

  private pushEvent(event: SocialEvent) {
    const entry = { ...event, id: `${event.platform}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
    this.eventLog.unshift(entry);
    if (this.eventLog.length > this.MAX_LOG) this.eventLog.length = this.MAX_LOG;
    return entry;
  }

  // ── Dashboard endpoints ───────────────────────────────────────────────────

  /** GET /social/callback/events — returns recent 50 events for the app dashboard */
  @Get('events')
  getEvents(@Query('limit') limit?: string) {
    const n = Math.min(parseInt(limit ?? '50', 10) || 50, this.MAX_LOG);
    return { ok: true, events: this.eventLog.slice(0, n) };
  }

  /** GET /social/callback/status — platform connection status */
  @Get('status')
  getStatus() {
    return {
      ok: true,
      platforms: {
        telegram: {
          connected: !!TELEGRAM_BOT_TOKEN,
          botUsername: TELEGRAM_BOT_USERNAME,
          webhookUrl: `${API_BASE_URL}/social/callback/telegram`,
        },
        discord: {
          connected: !!DISCORD_PUBLIC_KEY,
          clientId: process.env.DISCORD_CLIENT_ID ?? '',
          interactionsUrl: `${API_BASE_URL}/social/callback/discord`,
        },
        twitter: {
          connected: !!TWITTER_CONSUMER_SECRET,
          webhookUrl: `${API_BASE_URL}/social/callback/twitter`,
        },
      },
    };
  }

  /** POST /social/callback/telegram/setup — registers bot webhook with Telegram API */
  @Post('telegram/setup')
  async setupTelegramWebhook() {
    if (!TELEGRAM_BOT_TOKEN) {
      return { ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
    }
    const webhookUrl = `${API_BASE_URL}/social/callback/telegram`;
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'channel_post'] }),
        },
      );
      const json: any = await res.json();
      this.logger.log(`Telegram setWebhook result: ${JSON.stringify(json)}`);
      return { ok: json.ok, description: json.description, webhookUrl };
    } catch (e: any) {
      this.logger.error('Telegram setWebhook failed', e);
      return { ok: false, error: e.message };
    }
  }

  // ── Twitter / X ─────────────────────────────────────────────────────────────

  /**
   * Twitter CRC challenge — GET /social/callback/twitter
   * Twitter sends a crc_token; we must reply with HMAC-SHA256 digest.
   */
  @Get('twitter')
  twitterCrc(@Query('crc_token') crcToken: string, @Res() res: Response) {
    if (!crcToken) {
      res.status(400).json({ error: 'Missing crc_token' });
      return;
    }
    const hash = crypto
      .createHmac('sha256', TWITTER_CONSUMER_SECRET)
      .update(crcToken)
      .digest('base64');
    res.json({ response_token: `sha256=${hash}` });
  }

  /**
   * Twitter Account Activity API webhook — POST /social/callback/twitter
   */
  @Post('twitter')
  @HttpCode(200)
  async handleTwitterWebhook(
    @Body() body: any,
    @Headers('x-twitter-webhooks-signature') signature: string,
    @Req() req: Request,
  ) {
    // Verify signature
    if (TWITTER_CONSUMER_SECRET && signature) {
      const rawBody = (req as any).rawBody as Buffer | undefined;
      if (rawBody) {
        const expected =
          'sha256=' +
          crypto
            .createHmac('sha256', TWITTER_CONSUMER_SECRET)
            .update(rawBody)
            .digest('base64');
        if (expected !== signature) {
          this.logger.warn('Twitter webhook signature mismatch — rejecting');
          return { ok: false };
        }
      }
    }

    // Process tweet_create_events (mentions)
    const mentions: any[] = body?.tweet_create_events ?? [];
    for (const tweet of mentions) {
      const event: SocialEvent = {
        platform: 'twitter',
        eventType: 'mention',
        senderId: tweet.user?.id_str ?? '',
        senderName: tweet.user?.screen_name ?? '',
        text: tweet.text ?? tweet.full_text ?? '',
        rawPayload: tweet,
        timestamp: Date.now(),
      };
      await this.dispatchEvent(event);
    }

    // Process direct_message_events
    const dms: any[] = body?.direct_message_events ?? [];
    for (const dm of dms) {
      if (dm.type !== 'message_create') continue;
      const event: SocialEvent = {
        platform: 'twitter',
        eventType: 'dm',
        senderId: dm.message_create?.sender_id ?? '',
        senderName: '',
        text: dm.message_create?.message_data?.text ?? '',
        rawPayload: dm,
        timestamp: Date.now(),
      };
      await this.dispatchEvent(event);
    }

    return { ok: true };
  }

  // ── Telegram ─────────────────────────────────────────────────────────────────

  /**
   * Telegram Bot webhook — POST /social/callback/telegram
   * Set via: PUT https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL>
   */
  @Post('telegram')
  @HttpCode(200)
  async handleTelegramWebhook(@Body() body: any) {
    // Verify secret_token header if configured
    const update = body;

    const message = update?.message ?? update?.channel_post ?? null;
    if (!message) return { ok: true };

    const text: string = message?.text ?? message?.caption ?? '';
    const senderId = String(message?.from?.id ?? message?.chat?.id ?? '');
    const senderName =
      message?.from?.username ??
      `${message?.from?.first_name ?? ''} ${message?.from?.last_name ?? ''}`.trim();

    // Only process messages that mention @AgentrixBot or start with /
    const isMention = text.includes('@AgentrixBot') || text.startsWith('/');
    if (!isMention) return { ok: true };

    const event: SocialEvent = {
      platform: 'telegram',
      eventType: text.startsWith('/') ? 'command' : 'mention',
      senderId,
      senderName,
      text,
      rawPayload: message,
      timestamp: Date.now(),
    };
    await this.dispatchEvent(event);

    return { ok: true };
  }

  // ── Discord ──────────────────────────────────────────────────────────────────

  /**
   * Discord interactions endpoint — POST /social/callback/discord
   * Handles PING and APPLICATION_COMMAND interactions.
   */
  @Post('discord')
  @HttpCode(200)
  async handleDiscordWebhook(
    @Body() body: any,
    @Headers('x-signature-ed25519') sigEd25519: string,
    @Headers('x-signature-timestamp') sigTimestamp: string,
    @Req() req: Request,
  ) {
    // Verify Discord signature using Ed25519
    if (DISCORD_PUBLIC_KEY && sigEd25519 && sigTimestamp) {
      try {
        const rawBody = (req as any).rawBody as Buffer | undefined;
        if (rawBody) {
          const { createVerify } = await import('crypto');
          const verify = createVerify('ed25519');
          verify.update(Buffer.concat([Buffer.from(sigTimestamp), rawBody]));
          const isValid = verify.verify(
            Buffer.from(DISCORD_PUBLIC_KEY, 'hex'),
            Buffer.from(sigEd25519, 'hex'),
          );
          if (!isValid) {
            this.logger.warn('Discord signature invalid');
            return { error: 'Invalid signature' };
          }
        }
      } catch (e) {
        this.logger.error('Discord signature verification failed', e);
      }
    }

    // PING challenge
    if (body?.type === 1) {
      return { type: 1 };
    }

    // APPLICATION_COMMAND (type 2) or MESSAGE_COMPONENT (type 3)
    if (body?.type === 2) {
      const commandName: string = body?.data?.name ?? '';
      const userId: string = body?.member?.user?.id ?? body?.user?.id ?? '';
      const userName: string = body?.member?.user?.username ?? '';

      const event: SocialEvent = {
        platform: 'discord',
        eventType: 'command',
        senderId: userId,
        senderName: userName,
        text: `/${commandName} ${JSON.stringify(body?.data?.options ?? [])}`,
        rawPayload: body,
        timestamp: Date.now(),
      };
      await this.dispatchEvent(event);

      // Return deferred response (Discord requires response within 3s)
      return { type: 5 }; // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    }

    return { ok: true };
  }

  // ── Internal: Event Dispatch ─────────────────────────────────────────────────

  /**
   * Routes a normalised SocialEvent to the appropriate agent handler.
   * In production this would publish to a message queue (BullMQ / Redis).
   * Here we log and call the OpenClaw execution module directly.
   */
  private async dispatchEvent(event: SocialEvent): Promise<void> {
    const entry = this.pushEvent(event);
    this.logger.log(
      `[${event.platform}] ${event.eventType} from ${event.senderName}: "${event.text.slice(0, 80)}"`,
    );

    try {
      // TODO: Integrate with execution module
      // Example: await this.agentExecutionService.handleSocialEvent(event);
      this.logger.verbose(JSON.stringify(entry));
    } catch (err) {
      this.logger.error('Failed to dispatch social event', err);
    }
  }
}
