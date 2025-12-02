import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { OpenAIIntegrationService } from './openai-integration.service';

@Controller('openai')
export class OpenAIIntegrationController {
  constructor(private openaiService: OpenAIIntegrationService) {}

  /**
   * 获取 OpenAI Function Schemas
   * GET /api/openai/functions
   * 
   * ChatGPT 可以调用此接口获取所有可用的 Function
   */
  @Get('functions')
  async getFunctions() {
    const functions = await this.openaiService.getFunctionSchemas();
    return {
      functions,
      count: functions.length,
    };
  }

  /**
   * 执行 Function Call
   * POST /api/openai/function-call
   * 
   * ChatGPT 调用 Function 时，会调用此接口
   */
  @Post('function-call')
  async executeFunctionCall(
    @Body()
    body: {
      function: {
        name: string;
        arguments: string; // JSON string
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
      parameters = JSON.parse(func.arguments);
    } catch (error) {
      return {
        success: false,
        error: 'INVALID_ARGUMENTS',
        message: '参数格式错误',
      };
    }

    // 执行 Function
    const result = await this.openaiService.executeFunctionCall(func.name, parameters, context);

    return result;
  }

  /**
   * 快速测试接口
   * GET /api/openai/test?query={query}
   */
  @Get('test')
  async testSearch(@Query('query') query: string) {
    if (!query) {
      return { error: 'Query parameter is required' };
    }

    const result = await this.openaiService.executeFunctionCall(
      'search_agentrix_products',
      { query },
      {},
    );

    return result;
  }

  /**
   * OpenAPI 规范（用于 ChatGPT Actions）
   * GET /api/openai/openapi.json
   */
  @Get('openapi.json')
  getOpenAPISpec() {
    // 返回 OpenAPI 规范
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001/api';
    
    return {
      openapi: '3.1.0',
      info: {
        title: 'Agentrix Marketplace API',
        description: 'Agentrix Marketplace API for AI Agents. Search and purchase products, services, NFTs, and more.',
        version: '1.0.0',
        contact: {
          name: 'Agentrix Support',
          email: 'support@agentrix.com',
        },
      },
      servers: [
        {
          url: baseUrl,
          description: 'Agentrix API Server',
        },
      ],
      paths: {
        '/openai/functions': {
          get: {
            summary: 'Get OpenAI Function Schemas',
            description: 'Returns all available Function Schemas for OpenAI Function Calling',
            operationId: 'getOpenAIFunctions',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        functions: {
                          type: 'array',
                          items: { type: 'object' },
                        },
                        count: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/openai/function-call': {
          post: {
            summary: 'Execute OpenAI Function Call',
            description: 'Execute a function call from OpenAI/ChatGPT',
            operationId: 'executeFunctionCall',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['function'],
                    properties: {
                      function: {
                        type: 'object',
                        required: ['name', 'arguments'],
                        properties: {
                          name: { type: 'string' },
                          arguments: { type: 'string', description: 'JSON string of function arguments' },
                        },
                      },
                      context: {
                        type: 'object',
                        properties: {
                          userId: { type: 'string' },
                          sessionId: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object' },
                        error: { type: 'string' },
                        message: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }
}

