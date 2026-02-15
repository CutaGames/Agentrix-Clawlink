/**
 * HQ Core Controller
 * 统一的 API 入口
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Logger,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { HqCoreService, ChatRequest, ChatResponse } from './hq-core.service';
import { UnifiedChatService, UnifiedChatRequest, UnifiedChatResponse } from './unified-chat.service';
import { HqAgent } from '../../entities/hq-agent.entity';
import { HqAlert, AlertStatus, AlertSeverity } from '../../entities/hq-alert.entity';

@ApiTags('HQ Core')
@Controller('hq')
export class HqCoreController {
  private readonly logger = new Logger(HqCoreController.name);

  constructor(
    private readonly hqCoreService: HqCoreService,
    private readonly unifiedChatService: UnifiedChatService,
  ) {}

  // ========== Dashboard ==========

  @Get('dashboard')
  @ApiOperation({ summary: '获取仪表盘统计' })
  async getDashboardStats() {
    return this.hqCoreService.getDashboardStats();
  }

  // ========== Agents ==========

  @Get('agents')
  @ApiOperation({ summary: '获取所有 Agent' })
  async getAgents(): Promise<HqAgent[]> {
    return this.hqCoreService.getAgents();
  }

  @Get('agents/model-mapping')
  @ApiOperation({ summary: '获取 Agent 模型映射与解析结果' })
  async getAgentModelMapping() {
    return this.hqCoreService.getAgentModelDiagnostics();
  }

  @Get('agents/:agentId')
  @ApiOperation({ summary: '获取单个 Agent' })
  async getAgent(@Param('agentId') agentId: string): Promise<HqAgent | null> {
    return this.hqCoreService.getAgent(agentId);
  }

  // ========== 统一聊天接口 (新) ==========

  @Post('unified-chat')
  @ApiOperation({ summary: '统一聊天接口 - 推荐使用' })
  async unifiedChat(@Body() request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
    if (!request?.agentCode) {
      throw new BadRequestException('agentCode is required');
    }
    if (!request?.message) {
      throw new BadRequestException('message is required');
    }
    this.logger.log(`Unified chat: agent=${request.agentCode}, mode=${request.mode || 'general'}`);
    return this.unifiedChatService.chat(request);
  }

  @Get('unified-chat/sessions/:agentCode')
  @ApiOperation({ summary: '获取 Agent 的历史会话' })
  async getAgentSessions(
    @Param('agentCode') agentCode: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.unifiedChatService.getAgentSessions(
      agentCode,
      userId,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('unified-chat/session/:sessionId')
  @ApiOperation({ summary: '获取会话详情' })
  async getSession(@Param('sessionId') sessionId: string) {
    return this.unifiedChatService.getSession(sessionId);
  }

  @Delete('unified-chat/session/:sessionId')
  @ApiOperation({ summary: '删除会话' })
  async deleteSession(@Param('sessionId') sessionId: string) {
    await this.unifiedChatService.deleteSession(sessionId);
    return { success: true };
  }

  // ========== 旧聊天接口 (保持兼容) ==========

  @Post('chat')
  @ApiOperation({ summary: '与 Agent 对话' })
  async chat(@Body() request: ChatRequest): Promise<ChatResponse> {
    this.logger.log(`Chat request for agent ${request.agentId}`);
    return this.hqCoreService.chat(request);
  }

  @Post('chat/stream')
  @ApiOperation({ summary: '与 Agent 对话 (SSE 流式输出)' })
  async chatStream(@Body() request: ChatRequest, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.setTimeout(0);

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('status', { status: 'started', agentId: request.agentId });

    const heartbeat = setInterval(() => {
      res.write(`event: ping\n`);
      res.write(`data: ${Date.now()}\n\n`);
    }, 15000);

    try {
      for await (const event of this.hqCoreService.chatStream(request)) {
        sendEvent(event.type, event.data);
      }
    } catch (error: any) {
      this.logger.error(`Stream error: ${error.message}`);
      sendEvent('error', { message: error?.message || 'Stream failed' });
    } finally {
      clearInterval(heartbeat);
      res.end();
    }
  }

  @Post('chat/completion')
  @ApiOperation({ summary: 'AI 文本补全' })
  async chatCompletion(@Body() request: any) {
    return this.hqCoreService.chatCompletion(request.messages, request.options);
  }

  // ========== Alerts ==========

  @Get('alerts')
  @ApiOperation({ summary: '获取告警列表' })
  async getAlerts(
    @Query('status') status?: AlertStatus,
    @Query('severity') severity?: AlertSeverity,
    @Query('limit') limit?: string,
  ): Promise<HqAlert[]> {
    return this.hqCoreService.getAlerts({
      status,
      severity,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  // ========== Knowledge Base ==========

  @Get('knowledge-base')
  @ApiOperation({ summary: '获取知识库内容' })
  async getKnowledgeBase() {
    return this.hqCoreService.getKnowledgeBase();
  }

  @Post('knowledge-base')
  @ApiOperation({ summary: '保存知识库内容' })
  async saveKnowledgeBase(@Body() body: { content: string }) {
    return this.hqCoreService.saveKnowledgeBase(body.content);
  }

  @Get('rag-files')
  @ApiOperation({ summary: '获取 RAG 文件列表' })
  async getRagFiles() {
    return this.hqCoreService.getRagFiles();
  }

  @Post('rag-files/upload')
  @ApiOperation({ summary: '上传 RAG 文件' })
  async uploadRagFile(@Body() body: { name?: string; filename?: string; content: string }) {
    const name = body.name || body.filename;
    return this.hqCoreService.uploadRagFile(name, body.content);
  }

  @Delete('rag-files/:filename')
  @ApiOperation({ summary: '删除 RAG 文件' })
  async deleteRagFile(@Param('filename') filename: string) {
    return this.hqCoreService.deleteRagFile(`/rag/${filename}`);
  }
}
