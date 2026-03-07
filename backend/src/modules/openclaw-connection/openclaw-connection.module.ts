import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpenClawInstance } from '../../entities/openclaw-instance.entity';
import { OpenClawConnectionService } from './openclaw-connection.service';
import { OpenClawConnectionController } from './openclaw-connection.controller';
import { TelegramBotService } from './telegram-bot.service';
import { LocalRelayGateway } from './local-relay.gateway';
import { SkillModule } from '../skill/skill.module';

@Module({
  imports: [TypeOrmModule.forFeature([OpenClawInstance]), forwardRef(() => SkillModule)],
  providers: [OpenClawConnectionService, TelegramBotService, LocalRelayGateway],
  controllers: [OpenClawConnectionController],
  exports: [OpenClawConnectionService, TelegramBotService],
})
export class OpenClawConnectionModule {}
