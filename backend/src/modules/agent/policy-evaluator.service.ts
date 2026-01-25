import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Authorization, AuthorizationStatus } from '../../entities/authorization.entity';
import { Policy, PolicyType } from '../../entities/policy.entity';
import { Payment, PaymentStatus } from '../../entities/payment.entity';
import { Order } from '../../entities/order.entity';

/**
 * 策略评估结果
 */
export interface PolicyEvaluationResult {
  authorized: boolean;
  authorizationId?: string;
  reason?: string;
  evaluationDetails: {
    singleLimitCheck?: { passed: boolean; limit?: number; amount: number };
    dailyLimitCheck?: { passed: boolean; limit?: number; usedToday: number; remaining: number };
    monthlyLimitCheck?: { passed: boolean; limit?: number; usedThisMonth: number; remaining: number };
    merchantScopeCheck?: { passed: boolean; allowedMerchants?: string[]; requestedMerchant: string };
    categoryScopeCheck?: { passed: boolean; allowedCategories?: string[]; requestedCategory?: string };
    expiryCheck?: { passed: boolean; expiresAt?: Date };
    policyChecks?: { policyId: string; policyType: string; passed: boolean; details?: any }[];
  };
  suggestedAction?: 'auto_execute' | 'user_confirmation' | 'deny';
  confirmationUrl?: string;
}

/**
 * 策略评估器服务
 * 实现 PRD 中定义的策略评估逻辑
 */
@Injectable()
export class PolicyEvaluatorService {
  private readonly logger = new Logger(PolicyEvaluatorService.name);

