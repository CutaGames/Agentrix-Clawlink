/**
 * Agent Communication Controller
 * 
 * Agent间通信API端点
 */

import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AgentCommunicationService } from '../../hq/tick/agent-communication.service';

export class SendMessageDto {
  fromAgentCode: string;
  toAgentCode: string;
  content: string;
  message?: string;
  messageType?: 'request' | 'response' | 'notification' | 'delegation';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  context?: Record<string, any>;
}

export class DelegateTaskDto {
  fromAgentCode: string;
  toAgentCode: string;
  taskTitle: string;
  taskDescription: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  estimatedCost?: number;
  requiredSkills?: string[];
  deadline?: Date;
}

@ApiTags('agent-communication')
@Controller('hq/agents/communication')
export class AgentCommunicationController {
  constructor(
    private readonly communicationService: AgentCommunicationService,
  ) {}

  @Post('send')
  @ApiOperation({ summary: '发送消息给另一个Agent' })
  @ApiResponse({ status: 201, description: '消息已发送' })
  async sendMessage(@Body() dto: SendMessageDto) {
    const content = dto.content || dto.message;
    if (!content) {
      throw new BadRequestException('content is required');
    }
    return this.communicationService.sendMessage(
      dto.fromAgentCode,
      dto.toAgentCode,
      content,
      {
        messageType: dto.messageType,
        priority: dto.priority,
        context: dto.context,
      }
    );
  }

  @Get(':agentCode/messages')
  @ApiOperation({ summary: '获取Agent的待处理消息' })
  @ApiResponse({ status: 200, description: '返回消息列表' })
  async getPendingMessages(@Param('agentCode') agentCode: string) {
    return this.communicationService.getPendingMessages(agentCode);
  }

  @Post('messages/:messageId/read')
  @ApiOperation({ summary: '标记消息为已读' })
  @ApiResponse({ status: 200, description: '消息已标记为已读' })
  async markMessageAsRead(
    @Param('messageId') messageId: string,
    @Query('agentCode') agentCode: string,
  ) {
    await this.communicationService.markMessageAsRead(messageId, agentCode);
    return { success: true };
  }

  @Post('delegate')
  @ApiOperation({ summary: '委托任务给另一个Agent' })
  @ApiResponse({ status: 201, description: '任务已委托' })
  async delegateTask(@Body() dto: DelegateTaskDto) {
    return this.communicationService.delegateTask(
      dto.fromAgentCode,
      dto.toAgentCode,
      {
        taskTitle: dto.taskTitle,
        taskDescription: dto.taskDescription,
        priority: dto.priority as any,
        estimatedCost: dto.estimatedCost,
        requiredSkills: dto.requiredSkills,
        deadline: dto.deadline,
      }
    );
  }

  @Post('messages/:messageId/respond')
  @ApiOperation({ summary: '回复消息' })
  @ApiResponse({ status: 201, description: '回复已发送' })
  async respondToMessage(
    @Param('messageId') messageId: string,
    @Body() body: { agentCode: string; response: string },
  ) {
    const response = await this.communicationService.respondToMessage(
      messageId,
      body.agentCode,
      body.response,
    );
    await this.communicationService.markMessageAsRead(messageId, body.agentCode);
    return { success: true, response };
  }

  @Get('history/:agentCode')
  @ApiOperation({ summary: '获取Agent的通信历史' })
  @ApiResponse({ status: 200, description: '返回通信历史' })
  async getCommunicationHistory(
    @Param('agentCode') agentCode: string,
    @Query('limit') limit?: number,
    @Query('peer') peer?: string,
  ) {
    const messages = await this.communicationService.getAgentHistory(
      agentCode,
      limit ? Number(limit) : 50,
      peer,
    );
    return { messages, total: messages.length };
  }
}
