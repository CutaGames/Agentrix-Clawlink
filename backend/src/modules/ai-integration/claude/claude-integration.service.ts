import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../../entities/product.entity';
import { Order } from '../../../entities/order.entity';
import { CapabilityRegistryService } from '../../ai-capability/services/capability-registry.service';
import { CapabilityExecutorService } from '../../ai-capability/services/capability-executor.service';
import { SearchService } from '../../search/search.service';
import { ProductService } from '../../product/product.service';
import { OrderService } from '../../order/order.service';
import { CartService } from '../../cart/cart.service';
import { LogisticsService } from '../../logistics/logistics.service';
import { PayIntentService } from '../../payment/pay-intent.service';
import { PayIntentType } from '../../../entities/pay-intent.entity';
import { OrderStatus } from '../../../entities/order.entity';
import { ModelRouterService, ModelType } from '../model-router/model-router.service';
import { BedrockIntegrationService } from '../bedrock/bedrock-integration.service';

// 动态导入 Anthropic SDK（如果已安装）
let Anthropic: any;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch (e) {
  // SDK 未安装，将在运行时提示
}

/**
 * Claude Function Calling 统一接口
 * 
 * 为 Claude 提供统一的 Function Schema，实现电商流程
 * 支持：
 * 1. 搜索商品 (search_agentrix_products)
 * 2. 加入购物车 (add_to_agentrix_cart)
 * 3. 查看购物车 (view_agentrix_cart)
 * 4. 结算购物车 (checkout_agentrix_cart)
 * 5. 购买商品 (buy_agentrix_product)
 * 6. 查询订单 (get_agentrix_order)
 * 7. 支付订单 (pay_agentrix_order)
 */
