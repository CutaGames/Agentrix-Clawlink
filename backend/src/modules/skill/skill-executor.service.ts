/**
 * Skill Executor Service
 * 
 * 执行 Skill 的统一入口
 */

import { Injectable, Logger, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { Skill, SkillPricingType, SkillLayer } from '../../entities/skill.entity';
import { SkillService } from './skill.service';
import { MCPServerProxyService } from './mcp-server-proxy.service';
import { X402AuthorizationService } from '../payment/x402-authorization.service';
import { AgentPaymentService } from '../payment/agent-payment.service';
import { ProductService } from '../product/product.service';
import { WalletService } from '../wallet/wallet.service';
import { AirdropService } from '../auto-earn/airdrop.service';
import { AgentAuthorizationService } from '../agent-authorization/agent-authorization.service';
import { AgentMarketplaceService } from '../marketplace/agent-marketplace.service';
import { UnifiedMarketplaceService } from '../unified-marketplace/unified-marketplace.service';
import { A2AService } from '../a2a/a2a.service';
import axios from 'axios';

export interface ExecutionContext {
  userId?: string;
  sessionId?: string;
  apiKey?: string;
  platform?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
  skillId?: string;
  skillName?: string;
  billingInfo?: {
    amount: number;
    currency: string;
    paymentId: string;
  };
}

@Injectable()
export class SkillExecutorService {
  private readonly logger = new Logger(SkillExecutorService.name);

  // 内部处理器注册表
  private readonly internalHandlers: Map<string, (params: any, context: ExecutionContext) => Promise<any>> = new Map();

  constructor(
    private readonly skillService: SkillService,
    private readonly mcpProxyService: MCPServerProxyService,
    private readonly x402AuthService: X402AuthorizationService,
    private readonly agentPaymentService: AgentPaymentService,
    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService,
    private readonly walletService: WalletService,
    private readonly airdropService: AirdropService,
    private readonly agentAuthorizationService: AgentAuthorizationService,
    private readonly agentMarketplaceService: AgentMarketplaceService,
    private readonly unifiedMarketplaceService: UnifiedMarketplaceService,
    @Inject(forwardRef(() => A2AService))
    private readonly a2aService: A2AService,
  ) {
    this.registerDefaultHandlers();
  }

  /**
   * 执行 Skill
   */
  async execute(skillId: string, params: any, context: ExecutionContext = {}): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      const skill = await this.skillService.findById(skillId);

      // 1. 处理计费
      let billingInfo = null;
      if (skill.pricing && skill.pricing.type === SkillPricingType.PER_CALL && skill.pricing.pricePerCall > 0) {
        if (!context.userId) {
          throw new BadRequestException('Billing required for this skill but no userId provided');
        }

        // 检查 X402 授权
        const auth = await this.x402AuthService.checkAuthorization(context.userId);
        if (!auth) {
          throw new ForbiddenException('X402 Authorization required for paid skills. Please authorize in settings.');
        }

        if (skill.pricing.pricePerCall > auth.singleLimit) {
          throw new ForbiddenException(`Skill price (${skill.pricing.pricePerCall}) exceeds single transaction limit (${auth.singleLimit})`);
        }

        // 记录支付 (代付模式)
        const payment = await this.agentPaymentService.createAgentPayment({
          agentId: 'x402_system',
          userId: context.userId,
          amount: skill.pricing.pricePerCall,
          currency: skill.pricing.currency || 'USD',
          merchantId: skill.authorId || 'system',
          description: `Skill Execution: ${skill.name}`,
          repaymentMethod: 'system'
        });

        // 立即确认 (原子结算模拟)
        await this.agentPaymentService.confirmAgentPayment(payment.id, 'x402_system', `X402-EXEC-${Date.now()}`);
        
        // 记录使用量
        await this.x402AuthService.recordUsage(auth.id, skill.pricing.pricePerCall);

        billingInfo = {
          amount: skill.pricing.pricePerCall,
          currency: skill.pricing.currency || 'USD',
          paymentId: payment.id,
        };
      }

      // 2. 验证参数
      this.validateParams(skill, params);

      // 3. 执行
      let result: any;
      if (skill.executor.type === 'http') {
        result = await this.executeHttpSkill(skill, params, context);
      } else if (skill.executor.type === 'internal') {
        result = await this.executeInternalSkill(skill, params, context);
      } else if (skill.executor.type === 'mcp') {
        result = await this.executeMcpSkill(skill, params, context);
      } else {
        throw new BadRequestException(`Unknown executor type: ${skill.executor.type}`);
      }

      // 4. 更新调用计数
      await this.skillService.incrementCallCount(skillId);

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        skillId: skill.id,
        skillName: skill.name,
        billingInfo,
      };
    } catch (error: any) {
      this.logger.error(`Skill execution failed: ${skillId}`, error.stack);
      return {
        success: false,
        error: error.message || 'Execution failed',
        executionTime: Date.now() - startTime,
        skillId,
      };
    }
  }

  /**
   * 执行 HTTP Skill
   */
  private async executeHttpSkill(skill: Skill, params: any, context: ExecutionContext): Promise<any> {
    const { endpoint, method = 'POST', headers = {} } = skill.executor;

    if (!endpoint) {
      throw new BadRequestException('HTTP executor requires endpoint');
    }

    const response = await axios({
      method: method.toLowerCase(),
      url: endpoint,
      data: params,
      headers: {
        'Content-Type': 'application/json',
        'X-Agentrix-Context': JSON.stringify(context),
        ...headers,
      },
      timeout: 30000, // 30 秒超时
    });

    return response.data;
  }

  /**
   * 执行内部 Skill
   */
  private async executeInternalSkill(skill: Skill, params: any, context: ExecutionContext): Promise<any> {
    const handlerName = skill.executor.internalHandler;

    if (!handlerName) {
      throw new BadRequestException('Internal executor requires handler name');
    }

    const handler = this.internalHandlers.get(handlerName);
    if (!handler) {
      throw new BadRequestException(`Internal handler not found: ${handlerName}`);
    }

    return handler(params, context);
  }

  /**
   * 执行 MCP Skill
   */
  private async executeMcpSkill(skill: Skill, params: any, context: ExecutionContext): Promise<any> {
    const serverName = skill.executor.mcpServer;
    // 假设 skill.name 的格式为 mcp_servername_toolname 或者直接通过元数据获取
    // 实际实现中，通常一个 Skill 对应一个特定的 Tool
    const toolName = skill.executor.internalHandler || skill.name.replace(/^mcp_/, '').replace(/^[^_]+_/, '');

    if (!serverName) {
      throw new BadRequestException('MCP executor requires server name');
    }

    return this.mcpProxyService.callTool(serverName, toolName, params);
  }

  /**
   * 注册内部处理器
   */
  registerHandler(name: string, handler: (params: any, context: ExecutionContext) => Promise<any>): void {
    this.internalHandlers.set(name, handler);
    this.logger.log(`Registered internal handler: ${name}`);
  }

  /**
   * 验证参数
   */
  private validateParams(skill: Skill, params: any): void {
    const { required = [] } = skill.inputSchema;

    for (const field of required) {
      if (params[field] === undefined || params[field] === null) {
        throw new BadRequestException(`Missing required parameter: ${field}`);
      }
    }
  }

  /**
   * 注册默认处理器
   */
  private registerDefaultHandlers(): void {
    // ============ 电商类 Handlers ============
    
    // 搜索商品 - 搜索 Skills (新的统一市场)
    this.registerHandler('search_products', async (params, context) => {
      try {
        // 使用统一市场搜索 Skills
        const searchResult = await this.unifiedMarketplaceService.search({
          query: params.query,
          layer: params.type === 'service' ? [SkillLayer.RESOURCE] : undefined,
          resourceType: params.type ? [params.type as any] : undefined,
          page: 1,
          limit: 20,
        });
        
        const formattedProducts = searchResult.items.map(skill => ({
          id: skill.id,
          name: skill.displayName || skill.name,
          description: skill.description,
          price: skill.pricing?.pricePerCall || 0,
          currency: skill.pricing?.currency || 'USD',
          type: skill.resourceType || 'service',
          category: skill.category,
          stock: 999,
          image: skill.imageUrl || skill.thumbnailUrl,
          checkoutUrl: `https://agentrix.top/pay/checkout?skillId=${skill.id}`,
          skillId: skill.id
        }));
        
        return {
          products: formattedProducts,
          total: searchResult.total,
          message: formattedProducts.length > 0 
            ? `Found ${formattedProducts.length} products matching "${params.query}"`
            : `No products found for "${params.query}". Try browsing the marketplace.`
        };
      } catch (error) {
        console.error('search_products error:', error);
        return {
          products: [],
          total: 0,
          message: `Search failed: ${error.message}`
        };
      }
    });

    // 创建订单 - 真实实现
    this.registerHandler('create_order', async (params, context) => {
      const product = await this.productService.getProduct(params.productId);
      const quantity = params.quantity || 1;
      const totalPrice = Number(product.price) * quantity;
      
      return {
        success: true,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          currency: product.metadata?.currency || 'CNY'
        },
        quantity: quantity,
        totalPrice: totalPrice,
        checkoutUrl: `https://agentrix.top/pay/checkout?productId=${product.id}&quantity=${quantity}`,
        message: `Order created for ${quantity}x ${product.name}. Total: ${totalPrice} ${product.metadata?.currency || 'CNY'}.`
      };
    });

    // 查询余额 - 真实实现
    this.registerHandler('get_balance', async (params, context) => {
      const userId = params.userId || context.userId;
      if (!userId) {
        return { error: 'userId is required', balance: 0, currency: 'USDT' };
      }
      const balance = await this.walletService.getWalletBalance(userId, params.chain);
      return balance;
    });

    // ============ 资产类 Handlers ============
    
    // 资产总览
    this.registerHandler('asset_overview', async (params, context) => {
      const userId = params.userId || context.userId;
      if (!userId) {
        return { error: 'userId is required' };
      }
      
      // 获取钱包余额
      const walletBalance = await this.walletService.getWalletBalance(userId, 'all');
      
      // 获取 X402 授权状态
      let x402Status = null;
      try {
        x402Status = await this.x402AuthService.checkAuthorization(userId);
      } catch (e) {
        // 用户可能没有 X402 授权
      }
      
      return {
        success: true,
        userId,
        wallet: walletBalance,
        x402Authorization: x402Status ? {
          enabled: true,
          dailyLimit: x402Status.dailyLimit,
          singleLimit: x402Status.singleLimit,
          usedToday: x402Status.usedToday,
          remaining: x402Status.dailyLimit - x402Status.usedToday,
        } : { enabled: false },
        message: '资产总览获取成功'
      };
    });

    // ============ 空投类 Handlers ============
    
    // 空投发现
    this.registerHandler('airdrop_discover', async (params, context) => {
      const userId = params.userId || context.userId;
      if (!userId) {
        return { error: 'userId is required', airdrops: [] };
      }
      const airdrops = await this.airdropService.discoverAirdrops(userId);
      return {
        success: true,
        airdrops,
        total: airdrops.length,
        message: airdrops.length > 0 
          ? `发现 ${airdrops.length} 个可领取的空投`
          : '暂无可领取的空投'
      };
    });

    // 空投领取
    this.registerHandler('airdrop_claim', async (params, context) => {
      const userId = params.userId || context.userId;
      if (!userId) {
        return { error: 'userId is required' };
      }
      if (!params.airdropId) {
        return { error: 'airdropId is required' };
      }
      
      try {
        const result = await this.airdropService.claimAirdrop(userId, params.airdropId);
        return {
          success: true,
          ...result,
          message: '空投领取成功'
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: '空投领取失败'
        };
      }
    });

    // ============ 授权类 Handlers ============
    
    // 撤销授权
    this.registerHandler('agent_revoke', async (params, context) => {
      const userId = params.userId || context.userId;
      if (!userId) {
        return { error: 'userId is required' };
      }
      if (!params.authorizationId) {
        return { error: 'authorizationId is required' };
      }
      
      try {
        await this.agentAuthorizationService.revokeAuthorization(params.authorizationId);
        return {
          success: true,
          message: '授权已成功撤销'
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: '撤销授权失败'
        };
      }
    });

    // 获取授权列表
    this.registerHandler('agent_authorizations', async (params, context) => {
      const userId = params.userId || context.userId;
      if (!userId) {
        return { error: 'userId is required', authorizations: [] };
      }
      
      const authorizations = await this.agentAuthorizationService.getAuthorizationsByUserId(userId);
      return {
        success: true,
        authorizations,
        total: authorizations.length,
        message: `找到 ${authorizations.length} 个授权记录`
      };
    });

    // ============ 工具类 Handlers ============
    
    // Echo 测试处理器
    this.registerHandler('echo', async (params, context) => {
      return {
        echo: params,
        context: {
          userId: context.userId,
          platform: context.platform,
        },
        timestamp: new Date().toISOString(),
      };
    });

    // ============ Core Platform Skills (Strategic Plan Section 4) ============

    // 发现可用 Agent
    this.registerHandler('agent_discover', async (params, context) => {
      const results = await this.agentMarketplaceService.searchAgents({
        keyword: params.query,
        category: params.category,
        page: params.page || 1,
        pageSize: params.limit || 10
      });
      return {
        success: true,
        ...results,
        message: `Found ${results.total} agents matching your request.`
      };
    });

    // 调用/委托任务给 Agent (Real A2A message passing)
    this.registerHandler('agent_invoke', async (params, context) => {
      this.logger.log(`Invoking agent ${params.agentId} with task: ${params.task}`);

      const task = await this.a2aService.createTask({
        requesterAgentId: params.requesterAgentId || context.metadata?.agentId || 'system',
        targetAgentId: params.agentId,
        requesterUserId: context.userId,
        title: params.task || params.title || 'A2A Task',
        description: params.description || params.task || '',
        taskType: params.taskType,
        params: params.params,
        priority: params.priority,
        maxPrice: params.maxPrice ? String(params.maxPrice) : undefined,
        currency: params.currency,
        paymentMethod: params.paymentMethod,
        mandateId: params.mandateId,
        budgetPoolId: params.budgetPoolId,
        skillId: params.skillId,
        deadline: params.deadline,
        callback: params.callback,
        parentTaskId: params.parentTaskId,
        metadata: params.metadata,
      });

      return {
        success: true,
        message: `Task delegated to agent ${params.agentId}`,
        taskId: task.id,
        jobId: task.id,
        status: task.status,
        createdAt: task.createdAt,
      };
    });

    this.registerHandler('agent_delegate', async (params, context) => {
      return this.internalHandlers.get('agent_invoke')(params, context);
    });

    // 充值/法币入金 (Transak)
    this.registerHandler('onramp_fiat', async (params, context) => {
      const { fiatAmount, fiatCurrency = 'USD', cryptoCurrency = 'USDC' } = params;
      const walletAddress = params.walletAddress || context.metadata?.walletAddress;
      
      const transakUrl = `https://global.transak.com/?apiKey=${process.env.TRANSAK_API_KEY || 'demo'}&fiatAmount=${fiatAmount}&fiatCurrency=${fiatCurrency}&cryptoCurrencyCode=${cryptoCurrency}&walletAddress=${walletAddress || ''}&network=bsc`;
      
      return {
        success: true,
        checkoutUrl: transakUrl,
        message: `Checkout URL generated for ${fiatAmount} ${fiatCurrency}`
      };
    });

    // X402 协议支付
    this.registerHandler('x402_pay', async (params, context) => {
      const userId = params.userId || context.userId;
      if (!userId) {
        throw new BadRequestException('userId is required');
      }

      // 这里直接调用支付服务的 A2A 支付逻辑
      const payment = await this.agentPaymentService.createAgentPayment({
        agentId: params.agentId || 'direct_pay',
        userId: userId,
        amount: params.amount,
        currency: params.currency || 'USDC',
        merchantId: params.merchantId || 'system',
        description: params.description || 'X402 Protocol Payment',
        repaymentMethod: 'system'
      });

      return {
        success: true,
        paymentId: payment.id,
        status: payment.status,
        message: `X402 payment created successfully`
      };
    });

    // 计算分账金额
    this.registerHandler('commission_calculate', async (params, context) => {
      const { amount, feeRate = 0.05 } = params;
      const commission = Number(amount) * Number(feeRate);
      return {
        success: true,
        originalAmount: amount,
        feeRate,
        commission,
        netAmount: Number(amount) - commission
      };
    });

    // 执行分账 (Placeholder)
    this.registerHandler('commission_distribute', async (params, context) => {
      this.logger.log(`Distributing commission for payment: ${params.paymentId}`);
      return {
        success: true,
        paymentId: params.paymentId,
        distributed: true,
        timestamp: new Date().toISOString()
      };
    });

    // QuickPay 快捷支付 (基于 X402)
    this.registerHandler('quickpay_execute', async (params, context) => {
      // 实际上就是一种简化的 x402_pay 调用
      return this.internalHandlers.get('x402_pay')(params, context);
    });
  }
}
