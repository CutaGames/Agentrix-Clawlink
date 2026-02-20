import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HqAIService } from '../ai/hq-ai.service';
import { PromptBuilderService } from './prompt-builder.service';
import { ChatSession, ChatMessage } from '../../entities/chat-session.entity';
import { ChatHistoryService } from '../chat-history/chat-history.service';
import { ChatMessageRole } from '../../entities/chat-history.entity';
import { ToolService } from '../tools/tool.service';

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
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

@Injectable()
export class UnifiedChatService {
  private readonly logger = new Logger(UnifiedChatService.name);
  private readonly defaultWorkingDir: string;
  private readonly maxToolIterations: number;
  private readonly maxTokens: number;
  private readonly maxHistoryMessages: number;

  constructor(
    private readonly aiService: HqAIService,
    private readonly promptBuilder: PromptBuilderService,
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
    private readonly chatHistoryService: ChatHistoryService,
    private readonly configService: ConfigService,
    private readonly toolService: ToolService,
  ) {
    this.defaultWorkingDir = this.configService.get<string>(
      'HQ_DEFAULT_WORKING_DIR',
      '/home/ubuntu/Agentrix-independent-HQ',
    );

    // FREE-tier protection defaults
    this.maxToolIterations = Math.max(1, Number(this.configService.get<string>('HQ_MAX_TOOL_ITERATIONS', '3')) || 3);
    this.maxTokens = Math.max(256, Number(this.configService.get<string>('HQ_MAX_TOKENS', '4096')) || 4096);
    this.maxHistoryMessages = Math.max(4, Number(this.configService.get<string>('HQ_MAX_HISTORY_MESSAGES', '12')) || 12);
  }

