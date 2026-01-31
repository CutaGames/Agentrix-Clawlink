/**
 * Agent Memory Service
 * 
 * 实现 Agent 长期记忆能力，类似 Moltbot
 * 
 * 核心功能：
 * 1. 对话历史存储与检索
 * 2. 语义搜索（基于向量嵌入）
 * 3. 记忆压缩与摘要
 * 4. 记忆关联与推理
 * 5. 跨项目上下文管理
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In, LessThan, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  AgentMemory,
  MemoryType,
  MemoryImportance,
  MemoryAssociation,
  MemorySession,
} from '../../entities/agent-memory.entity';

export interface MemoryContext {
  agentId: string;
  projectId?: string;
  sessionId?: string;
  userId?: string;
}

export interface StoreMemoryInput {
  content: string;
  type: MemoryType;
  importance?: MemoryImportance;
  metadata?: Record<string, any>;
  summary?: string;
}

export interface RetrieveMemoryOptions {
  types?: MemoryType[];
  limit?: number;
  minImportance?: MemoryImportance;
  since?: Date;
  includeExpired?: boolean;
}

export interface MemorySearchResult {
  memory: AgentMemory;
  relevanceScore: number;
}

@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);
  private readonly maxContextTokens: number;
  private readonly retentionDays: number;

  constructor(
    @InjectRepository(AgentMemory)
    private memoryRepo: Repository<AgentMemory>,
    @InjectRepository(MemoryAssociation)
    private associationRepo: Repository<MemoryAssociation>,
    @InjectRepository(MemorySession)
    private sessionRepo: Repository<MemorySession>,
    private configService: ConfigService,
  ) {
    this.maxContextTokens = this.configService.get('MEMORY_MAX_CONTEXT_TOKENS', 8000);
    this.retentionDays = this.configService.get('MEMORY_RETENTION_DAYS', 365);
  }

  /**
   * 存储记忆
   */
  async storeMemory(context: MemoryContext, input: StoreMemoryInput): Promise<AgentMemory> {
    const memory = this.memoryRepo.create({
      agentId: context.agentId,
      projectId: context.projectId,
      sessionId: context.sessionId,
      type: input.type,
      importance: input.importance || MemoryImportance.MEDIUM,
      content: input.content,
      summary: input.summary,
      metadata: input.metadata,
      // embedding 将在后续通过 AI 模型生成
    });

    const saved = await this.memoryRepo.save(memory);
    this.logger.debug(`Stored memory ${saved.id} for agent ${context.agentId}`);

    // 自动生成摘要（如果内容较长）
    if (!input.summary && input.content.length > 500) {
      this.generateSummaryAsync(saved.id);
    }

    return saved;
  }

  /**
   * 存储对话消息
   */
  async storeConversation(
    context: MemoryContext,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<AgentMemory> {
    return this.storeMemory(context, {
      type: MemoryType.CONVERSATION,
      content: `[${role}]: ${content}`,
      importance: MemoryImportance.MEDIUM,
      metadata: { role },
    });
  }

  /**
   * 存储决策记录
   */
  async storeDecision(
    context: MemoryContext,
    decision: string,
    reasoning: string,
    outcome?: string,
  ): Promise<AgentMemory> {
    return this.storeMemory(context, {
      type: MemoryType.DECISION,
      content: `Decision: ${decision}\nReasoning: ${reasoning}${outcome ? `\nOutcome: ${outcome}` : ''}`,
      importance: MemoryImportance.HIGH,
      metadata: { decision, reasoning, outcome },
    });
  }

  /**
   * 存储洞察
   */
  async storeInsight(context: MemoryContext, insight: string, evidence?: string[]): Promise<AgentMemory> {
    return this.storeMemory(context, {
      type: MemoryType.INSIGHT,
      content: insight,
      importance: MemoryImportance.HIGH,
      metadata: { evidence },
    });
  }

  /**
   * 检索记忆
   */
  async retrieveMemories(
    context: MemoryContext,
    options: RetrieveMemoryOptions = {},
  ): Promise<AgentMemory[]> {
    const {
      types,
      limit = 50,
      minImportance,
      since,
      includeExpired = false,
    } = options;

    const query = this.memoryRepo.createQueryBuilder('memory')
      .where('memory.agentId = :agentId', { agentId: context.agentId })
      .andWhere('memory.isActive = :isActive', { isActive: true });

    if (context.projectId) {
      query.andWhere('(memory.projectId = :projectId OR memory.projectId IS NULL)', {
        projectId: context.projectId,
      });
    }

    if (types && types.length > 0) {
      query.andWhere('memory.type IN (:...types)', { types });
    }

    if (minImportance) {
      const importanceOrder = ['low', 'medium', 'high', 'critical'];
      const minIndex = importanceOrder.indexOf(minImportance);
      const validImportances = importanceOrder.slice(minIndex);
      query.andWhere('memory.importance IN (:...importances)', { importances: validImportances });
    }

    if (since) {
      query.andWhere('memory.createdAt >= :since', { since });
    }

    if (!includeExpired) {
      query.andWhere('(memory.expiresAt IS NULL OR memory.expiresAt > :now)', { now: new Date() });
    }

    query.orderBy('memory.createdAt', 'DESC').take(limit);

    const memories = await query.getMany();

    // 更新访问计数
    if (memories.length > 0) {
      await this.memoryRepo.update(
        { id: In(memories.map(m => m.id)) },
        { accessCount: () => 'access_count + 1', lastAccessedAt: new Date() },
      );
    }

    return memories;
  }

  /**
   * 获取最近的对话历史
   */
  async getRecentConversations(
    context: MemoryContext,
    limit: number = 20,
  ): Promise<AgentMemory[]> {
    return this.retrieveMemories(context, {
      types: [MemoryType.CONVERSATION],
      limit,
    });
  }

  /**
   * 获取项目上下文记忆
   */
  async getProjectContext(agentId: string, projectId: string): Promise<AgentMemory[]> {
    return this.retrieveMemories(
      { agentId, projectId },
      {
        types: [MemoryType.PROJECT_CONTEXT, MemoryType.KNOWLEDGE],
        minImportance: MemoryImportance.MEDIUM,
        limit: 30,
      },
    );
  }

  /**
   * 语义搜索记忆
   */
  async searchMemories(
    context: MemoryContext,
    query: string,
    limit: number = 10,
  ): Promise<MemorySearchResult[]> {
    // TODO: 实现向量搜索
    // 目前使用简单的文本匹配
    const memories = await this.memoryRepo
      .createQueryBuilder('memory')
      .where('memory.agentId = :agentId', { agentId: context.agentId })
      .andWhere('memory.isActive = :isActive', { isActive: true })
      .andWhere('memory.content ILIKE :query', { query: `%${query}%` })
      .orderBy('memory.importance', 'DESC')
      .addOrderBy('memory.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return memories.map(memory => ({
      memory,
      relevanceScore: 1.0, // 简化版，后续使用向量相似度
    }));
  }

  /**
   * 构建上下文提示词
   */
  async buildContextPrompt(context: MemoryContext): Promise<string> {
    const parts: string[] = [];

    // 1. 获取项目上下文
    if (context.projectId) {
      const projectMemories = await this.getProjectContext(context.agentId, context.projectId);
      if (projectMemories.length > 0) {
        parts.push('## Project Context');
        projectMemories.forEach(m => parts.push(`- ${m.summary || m.content.substring(0, 200)}`));
      }
    }

    // 2. 获取重要洞察
    const insights = await this.retrieveMemories(context, {
      types: [MemoryType.INSIGHT],
      minImportance: MemoryImportance.HIGH,
      limit: 5,
    });
    if (insights.length > 0) {
      parts.push('\n## Key Insights');
      insights.forEach(m => parts.push(`- ${m.content}`));
    }

    // 3. 获取最近决策
    const decisions = await this.retrieveMemories(context, {
      types: [MemoryType.DECISION],
      limit: 5,
    });
    if (decisions.length > 0) {
      parts.push('\n## Recent Decisions');
      decisions.forEach(m => parts.push(`- ${m.summary || m.content.substring(0, 200)}`));
    }

    // 4. 获取最近对话
    const conversations = await this.getRecentConversations(context, 10);
    if (conversations.length > 0) {
      parts.push('\n## Recent Conversation');
      // 按时间正序
      conversations.reverse().forEach(m => parts.push(m.content));
    }

    return parts.join('\n');
  }

  /**
   * 会话管理
   */
  async startSession(context: MemoryContext, title?: string): Promise<MemorySession> {
    const session = this.sessionRepo.create({
      agentId: context.agentId,
      projectId: context.projectId,
      userId: context.userId,
      title,
      isActive: true,
    });
    return this.sessionRepo.save(session);
  }

  async endSession(sessionId: string): Promise<void> {
    await this.sessionRepo.update(sessionId, {
      isActive: false,
      endedAt: new Date(),
    });
  }

  async getActiveSession(context: MemoryContext): Promise<MemorySession | null> {
    return this.sessionRepo.findOne({
      where: {
        agentId: context.agentId,
        projectId: context.projectId,
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 记忆压缩 - 将多条记忆合并为摘要
   */
  async compressMemories(memoryIds: string[]): Promise<AgentMemory> {
    const memories = await this.memoryRepo.findBy({ id: In(memoryIds) });
    if (memories.length === 0) {
      throw new Error('No memories found to compress');
    }

    const agentId = memories[0].agentId;
    const projectId = memories[0].projectId;

    // 合并内容
    const combinedContent = memories.map(m => m.content).join('\n---\n');

    // TODO: 使用 AI 生成摘要
    const summary = `Compressed ${memories.length} memories from ${memories[0].createdAt.toISOString()} to ${memories[memories.length - 1].createdAt.toISOString()}`;

    // 创建压缩记忆
    const compressed = await this.storeMemory(
      { agentId, projectId },
      {
        type: MemoryType.KNOWLEDGE,
        content: combinedContent,
        summary,
        importance: MemoryImportance.HIGH,
        metadata: {
          compressedFrom: memoryIds,
          originalCount: memories.length,
        },
      },
    );

    // 标记原始记忆为非活跃
    await this.memoryRepo.update(memoryIds, { isActive: false });

    return compressed;
  }

  /**
   * 清理过期记忆
   */
  async cleanupExpiredMemories(): Promise<number> {
    const result = await this.memoryRepo.update(
      {
        expiresAt: LessThan(new Date()),
        isActive: true,
      },
      { isActive: false },
    );
    this.logger.log(`Cleaned up ${result.affected} expired memories`);
    return result.affected || 0;
  }

  /**
   * 异步生成摘要
   */
  private async generateSummaryAsync(memoryId: string): Promise<void> {
    // TODO: 使用 AI 生成摘要
    // 这里先跳过，后续集成 AI 模型
  }

  /**
   * 获取记忆统计
   */
  async getMemoryStats(agentId: string): Promise<{
    total: number;
    byType: Record<MemoryType, number>;
    byImportance: Record<MemoryImportance, number>;
  }> {
    const memories = await this.memoryRepo.find({
      where: { agentId, isActive: true },
      select: ['type', 'importance'],
    });

    const byType: Record<string, number> = {};
    const byImportance: Record<string, number> = {};

    memories.forEach(m => {
      byType[m.type] = (byType[m.type] || 0) + 1;
      byImportance[m.importance] = (byImportance[m.importance] || 0) + 1;
    });

    return {
      total: memories.length,
      byType: byType as Record<MemoryType, number>,
      byImportance: byImportance as Record<MemoryImportance, number>,
    };
  }
}
