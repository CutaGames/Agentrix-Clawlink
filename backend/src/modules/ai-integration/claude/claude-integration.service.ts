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
      switch (functionName) {
        case 'search_agentrix_products':
          return await this.capabilityExecutor.execute(
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
    if (!this.anthropic) {
      throw new Error(
        'Claude API未配置，请设置ANTHROPIC_API_KEY环境变量或提供userApiKey，并确保已安装 @anthropic-ai/sdk',
      );
    }

    // 如果用户提供了 API Key，创建新的 Anthropic 实例
    const anthropicClient = options?.userApiKey
      ? new Anthropic({ apiKey: options.userApiKey })
      : this.anthropic;

    try {
      // 获取 Function Schemas
      let tools = await this.getFunctionSchemas();
      
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

        return {
          text: finalTextContent?.text || text,
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

