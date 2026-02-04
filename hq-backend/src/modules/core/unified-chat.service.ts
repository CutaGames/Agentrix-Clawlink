import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HqAIService } from '../ai/hq-ai.service';
import { PromptBuilderService } from './prompt-builder.service';
import { ChatSession, ChatMessage } from '../../entities/chat-session.entity';

/**
 * 统一聊天服务
 * 解决问题1: 对话入口分散
 * 解决问题2: 聊天记录存储混乱
 * 解决问题6: 简化 API 调用
 */

export interface UnifiedChatRequest {
  agentCode: string;
  message: string;
  sessionId?: string;
  workingDir?: string;
  userId?: string;
  context?: {
    currentFile?: string;
    selectedCode?: string;
    recentFiles?: string[];
    topic?: string;
  };
  mode?: 'workspace' | 'staff' | 'general';
}

export interface UnifiedChatResponse {
  sessionId: string;
  agentCode: string;
  response: string;
  model?: string;
  timestamp: Date;
}

@Injectable()
export class UnifiedChatService {
  private readonly logger = new Logger(UnifiedChatService.name);
  private readonly defaultWorkingDir = '/mnt/d/wsl/Ubuntu-24.04/Code/Agentrix/Agentrix-website';

  constructor(
    private readonly aiService: HqAIService,
    private readonly promptBuilder: PromptBuilderService,
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
  ) {}

  /**
   * 统一的聊天接口 - 所有对话入口都应该调用这个方法
   */
  async chat(request: UnifiedChatRequest): Promise<UnifiedChatResponse> {
    const { 
      agentCode, 
      message, 
      sessionId, 
      workingDir = this.defaultWorkingDir,
      userId,
      context,
      mode = 'general',
    } = request;

    this.logger.log(`📨 UnifiedChat: agent=${agentCode}, mode=${mode}, session=${sessionId || 'new'}`);

    // 1. 获取或创建会话
    let session: ChatSession | null = null;
    if (sessionId) {
      session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    }

    if (!session) {
      session = await this.createSession(agentCode, userId, mode, workingDir);
      this.logger.log(`📝 Created new session: ${session.id}`);
    }

    // 2. 构建系统提示词
    const systemPrompt = this.buildPromptForMode(mode, {
      agentCode,
      workingDir,
      context,
    });

    // 3. 添加用户消息到历史
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    session.messages.push(userMessage);

    // 4. 构建 AI 请求消息
    const conversationMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...session.messages.slice(-20).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // 5. 调用 AI
    const aiResult = await this.aiService.chatForAgent(
      agentCode,
      conversationMessages,
      { systemPrompt, maxTokens: 16384 },
    );

    // 6. 保存 AI 响应
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: aiResult.content,
      timestamp: new Date(),
    };
    session.messages.push(assistantMessage);
    session.lastMessageAt = new Date();
    if (context) {
      session.context = context;
    }

    await this.sessionRepo.save(session);

    this.logger.log(`✅ UnifiedChat complete: session=${session.id}, model=${aiResult.model}`);

    return {
      sessionId: session.id,
      agentCode,
      response: aiResult.content,
      model: aiResult.model,
      timestamp: new Date(),
    };
  }

  /**
   * 获取 Agent 的历史会话
   */
  async getAgentSessions(agentCode: string, userId?: string, limit = 10): Promise<ChatSession[]> {
    const queryBuilder = this.sessionRepo.createQueryBuilder('session')
      .where('session.agentCode = :agentCode', { agentCode })
      .andWhere('session.isActive = :isActive', { isActive: true });
    
    if (userId) {
      queryBuilder.andWhere('session.userId = :userId', { userId });
    }

    return queryBuilder
      .orderBy('session.lastMessageAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * 获取会话详情
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    return this.sessionRepo.findOne({ where: { id: sessionId } });
  }

  /**
   * 创建新会话
   */
  private async createSession(
    agentCode: string,
    userId?: string,
    mode: 'workspace' | 'staff' | 'general' = 'general',
    workingDir?: string,
  ): Promise<ChatSession> {
    const session = this.sessionRepo.create({
      agentCode,
      userId: userId || '',
      mode,
      workingDir: workingDir || this.defaultWorkingDir,
      messages: [],
      isActive: true,
    });
    return this.sessionRepo.save(session);
  }

  /**
   * 根据模式构建系统提示词
   */
  private buildPromptForMode(
    mode: 'workspace' | 'staff' | 'general',
    options: {
      agentCode: string;
      workingDir: string;
      context?: any;
    },
  ): string {
    const { agentCode, workingDir, context } = options;

    switch (mode) {
      case 'workspace':
        return this.promptBuilder.buildWorkspacePrompt({
          agentCode,
          workingDir,
          currentFile: context?.currentFile,
          selectedCode: context?.selectedCode,
          recentFiles: context?.recentFiles,
        });

      case 'staff':
        return this.promptBuilder.buildStaffPrompt({
          agentCode,
          workingDir,
          topic: context?.topic,
        });

      default:
        return this.promptBuilder.buildSystemPrompt({
          agentCode,
          workingDir,
          enableTools: true,
        });
    }
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.sessionRepo.delete(sessionId);
  }
}
