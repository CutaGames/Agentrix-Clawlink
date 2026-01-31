/**
 * Telegram Bot Module
 * 
 * 通过 Telegram 远程控制 Agent
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HqAgent } from '../../entities/hq-agent.entity';
import { HqProject } from '../../entities/project.entity';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramController } from './telegram.controller';
import { TelegramChatHandler } from './telegram-chat.handler';
import { HqCoreModule } from '../core/hq-core.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    TypeOrmModule.forFeature([HqAgent, HqProject]),
    forwardRef(() => HqCoreModule),
  ],
  controllers: [TelegramController],
  providers: [TelegramBotService, TelegramChatHandler],
  exports: [TelegramBotService],
})
export class TelegramModule {}
