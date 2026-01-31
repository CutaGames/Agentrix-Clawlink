/**
 * HQ Core Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HqCoreService, ChatRequest, ChatResponse } from './hq-core.service';
import { HqAgent } from '../../entities/hq-agent.entity';
import { HqAlert, AlertStatus, AlertSeverity } from '../../entities/hq-alert.entity';

@ApiTags('HQ Core')
@Controller('hq')
export class HqCoreController {
  private readonly logger = new Logger(HqCoreController.name);

  constructor(private readonly hqCoreService: HqCoreService) {}

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

  @Get('agents/:agentId')
  @ApiOperation({ summary: '获取单个 Agent' })
  async getAgent(@Param('agentId') agentId: string): Promise<HqAgent | null> {
    return this.hqCoreService.getAgent(agentId);
  }

  // ========== Chat ==========

  @Post('chat')
  @ApiOperation({ summary: '与 Agent 对话 (含记忆)' })
  async chat(@Body() request: ChatRequest): Promise<ChatResponse> {
    this.logger.log(`Chat request for agent ${request.agentId}`);
    return this.hqCoreService.chat(request);
  }

  // ========== Alerts ==========

  @Get('alerts')
  @ApiOperation({ summary: '获取告警列表' })
  async getAlerts(
    @Query('projectId') projectId?: string,
    @Query('status') status?: AlertStatus,
    @Query('severity') severity?: AlertSeverity,
    @Query('limit') limit?: string,
  ): Promise<HqAlert[]> {
    return this.hqCoreService.getAlerts({
      projectId,
      status,
      severity,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Put('alerts/:alertId/acknowledge')
  @ApiOperation({ summary: '确认告警' })
  async acknowledgeAlert(
    @Param('alertId') alertId: string,
    @Body() body: { userId: string },
  ): Promise<{ success: boolean }> {
    await this.hqCoreService.acknowledgeAlert(alertId, body.userId);
    return { success: true };
  }

  @Put('alerts/:alertId/resolve')
  @ApiOperation({ summary: '解决告警' })
  async resolveAlert(
    @Param('alertId') alertId: string,
    @Body() body: { userId: string; notes?: string },
  ): Promise<{ success: boolean }> {
    await this.hqCoreService.resolveAlert(alertId, body.userId, body.notes);
    return { success: true };
  }

  // ========== Knowledge Base (简化版) ==========

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
  async uploadRagFile(@Body() body: { name: string; content: string }) {
    return this.hqCoreService.uploadRagFile(body.name, body.content);
  }

  @Post('rag-files/delete')
  @ApiOperation({ summary: '删除 RAG 文件' })
  async deleteRagFile(@Body() body: { path: string }) {
    return this.hqCoreService.deleteRagFile(body.path);
  }
}
