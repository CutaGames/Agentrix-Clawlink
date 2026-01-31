/**
 * Telegram Chat Handler
 * 
 * Handles chat messages from Telegram and routes them to the AI service
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HqCoreService } from '../core/hq-core.service';

interface TelegramChatEvent {
  agentId: string;
  projectId?: string;
  message: string;
  chatId: number;
  userId: number;
}

interface TelegramTaskEvent {
  agentId: string;
  projectId?: string;
  task: string;
  chatId: number;
  userId: number;
}

@Injectable()
export class TelegramChatHandler {
  private readonly logger = new Logger(TelegramChatHandler.name);

  constructor(
    @Inject(forwardRef(() => HqCoreService))
    private readonly coreService: HqCoreService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Handle chat messages from Telegram
   */
  @OnEvent('telegram.chat')
  async handleTelegramChat(event: TelegramChatEvent): Promise<void> {
    this.logger.log(`Telegram chat from ${event.userId}: ${event.message.substring(0, 50)}...`);

    try {
      // Call the AI service
      const response = await this.coreService.chat({
        agentId: event.agentId,
        projectId: event.projectId,
        messages: [{ role: 'user', content: event.message }],
        useMemory: true,
      });

      // Emit response back to Telegram
      this.eventEmitter.emit('telegram.chat.response', {
        chatId: event.chatId,
        response: `🤖 <b>Agent 回复</b>\n\n${response.content}\n\n<i>Model: ${response.model || 'AI'}</i>`,
      });
    } catch (error: any) {
      this.logger.error(`Telegram chat error: ${error.message}`);
      
      this.eventEmitter.emit('telegram.chat.response', {
        chatId: event.chatId,
        response: `❌ <b>错误</b>\n\n${error.message}`,
      });
    }
  }

  /**
   * Handle task execution from Telegram
   */
  @OnEvent('telegram.task')
  async handleTelegramTask(event: TelegramTaskEvent): Promise<void> {
    this.logger.log(`Telegram task from ${event.userId}: ${event.task.substring(0, 50)}...`);

    try {
      // Create a task-oriented message
      const taskPrompt = `请执行以下任务并给出详细结果：\n\n${event.task}`;

      const response = await this.coreService.chat({
        agentId: event.agentId,
        projectId: event.projectId,
        messages: [{ role: 'user', content: taskPrompt }],
        useMemory: true,
      });

      // Emit task completed event
      this.eventEmitter.emit('task.completed', {
        agentId: event.agentId,
        task: event.task,
        result: response.content,
        chatId: event.chatId,
      });
    } catch (error: any) {
      this.logger.error(`Telegram task error: ${error.message}`);
      
      this.eventEmitter.emit('telegram.chat.response', {
        chatId: event.chatId,
        response: `❌ <b>任务执行失败</b>\n\n${error.message}`,
      });
    }
  }
}
