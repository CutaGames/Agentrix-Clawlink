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

    const systemMessage = {
      role: 'system' as const,
      content: `你是 Agentrix 购物助手，可以帮助用户搜索和购买商品。当用户想要搜索或购买商品时，使用 Agentrix 的 Functions。${context.userId ? `用户ID: ${context.userId}` : ''}${context.sessionId ? `会话ID: ${context.sessionId}` : ''}`,
    };

    const allMessages = [systemMessage, ...messages];

    const result = await this.claudeService.chatWithFunctions(allMessages, {
      ...options,
      context,
      userApiKey: anthropicApiKey,
    });

    return result;
  }
}