  constructor(
    @InjectRepository(Authorization)
    private authorizationRepository: Repository<Authorization>,
    @InjectRepository(Policy)
    private policyRepository: Repository<Policy>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  /**
   * 完整策略评估
   * 
   * 评估顺序：
   * 1. 检查是否存在有效授权
   * 2. 检查授权过期时间
   * 3. 检查商户范围
   * 4. 检查类目范围
   * 5. 检查单笔限额
   * 6. 检查日限额
   * 7. 检查月限额
   * 8. 检查用户自定义策略
   */
  async evaluatePolicy(
    userId: string,
    agentId: string,
    amount: number,
    merchantId: string,
    options?: {
      category?: string;
      productId?: string;
      orderId?: string;
      channel?: string;
    }
  ): Promise<PolicyEvaluationResult> {
    const evaluationDetails: PolicyEvaluationResult['evaluationDetails'] = {};

    // 1. 查找有效授权
    const authorizations = await this.authorizationRepository.find({
      where: {
        userId,
        agentId,
        status: AuthorizationStatus.ACTIVE,
      },
      order: { createdAt: 'DESC' },
    });

    if (!authorizations || authorizations.length === 0) {
      return {
        authorized: false,
        reason: 'NO_ACTIVE_AUTHORIZATION',
        evaluationDetails,
        suggestedAction: 'user_confirmation',
      };
    }

    // 遍历所有授权，找到第一个满足条件的
    for (const auth of authorizations) {
      const result = await this.evaluateSingleAuthorization(
        auth,
        amount,
        merchantId,
        options
      );
      
      if (result.authorized) {
        return result;
      }
    }

    // 所有授权都不满足条件
    return {
      authorized: false,
      reason: 'NO_MATCHING_AUTHORIZATION',
      evaluationDetails,
      suggestedAction: 'user_confirmation',
    };
  }

  /**
   * 评估单个授权
   */
  private async evaluateSingleAuthorization(
    auth: Authorization,
    amount: number,
    merchantId: string,
    options?: {
      category?: string;
      productId?: string;
      orderId?: string;
    }
  ): Promise<PolicyEvaluationResult> {
    const evaluationDetails: PolicyEvaluationResult['evaluationDetails'] = {
      policyChecks: [],
    };

    // 1. 检查过期时间
    if (auth.expiresAt && auth.expiresAt < new Date()) {
      evaluationDetails.expiryCheck = { passed: false, expiresAt: auth.expiresAt };
      return {
        authorized: false,
        authorizationId: auth.id,
        reason: 'AUTHORIZATION_EXPIRED',
        evaluationDetails,
        suggestedAction: 'user_confirmation',
      };
    }
    evaluationDetails.expiryCheck = { passed: true, expiresAt: auth.expiresAt };

    // 2. 检查商户范围
    if (auth.merchantScope && auth.merchantScope.length > 0) {
      const passed = auth.merchantScope.includes(merchantId);
      evaluationDetails.merchantScopeCheck = {
        passed,
        allowedMerchants: auth.merchantScope,
        requestedMerchant: merchantId,
      };
      if (!passed) {
        return {
          authorized: false,
          authorizationId: auth.id,
          reason: 'MERCHANT_NOT_IN_SCOPE',
          evaluationDetails,
          suggestedAction: 'user_confirmation',
        };
      }
    } else {
      evaluationDetails.merchantScopeCheck = {
        passed: true,
        allowedMerchants: [],
        requestedMerchant: merchantId,
      };
    }

    // 3. 检查类目范围
    if (options?.category && auth.categoryScope && auth.categoryScope.length > 0) {
      const passed = auth.categoryScope.includes(options.category);
      evaluationDetails.categoryScopeCheck = {
        passed,
        allowedCategories: auth.categoryScope,
        requestedCategory: options.category,
      };
      if (!passed) {
        return {
          authorized: false,
          authorizationId: auth.id,
          reason: 'CATEGORY_NOT_IN_SCOPE',
          evaluationDetails,
          suggestedAction: 'user_confirmation',
        };
      }
    } else {
      evaluationDetails.categoryScopeCheck = {
        passed: true,
        allowedCategories: auth.categoryScope || [],
        requestedCategory: options?.category,
      };
    }

    // 4. 检查单笔限额
    if (auth.singleTxLimit) {
      const passed = amount <= Number(auth.singleTxLimit);
      evaluationDetails.singleLimitCheck = {
        passed,
        limit: Number(auth.singleTxLimit),
        amount,
      };
      if (!passed) {
        return {
          authorized: false,
          authorizationId: auth.id,
          reason: 'EXCEEDS_SINGLE_TX_LIMIT',
          evaluationDetails,
          suggestedAction: 'user_confirmation',
        };
      }
    } else {
      evaluationDetails.singleLimitCheck = { passed: true, amount };
    }

    // 5. 检查日限额
    if (auth.dailyLimit) {
      const usedToday = await this.getDailyUsage(auth.userId, auth.agentId);
      const remaining = Number(auth.dailyLimit) - usedToday;
      const passed = amount <= remaining;
      
      evaluationDetails.dailyLimitCheck = {
        passed,
        limit: Number(auth.dailyLimit),
        usedToday,
        remaining: Math.max(0, remaining),
      };
      
      if (!passed) {
        return {
          authorized: false,
          authorizationId: auth.id,
          reason: 'EXCEEDS_DAILY_LIMIT',
          evaluationDetails,
          suggestedAction: 'user_confirmation',
        };
      }
    } else {
      evaluationDetails.dailyLimitCheck = {
        passed: true,
        usedToday: 0,
        remaining: Infinity,
      };
    }

    // 6. 检查月限额
    if (auth.monthlyLimit) {
      const usedThisMonth = await this.getMonthlyUsage(auth.userId, auth.agentId);
      const remaining = Number(auth.monthlyLimit) - usedThisMonth;
      const passed = amount <= remaining;
      
      evaluationDetails.monthlyLimitCheck = {
        passed,
        limit: Number(auth.monthlyLimit),
        usedThisMonth,
        remaining: Math.max(0, remaining),
      };
      
      if (!passed) {
        return {
          authorized: false,
          authorizationId: auth.id,
          reason: 'EXCEEDS_MONTHLY_LIMIT',
          evaluationDetails,
          suggestedAction: 'user_confirmation',
        };
      }
    } else {
      evaluationDetails.monthlyLimitCheck = {
        passed: true,
        usedThisMonth: 0,
        remaining: Infinity,
      };
    }

    // 7. 检查用户自定义策略
    const userPolicies = await this.policyRepository.find({
      where: { userId: auth.userId, enabled: true },
    });

    for (const policy of userPolicies) {
      const policyResult = await this.evaluateCustomPolicy(policy, {
        amount,
        merchantId,
        category: options?.category,
        agentId: auth.agentId,
      });
      
      evaluationDetails.policyChecks?.push({
        policyId: policy.id,
        policyType: policy.type,
        passed: policyResult.passed,
        details: policyResult.details,
      });

      if (!policyResult.passed) {
        return {
          authorized: false,
          authorizationId: auth.id,
          reason: `POLICY_VIOLATION: ${policy.name}`,
          evaluationDetails,
          suggestedAction: 'user_confirmation',
        };
      }
    }

    // 所有检查通过
    this.logger.log(`策略评估通过: userId=${auth.userId}, agentId=${auth.agentId}, amount=${amount}`);
    
    return {
      authorized: true,
      authorizationId: auth.id,
      evaluationDetails,
      suggestedAction: 'auto_execute',
    };
  }

  /**
   * 评估自定义策略
   */
  private async evaluateCustomPolicy(
    policy: Policy,
    context: {
      amount: number;
      merchantId: string;
      category?: string;
      agentId?: string;
    }
  ): Promise<{ passed: boolean; details?: any }> {
    const value = policy.value;

    switch (policy.type) {
      case PolicyType.DAILY_LIMIT:
        // 额外的日限额策略（可能是针对特定商户或类目的）
        if (value.limit && context.amount > value.limit) {
          return { passed: false, details: { limit: value.limit, amount: context.amount } };
        }
        return { passed: true };

      case PolicyType.SINGLE_LIMIT:
        // 单笔限额策略
        if (value.limit && context.amount > value.limit) {
          return { passed: false, details: { limit: value.limit, amount: context.amount } };
        }
        return { passed: true };

      case PolicyType.PROTOCOL_WHITELIST:
        // 协议白名单（如只允许特定 DeFi 协议）
        if (value.protocols && value.protocols.length > 0) {
          // TODO: 从交易上下文中获取协议信息
          return { passed: true };
        }
        return { passed: true };

      case PolicyType.ACTION_WHITELIST:
        // 操作白名单
        if (value.actions && value.actions.length > 0) {
          // TODO: 检查操作类型
          return { passed: true };
        }
        return { passed: true };

      case PolicyType.AUTO_CLAIM_AIRDROP:
        // 自动领取空投的策略
        return { passed: true };

      default:
        return { passed: true };
    }
  }

  /**
   * 获取今日已使用额度
   */
  private async getDailyUsage(userId: string, agentId?: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const whereClause: any = {
      userId,
      status: PaymentStatus.COMPLETED,
      createdAt: Between(today, tomorrow),
    };

    if (agentId) {
      whereClause.agentId = agentId;
    }

    const payments = await this.paymentRepository.find({
      where: whereClause,
      select: ['amount'],
    });

    return payments.reduce((sum, p) => sum + Number(p.amount), 0);
  }

  /**
   * 获取本月已使用额度
   */
  private async getMonthlyUsage(userId: string, agentId?: string): Promise<number> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const whereClause: any = {
      userId,
      status: PaymentStatus.COMPLETED,
      createdAt: Between(firstDayOfMonth, firstDayOfNextMonth),
    };

    if (agentId) {
      whereClause.agentId = agentId;
    }

    const payments = await this.paymentRepository.find({
      where: whereClause,
      select: ['amount'],
    });

    return payments.reduce((sum, p) => sum + Number(p.amount), 0);
  }

  /**
   * 创建快速评估（用于 UI 展示剩余额度）
   */
  async getQuickEvaluation(userId: string, agentId?: string): Promise<{
    hasActiveAuth: boolean;
    dailyRemaining: number;
    monthlyRemaining: number;
    singleLimit: number;
  }> {
    const auth = await this.authorizationRepository.findOne({
      where: {
        userId,
        agentId: agentId || undefined,
        status: AuthorizationStatus.ACTIVE,
      },
      order: { createdAt: 'DESC' },
    });

    if (!auth) {
      return {
        hasActiveAuth: false,
        dailyRemaining: 0,
        monthlyRemaining: 0,
        singleLimit: 0,
      };
    }

    const dailyUsage = await this.getDailyUsage(userId, agentId);
    const monthlyUsage = await this.getMonthlyUsage(userId, agentId);

    return {
      hasActiveAuth: true,
      dailyRemaining: Math.max(0, Number(auth.dailyLimit || 0) - dailyUsage),
      monthlyRemaining: Math.max(0, Number(auth.monthlyLimit || 0) - monthlyUsage),
      singleLimit: Number(auth.singleTxLimit || 0),
    };
  }
}
