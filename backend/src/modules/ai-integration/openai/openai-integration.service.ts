import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
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

/**
 * OpenAI Function Calling 统一接口
 * 
 * 为 ChatGPT 提供统一的 Function Schema，而不是每个商品一个 Function
 * 这样 ChatGPT 可以：
 * 1. 搜索商品 (search_paymind_products)
 * 2. 购买商品 (buy_paymind_product)
 * 3. 查询订单 (get_paymind_order)
 */
@Injectable()
export class OpenAIIntegrationService {
  private readonly logger = new Logger(OpenAIIntegrationService.name);

  constructor(
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
  ) {}

  /**
   * 获取 OpenAI Function Calling 的 Function Schemas
   * 返回统一的 Function 列表，包括系统级能力和商品级能力
   */
  async getFunctionSchemas(): Promise<any[]> {
    // 1. 获取系统级能力（电商流程等），只返回外部暴露的能力
    const systemSchemas = this.capabilityRegistry.getSystemCapabilitySchemas(['openai'], true);
    
    // 2. 保留原有的基础功能（向后兼容）
    const basicFunctions = [
      {
        type: 'function',
        function: {
          name: 'buy_paymind_product',
          description: '购买 PayMind Marketplace 中的商品。支持实物商品、服务、NFT等。',
          parameters: {
            type: 'object',
            properties: {
              product_id: { type: 'string', description: '商品ID（从搜索结果中获取）' },
              quantity: { type: 'number', description: '购买数量（默认：1）', minimum: 1 },
              shipping_address: { type: 'string', description: '收货地址（实物商品需要）' },
              appointment_time: { type: 'string', description: '预约时间（服务类商品需要，ISO 8601格式）' },
              contact_info: { type: 'string', description: '联系方式（服务类商品需要）' },
              wallet_address: { type: 'string', description: '接收NFT的钱包地址（NFT类商品需要）' },
              chain: { type: 'string', enum: ['ethereum', 'polygon', 'solana', 'bsc'], description: '区块链网络（NFT类商品需要）' },
            },
            required: ['product_id'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_paymind_order',
          description: '查询 PayMind 订单状态和详情',
          parameters: {
            type: 'object',
            properties: {
              order_id: { type: 'string', description: '订单ID' },
            },
            required: ['order_id'],
          },
        },
      },
    ];

    // 合并系统级能力和基础功能
    return [...systemSchemas, ...basicFunctions];
  }

  /**
   * 执行 Function Call
   */
  async executeFunctionCall(
    functionName: string,
    parameters: Record<string, any>,
    context: {
      userId?: string;
      sessionId?: string;
    },
  ): Promise<any> {
    this.logger.log(`执行 OpenAI Function: ${functionName}`, parameters);

    try {
      switch (functionName) {
        case 'search_paymind_products':
          // 使用统一执行器
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

        case 'buy_paymind_product':
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

        case 'get_paymind_order':
          return await this.getOrder(
            parameters as { order_id: string },
            context,
          );

        case 'compare_paymind_prices':
          // 使用统一执行器
          return await this.capabilityExecutor.execute(
            'executor_compare',
            parameters as { query?: string },
            {
              userId: context.userId,
              sessionId: context.sessionId,
              metadata: {
                lastSearchQuery: parameters.query,
              },
            },
          );

        case 'pay_paymind_order':
          return await this.payOrder(
            parameters as { order_id?: string },
            context,
          );

        case 'track_paymind_logistics':
          return await this.trackLogistics(
            parameters as { order_id: string },
            context,
          );

        default:
          throw new Error(`Unknown function: ${functionName}`);
      }
    } catch (error: any) {
      this.logger.error(`执行 Function 失败: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 搜索商品
   */
  private async searchProducts(params: {
    query: string;
    category?: string;
    priceMin?: number;
    priceMax?: number;
    currency?: string;
    inStock?: boolean;
  }): Promise<any> {
    const { query, category, priceMin, priceMax, currency, inStock } = params;

    // 使用语义搜索
    const searchResults = await this.searchService.semanticSearch(
      query,
      20,
      {
        type: 'product',
        category,
        priceMin,
        priceMax,
        currency,
        inStock,
      },
    );

    // 获取商品详细信息
    const productData = await Promise.all(
      searchResults.map(async (result) => {
        try {
          const product = await this.productService.getProduct(result.id);
          return {
            product,
            score: result.score,
          };
        } catch (error) {
          this.logger.warn(`获取商品详情失败: ${result.id}`, error);
          return null;
        }
      }),
    );

    const validProductData = productData.filter((p) => p !== null) as Array<{
      product: Product;
      score: number;
    }>;
    
    // 使用统一格式化函数格式化商品数据
    const { formatProductsForDisplay } = await import('../../product/utils/product-formatter');
    const validProducts = formatProductsForDisplay(
      validProductData.map((p) => p.product),
      {
        scores: validProductData.map((p) => p.score),
      },
    );

    return {
      success: true,
      query,
      total: validProducts.length,
      products: validProducts,
      message: `找到 ${validProducts.length} 件相关商品`,
    };
  }

  /**
   * 购买商品
   */
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
    const { product_id, quantity = 1, shipping_address, appointment_time, contact_info, wallet_address, chain } =
      params;

    if (!context.userId) {
      return {
        success: false,
        error: 'USER_NOT_AUTHENTICATED',
        message: '用户未认证，请先登录',
      };
    }

    // 获取商品信息
    const product = await this.productService.getProduct(product_id);
    if (!product) {
      return {
        success: false,
        error: 'PRODUCT_NOT_FOUND',
        message: `商品不存在：${product_id}`,
      };
    }

    // 确定执行器类型
    let executor: string;
    let executorParams: Record<string, any> = {
      product_id,
      quantity,
    };

    if (product.productType === 'service') {
      executor = 'executor_book';
      executorParams.appointment_time = appointment_time;
      executorParams.contact_info = contact_info;
    } else if (product.productType === 'nft' || product.productType === 'ft' || product.productType === 'game_asset') {
      executor = 'executor_mint';
      executorParams.wallet_address = wallet_address;
      executorParams.chain = chain;
    } else {
      executor = 'executor_purchase';
      if (product.productType === 'physical' && shipping_address) {
        executorParams.shipping_address = shipping_address;
      }
    }

    // 执行购买
    const result = await this.capabilityExecutor.execute(executor, executorParams, {
      userId: context.userId,
      sessionId: context.sessionId,
    });

    return result;
  }

  /**
   * 查询订单
   */
  private async getOrder(
    params: { order_id: string },
    context: { userId?: string; sessionId?: string },
  ): Promise<any> {
    if (!context.userId) {
      return {
        success: false,
        error: 'USER_NOT_AUTHENTICATED',
        message: '用户未认证，请先登录',
      };
    }

    try {
      const order = await this.orderService.getOrder(context.userId, params.order_id);
      return {
        success: true,
        order: {
          id: order.id,
          status: order.status,
          amount: order.amount,
          currency: order.currency,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          metadata: order.metadata,
        },
        message: `订单状态：${order.status}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: `订单不存在：${params.order_id}`,
      };
    }
  }

  /**
   * 比价功能
   */
  private async comparePrices(
    params: { query?: string },
    context: { userId?: string; sessionId?: string },
  ): Promise<any> {
    try {
      if (!params.query) {
        return { success: false, error: 'MISSING_QUERY', message: '请提供商品查询' };
      }

      const searchResults = await this.searchService.semanticSearch(params.query, 20, {
        type: 'product',
      });

      if (searchResults.length === 0) {
        return { success: false, error: 'NO_PRODUCTS_FOUND', message: '没有找到相关商品' };
      }

      const products = await Promise.all(
        searchResults.map(async (result) => {
          try {
            const product = await this.productService.getProduct(result.id);
            if (product.status === 'active' && product.stock > 0) {
              return {
                id: product.id,
                name: product.name,
                price: Number(product.price),
                currency: (product.metadata as any)?.currency || 'CNY',
                score: result.score,
              };
            }
            return null;
          } catch {
            return null;
          }
        }),
      );

      const validProducts = products.filter((p) => p !== null);
      if (validProducts.length === 0) {
        return { success: false, error: 'NO_AVAILABLE_PRODUCTS', message: '没有找到有库存的商品' };
      }

      const prices = validProducts.map((p) => p.price);
      const cheapest = validProducts.reduce((min, p) => (p.price < min.price ? p : min));
      const mostExpensive = validProducts.reduce((max, p) => (p.price > max.price ? p : max));
      const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const bestValue = validProducts.sort((a, b) => {
        const aScore = (a.score || 0) * 0.6 - (a.price / averagePrice) * 0.4;
        const bScore = (b.score || 0) * 0.6 - (b.price / averagePrice) * 0.4;
        return bScore - aScore;
      })[0];

      return {
        success: true,
        message: `比价结果：最低价 ${cheapest.name} ¥${cheapest.price.toFixed(2)}，最高价 ${mostExpensive.name} ¥${mostExpensive.price.toFixed(2)}，平均价格 ¥${averagePrice.toFixed(2)}，最佳性价比 ${bestValue.name} ¥${bestValue.price.toFixed(2)}`,
        data: {
          products: validProducts,
          comparison: { cheapest, mostExpensive, averagePrice, bestValue },
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 支付订单
   */
  private async payOrder(
    params: { order_id?: string },
    context: { userId?: string; sessionId?: string },
  ): Promise<any> {
    if (!context.userId) {
      return { success: false, error: 'USER_NOT_AUTHENTICATED', message: '用户未认证' };
    }

    try {
      let orderId = params.order_id;

      // 如果没有提供订单ID，查找最近的待支付订单
      if (!orderId) {
        const pendingOrder = await this.orderRepository.findOne({
          where: { userId: context.userId, status: OrderStatus.PENDING },
          order: { createdAt: 'DESC' },
        });

        if (!pendingOrder) {
          return {
            success: false,
            error: 'NO_PENDING_ORDER',
            message: '没有找到待支付的订单，请提供订单ID',
          };
        }

        orderId = pendingOrder.id;
      }

      // 获取订单
      const order = await this.orderService.getOrder(context.userId, orderId);
      if (!order) {
        return {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: `订单不存在：${orderId}`,
        };
      }

      if (order.status !== OrderStatus.PENDING) {
        return {
          success: false,
          error: 'ORDER_NOT_PAYABLE',
          message: `订单状态为"${order.status}"，无法支付。只有待支付订单可以支付。`,
        };
      }

      // 创建支付意图
      const payment = await this.payIntentService.createPayIntent(context.userId, {
        type: PayIntentType.ORDER_PAYMENT,
        amount: Number(order.amount),
        currency: order.currency,
        description: `订单支付：${order.id}`,
        orderId: order.id,
        merchantId: order.merchantId,
      });

      const paymentUrl = (payment.metadata as any)?.payUrl || '已生成';

      return {
        success: true,
        message: `支付链接已生成！订单ID：${order.id}，金额：¥${Number(order.amount).toFixed(2)} ${order.currency}`,
        data: {
          orderId: order.id,
          paymentId: payment.id,
          paymentUrl,
          amount: order.amount,
          currency: order.currency,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 物流跟踪
   */
  private async trackLogistics(
    params: { order_id: string },
    context: { userId?: string; sessionId?: string },
  ): Promise<any> {
    if (!context.userId) {
      return { success: false, error: 'USER_NOT_AUTHENTICATED', message: '用户未认证' };
    }

    try {
      const order = await this.orderService.getOrder(context.userId, params.order_id);
      const tracking = await this.logisticsService.getLogisticsTracking(params.order_id);
      return {
        success: true,
        message: `订单 ${params.order_id} 物流状态：${tracking?.status || order.status}`,
        data: { order_id: params.order_id, tracking, order_status: order.status },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

