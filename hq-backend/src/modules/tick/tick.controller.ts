/**
 * Tick Controller
 * 
 * Agent Tick执行API端点
 */

import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TickService } from '../../hq/tick/tick.service';

export class ExecuteTickDto {
  agentId?: string;
  type?: 'scheduled' | 'manual' | 'triggered';
}

@ApiTags('agent-tick')
@Controller('hq/tick')
export class TickController {
  constructor(private readonly tickService: TickService) {}

  @Post('execute')
  @ApiOperation({ summary: '手动触发Tick执行' })
  @ApiResponse({ status: 201, description: 'Tick执行已启动' })
  async executeTick(@Body() dto: ExecuteTickDto) {
    const result = await this.tickService.executeTick(dto.type || 'manual');
    return {
      success: true,
      message: 'Tick execution completed',
      agentId: dto.agentId,
      type: dto.type || 'manual',
      result,
    };
  }

  @Get('executions')
  @ApiOperation({ summary: '获取Tick执行历史' })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: '返回执行历史列表' })
  async getExecutions(
    @Query('agentId') agentId?: string,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    const result = await this.tickService.getExecutions({
      limit: limit ? Number(limit) : undefined,
      status,
    });

    return result;
  }

  @Get('stats')
  @ApiOperation({ summary: '获取Tick统计数据' })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: '返回统计数据' })
  async getStats(
    @Query('agentId') agentId?: string,
    @Query('days') days?: number,
  ) {
    return this.tickService.getStats(days ? Number(days) : 7);
  }

  @Get('agents/:agentId/status')
  @ApiOperation({ summary: '获取Agent的Tick状态' })
  @ApiResponse({ status: 200, description: '返回Agent状态' })
  async getAgentStatus(@Param('agentId') agentId: string) {
    return this.tickService.getAgentStatus(agentId);
  }

  @Post('agents/:agentId/pause')
  @ApiOperation({ summary: '暂停Agent的自动Tick' })
  @ApiResponse({ status: 200, description: 'Agent已暂停' })
  async pauseAgent(@Param('agentId') agentId: string) {
    return this.tickService.pauseAgent(agentId);
  }

  @Post('agents/:agentId/resume')
  @ApiOperation({ summary: '恢复Agent的自动Tick' })
  @ApiResponse({ status: 200, description: 'Agent已恢复' })
  async resumeAgent(@Param('agentId') agentId: string) {
    return this.tickService.resumeAgent(agentId);
  }
}