  /**
   * 统一的聊天接口 - 所有对话入口都应该调用这个方法（带工具执行）
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

    // 3. 获取 Agent 工具列表
    // 说明：当前工具执行循环依赖 Provider 的原生 tool calling（Bedrock/Gemini）。
    // 对不支持原生 tool calling 的 Provider（如 Groq 文本模式），禁用 tools，避免无意义的大 token 开销。
    const agentRole = agentCode.split('-')[0].toLowerCase(); // CEO, SOCIAL, BD, etc.
    const mapping = this.aiService.getAgentAIConfig(agentCode);
    const provider = mapping?.provider;
    const supportsNativeToolCalling = !!provider && (provider === 'gemini' || provider.startsWith('bedrock'));
    const tools = supportsNativeToolCalling ? this.toolService.getClaudeTools(agentRole) : [];
    this.logger.log(`🔧 Agent ${agentCode} provider=${provider || 'auto'} tools=${tools.length}`);

    // 4. 添加用户消息到历史
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    session.messages.push(userMessage);

    await this.chatHistoryService.saveMessage({
      sessionId: session.id,
      userId,
      agentId: agentCode,
      role: ChatMessageRole.USER,
      content: message,
    });

    // 5. 工具执行循环（默认 3 轮，避免免费配额被工具循环快速耗尽）
    const maxIterations = this.maxToolIterations;
    let iterationCount = 0;
    let aiResult: any;

    while (iterationCount < maxIterations) {
      iterationCount++;

      // 5.1 构建 AI 请求消息
      const conversationMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...session.messages.slice(-this.maxHistoryMessages).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      // 5.2 调用 AI（带工具）
      aiResult = await this.aiService.chatForAgent(
        agentCode,
        conversationMessages,
        { systemPrompt, maxTokens: this.maxTokens, tools },
      );

      // 5.3 检查是否需要调用工具
      if (aiResult.finishReason !== 'tool_use' || !aiResult.toolCalls || aiResult.toolCalls.length === 0) {
        // 完成，返回文本响应
        this.logger.log(`✅ Iteration ${iterationCount}: Agent returned final response`);
        break;
      }

      // 5.4 执行工具
      this.logger.log(`🔧 Iteration ${iterationCount}: Agent wants to call ${aiResult.toolCalls.length} tools`);

      const toolResults = [];
      for (const toolCall of aiResult.toolCalls) {
        this.logger.log(`🔧 Executing tool: ${toolCall.name}`);

        const result = await this.toolService.executeTool(
          toolCall.name,
          toolCall.arguments,
          { agentCode, taskId: session.id },
        );

        toolResults.push({
          tool_use_id: toolCall.id,
          type: 'tool_result',
          content: result.success ? result.output : `Error: ${result.error}`,
          is_error: !result.success,
        });

        this.logger.log(`${result.success ? '✅' : '❌'} Tool ${toolCall.name}: ${result.success ? 'success' : result.error}`);
      }

      // 5.5 保存工具调用和结果到会话
      const callsSummary = aiResult.toolCalls.map((tc: any) => `Action: ${tc.name}\nArguments: ${JSON.stringify(tc.arguments)}`).join('\n\n');
      session.messages.push({
        role: 'assistant',
        content: `我决定调用以下工具来完成任务：\n\n${callsSummary}`,
        timestamp: new Date(),
      });

      const resultsSummary = toolResults.map((tr, idx) => `Result of ${aiResult.toolCalls[idx].name}:\n${tr.content}`).join('\n\n');
      session.messages.push({
        role: 'user',
        content: `以下是工具执行的结果，请根据这些信息继续：\n\n${resultsSummary}`,
        timestamp: new Date(),
      });
    }

    // 达到最大迭代次数但仍未完成
    if (iterationCount >= maxIterations && aiResult.finishReason === 'tool_use') {
      this.logger.warn(`⚠️ Agent ${agentCode} reached max tool iterations (${maxIterations})`);
      aiResult.content = '工具执行循环达到上限，任务可能未完成。请检查执行日志。';
    }

    // 6. 保存 AI 最终响应
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

    await this.chatHistoryService.saveMessage({
      sessionId: session.id,
      userId,
      agentId: agentCode,
      role: ChatMessageRole.ASSISTANT,
      content: aiResult.content,
      metadata: {
        model: aiResult.model,
        usage: aiResult.usage,
        iterations: iterationCount,
      },
    });

    await this.sessionRepo.save(session);

    this.logger.log(`✅ UnifiedChat complete: session=${session.id}, model=${aiResult.model}, iterations=${iterationCount}, tokens=${aiResult.usage?.totalTokens || 0}`);

    return {
      sessionId: session.id,
      agentCode,
      response: aiResult.content,
      model: aiResult.model,
      timestamp: new Date(),
      usage: aiResult.usage,
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

  /**
   * 流式聊天接口 - 带工具执行事件的 SSE 流
   * 每次工具调用都发送 tool_start / tool_end 事件给客户端
   */
  async *chatStream(request: UnifiedChatRequest): AsyncGenerator<{
    type: 'meta' | 'chunk' | 'done' | 'error' | 'tool_start' | 'tool_end';
    data: any;
  }> {
    const {
      agentCode,
      message,
      sessionId,
      workingDir = this.defaultWorkingDir,
      userId,
      context,
      mode = 'general',
    } = request;

    this.logger.log(`📨 UnifiedChatStream: agent=${agentCode}, mode=${mode}`);

    // 1. 获取或创建会话
    let session: ChatSession | null = null;
    if (sessionId) {
      session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    }
    if (!session) {
      session = await this.createSession(agentCode, userId, mode, workingDir);
    }

    // 2. 构建系统提示词
    const systemPrompt = this.buildPromptForMode(mode, { agentCode, workingDir, context });

    // 3. 获取 Agent 工具列表
    const agentRole = agentCode.split('-')[0].toLowerCase();
    const tools = this.toolService.getClaudeTools(agentRole);

    // 元数据
    yield {
      type: 'meta',
      data: { agentId: agentCode, sessionId: session.id, toolsAvailable: tools.length },
    };

    // 4. 添加用户消息
    session.messages.push({ role: 'user', content: message, timestamp: new Date() });
    await this.chatHistoryService.saveMessage({
      sessionId: session.id, userId, agentId: agentCode,
      role: ChatMessageRole.USER, content: message,
    });

    // 5. 工具执行循环（FREE-tier protection via env-configured limits）
    const maxIterations = this.maxToolIterations;
    let iterationCount = 0;
    let aiResult: any;

    try {
      while (iterationCount < maxIterations) {
        iterationCount++;

        const conversationMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...session.messages.slice(-this.maxHistoryMessages).map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ];

        aiResult = await this.aiService.chatForAgent(
          agentCode, conversationMessages,
          { systemPrompt, maxTokens: this.maxTokens, tools },
        );

        if (aiResult.finishReason !== 'tool_use' || !aiResult.toolCalls || aiResult.toolCalls.length === 0) {
          break;
        }

        // 执行工具并发送事件
        const toolResults: Array<{ name: string; content: string }> = [];
        for (const toolCall of aiResult.toolCalls) {
          yield {
            type: 'tool_start',
            data: { name: toolCall.name, arguments: toolCall.arguments, iteration: iterationCount },
          };

          const result = await this.toolService.executeTool(
            toolCall.name, toolCall.arguments,
            { agentCode, taskId: session.id },
          );

          const resultContent = result.success ? result.output : `Error: ${result.error}`;
          toolResults.push({ name: toolCall.name, content: resultContent });

          yield {
            type: 'tool_end',
            data: {
              name: toolCall.name,
              success: result.success,
              output: result.success
                ? (result.output?.substring(0, 500) || 'Done')
                : `Error: ${result.error}`,
              executionTimeMs: result.executionTimeMs,
            },
          };
        }

        // 保存工具调用结果到会话（使用已执行的结果，不重复执行）
        const callsSummary = aiResult.toolCalls.map((tc: any) => `Action: ${tc.name}\nArguments: ${JSON.stringify(tc.arguments)}`).join('\n\n');
        session.messages.push({
          role: 'assistant',
          content: `我决定调用以下工具来完成任务：\n\n${callsSummary}`,
          timestamp: new Date(),
        });

        const resultsSummary = toolResults.map(tr => `Result of ${tr.name}:\n${tr.content}`).join('\n\n');
        session.messages.push({
          role: 'user',
          content: `以下是工具执行的结果，请根据这些信息继续：\n\n${resultsSummary}`,
          timestamp: new Date(),
        });
      }

      // 达到最大迭代
      if (iterationCount >= maxIterations && aiResult?.finishReason === 'tool_use') {
        aiResult.content = '工具执行循环达到上限，任务可能未完成。请检查执行日志。';
      }

      // 6. 流式输出最终响应
      const content = aiResult?.content || '';
      const chunkSize = 20;
      for (let i = 0; i < content.length; i += chunkSize) {
        yield { type: 'chunk', data: { content: content.slice(i, i + chunkSize) } };
      }

      // 7. 保存到历史
      session.messages.push({ role: 'assistant', content, timestamp: new Date() });
      session.lastMessageAt = new Date();
      if (context) session.context = context;

      await this.chatHistoryService.saveMessage({
        sessionId: session.id, userId, agentId: agentCode,
        role: ChatMessageRole.ASSISTANT, content,
        metadata: { model: aiResult?.model, usage: aiResult?.usage, iterations: iterationCount },
      });
      await this.sessionRepo.save(session);

      yield {
        type: 'done',
        data: {
          sessionId: session.id,
          model: aiResult?.model,
          tokensUsed: aiResult?.usage?.totalTokens || 0,
          iterations: iterationCount,
        },
      };
    } catch (error: any) {
      this.logger.error(`❌ ChatStream error: ${error.message}`);
      yield { type: 'error', data: { message: error.message } };
    }
  }
}
