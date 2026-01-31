/**
 * App Controller
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('HQ System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: '根路径' })
  getRoot(): { message: string; version: string } {
    return {
      message: 'Agentrix HQ Backend',
      version: '1.0.0',
    };
  }

  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  getHealth(): { status: string; timestamp: string } {
    return this.appService.getHealth();
  }
}
