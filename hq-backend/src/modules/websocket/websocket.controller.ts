/**
 * WebSocket Controller
 * 
 * WebSocket 状态和管理 API
 */

import { Controller, Get } from '@nestjs/common';
import { HqWebSocketGateway } from './hq-websocket.gateway';

@Controller('hq/websocket')
export class WebSocketController {
  constructor(private readonly wsGateway: HqWebSocketGateway) {}

  /**
   * 获取 WebSocket 状态
   * GET /api/hq/websocket/status
   */
  @Get('status')
  getStatus() {
    return {
      success: true,
      data: {
        onlineClients: this.wsGateway.getOnlineCount(),
        namespace: '/hq',
        features: ['chat', 'task', 'skill', 'alert', 'agent-status', 'project-update'],
      },
    };
  }

  /**
   * 健康检查
   * GET /api/hq/websocket/health
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'websocket',
      onlineClients: this.wsGateway.getOnlineCount(),
    };
  }
}
