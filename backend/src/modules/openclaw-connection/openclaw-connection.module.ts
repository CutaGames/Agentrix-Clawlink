import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpenClawInstance } from '../../entities/openclaw-instance.entity';
import { OpenClawConnectionService } from './openclaw-connection.service';
import { OpenClawConnectionController } from './openclaw-connection.controller';
import { TelegramBotService } from './telegram-bot.service';
import { LocalRelayGateway } from './local-relay.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([OpenClawInstance])],
  providers: [OpenClawConnectionService, TelegramBotService, LocalRelayGateway],
  controllers: [OpenClawConnectionController],
  exports: [OpenClawConnectionService, TelegramBotService],
})
export class OpenClawConnectionModule {}
