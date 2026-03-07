import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpenClawInstance } from '../../entities/openclaw-instance.entity';
import { OpenClawConnectionService } from './openclaw-connection.service';
import { OpenClawConnectionController } from './openclaw-connection.controller';
import { TelegramBotService } from './telegram-bot.service';
import { LocalRelayGateway } from './local-relay.gateway';
import { VoiceModule } from '../voice/voice.module';

@Module({
  imports: [TypeOrmModule.forFeature([OpenClawInstance]), VoiceModule],
  providers: [OpenClawConnectionService, TelegramBotService, LocalRelayGateway],
  controllers: [OpenClawConnectionController],
  exports: [OpenClawConnectionService, TelegramBotService],
})
export class OpenClawConnectionModule {}
