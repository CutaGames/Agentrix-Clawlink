import { Injectable, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SplitPlanService } from './split-plan.service';
import { BudgetPoolService } from './budget-pool.service';
import { UsagePatternService, UsageHint } from './usage-pattern.service';
import { CreateSplitPlanDto, UpdateSplitPlanDto, PreviewAllocationDto } from './dto/split-plan.dto';
import { 
  CreateBudgetPoolDto, 
  UpdateBudgetPoolDto, 
  FundBudgetPoolDto,
  CreateMilestoneDto,
  SubmitMilestoneDto,
  ApproveMilestoneDto,
  RejectMilestoneDto,
} from './dto/budget-pool.dto';
import { PaymentService } from '../payment/payment.service';
import { PayIntent, PayIntentStatus, PayIntentType } from '../../entities/pay-intent.entity';
import { Payment, PaymentStatus, PaymentMethod } from '../../entities/payment.entity';
import { v4 as uuidv4 } from 'uuid';

// Commerce Order Entity (内联定义，可后续独立)
export interface CommerceOrder {
  id: string;
  userId: string;
  type: 'product' | 'service' | 'subscription';
  status: 'draft' | 'pending' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  items: OrderItem[];
  splitPlanId?: string;
  paymentIntentId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  metadata?: Record<string, any>;
}

// 幂等性缓存 (生产环境应使用 Redis)
const idempotencyCache = new Map<string, { result: any; expiresAt: number }>();

export type CommerceMode = 'PAY_ONLY' | 'SPLIT_ONLY' | 'PAY_AND_SPLIT';

export type CommerceAction = 
  // 订单
  | 'createOrder'
  | 'getOrder'
  | 'updateOrder'
  // 支付
  | 'createPaymentIntent'
  | 'capturePayment'
  | 'refundPayment'
  // 分佣计划
  | 'createSplitPlan'
  | 'getSplitPlan'
  | 'getSplitPlans'
  | 'updateSplitPlan'
  | 'activateSplitPlan'
  | 'archiveSplitPlan'
  | 'deleteSplitPlan'
  | 'previewAllocation'
  // 预算池
  | 'createBudgetPool'
  | 'getBudgetPool'
  | 'getBudgetPools'
  | 'updateBudgetPool'
  | 'fundBudgetPool'
  | 'cancelBudgetPool'
  | 'getPoolStats'
  // 里程碑
  | 'createMilestone'
  | 'getMilestones'
  | 'getMilestone'
  | 'startMilestone'
  | 'submitMilestone'
  | 'approveMilestone'
  | 'rejectMilestone'
  | 'releaseMilestone'
  // 结算
  | 'getSettlements'
  | 'payoutSettlement'
  // 账本
  | 'getLedger';

@Injectable()
export class CommerceService {
  private readonly logger = new Logger(CommerceService.name);
  
  // 内存订单存储 (生产环境应使用数据库实体)
  private orders = new Map<string, CommerceOrder>();
  // 内存结算记录
  private settlements = new Map<string, any>();
  // 内存账本
  private ledgerEntries: any[] = [];

  constructor(
    private readonly splitPlanService: SplitPlanService,
    private readonly budgetPoolService: BudgetPoolService,
    private readonly usagePatternService: UsagePatternService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService?: PaymentService,
  ) {}

  /**
   * 幂等性检查
   */
  private async checkIdempotency(key: string): Promise<{ cached: boolean; result?: any }> {
    const cached = idempotencyCache.get(key);
    if (cached) {
      if (cached.expiresAt > Date.now()) {
        this.logger.debug(`Idempotency cache hit for key: ${key}`);
        return { cached: true, result: cached.result };
      }
      // 过期清理
      idempotencyCache.delete(key);
    }
    return { cached: false };
  }

