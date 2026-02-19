import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpenClawInstance } from '../../entities/openclaw-instance.entity';

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string; first_name?: string; username?: string };
    from?: { id: number; first_name?: string; username?: string };
    text?: string;
    date: number;
  };
}

/**
 * Handles inbound Telegram Bot webhooks.
 *
 * Flow:
 *  1. User clicks "Connect Telegram" in the APP
 *  2. Backend generates a deep-link: https://t.me/<BOT_NAME>?start=<relayToken>
 *  3. APP shows this as a QR code
 *  4. User scans → Telegram opens → Bot receives /start <relayToken>
 *  5. This service resolves the token → binds telegramChatId → replies with welcome
 *  6. All subsequent messages from that chat are proxied to the instance's AI engine
 */
@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  private readonly botName = process.env.TELEGRAM_BOT_NAME || 'ClawLinkBot';
  private readonly apiBase: string;

  constructor(
    @InjectRepository(OpenClawInstance)
    private readonly instanceRepo: Repository<OpenClawInstance>,
  ) {
    this.apiBase = `https://api.telegram.org/bot${this.botToken}`;
  }

  /** Called by controller for every Telegram webhook POST */
  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const msg = update.message;
    if (!msg?.text) return;

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    if (text.startsWith('/start ')) {
      await this.handleBindCommand(chatId, text.slice(7).trim(), msg.chat.first_name);
      return;
    }
    if (text === '/start') {
      await this.send(chatId,
        `👋 Welcome to ClawLink!\n\nTo connect your AI agent, open the ClawLink app → Agent tab → Connect Social.`
      );
      return;
    }
    if (text === '/status') {
      await this.handleStatusCommand(chatId);
      return;
    }
    if (text === '/help') {
      await this.send(chatId, HELP_TEXT);
      return;
    }

    // Forward message to AI engine
    await this.forwardToAgent(chatId, text);
  }

  private async handleBindCommand(chatId: number, token: string, firstName?: string): Promise<void> {
    if (!token) {
      await this.send(chatId, '❌ Invalid link. Please generate a new QR code from the ClawLink app.');
      return;
    }

    const instance = await this.instanceRepo.findOneBy({ relayToken: token });
    if (!instance) {
      await this.send(chatId, '❌ This link has expired or is invalid. Please generate a new one from the app.');
      return;
    }

    if (instance.telegramChatId) {
      await this.send(chatId, '✅ Telegram is already connected to this agent.');
      return;
    }

    // Bind chat
    await this.instanceRepo.update(instance.id, {
      telegramChatId: String(chatId),
    });

    const name = firstName ? firstName : 'there';
    await this.send(chatId,
      `🎉 Connected! Hi ${name}, your AI agent *${instance.name}* is now linked to this chat.\n\n` +
      `Just type any message to talk to your agent.\n\n` +
      `Type /help for commands.`,
      { parse_mode: 'Markdown' }
    );

    this.logger.log(`Telegram chat ${chatId} bound to instance ${instance.id}`);
  }

  private async handleStatusCommand(chatId: number): Promise<void> {
    const instance = await this.instanceRepo.findOneBy({ telegramChatId: String(chatId) });
    if (!instance) {
      await this.send(chatId, '❌ No agent linked. Scan a QR code from the ClawLink app to connect.');
      return;
    }
    const status = instance.relayConnected ? '🟢 Online' : '🔴 Offline';
    const mode = instance.instanceType === 'local' ? '💻 Local' : '☁️ Cloud';
    await this.send(chatId,
      `*${instance.name}*\nStatus: ${status}\nMode: ${mode}\nType: ${instance.instanceType}`,
      { parse_mode: 'Markdown' }
    );
  }

  private async forwardToAgent(chatId: number, userText: string): Promise<void> {
    const instance = await this.instanceRepo.findOneBy({ telegramChatId: String(chatId) });
    if (!instance) {
      await this.send(chatId,
        `👋 No agent linked yet. Open the ClawLink app and scan the QR code to connect.`
      );
      return;
    }

    // Show typing indicator
    await this.sendChatAction(chatId, 'typing');

    try {
      let reply: string;

      if (instance.instanceType === 'local') {
        // Relay to local agent via in-memory relay registry
        reply = await RelayRegistry.sendAndAwait(instance.id, userText, chatId);
      } else {
        // Proxy to cloud instance
        reply = await this.callCloudAgent(instance, userText);
      }

      await this.send(chatId, reply);
    } catch (err: any) {
      this.logger.error(`Agent forward error: ${err.message}`);
      await this.send(chatId, `⚠️ Your agent didn't respond. It may be offline. Try again or check the app.`);
    }
  }

  private async callCloudAgent(instance: OpenClawInstance, message: string): Promise<string> {
    if (!instance.instanceUrl) return '⚠️ Agent URL not configured.';
    const resp = await fetch(`${instance.instanceUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(instance.instanceToken ? { Authorization: `Bearer ${instance.instanceToken}` } : {}),
      },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) throw new Error(`Instance returned ${resp.status}`);
    const data: any = await resp.json();
    return data?.reply?.content || data?.content || data?.message || '(no response)';
  }

  /** Generate a Telegram deep-link for the given relay token */
  getDeepLink(relayToken: string): string {
    return `https://t.me/${this.botName}?start=${relayToken}`;
  }

  async send(chatId: number, text: string, extra?: Record<string, any>): Promise<void> {
    if (!this.botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — skipping send');
      return;
    }
    await fetch(`${this.apiBase}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, ...extra }),
    });
  }

  private async sendChatAction(chatId: number, action: string): Promise<void> {
    if (!this.botToken) return;
    await fetch(`${this.apiBase}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action }),
    }).catch(() => null);
  }
}

const HELP_TEXT = `
*ClawLink AI Agent Commands*

Just type any message — the AI will respond.

/status  — Show agent connection status
/help    — Show this help

To manage your agent, open the ClawLink app.
`.trim();

/**
 * In-memory relay registry — maps instanceId → pending resolve callbacks.
 * The LocalRelayGateway pushes agent replies here.
 * In production, replace with Redis pub/sub for multi-node deployment.
 */
export class RelayRegistry {
  private static pending = new Map<
    string,
    { resolve: (reply: string) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();

  /** Telegram side: send a message and wait for the local agent to reply */
  static sendAndAwait(instanceId: string, message: string, chatId: number, timeoutMs = 30_000): Promise<string> {
    return new Promise((resolve, reject) => {
      const key = `${instanceId}:${Date.now()}`;
      const timer = setTimeout(() => {
        RelayRegistry.pending.delete(key);
        reject(new Error('Local agent timed out'));
      }, timeoutMs);

      RelayRegistry.pending.set(key, { resolve, reject, timer });

      // Emit to local agent socket — LocalRelayGateway.emit() is called by the gateway
      RelayRegistry.emitToAgent(instanceId, { key, message, chatId });
    });
  }

  /** Local agent replies back — called by LocalRelayGateway */
  static resolveReply(key: string, reply: string): void {
    const pending = RelayRegistry.pending.get(key);
    if (pending) {
      clearTimeout(pending.timer);
      RelayRegistry.pending.delete(key);
      pending.resolve(reply);
    }
  }

  // Overwritten by LocalRelayGateway on startup
  static emitToAgent: (instanceId: string, payload: object) => void = () => {};
}
