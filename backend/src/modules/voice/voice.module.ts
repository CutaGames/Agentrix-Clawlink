import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { VoiceController } from './voice.controller';
import { VoiceMetricsController } from './voice-metrics.controller';
import { VoiceService } from './voice.service';
import { RealtimeVoiceGateway } from './realtime-voice.gateway';
import { VoiceSessionStore } from './voice-session.store';
import { VoiceSessionHandoffService } from './voice-session-handoff.service';
import { VoiceABTestService } from './voice-ab-test.service';

@Module({
  imports: [JwtModule, ConfigModule],
  controllers: [VoiceController, VoiceMetricsController],
  providers: [
    VoiceService,
    RealtimeVoiceGateway,
    VoiceSessionStore,
    VoiceSessionHandoffService,
    VoiceABTestService,
  ],
  exports: [VoiceService, VoiceSessionStore, VoiceSessionHandoffService, VoiceABTestService],
})
export class VoiceModule {}