  /**
   * 保存幂等性结果
   */
  private saveIdempotencyResult(key: string, result: any, ttlMs: number = 24 * 60 * 60 * 1000): void {
    idempotencyCache.set(key, {
      result,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * 统一执行入口
   */
  async execute(
    action: CommerceAction,
    mode: CommerceMode,
    params: Record<string, any>,
    userId?: string,
    idempotencyKey?: string,
  ) {
    // 幂等性检查
    if (idempotencyKey) {
      const { cached, result } = await this.checkIdempotency(idempotencyKey);
      if (cached) {
        return result;
      }
    }

    // 记录调用（用于模式分析）
    if (userId) {
      this.usagePatternService.recordCall(userId, action, params);
    }

    let result: any;

    switch (action) {
      // ===== 分佣计划 =====
      case 'createSplitPlan':
        if (!userId) throw new BadRequestException('User authentication required');
        return this.splitPlanService.create(userId, params as CreateSplitPlanDto);

      case 'getSplitPlans':
        if (!userId) throw new BadRequestException('User authentication required');
        return this.splitPlanService.findByUser(userId, params);

      case 'getSplitPlan':
        return this.splitPlanService.findById(params.id, userId);

      case 'updateSplitPlan':
        if (!userId) throw new BadRequestException('User authentication required');
        return this.splitPlanService.update(params.id, userId, params as UpdateSplitPlanDto);

      case 'activateSplitPlan':
        if (!userId) throw new BadRequestException('User authentication required');
        return this.splitPlanService.activate(params.id, userId);

      case 'archiveSplitPlan':
        if (!userId) throw new BadRequestException('User authentication required');
        return this.splitPlanService.archive(params.id, userId);

      case 'deleteSplitPlan':
        if (!userId) throw new BadRequestException('User authentication required');
        await this.splitPlanService.remove(params.id, userId);
        return { success: true };

      case 'previewAllocation':
        return this.splitPlanService.previewAllocation(params as PreviewAllocationDto);

      // ===== 预算池 =====
      case 'createBudgetPool':
        if (!userId) throw new BadRequestException('User authentication required');
        return this.budgetPoolService.createPool(userId, params as CreateBudgetPoolDto);

      case 'getBudgetPools':
        if (!userId) throw new BadRequestException('User authentication required');
        return this.budgetPoolService.findPoolsByUser(userId, params);

      case 'getBudgetPool':
        return this.budgetPoolService.findPoolById(params.id, userId);

      case 'updateBudgetPool':
        if (!userId) throw new BadRequestException('User authentication required');
        return this.budgetPoolService.updatePool(params.id, userId, params as UpdateBudgetPoolDto);

      case 'fundBudgetPool':
        if (!userId) throw new BadRequestException('User authentication required');
        return this.budgetPoolService.fundPool(params.id, userId, params as FundBudgetPoolDto);

      case 'cancelBudgetPool':
        if (!userId) throw new BadRequestException('User authentication required');
        return this.budgetPoolService.cancelPool(params.id, userId);

      case 'getPoolStats':
        if (!userId) throw new BadRequestException('User authentication required');
        return this.budgetPoolService.getPoolStats(params.id, userId);

      // ===== 里程碑 =====
      case 'createMilestone':
        if (!userId) throw new BadRequestException('User authentication required');
        return this.budgetPoolService.createMilestone(userId, params as CreateMilestoneDto);

      case 'getMilestones':
        return this.budgetPoolService.findMilestonesByPool(params.budgetPoolId);

      case 'getMilestone':
        return this.budgetPoolService.findMilestoneById(params.id);

      case 'startMilestone':
        if (!userId) throw new BadRequestException('User authentication required');
        return this.budgetPoolService.startMilestone(params.id, userId);

      case 'submitMilestone':
        return this.budgetPoolService.submitMilestone(params.id, params as SubmitMilestoneDto);

      case 'approveMilestone':
        if (!userId) throw new BadRequestException('User authentication required');
        return this.budgetPoolService.approveMilestone(params.id, userId, params as ApproveMilestoneDto);

      case 'rejectMilestone':
        if (!userId) throw new BadRequestException('User authentication required');
        return this.budgetPoolService.rejectMilestone(params.id, userId, params as RejectMilestoneDto);

      case 'releaseMilestone':
        if (!userId) throw new BadRequestException('User authentication required');
        result = await this.budgetPoolService.releaseMilestone(params.id, userId);
        break;

      // ===== 订单管理 =====
      case 'createOrder':
        if (!userId) throw new BadRequestException('User authentication required');
        result = await this.createOrder(userId, params as any);
        break;

      case 'getOrder':
        result = await this.getOrder(params.id, userId);
        break;

      case 'updateOrder':
        if (!userId) throw new BadRequestException('User authentication required');
        result = await this.updateOrder(params.id, userId, params);
        break;

      // ===== 支付处理 =====
      case 'createPaymentIntent':
        if (!userId) throw new BadRequestException('User authentication required');
        result = await this.createPaymentIntentForOrder(userId, params as any);
        break;

      case 'capturePayment':
        if (!userId) throw new BadRequestException('User authentication required');
        result = await this.capturePayment(userId, params as any);
        break;

      case 'refundPayment':
        if (!userId) throw new BadRequestException('User authentication required');
        result = await this.refundPayment(userId, params as any);
        break;

      // ===== 结算 =====
      case 'getSettlements':
        if (!userId) throw new BadRequestException('User authentication required');
        result = await this.getSettlements(userId, params);
        break;

      case 'payoutSettlement':
        if (!userId) throw new BadRequestException('User authentication required');
        result = await this.payoutSettlement(userId, params as any);
        break;

      // ===== 账本 =====
      case 'getLedger':
        if (!userId) throw new BadRequestException('User authentication required');
        result = await this.getLedger(userId, params);
        break;

      default:
        throw new BadRequestException(`Unknown action: ${action}`);
    }

    // 保存幂等性结果
    if (idempotencyKey && result) {
      this.saveIdempotencyResult(idempotencyKey, result);
    }

    return result;
  }

  // ==================== 订单管理 ====================

  /**
   * 创建订单
   */
  private async createOrder(userId: string, params: {
    type: 'product' | 'service' | 'subscription';
    items: OrderItem[];
    currency?: string;
    splitPlanId?: string;
    metadata?: Record<string, any>;
  }): Promise<CommerceOrder> {
    const totalAmount = params.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    const order: CommerceOrder = {
      id: uuidv4(),
      userId,
      type: params.type,
      status: 'draft',
      amount: totalAmount,
      currency: params.currency || 'USD',
      items: params.items.map(item => ({
        ...item,
        id: item.id || uuidv4(),
      })),
      splitPlanId: params.splitPlanId,
      metadata: params.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.set(order.id, order);
    this.logger.log(`Order created: ${order.id}, amount: ${order.amount} ${order.currency}`);

    // 记录账本
    this.addLedgerEntry({
      type: 'order_created',
      orderId: order.id,
      userId,
      amount: order.amount,
      currency: order.currency,
      timestamp: new Date(),
    });

    return order;
  }

  /**
   * 获取订单
   */
  private async getOrder(orderId: string, userId?: string): Promise<CommerceOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new BadRequestException(`Order not found: ${orderId}`);
    }
    if (userId && order.userId !== userId) {
      throw new BadRequestException('Access denied');
    }
    return order;
  }

  /**
   * 更新订单
   */
  private async updateOrder(orderId: string, userId: string, params: {
    status?: CommerceOrder['status'];
    items?: OrderItem[];
    metadata?: Record<string, any>;
  }): Promise<CommerceOrder> {
    const order = await this.getOrder(orderId, userId);

    if (order.status === 'paid' || order.status === 'fulfilled') {
      throw new BadRequestException('Cannot update a paid or fulfilled order');
    }

    if (params.items) {
      order.items = params.items;
      order.amount = params.items.reduce((sum, item) => sum + item.totalPrice, 0);
    }

    if (params.status) {
      order.status = params.status;
    }

    if (params.metadata) {
      order.metadata = { ...order.metadata, ...params.metadata };
    }

    order.updatedAt = new Date();
    this.orders.set(order.id, order);

    return order;
  }

  // ==================== 支付处理 ====================

  /**
   * 为订单创建支付意图
   */
  private async createPaymentIntentForOrder(userId: string, params: {
    orderId: string;
    paymentMethod?: string;
    returnUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    const order = await this.getOrder(params.orderId, userId);

    if (order.status !== 'draft' && order.status !== 'pending') {
      throw new BadRequestException(`Order is not in a payable state: ${order.status}`);
    }

    // 更新订单状态为 pending
    order.status = 'pending';
    order.updatedAt = new Date();
    this.orders.set(order.id, order);

    // 如果有支付服务，创建真实的支付意图
    if (this.paymentService) {
      try {
        const paymentIntent = await this.paymentService.createPaymentIntent(userId, {
          amount: order.amount,
          currency: order.currency,
          description: `Order ${order.id}`,
          paymentMethod: params.paymentMethod as any,
          metadata: {
            orderId: order.id,
            splitPlanId: order.splitPlanId,
            ...params.metadata,
          },
        });

        order.paymentIntentId = (paymentIntent as any).id || (paymentIntent as any).paymentIntentId;
        this.orders.set(order.id, order);

        return {
          paymentIntent,
          order: {
            id: order.id,
            status: order.status,
            amount: order.amount,
            currency: order.currency,
          },
        };
      } catch (error: any) {
        this.logger.error(`Failed to create payment intent: ${error.message}`);
        throw error;
      }
    }

    // 模拟支付意图（无支付服务时）
    return {
      id: `pi_${uuidv4()}`,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: 'requires_payment_method',
      clientSecret: `pi_${uuidv4()}_secret_${uuidv4()}`,
      message: 'Payment service not available, using mock response',
    };
  }

  /**
   * 捕获支付
   */
  private async capturePayment(userId: string, params: {
    orderId: string;
    paymentIntentId?: string;
    txHash?: string;
  }): Promise<any> {
    const order = await this.getOrder(params.orderId, userId);

    if (order.status !== 'pending') {
      throw new BadRequestException(`Order is not pending payment: ${order.status}`);
    }

    // 更新订单状态
    order.status = 'paid';
    order.updatedAt = new Date();
    order.metadata = {
      ...order.metadata,
      paidAt: new Date(),
      txHash: params.txHash,
      paymentIntentId: params.paymentIntentId,
    };
    this.orders.set(order.id, order);

    // 如果有分佣计划，创建结算记录
    if (order.splitPlanId) {
      await this.createSettlementFromOrder(order);
    }

    // 记录账本
    this.addLedgerEntry({
      type: 'payment_captured',
      orderId: order.id,
      userId,
      amount: order.amount,
      currency: order.currency,
      txHash: params.txHash,
      timestamp: new Date(),
    });

    this.logger.log(`Payment captured for order ${order.id}`);

    return {
      success: true,
      order: {
        id: order.id,
        status: order.status,
        amount: order.amount,
      },
    };
  }

  /**
   * 退款
   */
  private async refundPayment(userId: string, params: {
    orderId: string;
    amount?: number;
    reason?: string;
  }): Promise<any> {
    const order = await this.getOrder(params.orderId, userId);

    if (order.status !== 'paid' && order.status !== 'fulfilled') {
      throw new BadRequestException(`Order cannot be refunded: ${order.status}`);
    }

    const refundAmount = params.amount || order.amount;

    // 更新订单状态
    order.status = 'refunded';
    order.updatedAt = new Date();
    order.metadata = {
      ...order.metadata,
      refundedAt: new Date(),
      refundAmount,
      refundReason: params.reason,
    };
    this.orders.set(order.id, order);

    // 记录账本
    this.addLedgerEntry({
      type: 'refund',
      orderId: order.id,
      userId,
      amount: -refundAmount,
      currency: order.currency,
      reason: params.reason,
      timestamp: new Date(),
    });

    this.logger.log(`Refund processed for order ${order.id}, amount: ${refundAmount}`);

    return {
      success: true,
      refundId: `ref_${uuidv4()}`,
      orderId: order.id,
      amount: refundAmount,
      status: 'refunded',
    };
  }

  // ==================== 结算管理 ====================

  /**
   * 从订单创建结算记录
   */
  private async createSettlementFromOrder(order: CommerceOrder): Promise<void> {
    if (!order.splitPlanId) return;

    try {
      const splitPlan = await this.splitPlanService.findById(order.splitPlanId, order.userId);
      const preview = await this.splitPlanService.previewAllocation({
        splitPlanId: order.splitPlanId,
        amount: order.amount,
        currency: order.currency,
      });

      const settlement = {
        id: `stl_${uuidv4()}`,
        orderId: order.id,
        splitPlanId: order.splitPlanId,
        totalAmount: order.amount,
        currency: order.currency,
        platformFee: preview.fees.totalFees,
        netAmount: preview.merchantNet,
        allocations: preview.allocations.map(a => ({
          recipientId: a.recipient,
          role: a.role,
          amount: a.amount,
          shareBps: Math.round(a.percentage * 100),
        })),
        status: 'pending',
        createdAt: new Date(),
      };

      this.settlements.set(settlement.id, settlement);
      this.logger.log(`Settlement created: ${settlement.id} for order ${order.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to create settlement: ${error.message}`);
    }
  }

  /**
   * 获取结算列表
   */
  private async getSettlements(userId: string, params: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const settlements = Array.from(this.settlements.values())
      .filter(s => {
        // 过滤条件
        if (params.status && s.status !== params.status) return false;
        if (params.startDate && s.createdAt < params.startDate) return false;
        if (params.endDate && s.createdAt > params.endDate) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    return {
      items: settlements.slice(offset, offset + limit),
      total: settlements.length,
      page,
      limit,
      totalPages: Math.ceil(settlements.length / limit),
    };
  }

  /**
   * 结算打款
   */
  private async payoutSettlement(userId: string, params: {
    settlementId: string;
  }): Promise<any> {
    const settlement = this.settlements.get(params.settlementId);
    if (!settlement) {
      throw new BadRequestException(`Settlement not found: ${params.settlementId}`);
    }

    if (settlement.status === 'paid') {
      throw new BadRequestException('Settlement already paid');
    }

    // 模拟打款处理
    settlement.status = 'paid';
    settlement.paidAt = new Date();
    settlement.paidBy = userId;
    this.settlements.set(settlement.id, settlement);

    // 记录每个分配的账本条目
    for (const allocation of settlement.allocations) {
      this.addLedgerEntry({
        type: 'payout',
        settlementId: settlement.id,
        recipientId: allocation.recipientId,
        amount: allocation.amount,
        currency: settlement.currency,
        timestamp: new Date(),
      });
    }

    this.logger.log(`Settlement paid: ${settlement.id}`);

    return {
      success: true,
      settlementId: settlement.id,
      status: 'paid',
      paidAt: settlement.paidAt,
      allocations: settlement.allocations,
    };
  }

  // ==================== 账本查询 ====================

  /**
   * 添加账本条目
   */
  private addLedgerEntry(entry: any): void {
    this.ledgerEntries.push({
      id: `led_${uuidv4()}`,
      ...entry,
    });
  }

  /**
   * 获取账本
   */
  private async getLedger(userId: string, params: {
    type?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<any> {
    let entries = [...this.ledgerEntries]
      .filter(e => {
        if (params.type && e.type !== params.type) return false;
        if (params.startDate && e.timestamp < params.startDate) return false;
        if (params.endDate && e.timestamp > params.endDate) return false;
        return true;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    // 计算汇总
    const summary = {
      totalIncome: entries.filter(e => e.amount > 0).reduce((sum, e) => sum + e.amount, 0),
      totalExpense: entries.filter(e => e.amount < 0).reduce((sum, e) => sum + Math.abs(e.amount), 0),
      netBalance: entries.reduce((sum, e) => sum + e.amount, 0),
    };

    return {
      items: entries.slice(offset, offset + limit),
      total: entries.length,
      page,
      limit,
      totalPages: Math.ceil(entries.length / limit),
      summary,
    };
  }

  // ===== 引导转化相关方法 =====

  /**
   * 获取用户使用统计
   */
  async getUsageStats(userId: string) {
    return this.usagePatternService.getUsageStats(userId);
  }

  /**
   * 获取用户转化引导建议
   */
  async getConversionHints(userId: string): Promise<UsageHint | null> {
    return this.usagePatternService.generateHints(userId);
  }

  /**
   * 获取推荐的Marketplace配置
   */
  async getSuggestedMarketplaceConfig(userId: string) {
    return this.usagePatternService.getSuggestedMarketplaceConfig(userId);
  }

  /**
   * 关闭特定引导提示
   */
  async dismissHint(userId: string, hintType: string) {
    this.usagePatternService.dismissHint(userId, hintType);
    return { success: true };
  }

  /**
   * 包装响应（附加引导信息）
   */
  wrapResponseWithHints<T>(data: T, userId?: string): { data: T; hints?: UsageHint } {
    if (!userId) {
      return { data };
    }

    const hint = this.usagePatternService.generateHints(userId);
    return {
      data,
      ...(hint && { hints: hint }),
    };
  }
}