@Injectable()
export class ClaudeIntegrationService {
  private readonly logger = new Logger(ClaudeIntegrationService.name);
  private readonly anthropic: any;
  private readonly defaultModel: string; // 向后兼容的默认模型

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private capabilityRegistry: CapabilityRegistryService,
    private capabilityExecutor: CapabilityExecutorService,
    private searchService: SearchService,
    private productService: ProductService,
    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService,
    @Inject(forwardRef(() => CartService))
    private cartService: CartService,
    @Inject(forwardRef(() => LogisticsService))
    private logisticsService: LogisticsService,
    @Inject(forwardRef(() => PayIntentService))
    private payIntentService: PayIntentService,
    private modelRouter: ModelRouterService,
    private bedrockService: BedrockIntegrationService,
  ) {
    // 从环境变量读取模型名称（向后兼容）
    this.defaultModel =
      this.configService.get<string>('ANTHROPIC_MODEL') || 'claude-3-opus';

    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY not configured, Claude integration will be disabled',
      );
      this.anthropic = null;
    } else if (!Anthropic) {
      this.logger.error(
        '@anthropic-ai/sdk not installed. Please run: npm install @anthropic-ai/sdk',
      );
      this.anthropic = null;
    } else {
      this.anthropic = new Anthropic({ apiKey });
      this.logger.log(`Claude integration initialized with model router enabled`);
    }
  }

  /**
   * 获取 Claude Function Calling 的 Function Schemas
   */
  async getFunctionSchemas(): Promise<any[]> {
    // 1. 获取系统级能力（电商流程等），只返回外部暴露的能力
    const systemSchemas = this.capabilityRegistry.getSystemCapabilitySchemas(
      ['claude'],
      true,
    );

    // 2. 转换为 Claude 格式
    const claudeTools = systemSchemas.map((schema) => {
      // FunctionSchema 可能是 OpenAIFunctionSchema, ClaudeToolSchema 或 GeminiFunctionSchema
      if ('input_schema' in schema) {
        // 已经是 ClaudeToolSchema
        return {
          name: schema.name,
          description: schema.description,
          input_schema: schema.input_schema,
        };
      } else {
        // OpenAIFunctionSchema 或 GeminiFunctionSchema，需要转换
        return {
          name: schema.name,
          description: schema.description,
          input_schema: {
            type: 'object',
            properties: schema.parameters?.properties || {},
            required: schema.parameters?.required || [],
          },
        };
      }
    });

    // 3. 添加基础功能（向后兼容）
    const basicTools = [
      {
        name: 'search_web',
        description: 'Search the web for up-to-date information on any topic. Use this when the user asks about recent events, facts, or anything that requires current information.',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_agentrix_products',
        description: '搜索 Agentrix Marketplace 中的商品。支持语义搜索、价格筛选、分类筛选等。',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '搜索查询（必需）' },
            category: { type: 'string', description: '商品分类（可选）' },
            priceMin: { type: 'number', description: '最低价格（可选）' },
            priceMax: { type: 'number', description: '最高价格（可选）' },
            currency: {
              type: 'string',
              description: '货币类型（可选，如 USD、CNY）',
            },
            inStock: {
              type: 'boolean',
              description: '是否仅显示有库存商品（可选）',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'add_to_agentrix_cart',
        description: '将商品加入购物车',
        input_schema: {
          type: 'object',
          properties: {
            product_id: { type: 'string', description: '商品ID（必需）' },
            quantity: {
              type: 'number',
              description: '数量（可选，默认：1）',
              minimum: 1,
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'view_agentrix_cart',
        description: '查看当前购物车内容',
        input_schema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'checkout_agentrix_cart',
        description: '结算购物车，创建订单',
        input_schema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'buy_agentrix_product',
        description:
          '购买 Agentrix Marketplace 中的商品。支持实物商品、服务、NFT等。',
        input_schema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: '商品ID（从搜索结果中获取）',
            },
            quantity: {
              type: 'number',
              description: '购买数量（默认：1）',
              minimum: 1,
            },
            shipping_address: {
              type: 'string',
              description: '收货地址（实物商品需要）',
            },
            appointment_time: {
              type: 'string',
              description: '预约时间（服务类商品需要，ISO 8601格式）',
            },
            contact_info: {
              type: 'string',
              description: '联系方式（服务类商品需要）',
            },
            wallet_address: {
              type: 'string',
              description: '接收NFT的钱包地址（NFT类商品需要）',
            },
            chain: {
              type: 'string',
              enum: ['ethereum', 'polygon', 'solana', 'bsc'],
              description: '区块链网络（NFT类商品需要）',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'get_agentrix_order',
        description: '查询 Agentrix 订单状态和详情',
        input_schema: {
          type: 'object',
          properties: {
            order_id: { type: 'string', description: '订单ID' },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'pay_agentrix_order',
        description: '支付订单',
        input_schema: {
          type: 'object',
          properties: {
            order_id: { type: 'string', description: '订单ID（必需）' },
            payment_method: {
              type: 'string',
              description: '支付方式（可选，如 USDC、SOL、Visa、Apple Pay）',
            },
          },
          required: ['order_id'],
        },
      },
    ];

    return [...claudeTools, ...basicTools];
  }

  /**
   * 执行 Function Call（与 Gemini 服务类似）
   */

  private async doWebSearch(query: string): Promise<string> {
    try {
      const axios = require('axios');
      const encoded = encodeURIComponent(query);
      const decodeEntities = (input: string) => input
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

      if (/(news|headline|headlines|latest|current|recent)/i.test(query)) {
        const newsResp = await axios.get(
          `https://news.google.com/rss/search?q=${encoded}`,
          {
            timeout: 10_000,
            headers: {
              'Accept-Encoding': 'identity',
              'User-Agent': 'Mozilla/5.0 (compatible; AgentrixBot/1.0; +https://agentrix.top)',
            },
          },
        );
        const xml = typeof newsResp.data === 'string' ? newsResp.data : '';
        const items = Array.from(
          xml.matchAll(/<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<link>(.*?)<\/link>/gi),
        ).slice(0, 5);
        if (items.length > 0) {
          const lines = items.map((match, index) => `${index + 1}. ${decodeEntities(match[1] || '')}\n   ${decodeEntities(match[2] || '')}`);
          return `Top news results for "${query}":\n${lines.join('\n')}`;
        }
      }

      const htmlResp = await axios.get(
        `https://html.duckduckgo.com/html/?q=${encoded}`,
        {
          timeout: 10_000,
          headers: {
            'Accept-Encoding': 'identity',
            'User-Agent': 'Mozilla/5.0 (compatible; AgentrixBot/1.0; +https://agentrix.top)',
          },
        },
      );

      const html = typeof htmlResp.data === 'string' ? htmlResp.data : '';
      const matches = Array.from(
        html.matchAll(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gis),
      ).slice(0, 5);

      if (matches.length > 0) {
        const lines = matches.map((match, index) => {
          const url = decodeEntities(match[1] || '');
          const title = decodeEntities((match[2] || '').replace(/<[^>]+>/g, '').trim());
          return `${index + 1}. ${title}\n   ${url}`;
        });
        return `Top web results for "${query}":\n${lines.join('\n')}`;
      }

      const resp = await axios.get(
        `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`,
        { timeout: 8000, headers: { 'Accept-Encoding': 'identity' } },
      );
      const data = resp.data;
      const abstract = data.AbstractText || '';
      const relatedTopics: string[] = (data.RelatedTopics || [])
        .filter((t: any) => t.Text)
        .slice(0, 5)
        .map((t: any) => t.Text);

      if (!abstract && relatedTopics.length === 0) {
        return `No web results found for: "${query}".`;
      }

      let result = '';
      if (abstract) result += `Summary: ${abstract}\n\n`;
      if (relatedTopics.length > 0) result += `Related:\n` + relatedTopics.map(t => `- ${t}`).join('\n');
      return result.trim();
    } catch (e: any) {
      return `Search failed: ${e.message}`;
    }
  }

  private extractToolResultText(toolResult: any): string {
    const rawContent = toolResult?.content ?? toolResult;
    let parsed = rawContent;

    if (typeof rawContent === 'string') {
      try {
        parsed = JSON.parse(rawContent);
      } catch {
        parsed = rawContent;
      }
    }

    if (typeof parsed === 'string') {
      return parsed;
    }

    if (parsed?.result && typeof parsed.result === 'string') {
      return parsed.result;
    }

    if (typeof parsed?.message === 'string' && !parsed?.data) {
      return parsed.message;
    }

    if (typeof parsed?.error === 'string') {
      return `Tool error: ${parsed.error}`;
    }

    if (parsed?.data !== undefined) {
      return typeof parsed.data === 'string'
        ? parsed.data
        : JSON.stringify(parsed.data, null, 2);
    }

    return JSON.stringify(parsed, null, 2);
  }

  private buildToolFallbackText(toolResults: any[]): string {
    const parts = toolResults
      .map((result, index) => {
        const text = this.extractToolResultText(result)?.trim();
        if (!text) return '';
        return toolResults.length === 1 ? text : `Tool ${index + 1} result:\n${text}`;
      })
      .filter(Boolean);

    return parts.join('\n\n').trim();
  }

  private looksLikeToolAccessRefusal(text?: string): boolean {
    if (!text) return false;
    return /(?:don't|do not|can't|cannot|unable to|lack)\b.{0,50}\b(?:web|internet|browse|search|real-time|current information|access)|(?:tool|web search|search tool).{0,20}(?:not available|unavailable)/i.test(text);
  }

  async executeFunctionCall(
    functionName: string,
    parameters: Record<string, any>,
    context: {
      userId?: string;
      sessionId?: string;
    },
  ): Promise<any> {
    this.logger.log(`执行 Claude Function: ${functionName}`, parameters);

    try {
      // 复用 Gemini 服务的执行逻辑（电商流程相同）
      if (functionName === 'search_web') {
      const query = parameters.query || parameters.q || JSON.stringify(parameters);
      const result = await this.doWebSearch(query);
      return { success: true, result };
    }
    switch (functionName) {
        case 'search_agentrix_products': {
          const productResult = await this.capabilityExecutor.execute(
            'executor_search',
            parameters as {
              query: string;
              category?: string;
              priceMin?: number;
              priceMax?: number;
              currency?: string;
              inStock?: boolean;
            },
            {
              userId: context.userId,
              sessionId: context.sessionId,
            },
          );
          // If product search returned nothing, also search the skill table as fallback
          // (covers agent chat fallback path that only has standard tools)
          const hasProducts = (productResult?.data?.products?.length ?? 0) > 0;
          if (!hasProducts && parameters.query) {
            try {
              const q = `%${String(parameters.query).toLowerCase().replace(/[%_]/g, '')}%`;
              const skills = await this.productRepository.query(
                `SELECT id, name, "displayName", description, category, "hubSlug" FROM skill
                 WHERE status = 'published'
                   AND (LOWER(name) LIKE $1 OR LOWER("displayName") LIKE $1 OR LOWER(description) LIKE $1)
                 ORDER BY "callCount" DESC NULLS LAST
                 LIMIT 10`,
                [q],
              );
              if (skills.length > 0) {
                return {
                  success: true,
                  data: {
                    products: skills.map((s: any) => ({
                      id: s.id,
                      name: s.displayName || s.name,
                      description: s.description?.substring(0, 200),
                      category: s.category || 'skill',
                      type: 'skill',
                      source: s.hubSlug ? 'openclaw_hub' : 'marketplace',
                    })),
                    query: parameters.query,
                    total: skills.length,
                  },
                  message: `Found ${skills.length} skills matching "${parameters.query}"`,
                };
              }
            } catch (skillErr: any) {
              this.logger.warn(`Skill fallback search failed: ${skillErr.message}`);
            }
          }
          return productResult;
        }

        case 'add_to_agentrix_cart':
          return await this.addToCart(
            parameters as { product_id: string; quantity?: number },
            context,
          );

        case 'view_agentrix_cart':
          return await this.viewCart(context);

        case 'checkout_agentrix_cart':
          return await this.checkoutCart(context);

        case 'buy_agentrix_product':
          return await this.buyProduct(
            parameters as {
              product_id: string;
              quantity?: number;
              shipping_address?: string;
              appointment_time?: string;
              contact_info?: string;
              wallet_address?: string;
              chain?: string;
            },
            context,
          );

        case 'get_agentrix_order':
          return await this.getOrder(parameters as { order_id: string }, context);

        case 'pay_agentrix_order':
          return await this.payOrder(
            parameters as { order_id: string; payment_method?: string },
            context,
          );

        default:
          throw new Error(`未知的 Function: ${functionName}`);
      }
    } catch (error: any) {
      this.logger.error(`执行 Function 失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 调用 Claude API（带 Function Calling）
   */
  async chatWithFunctions(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      context?: { userId?: string; sessionId?: string };
      userApiKey?: string; // 用户提供的 API Key（可选）
      enableModelRouting?: boolean; // 是否启用模型路由（默认启用）
      additionalTools?: any[]; //HQ 专属工具箱支持
      onToolCall?: (name: string, args: any) => Promise<any>;
    },
  ): Promise<any> {
    // Always fetch standard tools first — needed for both Anthropic SDK and Bedrock fallback
    const standardTools = await this.getFunctionSchemas();
    // When the caller provides dedicated tools (e.g. agent chat with skill_search),
    // strip out standard e-commerce tools so the LLM doesn’t pick the wrong one
    // (e.g. search_agentrix_products instead of skill_search).
    const ECOMMERCE_STANDARD_TOOLS = new Set([
      'search_agentrix_products', 'add_to_agentrix_cart', 'view_agentrix_cart',
      'checkout_agentrix_cart', 'buy_agentrix_product', 'get_agentrix_order', 'pay_agentrix_order',
    ]);
    const effectiveStandard = (options?.additionalTools?.length)
      ? standardTools.filter(t => !ECOMMERCE_STANDARD_TOOLS.has(t.name))
      : standardTools;
    const mergedTools = [...effectiveStandard, ...(options?.additionalTools || [])];

    if (!this.anthropic && !options?.userApiKey) {
      // Fallback to AWS Bedrock (uses AWS_BEARER_TOKEN_BEDROCK)
      try {
        const modelId = (options && options.model) ? options.model : 'claude-3-haiku';
        this.logger.log(`Bedrock fallback model: ${modelId} with ${mergedTools.length} tools`);

        // Convert Claude tool format (input_schema) to Bedrock format (parameters)
        const bedrockTools = mergedTools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.input_schema || t.parameters,
        }));

        const bedrockResult = await this.bedrockService.chatWithFunctions(messages, {
          model: modelId,
          tools: bedrockTools,
        });

        // If Bedrock returned tool calls, execute them and do a second LLM call
        if (bedrockResult.functionCalls && bedrockResult.functionCalls.length > 0) {
          this.logger.log(`Bedrock returned ${bedrockResult.functionCalls.length} tool call(s)`);
          const toolResults: any[] = [];
          for (const tc of bedrockResult.functionCalls) {
            const fnName = tc.function?.name || tc.name;
            const fnArgs = tc.function?.arguments
              ? (typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments)
              : tc.input || {};
            try {
              let result: any;
              if (options?.onToolCall) {
                result = await options.onToolCall(fnName, fnArgs);
              }
              if (result === undefined) {
                result = await this.executeFunctionCall(fnName, fnArgs, options?.context || {});
              }
              toolResults.push({
                type: 'tool_result',
                tool_use_id: tc.id || `tool-${Date.now()}`,
                content: JSON.stringify(result),
              });
            } catch (err: any) {
              toolResults.push({
                type: 'tool_result',
                tool_use_id: tc.id || `tool-${Date.now()}`,
                content: JSON.stringify({ success: false, error: err.message }),
              });
            }
          }

          const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
          const toolFallbackText = this.buildToolFallbackText(toolResults);

          // Second Bedrock call with tool results
          const followUpMessages = [
            ...messages,
            { role: 'assistant' as const, content: bedrockResult.text || 'I used the available tools and received the results.' },
            {
              role: 'user' as const,
              content:
                `Answer the original request using the tool results below. ` +
                `Do not say you lack web access or tool access when tool results are present.\n\n` +
                `Original request:\n${lastUserMessage}\n\n` +
                `Tool results:\n${toolResults.map(r => r.content).join('\n')}`,
            },
          ];
          try {
            const finalResult = await this.bedrockService.chatWithFunctions(followUpMessages, {
              model: modelId,
            });
            const finalText = finalResult.text?.trim();
            return {
              text: !finalText || this.looksLikeToolAccessRefusal(finalText)
                ? (toolFallbackText || finalText || bedrockResult.text)
                : finalText,
              toolCalls: bedrockResult.functionCalls,
            };
          } catch {
            // If second call fails, return the tool results directly
            return {
              text: toolFallbackText || (bedrockResult.text + '\n\n' + toolResults.map(r => r.content).join('\n')),
              toolCalls: bedrockResult.functionCalls,
            };
          }
        }

        return { text: bedrockResult.text, toolCalls: bedrockResult.functionCalls ?? null };
      } catch (bedrockErr: any) {
        this.logger.error(`Bedrock fallback failed: ${bedrockErr.message}`);
        throw new Error(
          'AI service unavailable: Neither ANTHROPIC_API_KEY nor AWS_BEARER_TOKEN_BEDROCK is configured. ' +
          'Please contact the administrator.',
        );
      }
    }

    // 如果用户提供了 API Key，创建新的 Anthropic 实例
    const anthropicClient = options?.userApiKey
      ? new Anthropic({ apiKey: options.userApiKey })
      : this.anthropic;

    try {
      // Reuse tools already fetched above (standardTools + additionalTools)
      let tools = [...standardTools];
      
      // 合并 HQ 专属工具箱
      if (options?.additionalTools) {
        // Claude 需要 input_schema 格式，HQ tools 可能是 OpenAI 格式
        const hqTools = options.additionalTools.map(t => {
          if (t.input_schema) return t;
          return {
            name: t.name,
            description: t.description,
            input_schema: t.parameters
          };
        });
        tools = [...tools, ...hqTools];
      }

      const hasFunctionCalling = tools.length > 0;

      // 智能模型路由：根据任务复杂度选择模型
      let selectedModel: string;
      let routingDecision;

      const enableRouting = options?.enableModelRouting !== false; // 默认启用

      if (enableRouting && !options?.model) {
        // 使用模型路由服务选择最合适的模型
        routingDecision = this.modelRouter.routeModel(
          ModelType.CLAUDE,
          messages,
          {
            hasFunctionCalling,
            contextLength: messages.reduce(
              (sum, msg) => sum + (msg.content?.length || 0),
              0,
            ),
            overrideModel: options?.model,
          },
        );
        selectedModel = routingDecision.model;
        this.logger.log(
          `模型路由决策: ${routingDecision.model} (${routingDecision.complexity}) - ${routingDecision.reason}`,
        );
      } else {
        // 使用用户指定的模型或默认模型
        selectedModel = options?.model || this.defaultModel;
        this.logger.log(`使用指定模型: ${selectedModel}`);
      }

      // 转换消息格式（Claude 使用不同的格式）
      const systemMessages = messages.filter((msg) => msg.role === 'system');
      const systemPrompt = systemMessages
        .map((msg) => msg.content)
        .join('\n');

      const conversationMessages = messages
        .filter((msg) => msg.role !== 'system')
        .map((msg) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        }));

      // 调用 Claude API
      const response = await anthropicClient.messages.create({
        model: selectedModel,
        max_tokens: options?.maxTokens || 2048,
        temperature: options?.temperature || 0.7,
        system: systemPrompt || undefined,
        messages: conversationMessages,
        tools: hasFunctionCalling ? tools : undefined,
      });

      // 处理响应
      const textContent = response.content.find(
        (item: any) => item.type === 'text',
      );
      const text = textContent?.text || '';

      // 检查是否有 Tool Use（Function Call）
      const toolUses = response.content.filter(
        (item: any) => item.type === 'tool_use',
      );

      if (toolUses && toolUses.length > 0) {
        // 处理 Tool Calls
        const toolResults = await Promise.all(
          toolUses.map(async (toolUse: any) => {
            const functionName = toolUse.name;
            const parameters = toolUse.input || {};

            try {
              let result: any;
              
              // 优先检查外部定义的 onToolCall (如 HQ 总部工具)
              if (options?.onToolCall) {
                result = await options.onToolCall(functionName, parameters);
              }

              // 如果外部未处理或未定义，则尝试执行系统内定义的电商能力
              if (result === undefined) {
                result = await this.executeFunctionCall(
                  functionName,
                  parameters,
                  options?.context || {},
                );
              }

              return {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: JSON.stringify(result),
              };
            } catch (error: any) {
              this.logger.error(`Function 执行失败: ${functionName}`, error);
              return {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: JSON.stringify({
                  success: false,
                  error: error.message,
                }),
              };
            }
          }),
        );

        // 发送 Tool 结果并获取最终响应
        const finalResponse = await anthropicClient.messages.create({
          model: selectedModel,
          max_tokens: options?.maxTokens || 2048,
          temperature: options?.temperature || 0.7,
          system: systemPrompt || undefined,
          messages: [
            ...conversationMessages,
            {
              role: 'assistant',
              content: response.content,
            },
            {
              role: 'user',
              content: toolResults,
            },
          ],
        });

        const finalTextContent = finalResponse.content.find(
          (item: any) => item.type === 'text',
        );
        const finalText = finalTextContent?.text || text;

        return {
          text: this.looksLikeToolAccessRefusal(finalText)
            ? (this.buildToolFallbackText(toolResults) || finalText)
            : finalText,
          toolCalls: toolUses.map((toolUse: any) => ({
            name: toolUse.name,
            input: toolUse.input,
          })),
        };
      }

      return {
        text,
        toolCalls: null,
      };
    } catch (error: any) {
      this.logger.error(`Claude API调用失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  // 以下方法与 Gemini 服务相同，可以复用
  private async addToCart(
    params: { product_id: string; quantity?: number },
    context: { userId?: string; sessionId?: string },
  ): Promise<any> {
    const { product_id, quantity = 1 } = params;
    const cartIdentifier = context.userId || context.sessionId;
    const isSessionId = !context.userId;

    if (!cartIdentifier) {
      throw new Error('无法识别用户身份');
    }

    const product = await this.productService.getProduct(product_id);
    if (!product) {
      throw new Error('商品不存在');
    }

    const cart = await this.cartService.addToCart(
      cartIdentifier,
      product_id,
      quantity,
      isSessionId,
    );

    return {
      success: true,
      message: `已将 ${product.name} 加入购物车`,
      data: {
        cart,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
        },
      },
    };
  }

  private async viewCart(
    context: { userId?: string; sessionId?: string },
  ): Promise<any> {
    const cartIdentifier = context.userId || context.sessionId;
    const isSessionId = !context.userId;

    if (!cartIdentifier) {
      throw new Error('无法识别用户身份');
    }

    const cart = await this.cartService.getCartWithProducts(
      cartIdentifier,
      isSessionId,
    );

    return {
      success: true,
      data: {
        cart,
        itemCount: cart.items?.length || 0,
        totalAmount:
          cart.items?.reduce(
            (sum, item) => sum + (item.product?.price || 0) * item.quantity,
            0,
          ) || 0,
      },
    };
  }

  private async checkoutCart(
    context: { userId?: string; sessionId?: string },
  ): Promise<any> {
    const cartIdentifier = context.userId || context.sessionId;
    const isSessionId = !context.userId;

    if (!cartIdentifier) {
      throw new Error('无法识别用户身份');
    }

    if (!context.userId) {
      throw new Error('结算需要登录');
    }

    const cart = await this.cartService.getCartWithProducts(
      cartIdentifier,
      isSessionId,
    );
    if (!cart.items || cart.items.length === 0) {
      throw new Error('购物车为空');
    }

    const orderItems = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.product?.price || 0,
    }));

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + (item.product?.price || 0) * item.quantity,
      0,
    );

    const order = await this.orderService.createOrder(context.userId, {
      merchantId: cart.items[0]?.product?.merchantId || '',
      productId: cart.items[0]?.productId || '',
      amount: totalAmount,
      currency: 'CNY',
      metadata: {
        items: orderItems,
        fromCart: true,
      },
    });

    return {
      success: true,
      message: '订单创建成功',
      data: {
        order,
        orderId: order.id,
      },
    };
  }

  private async buyProduct(
    params: {
      product_id: string;
      quantity?: number;
      shipping_address?: string;
      appointment_time?: string;
      contact_info?: string;
      wallet_address?: string;
      chain?: string;
    },
    context: { userId?: string; sessionId?: string },
  ): Promise<any> {
    const {
      product_id,
      quantity = 1,
      shipping_address,
      appointment_time,
      contact_info,
      wallet_address,
      chain,
    } = params;

    if (!context.userId) {
      throw new Error('购买需要登录');
    }

    const product = await this.productService.getProduct(product_id);
    if (!product) {
      throw new Error('商品不存在');
    }

    const order = await this.orderService.createOrder(context.userId, {
      merchantId: product.merchantId,
      productId: product_id,
      amount: Number(product.price) * quantity,
      currency: (product.metadata as any)?.currency || 'CNY',
      metadata: {
        quantity,
        shippingAddress: shipping_address,
        appointmentTime: appointment_time,
        contactInfo: contact_info,
        walletAddress: wallet_address,
        chain,
      },
    });

    return {
      success: true,
      message: '订单创建成功',
      data: {
        order,
        orderId: order.id,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
        },
      },
    };
  }

  private async getOrder(
    params: { order_id: string },
    context: { userId?: string; sessionId?: string },
  ): Promise<any> {
    const { order_id } = params;

    if (!context.userId) {
      throw new Error('查询订单需要登录');
    }

    const order = await this.orderService.getOrder(context.userId, order_id);
    if (!order) {
      throw new Error('订单不存在');
    }

    return {
      success: true,
      data: {
        order,
        status: order.status,
        items: order.items || [],
        totalAmount: order.amount,
      },
    };
  }

  private async payOrder(
    params: { order_id: string; payment_method?: string },
    context: { userId?: string; sessionId?: string },
  ): Promise<any> {
    const { order_id, payment_method = 'crypto' } = params;

    if (!context.userId) {
      throw new Error('支付需要登录');
    }

    const order = await this.orderService.getOrder(context.userId, order_id);
    if (!order) {
      throw new Error('订单不存在');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new Error(`订单状态为 ${order.status}，无法支付`);
    }

    const payIntent = await this.payIntentService.createPayIntent(
      context.userId,
      {
        orderId: order_id,
        amount: order.amount,
        currency: order.currency || 'CNY',
        type: PayIntentType.ORDER_PAYMENT,
        paymentMethod: {
          type: payment_method || 'crypto',
        },
        metadata: {
          paymentMethod: payment_method,
        } as any,
      },
    );

    return {
      success: true,
      message: '支付意图创建成功',
      data: {
        payIntent,
        paymentId: payIntent.id,
        order,
      },
    };
  }
}

