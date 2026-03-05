import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ClaudeIntegrationService } from './claude-integration.service';

@Controller('claude')
export class ClaudeIntegrationController {
  constructor(private claudeService: ClaudeIntegrationService) {}

  /**
   * 获取 Claude Function Schemas
   * GET /api/claude/functions
   */
  @Get('functions')
  async getFunctions() {
    const functions = await this.claudeService.getFunctionSchemas();
    return {
      functions,
      count: functions.length,
    };
  }

  /**
   * 执行 Function Call
   * POST /api/claude/function-call
   */
  @Post('function-call')
  async executeFunctionCall(
    @Body()
    body: {
      function: {
        name: string;
        arguments: string | Record<string, any>;
      };
      context?: {
        userId?: string;
        sessionId?: string;
      };
    },
  ) {
    const { function: func, context = {} } = body;

    let parameters: Record<string, any> = {};
    try {
      if (typeof func.arguments === 'string') {
        parameters = JSON.parse(func.arguments);
      } else {
        parameters = func.arguments;
      }
    } catch (error) {
      return {
        success: false,
        error: 'INVALID_ARGUMENTS',
        message: '参数格式错误',
      };
    }

    const result = await this.claudeService.executeFunctionCall(
      func.name,
      parameters,
      context,
    );

    return result;
  }

  /**
   * 快速测试接口
   * GET /api/claude/test?query={query}
   */
  @Get('test')
  async testSearch(@Query('query') query: string) {
    if (!query) {
      return { error: 'Query parameter is required' };
    }

    const result = await this.claudeService.executeFunctionCall(
      'search_agentrix_products',
      { query },
      {},
    );

    return result;
  }

  /**
   * 对话接口（带 Function Calling）
   * POST /api/claude/chat
   * 
   * 支持用户提供自己的 Anthropic API Key
   */
  @Post('chat')
  async chat(
    @Body()
    body: {
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
      anthropicApiKey?: string; // 用户提供的 API Key（可选）
      context?: {
        userId?: string;
        sessionId?: string;
      };
      options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
        enableModelRouting?: boolean; // 是否启用模型路由（默认启用）
      };
    },
  ) {
    const { messages, anthropicApiKey, context = {}, options } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return { error: 'messages array is required and must not be empty' };
    }

    // If the client already provides a system message, use it as-is.
    // Otherwise inject the default personal agent system prompt.
    const hasClientSystemMessage = messages.some(m => m.role === 'system');

    const defaultSystemPrompt = `You are a helpful personal AI assistant. You can help the user with anything they need — answering questions, researching topics, writing, coding, analysis, and more.

You have the following capabilities available:
- Web search: when you need up-to-date information, call the search_web function
- Agentrix marketplace: you can search and browse products if the user asks
- Task assistance: help users plan, organise, and execute tasks

${context.userId ? `User ID: ${context.userId}` : ''}${context.sessionId ? `Session ID: ${context.sessionId}` : ''}

Always reply in the same language the user uses. Be concise, helpful, and friendly.`;

    const baseMessages = hasClientSystemMessage ? messages : [
      { role: 'system' as const, content: defaultSystemPrompt },
      ...messages,
    ];

    const allMessages = baseMessages;

    const result = await this.claudeService.chatWithFunctions(allMessages, {
      ...options,
      context,
      userApiKey: anthropicApiKey,
    });

    return result;
  }
}

