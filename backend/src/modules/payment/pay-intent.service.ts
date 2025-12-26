import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as QRCode from 'qrcode';
import { PayIntent, PayIntentStatus, PayIntentType } from '../../entities/pay-intent.entity';
import { PaymentService } from './payment.service';
import { QuickPayGrantService } from './quick-pay-grant.service';
import { WebhookService } from '../webhook/webhook.service';

export interface CreatePayIntentDto {
  type: PayIntentType;
  amount: number;
  currency: string;
  description?: string;
  orderId?: string;
  merchantId?: string;
  agentId?: string;
  paymentMethod?: {
    type: string;
    details?: any;
  };
  metadata?: {
    returnUrl?: string;
    cancelUrl?: string;
    successUrl?: string;
    paymentMethod?: string;
    [key: string]: any;
  };
  expiresIn?: number; // 过期时间（秒），默认1小时
  mode?: 'sandbox' | 'production';
}

@Injectable()
export class PayIntentService {
  private readonly logger = new Logger(PayIntentService.name);

  constructor(
    @InjectRepository(PayIntent)
    private payIntentRepository: Repository<PayIntent>,
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService,
    private quickPayGrantService: QuickPayGrantService,
    private webhookService: WebhookService,
  ) {}

  /**
   * 触发Webhook事件
   */
  private async triggerWebhook(payIntent: PayIntent, eventType: string) {
    try {
      // 如果有商户ID，通知商户
      if (payIntent.merchantId) {
        await this.webhookService.sendWebhookEvent(
          payIntent.merchantId,
          eventType,
          {
            id: payIntent.id,
            status: payIntent.status,
            amount: payIntent.amount,
            currency: payIntent.currency,
            orderId: payIntent.orderId,
            metadata: payIntent.metadata,
            attribution: payIntent.attribution,
          },
        );
      }
    } catch (error) {
      this.logger.error(`触发Webhook失败: ${error.message}`);
    }
  }

  /**
   * 创建PayIntent（V3.0：统一支付意图规范）
   */
  async createPayIntent(userId: string, dto: CreatePayIntentDto): Promise<PayIntent> {
    // 计算过期时间
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (dto.expiresIn || 3600)); // 默认1小时

    const payIntent = this.payIntentRepository.create({
      userId,
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency,
      description: dto.description,
      orderId: dto.orderId,
      merchantId: dto.merchantId,
      agentId: dto.agentId,
      paymentMethod: dto.paymentMethod,
      status: PayIntentStatus.REQUIRES_PAYMENT_METHOD,
      mode: dto.mode || 'production',
      authorization: {
        authorized: false,
      },
      metadata: dto.metadata,
      expiresAt,
    });

    const savedPayIntent = await this.payIntentRepository.save(payIntent);

