/**
 * Chat History Controller
 * 
 * 对话历史API端点
 */

import { Controller, Get, Delete, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ChatHistoryService } from './chat-history.service';

@ApiTags('chat-history')
@Controller('hq/chat/history')
export class ChatHistoryController {
  constructor(private readonly chatHistoryService: ChatHistoryService) {}

  @Get()
  @ApiOperation({ summary: '获取对话历史' })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: '返回对话历史列表' })
  async getHistory(
    @Query('sessionId') sessionId?: string,
    @Query('userId') userId?: string,
    @Query('agentId') agentId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.chatHistoryService.getHistory({
      sessionId,
      userId,
      agentId,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });
  }

  @Get('sessions/:userId')
  @ApiOperation({ summary: '获取用户的所有会话ID' })
  @ApiResponse({ status: 200, description: '返回会话ID列表' })
  async getUserSessions(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.chatHistoryService.getUserSessions(
      userId,
      limit ? Number(limit) : 50,
    );
  }

  @Get('stats/:agentId')
  @ApiOperation({ summary: '获取Agent的对话统计' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: '返回统计数据' })
  async getAgentStats(
    @Param('agentId') agentId: string,
    @Query('days') days?: number,
  ) {
    return this.chatHistoryService.getAgentStats(
      agentId,
      days ? Number(days) : 7,
    );
  }

  @Delete('cleanup')
  @ApiOperation({ summary: '清理旧的对话记录' })
  @ApiQuery({ name: 'daysToKeep', required: false, type: Number })
  @ApiResponse({ status: 200, description: '返回清理数量' })
  async cleanupOldChats(@Query('daysToKeep') daysToKeep?: number) {
    const count = await this.chatHistoryService.cleanupOldChats(
      daysToKeep ? Number(daysToKeep) : 30,
    );
    return { deleted: count };
  }
}
