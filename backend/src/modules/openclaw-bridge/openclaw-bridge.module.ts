import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpenClawInstance } from '../../entities/openclaw-instance.entity';
import { OpenClawBridgeService } from './openclaw-bridge.service';
import { OpenClawBridgeController } from './openclaw-bridge.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OpenClawInstance])],
  controllers: [OpenClawBridgeController],
  providers: [OpenClawBridgeService],
  exports: [OpenClawBridgeService],
})
export class OpenClawBridgeModule {}
