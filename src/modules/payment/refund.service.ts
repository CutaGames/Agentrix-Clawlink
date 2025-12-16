import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus, PaymentMethod } from '../../entities/payment.entity';
import { Order, OrderStatus } from '../../entities/order.entity';

export interface RefundRequest {
  paymentId: string;
  amount?: number; // 部分退款时指定金额，不指定则全额退款
  reason: string;
  requestedBy: string; // userId
}

export interface RefundResult {
  refundId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reason: string;
  transactionHash?: string; // 链上退款时的交易哈希
  createdAt: Date;
}

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);
  private refunds: Map<string, RefundResult> = new Map();

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  /**
   * 创建退款请求
   */
  async createRefund(request: RefundRequest): Promise<RefundResult> {
    // 查找支付记录
    const payment = await this.paymentRepository.findOne({
      where: { id: request.paymentId },
    });

    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }

    // 验证支付状态
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('只能对已完成的支付进行退款');
    }

    // 检查是否已有退款
    const existingRefunds = Array.from(this.refunds.values()).filter(
      (r) => r.paymentId === request.paymentId && r.status !== 'failed',
    );

    if (existingRefunds.length > 0) {
      const totalRefunded = existingRefunds
        .filter((r) => r.status === 'completed')
        .reduce((sum, r) => sum + r.amount, 0);

      const refundAmount = request.amount || payment.amount;
      if (totalRefunded + refundAmount > payment.amount) {
        throw new BadRequestException('退款金额超过支付金额');
      }
    }

    // 确定退款金额
    const refundAmount = request.amount || payment.amount;

    // 创建退款记录
    const refundId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const refund: RefundResult = {
      refundId,
      paymentId: request.paymentId,
      amount: refundAmount,
      currency: payment.currency,
      status: 'pending',
      reason: request.reason,
      createdAt: new Date(),
    };

    this.refunds.set(refundId, refund);

    // 异步处理退款
    this.processRefund(refundId, payment).catch((error) => {
      this.logger.error(`处理退款失败: ${refundId}`, error);
      const refundRecord = this.refunds.get(refundId);
      if (refundRecord) {
        refundRecord.status = 'failed';
        this.refunds.set(refundId, refundRecord);
      }
    });

    this.logger.log(`创建退款请求: ${refundId}, 金额: ${refundAmount} ${payment.currency}`);

    return refund;
  }

  /**
   * 处理退款（根据支付方式选择不同的退款流程）
   */
  private async processRefund(refundId: string, payment: Payment): Promise<void> {
    const refund = this.refunds.get(refundId);
    if (!refund) {
      throw new NotFoundException('退款记录不存在');
    }

    refund.status = 'processing';
    this.refunds.set(refundId, refund);

    try {
      // 根据支付方式处理退款
      switch (payment.paymentMethod) {
        case PaymentMethod.STRIPE:
          await this.processStripeRefund(refund, payment);
          break;
        case PaymentMethod.WALLET:
          // 钱包支付（包括USDT/USDC等加密货币）
          await this.processCryptoRefund(refund, payment);
          break;
        case PaymentMethod.X402:
          await this.processX402Refund(refund, payment);
          break;
        default:
          throw new BadRequestException(`不支持的支付方式: ${payment.paymentMethod}`);
      }

      // 更新支付状态
      payment.status = PaymentStatus.REFUNDED;
      await this.paymentRepository.save(payment);

      // 更新关联订单状态
      if (payment.metadata?.orderId) {
        const order = await this.orderRepository.findOne({
          where: { id: payment.metadata.orderId },
        });
        if (order) {
          order.status = OrderStatus.REFUNDED;
          order.metadata = {
            ...order.metadata,
            refund: {
              refundId,
              amount: refund.amount,
              reason: refund.reason,
              refundedAt: new Date(),
            },
          };
          await this.orderRepository.save(order);
        }
      }

      refund.status = 'completed';
      this.refunds.set(refundId, refund);
      this.logger.log(`退款完成: ${refundId}`);
    } catch (error) {
      refund.status = 'failed';
      this.refunds.set(refundId, refund);
      this.logger.error(`退款失败: ${refundId}`, error);
      throw error;
    }
  }

  /**
   * 处理Stripe退款
   */
  private async processStripeRefund(refund: RefundResult, payment: Payment): Promise<void> {
    // 实际应该调用Stripe API
    this.logger.log(`处理Stripe退款: ${refund.refundId}, 金额: ${refund.amount}`);
    // 模拟处理时间
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  /**
   * 处理加密货币退款
   */
  private async processCryptoRefund(refund: RefundResult, payment: Payment): Promise<void> {
    // 实际应该调用链上合约或钱包服务
    this.logger.log(`处理加密货币退款: ${refund.refundId}, 金额: ${refund.amount}`);
    
    // 模拟生成交易哈希
    refund.transactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    this.refunds.set(refund.refundId, refund);
    
    // 模拟处理时间
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  /**
   * 处理X402退款
   */
  private async processX402Refund(refund: RefundResult, payment: Payment): Promise<void> {
    // 实际应该调用X402服务
    this.logger.log(`处理X402退款: ${refund.refundId}, 金额: ${refund.amount}`);
    
    // 模拟生成交易哈希
    refund.transactionHash = `x402_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.refunds.set(refund.refundId, refund);
    
    // 模拟处理时间
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  /**
   * 获取退款信息
   */
  async getRefund(refundId: string): Promise<RefundResult> {
    const refund = this.refunds.get(refundId);
    if (!refund) {
      throw new NotFoundException('退款记录不存在');
    }
    return refund;
  }

  /**
   * 获取支付的所有退款
   */
  async getPaymentRefunds(paymentId: string): Promise<RefundResult[]> {
    return Array.from(this.refunds.values()).filter((r) => r.paymentId === paymentId);
  }

  /**
   * 自动退款（用于订单取消、服务未交付等情况）
   */
  async autoRefund(
    paymentId: string,
    reason: string,
    requestedBy: string = 'system',
  ): Promise<RefundResult> {
    return this.createRefund({
      paymentId,
      reason: `自动退款: ${reason}`,
      requestedBy,
    });
  }
}

