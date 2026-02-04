import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramModule } from '../telegram/telegram.module';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

@Module({
  imports: [ConfigModule, TelegramModule],
  controllers: [SocialController],
  providers: [SocialService],
})
export class SocialModule {}
