/**
 * Social Media Module
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import {
  TelegramBotService,
  TwitterService,
  DiscordBotService,
  SocialMediaService,
  SocialSchedulerService,
} from './social-media.service';
import { SocialMediaController } from './social-media.controller';
import { EmailService } from './email.service';

@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule],
  controllers: [SocialMediaController],
  providers: [
    TelegramBotService,
    TwitterService,
    DiscordBotService,
    SocialMediaService,
    SocialSchedulerService,
    EmailService,
  ],
  exports: [SocialMediaService, TelegramBotService, TwitterService, DiscordBotService, EmailService],
})
export class SocialMediaModule {}