    // 生成支付链接和二维码
    const payUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pay/intent/${savedPayIntent.id}`;
    savedPayIntent.metadata = {
      ...(savedPayIntent.metadata || {}),
      returnUrl: dto.metadata?.returnUrl,
      cancelUrl: dto.metadata?.cancelUrl,
      successUrl: dto.metadata?.successUrl,
      payUrl,
      qrCode: await this.generateQRCode(payUrl),
    };

    await this.payIntentRepository.save(savedPayIntent);

    this.logger.log(`创建PayIntent: id=${savedPayIntent.id}, userId=${userId}, amount=${dto.amount}`);

    // 触发Webhook
    await this.triggerWebhook(savedPayIntent, 'payment_intent.created');

    return savedPayIntent;
  }

  /**
   * 授权PayIntent
   */
  async authorizePayIntent(
    payIntentId: string,
    userId: string,
    authorizationType: 'user' | 'agent' | 'quickpay' = 'user',
    quickPayGrantId?: string,
  ): Promise<PayIntent> {
    const payIntent = await this.payIntentRepository.findOne({
      where: { id: payIntentId, userId },
    });

    if (!payIntent) {
      throw new NotFoundException('PayIntent不存在');
    }

    if (payIntent.status !== PayIntentStatus.CREATED) {
      throw new BadRequestException('PayIntent状态不允许授权');
    }

    if (payIntent.expiresAt && payIntent.expiresAt < new Date()) {
      payIntent.status = PayIntentStatus.EXPIRED;
      await this.payIntentRepository.save(payIntent);
      throw new BadRequestException('PayIntent已过期');
    }

    // 如果是QuickPay授权，验证授权
    if (authorizationType === 'quickpay' && quickPayGrantId) {
      const grant = await this.quickPayGrantService.getGrant(quickPayGrantId, userId);
      if (!grant) {
        throw new BadRequestException('QuickPay授权无效');
      }

      // 验证授权限制
      const validation = await this.quickPayGrantService.validateGrant(
        grant,
        payIntent.amount,
        payIntent.merchantId,
      );

      if (!validation.valid) {
        throw new BadRequestException(validation.reason || '授权验证失败');
      }

      payIntent.authorization.quickPayGrantId = quickPayGrantId;
    }

    payIntent.status = PayIntentStatus.AUTHORIZED;
    payIntent.authorization = {
      authorized: true,
      authorizedAt: new Date(),
      authorizedBy: authorizationType,
      quickPayGrantId: payIntent.authorization.quickPayGrantId,
    };

    return this.payIntentRepository.save(payIntent);
  }

  /**
   * 执行PayIntent（创建实际支付）
   */
  async executePayIntent(payIntentId: string, userId: string): Promise<PayIntent> {
    const payIntent = await this.payIntentRepository.findOne({
      where: { id: payIntentId, userId },
    });

    if (!payIntent) {
      throw new NotFoundException('PayIntent不存在');
    }

    if (payIntent.status !== PayIntentStatus.AUTHORIZED) {
      throw new BadRequestException('PayIntent必须先授权才能执行');
    }

    payIntent.status = PayIntentStatus.EXECUTING;

    try {
      let paymentId = '';
      let transactionHash = '';

      if (payIntent.mode === 'sandbox') {
        // 沙盒模式：模拟支付
        this.logger.log(`沙盒模式支付模拟: id=${payIntentId}, amount=${payIntent.amount}`);
        
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        paymentId = `sim_${Math.random().toString(36).substring(2, 15)}`;
        transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
        
        // 如果金额是 66.66，模拟失败（用于测试）
        if (payIntent.amount === 66.66) {
          throw new Error('Sandbox simulated failure (Amount 66.66)');
        }
      } else {
        // 生产模式：创建实际支付
        const payment = await this.paymentService.processPayment(userId, {
          amount: payIntent.amount,
          currency: payIntent.currency,
          paymentMethod: payIntent.paymentMethod?.type as any,
          description: payIntent.description || `PayIntent: ${payIntentId}`,
          merchantId: payIntent.merchantId,
          agentId: payIntent.agentId,
          metadata: {
            payIntentId: payIntent.id,
            orderId: payIntent.orderId,
            ...payIntent.metadata,
          },
        });
        paymentId = payment.id;
        transactionHash = payment.transactionHash;
      }

      payIntent.paymentId = paymentId;
      payIntent.status = PayIntentStatus.SUCCEEDED;
      payIntent.completedAt = new Date();

      if (transactionHash) {
        payIntent.metadata.transactionHash = transactionHash;
      }

      await this.payIntentRepository.save(payIntent);

      // 触发Webhook
      await this.triggerWebhook(payIntent, 'payment_intent.succeeded');

      // 更新QuickPay授权使用量
      if (payIntent.authorization.quickPayGrantId) {
        await this.quickPayGrantService.recordUsage(
          payIntent.authorization.quickPayGrantId,
          payIntent.amount,
        );
      }

      this.logger.log(`执行PayIntent成功: id=${payIntentId}, paymentId=${paymentId}, mode=${payIntent.mode}`);

      return payIntent;
    } catch (error) {
      this.logger.error(`执行PayIntent失败: ${error.message}`, error.stack);
      payIntent.status = PayIntentStatus.FAILED;
      payIntent.metadata.errorMessage = error.message;
      await this.payIntentRepository.save(payIntent);

      // 触发Webhook
      await this.triggerWebhook(payIntent, 'payment_intent.failed');

      throw error;
    }
  }

  /**
   * 获取PayIntent
   */
  async getPayIntent(payIntentId: string, userId?: string): Promise<PayIntent> {
    const where: any = { id: payIntentId };
    if (userId) {
      where.userId = userId;
    }

    const payIntent = await this.payIntentRepository.findOne({ where });

    if (!payIntent) {
      throw new NotFoundException('PayIntent不存在');
    }

    // 检查是否过期
    if (payIntent.expiresAt && payIntent.expiresAt < new Date() && payIntent.status === PayIntentStatus.CREATED) {
      payIntent.status = PayIntentStatus.EXPIRED;
      await this.payIntentRepository.save(payIntent);
    }

    return payIntent;
  }

  /**
   * 取消PayIntent
   */
  async cancelPayIntent(payIntentId: string, userId: string): Promise<PayIntent> {
    const payIntent = await this.payIntentRepository.findOne({
      where: { id: payIntentId, userId },
    });

    if (!payIntent) {
      throw new NotFoundException('PayIntent不存在');
    }

    if ([PayIntentStatus.COMPLETED, PayIntentStatus.EXECUTING].includes(payIntent.status)) {
      throw new BadRequestException('PayIntent状态不允许取消');
    }

    payIntent.status = PayIntentStatus.CANCELLED;
    return this.payIntentRepository.save(payIntent);
  }

  /**
   * 清理过期的PayIntent（定时任务）
   */
  async cleanupExpiredPayIntents(): Promise<number> {
    const result = await this.payIntentRepository.update(
      {
        status: PayIntentStatus.CREATED,
        expiresAt: MoreThan(new Date()),
      },
      {
        status: PayIntentStatus.EXPIRED,
      },
    );

    return result.affected || 0;
  }

  /**
   * 生成二维码
   */
  private async generateQRCode(data: string): Promise<string> {
    try {
      return await QRCode.toDataURL(data);
    } catch (err) {
      this.logger.error(`生成二维码失败: ${err.message}`);
      return '';
    }
  }
}

