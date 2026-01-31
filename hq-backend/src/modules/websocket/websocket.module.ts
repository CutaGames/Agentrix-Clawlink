/**
 * WebSocket Module
 * 
 * 实时通信模块
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HqWebSocketGateway } from './hq-websocket.gateway';
import { WebSocketController } from './websocket.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [WebSocketController],
  providers: [HqWebSocketGateway],
  exports: [HqWebSocketGateway],
})
export class WebSocketModule {}
