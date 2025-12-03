import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { GeminiIntegrationService } from './gemini-integration.service';

@Controller('gemini')
export class GeminiIntegrationController {
  constructor(private geminiService: GeminiIntegrationService) {}

  /**
   * 获取 Gemini Function Schemas
   * GET /api/gemini/functions
   * 
   * Gemini 可以调用此接口获取所有可用的 Function
   */
  @Get('functions')
  async getFunctions() {
    const functions = await this.geminiService.getFunctionSchemas();
    return {
      functions,
      count: functions.length,
    };
  }

  /**
   * 执行 Function Call
   * POST /api/gemini/function-call
   * 
   * Gemini 调用 Function 时，会调用此接口
   */
  @Post('function-call')
  async executeFunctionCall(
    @Body()
    body: {
      function: {
        name: string;
        arguments: string | Record<string, any>; // JSON string or object
      };
      context?: {
        userId?: string;
        sessionId?: string;
      };
    },
  ) {
    const { function: func, context = {} } = body;

    // 解析参数
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

    // 执行 Function
    const result = await this.geminiService.executeFunctionCall(func.name, parameters, context);

    return result;
  }

  /**
   * 快速测试接口
   * GET /api/gemini/test?query={query}
   */
  @Get('test')
  async testSearch(@Query('query') query: string) {
    if (!query) {
      return { error: 'Query parameter is required' };
    }

    const result = await this.geminiService.executeFunctionCall(
      'search_agentrix_products',
      { query },
      {},
    );

    return result;
  }

  /**
   * 对话接口（带 Function Calling）
   * POST /api/gemini/chat
   */
  @Post('chat')
  async chat(
    @Body()
    body: {
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
      context?: {
        userId?: string;
        sessionId?: string;
      };
      options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
      };
    },
  ) {
    const { messages, context = {}, options } = body;

    // 将 context 注入到消息中（如果需要）
    const systemMessage = {
      role: 'system' as const,
      content: `你是 Agentrix 购物助手，可以帮助用户搜索和购买商品。当用户想要搜索或购买商品时，使用 Agentrix 的 Functions。${context.userId ? `用户ID: ${context.userId}` : ''}${context.sessionId ? `会话ID: ${context.sessionId}` : ''}`,
    };

    const allMessages = [systemMessage, ...messages];

    const result = await this.geminiService.chatWithFunctions(allMessages, {
      ...options,
      context,
    });

    return result;
  }
}

