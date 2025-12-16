import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { SearchService } from '../../search/search.service';
import { ProductService } from '../../product/product.service';
import { OrderService } from '../../order/order.service';
import { PayIntentService, CreatePayIntentDto } from '../../payment/pay-intent.service';
import { PayIntentType } from '../../../entities/pay-intent.entity';
import { OrderStatus } from '../../../entities/order.entity';
import { ApiKeyService } from '../../api-key/api-key.service';

/**
 * Marketplace GPTs Controller
 * 
 * 专门为 GPTs Actions 提供的 REST API 端点
 * 符合 OpenAPI 3.1.0 规范，支持标准的 REST API 格式
 */
@ApiTags('Marketplace (GPTs)')
@Controller('marketplace')
@Public() // 允许 GPTs 访问，但需要通过 API Key 认证
export class MarketplaceGPTsController {
  private readonly logger = new Logger(MarketplaceGPTsController.name);

  constructor(
    private searchService: SearchService,
    private productService: ProductService,
    private orderService: OrderService,
    private payIntentService: PayIntentService,
    @Inject(forwardRef(() => ApiKeyService))
    private apiKeyService: ApiKeyService,
  ) {}

  /**
   * 从多个可能的 Header 中提取 API Key
   * 支持: x-api-key, agentrix-api-key, authorization
   */
  private extractApiKey(headers: Record<string, string | undefined>): string | null {
    // 按优先级检查不同的 Header 名称
    const apiKey = headers['x-api-key'] || 
                   headers['agentrix-api-key'] || 
                   headers['authorization'];
    
    if (!apiKey) return null;
    
    // 处理 Bearer token 格式
    if (apiKey.toLowerCase().startsWith('bearer ')) {
      return apiKey.substring(7);
    }
    
    return apiKey;
  }

