/**
 * Memory Controller
 * 
 * Agent 记忆管理 API
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  AgentMemoryService,
  MemoryContext,
  StoreMemoryInput,
  RetrieveMemoryOptions,
} from './agent-memory.service';
import { AgentMemory, MemoryType, MemoryImportance } from '../../entities/agent-memory.entity';

// DTOs
class StoreMemoryDto {
  agentId: string;
  type: MemoryType;
  content: string;
  importance?: MemoryImportance;
  sessionId?: string;
  projectId?: string;
  summary?: string;
  metadata?: Record<string, any>;
}

class StoreConversationDto {
  agentId: string;
  sessionId?: string;
  projectId?: string;
  role: 'user' | 'assistant';
  content: string;
}

class StoreDecisionDto {
  agentId: string;
  sessionId?: string;
  projectId?: string;
  decision: string;
  reasoning: string;
  outcome?: string;
}

class StoreInsightDto {
  agentId: string;
  sessionId?: string;
  projectId?: string;
  insight: string;
  evidence?: string[];
}

class SearchQueryDto {
  query: string;
  agentId: string;
  projectId?: string;
  types?: MemoryType[];
  limit?: number;
}

@ApiTags('Memory')
@Controller('memory')
export class MemoryController {
  private readonly logger = new Logger(MemoryController.name);

  constructor(private readonly memoryService: AgentMemoryService) {}

  // ========== Store Memory ==========

  @Post()
  @ApiOperation({ summary: '存储记忆' })
  async storeMemory(@Body() dto: StoreMemoryDto): Promise<AgentMemory> {
    this.logger.log(`Storing ${dto.type} memory for agent ${dto.agentId}`);
    const context: MemoryContext = {
      agentId: dto.agentId,
      projectId: dto.projectId,
      sessionId: dto.sessionId,
    };
    const input: StoreMemoryInput = {
      type: dto.type,
      content: dto.content,
      importance: dto.importance,
      summary: dto.summary,
      metadata: dto.metadata,
    };
    return this.memoryService.storeMemory(context, input);
  }

  @Post('conversation')
  @ApiOperation({ summary: '存储对话记忆' })
  async storeConversation(@Body() dto: StoreConversationDto): Promise<AgentMemory> {
    const context: MemoryContext = {
      agentId: dto.agentId,
      projectId: dto.projectId,
      sessionId: dto.sessionId,
    };
    return this.memoryService.storeConversation(context, dto.role, dto.content);
  }

  @Post('decision')
  @ApiOperation({ summary: '存储决策记忆' })
  async storeDecision(@Body() dto: StoreDecisionDto): Promise<AgentMemory> {
    const context: MemoryContext = {
      agentId: dto.agentId,
      projectId: dto.projectId,
      sessionId: dto.sessionId,
    };
    return this.memoryService.storeDecision(context, dto.decision, dto.reasoning, dto.outcome);
  }

  @Post('insight')
  @ApiOperation({ summary: '存储洞察记忆' })
  async storeInsight(@Body() dto: StoreInsightDto): Promise<AgentMemory> {
    const context: MemoryContext = {
      agentId: dto.agentId,
      projectId: dto.projectId,
      sessionId: dto.sessionId,
    };
    return this.memoryService.storeInsight(context, dto.insight, dto.evidence);
  }

  // ========== Retrieve Memory ==========

  @Get('agent/:agentId')
  @ApiOperation({ summary: '获取 Agent 的记忆' })
  @ApiQuery({ name: 'types', required: false, description: 'Comma-separated memory types' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'minImportance', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'includeExpired', required: false })
  async retrieveMemories(
    @Param('agentId') agentId: string,
    @Query('types') types?: string,
    @Query('projectId') projectId?: string,
    @Query('minImportance') minImportance?: MemoryImportance,
    @Query('limit') limit?: string,
    @Query('includeExpired') includeExpired?: string,
  ): Promise<AgentMemory[]> {
    const context: MemoryContext = { agentId, projectId };
    const options: RetrieveMemoryOptions = {
      minImportance,
      limit: limit ? parseInt(limit) : undefined,
      includeExpired: includeExpired === 'true',
    };
    
    if (types) {
      options.types = types.split(',') as MemoryType[];
    }
    
    return this.memoryService.retrieveMemories(context, options);
  }

  // ========== Search Memory ==========

  @Post('search')
  @ApiOperation({ summary: '搜索记忆' })
  async searchMemories(@Body() dto: SearchQueryDto) {
    const context: MemoryContext = {
      agentId: dto.agentId,
      projectId: dto.projectId,
    };
    return this.memoryService.searchMemories(context, dto.query, dto.limit || 10);
  }

  // ========== Context Building ==========

  @Get('context/:agentId')
  @ApiOperation({ summary: '构建上下文提示' })
  @ApiQuery({ name: 'projectId', required: false })
  async buildContextPrompt(
    @Param('agentId') agentId: string,
    @Query('projectId') projectId?: string,
  ): Promise<{ contextPrompt: string; memoryCount: number }> {
    const context: MemoryContext = { agentId, projectId };
    const prompt = await this.memoryService.buildContextPrompt(context);
    
    const memories = await this.memoryService.retrieveMemories(context, { limit: 50 });
    
    return {
      contextPrompt: prompt,
      memoryCount: memories.length,
    };
  }

  // ========== Memory Management ==========

  @Delete('expired')
  @ApiOperation({ summary: '清理过期记忆' })
  async cleanupExpired(): Promise<{ deletedCount: number }> {
    const deleted = await this.memoryService.cleanupExpiredMemories();
    return { deletedCount: deleted };
  }

  // ========== Statistics ==========

  @Get('stats/:agentId')
  @ApiOperation({ summary: '获取 Agent 记忆统计' })
  async getMemoryStats(@Param('agentId') agentId: string) {
    return this.memoryService.getMemoryStats(agentId);
  }
}