  /**
   * 搜索商品
   * GET /api/marketplace/search
   */
  @Get('search')
  @ApiOperation({ 
    summary: 'Search products',
    description: '搜索商品，支持语义搜索、分类筛选、价格筛选等'
  })
  @ApiSecurity('ApiKeyAuth')
  @ApiQuery({ name: 'query', required: true, description: '搜索查询（支持自然语言）' })
  @ApiQuery({ name: 'category', required: false, description: '商品分类' })
  @ApiQuery({ name: 'priceMin', required: false, type: Number, description: '最低价格' })
  @ApiQuery({ name: 'priceMax', required: false, type: Number, description: '最高价格' })
  @ApiQuery({ name: 'currency', required: false, description: '货币类型' })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean, description: '是否仅显示有库存商品' })
  @ApiQuery({ name: 'assetType', required: false, description: '资产类型：physical(实物), service(服务), nft, ft(代币), game_asset(游戏资产), rwa(真实资产)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '返回结果数量限制' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async searchProducts(
    @Query('query') query: string,
    @Query('category') category?: string,
    @Query('priceMin') priceMin?: number,
    @Query('priceMax') priceMax?: number,
    @Query('currency') currency?: string,
    @Query('inStock') inStock?: boolean,
    @Query('assetType') assetType?: string,
    @Query('limit') limit?: number,
    @Headers('x-api-key') xApiKey?: string,
    @Headers('agentrix-api-key') agentrixApiKey?: string,
    @Headers('authorization') authorization?: string,
  ) {
    // 提取 API Key（支持多种 Header）
    const apiKey = this.extractApiKey({ 
      'x-api-key': xApiKey, 
      'agentrix-api-key': agentrixApiKey, 
      'authorization': authorization 
    });
    
    try {
      // 验证必需参数
      if (!query || query.trim().length === 0) {
        throw new HttpException(
          {
            success: false,
            error: 'BAD_REQUEST',
            message: '查询参数 query 是必需的',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 通过 API Key 识别用户（如果提供）
      const userId = await this.getUserIdFromApiKey(apiKey);
      
      // 构建搜索过滤器
      const filters: Record<string, any> = {
        type: 'product', // 只搜索商品
      };
      
      if (category) {
        filters.category = category;
      }
      if (priceMin !== undefined) {
        filters.priceMin = priceMin;
      }
      if (priceMax !== undefined) {
        filters.priceMax = priceMax;
      }
      if (currency) {
        filters.currency = currency;
      }
      if (inStock !== undefined) {
        filters.inStock = inStock;
      }
      if (assetType) {
        filters.productType = assetType;
      }
      
      // 调用搜索服务
      const searchResults = await this.searchService.semanticSearch(
        query,
        limit || 10,
        filters,
      );
      
      // 获取商品详情
      const productIds = searchResults.map(r => r.id);
      const products = await Promise.all(
        productIds.map(id => this.productService.getProduct(id).catch(() => null))
      );
      
      // 过滤掉不存在的商品，并格式化
      const validProducts = products
        .filter(p => p !== null)
        .map(p => this.formatProduct(p));
      
      // 应用库存过滤（如果指定）
      const filteredProducts = inStock !== undefined && inStock
        ? validProducts.filter(p => p.inStock)
        : validProducts;
      
      return {
        success: true,
        message: `找到 ${filteredProducts.length} 个相关商品`,
        data: {
          items: filteredProducts,
          total: filteredProducts.length,
          query: query,
        },
      };
    } catch (error) {
      this.logger.error('搜索商品失败:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          error: 'INTERNAL_ERROR',
          message: error.message || '搜索商品时发生错误',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取商品详情
   * GET /api/marketplace/products/{id}
   */
  @Get('products/:id')
  @ApiOperation({ 
    summary: 'Get product details',
    description: '获取商品详情'
  })
  @ApiSecurity('ApiKeyAuth')
  @ApiParam({ name: 'id', description: '商品ID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProduct(
    @Param('id') id: string,
    @Headers('x-api-key') apiKey?: string,
  ) {
    try {
      const product = await this.productService.getProduct(id);
      
      if (!product) {
        throw new HttpException(
          {
            success: false,
            error: 'NOT_FOUND',
            message: '商品不存在',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      return {
        success: true,
        message: '获取商品详情成功',
        data: this.formatProduct(product),
      };
    } catch (error) {
      this.logger.error('获取商品详情失败:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          error: 'INTERNAL_ERROR',
          message: error.message || '获取商品详情时发生错误',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 创建订单
   * POST /api/marketplace/orders
   * 
   * 注意：为了符合 OpenAPI Schema 并避免与现有 OrderController 冲突，
   * 我们将路径放在 marketplace 下
   */
  @Post('orders')
  @ApiOperation({ 
    summary: 'Create an order',
    description: '创建订单'
  })
  @ApiSecurity('ApiKeyAuth')
  @ApiResponse({ status: 200, description: 'Order created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createOrder(
    @Body() input: {
      productId: string;
      quantity?: number;
      shippingAddress?: {
        name: string;
        phone: string;
        addressLine: string;
        city?: string;
        postalCode?: string;
        country?: string;
      };
      appointmentTime?: string;
      contactInfo?: string;
      walletAddress?: string;
      chain?: string;
    },
    @Headers('x-api-key') apiKey?: string,
  ) {
    try {
      // 通过 API Key 识别用户
      const userId = await this.getUserIdFromApiKey(apiKey);
      if (!userId) {
        throw new HttpException(
          {
            success: false,
            error: 'UNAUTHORIZED',
            message: '需要提供有效的 API Key',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      
      // 验证必需参数
      if (!input.productId) {
        throw new HttpException(
          {
            success: false,
            error: 'BAD_REQUEST',
            message: 'productId 是必需的',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      // 获取商品信息
      const product = await this.productService.getProduct(input.productId);
      if (!product) {
        throw new HttpException(
          {
            success: false,
            error: 'NOT_FOUND',
            message: '商品不存在',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      // 创建订单
      const order = await this.orderService.createOrder(userId, {
        merchantId: product.merchantId,
        productId: input.productId,
        amount: Number(product.price) * (input.quantity || 1),
        currency: (product.metadata as any)?.currency || 'CNY',
        metadata: {
          quantity: input.quantity || 1,
          shippingAddress: input.shippingAddress,
          appointmentTime: input.appointmentTime,
          contactInfo: input.contactInfo,
          walletAddress: input.walletAddress,
          chain: input.chain,
        },
      });
      
      return {
        success: true,
        message: '订单创建成功',
        data: {
          orderId: order.id,
          status: order.status,
          amount: order.amount,
          currency: order.currency,
          productId: order.productId,
          quantity: input.quantity || 1,
          createdAt: order.createdAt.toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('创建订单失败:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          error: 'INTERNAL_ERROR',
          message: error.message || '创建订单时发生错误',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 创建支付意图
   * POST /api/marketplace/payments
   * 
   * 注意：为了符合 OpenAPI Schema 并避免与现有 PaymentController 冲突，
   * 我们将路径放在 marketplace 下
   */
  @Post('payments')
  @ApiOperation({ 
    summary: 'Initiate a payment',
    description: '创建支付意图，返回支付页面URL'
  })
  @ApiSecurity('ApiKeyAuth')
  @ApiResponse({ status: 200, description: 'Payment session created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async initiatePayment(
    @Body() input: {
      orderId: string;
      method?: string;
    },
    @Headers('x-api-key') apiKey?: string,
  ) {
    try {
      // 通过 API Key 识别用户
      const userId = await this.getUserIdFromApiKey(apiKey);
      if (!userId) {
        throw new HttpException(
          {
            success: false,
            error: 'UNAUTHORIZED',
            message: '需要提供有效的 API Key',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }
      
      // 验证必需参数
      if (!input.orderId) {
        throw new HttpException(
          {
            success: false,
            error: 'BAD_REQUEST',
            message: 'orderId 是必需的',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      // 获取订单信息
      const order = await this.orderService.getOrder(userId, input.orderId);
      if (!order) {
        throw new HttpException(
          {
            success: false,
            error: 'NOT_FOUND',
            message: '订单不存在',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      // 检查订单状态
      if (order.status !== OrderStatus.PENDING) {
        throw new HttpException(
          {
            success: false,
            error: 'BAD_REQUEST',
            message: `订单状态为 ${order.status}，无法支付`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      // 创建支付意图
      const payIntentDto: CreatePayIntentDto = {
        orderId: input.orderId,
        amount: order.amount,
        currency: order.currency || 'CNY',
        type: PayIntentType.ORDER_PAYMENT,
        paymentMethod: {
          type: input.method || 'crypto',
        },
        metadata: {
          paymentMethod: input.method,
        },
      };
      
      const payIntent = await this.payIntentService.createPayIntent(userId, payIntentDto);
      
      // 生成支付页面URL
      const frontendUrl = process.env.FRONTEND_URL || 'https://www.agentrix.top';
      const paymentUrl = `${frontendUrl}/payment/${payIntent.id}`;
      
      return {
        success: true,
        message: '支付意图创建成功',
        data: {
          paymentId: payIntent.id,
          paymentUrl: paymentUrl,
          status: payIntent.status,
          orderId: input.orderId,
        },
      };
    } catch (error) {
      this.logger.error('创建支付意图失败:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          error: 'INTERNAL_ERROR',
          message: error.message || '创建支付意图时发生错误',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 辅助方法：通过 API Key 获取用户 ID
   * 使用 ApiKeyService 进行验证
   * 
   * 返回值：
   * - 平台级 Key: 返回 'platform'（表示这是 GPTs 等第三方调用）
   * - 用户级 Key: 返回实际的用户 ID
   * - 无 Key 或验证失败: 返回 null
   */
  private async getUserIdFromApiKey(apiKey?: string): Promise<string | null> {
    if (!apiKey) {
      // 没有 API Key 也允许访问搜索等公开接口
      this.logger.debug('No API Key provided, allowing anonymous access for public endpoints');
      return null;
    }
    
    try {
      // 使用 ApiKeyService 验证
      const result = await this.apiKeyService.validateApiKey(apiKey);
      
      if (result.isPlatform) {
        this.logger.debug('Platform API Key validated successfully');
        return 'platform'; // 平台级 Key，不关联具体用户
      }
      
      return result.userId;
    } catch (error) {
      // 如果验证失败，记录日志但不阻止访问公开接口
      this.logger.warn(`API Key 验证失败: ${error.message}`);
      
      // 对于搜索等公开接口，即使 Key 无效也允许访问
      // 但创建订单等需要用户身份的接口会在后续检查中拒绝
      return null;
    }
  }

  /**
   * 格式化商品数据，符合 OpenAPI Schema
   * 支持多资产类型：physical, service, nft, ft, game_asset, rwa
   */
  private formatProduct(product: any): any {
    const metadata = product.metadata || {};
    const currency = metadata.currency || product.currency || 'CNY';
    const priceDisplay = this.formatPrice(product.price, currency);
    const productType = product.productType || 'physical';
    
    // 基础商品信息
    const formatted: any = {
      id: product.id,
      title: product.name,
      name: product.name,
      description: product.description || '',
      price: Number(product.price),
      currency: currency,
      priceDisplay: priceDisplay,
      image: product.image || product.images?.[0] || null,
      images: product.images || [],
      category: product.category || null,
      productType: productType,
      assetType: productType, // 别名，方便GPT理解
      stock: product.stock || 0,
      inStock: (product.stock || 0) > 0,
      merchantId: product.merchantId || null,
      merchantName: product.merchant?.name || null,
    };
    
    // 根据资产类型添加额外信息
    switch (productType) {
      case 'service':
        // 服务类商品
        formatted.serviceInfo = {
          serviceType: metadata.serviceType || 'one-time', // subscription, one-time, consultation
          duration: metadata.duration || null,
          deliverables: metadata.deliverables || [],
          format: metadata.format || null, // 视频会议、线下等
        };
        break;
        
      case 'nft':
        // NFT资产
        formatted.nftInfo = {
          tokenAddress: metadata.tokenAddress || null,
          tokenId: metadata.tokenId || null,
          chainId: metadata.chainId || null,
          chainName: metadata.chainName || this.getChainName(metadata.chainId),
          standard: metadata.standard || 'ERC-721',
          attributes: metadata.attributes || [],
          rarity: this.calculateRarity(metadata.attributes),
        };
        formatted.blockchainBadge = `${formatted.nftInfo.chainName} NFT`;
        break;
        
      case 'ft':
        // 同质化代币
        formatted.tokenInfo = {
          tokenAddress: metadata.tokenAddress || null,
          chainId: metadata.chainId || null,
          chainName: metadata.chainName || this.getChainName(metadata.chainId),
          symbol: metadata.symbol || null,
          decimals: metadata.decimals || 18,
          amount: metadata.amount || 1,
          standard: metadata.standard || 'ERC-20',
        };
        formatted.blockchainBadge = `${metadata.symbol || 'Token'} on ${formatted.tokenInfo.chainName}`;
        break;
        
      case 'game_asset':
        // 游戏资产
        formatted.gameInfo = {
          gameId: metadata.gameId || null,
          gameName: metadata.gameName || null,
          itemType: metadata.itemType || null, // weapon, mount, skin, etc.
          rarity: metadata.rarity || 'common',
          stats: metadata.stats || {},
          level: metadata.level || null,
          tradeable: metadata.tradeable !== false,
        };
        formatted.rarityBadge = metadata.rarity?.toUpperCase() || 'COMMON';
        break;
        
      case 'rwa':
        // 真实世界资产代币化
        formatted.rwaInfo = {
          assetType: metadata.assetType || null, // real_estate, precious_metal, artwork, etc.
          underlying: metadata.underlying || null,
          totalShares: metadata.totalShares || null,
          custodian: metadata.custodian || null,
          redeemable: metadata.redeemable || false,
          annualYield: metadata.annualYield || null,
          tokenAddress: metadata.tokenAddress || null,
          chainId: metadata.chainId || null,
        };
        formatted.rwaBadge = metadata.assetType?.replace('_', ' ').toUpperCase() || 'RWA';
        break;
        
      case 'physical':
      default:
        // 实物商品
        formatted.physicalInfo = {
          brand: metadata.brand || null,
          color: metadata.color || null,
          warranty: metadata.warranty || null,
          weight: metadata.weight || null,
          dimensions: metadata.dimensions || null,
        };
        break;
    }
    
    return formatted;
  }
  
  /**
   * 根据链ID获取链名称
   */
  private getChainName(chainId?: number): string {
    const chains: Record<number, string> = {
      1: 'Ethereum',
      56: 'BSC',
      97: 'BSC Testnet',
      137: 'Polygon',
      80001: 'Mumbai',
      42161: 'Arbitrum',
      10: 'Optimism',
      43114: 'Avalanche',
    };
    return chains[chainId || 0] || 'Unknown';
  }
  
  /**
   * 计算NFT稀有度
   */
  private calculateRarity(attributes?: any[]): string {
    if (!attributes || attributes.length === 0) return 'common';
    
    const rarityAttr = attributes.find((a: any) => 
      a.trait_type?.toLowerCase() === 'rarity' || 
      a.trait_type?.toLowerCase() === 'tier'
    );
    
    return rarityAttr?.value?.toLowerCase() || 'common';
  }

  /**
   * 格式化价格显示
   */
  private formatPrice(price: number, currency: string): string {
    const priceNum = Number(price);
    const symbol = this.getCurrencySymbol(currency);
    return `${symbol}${priceNum.toFixed(2)}`;
  }

  /**
   * 获取货币符号
   */
  private getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      CNY: '¥',
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
    };
    return symbols[currency.toUpperCase()] || currency;
  }
}

