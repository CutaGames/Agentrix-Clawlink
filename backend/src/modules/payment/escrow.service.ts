import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../../entities/payment.entity';

export enum EscrowStatus {
  PENDING = 'pending', // 等待支付
  FUNDED = 'funded', // 资金已托管
  CONFIRMED = 'confirmed', // 用户确认收货
  DISPUTED = 'disputed', // 争议中
  RELEASED = 'released', // 已释放给商户
  REFUNDED = 'refunded', // 已退款
}

export interface EscrowConfig {
  paymentId: string;
  merchantId: string;
  userId: string;
  amount: number;
  currency: string;
  commissionRate?: number; // 分润比例（如0.01表示1%）
  autoReleaseDays?: number; // 自动释放天数（默认7天）
  description?: string;
  orderType?: 'nft' | 'virtual' | 'service' | 'product' | 'physical'; // 订单类型
  settlementType?: 'instant' | 'service_started' | 'delivery_confirmed'; // 结算类型
  commission?: {
    merchant: number;
    agent: number;
    paymind: number;
  }; // 分成配置
}

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);
  private escrows: Map<string, {
    config: EscrowConfig;
    status: EscrowStatus;
    transactionHash?: string;
    createdAt: Date;
    confirmedAt?: Date;
    releasedAt?: Date;
  }> = new Map();

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  /**
   * 创建托管交易
   */
  async createEscrow(config: EscrowConfig): Promise<{ escrowId: string; contractAddress?: string }> {
    const escrowId = `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.escrows.set(escrowId, {
      config: {
        ...config,
        paymentId: config.paymentId || '', // 允许稍后设置
      },
      status: EscrowStatus.PENDING,
      createdAt: new Date(),
    });

    this.logger.log(`创建托管交易: ${escrowId}, 金额: ${config.amount} ${config.currency}`);

    return {
      escrowId,
      // 实际应该返回智能合约地址
      contractAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
    };
  }

  /**
   * 更新托管交易的paymentId
   */
  async updateEscrowPaymentId(escrowId: string, paymentId: string): Promise<void> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new NotFoundException('托管交易不存在');
    }

    escrow.config.paymentId = paymentId;
    this.escrows.set(escrowId, escrow);
  }

  /**
   * 资金托管（用户支付后）
   */
  async fundEscrow(escrowId: string, transactionHash: string): Promise<void> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new NotFoundException('托管交易不存在');
    }

    if (escrow.status !== EscrowStatus.PENDING) {
      throw new BadRequestException(`托管交易状态错误: ${escrow.status}`);
    }

    escrow.status = EscrowStatus.FUNDED;
    escrow.transactionHash = transactionHash;

    // 更新支付记录
    const payment = await this.paymentRepository.findOne({
      where: { metadata: { escrowId } } as any,
    });

    if (payment) {
      payment.status = PaymentStatus.PROCESSING;
      payment.transactionHash = transactionHash;
      payment.metadata = {
        ...payment.metadata,
        escrowStatus: EscrowStatus.FUNDED,
      };
      await this.paymentRepository.save(payment);
    }

    this.logger.log(`资金已托管: ${escrowId}`);
  }

  /**
   * 用户确认收货（释放资金给商户）
   * 根据订单类型和结算条件处理
   */
  async confirmDelivery(escrowId: string, userId: string): Promise<void> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new NotFoundException('托管交易不存在');
    }

    if (escrow.config.userId !== userId) {
      throw new BadRequestException('无权操作此托管交易');
    }

    if (escrow.status !== EscrowStatus.FUNDED) {
      throw new BadRequestException(`托管交易状态错误: ${escrow.status}`);
    }

    escrow.status = EscrowStatus.CONFIRMED;
    escrow.confirmedAt = new Date();

    // 根据订单类型计算分成
    let merchantAmount: number;
    let agentAmount: number = 0;
    let paymindAmount: number = 0;

    if (escrow.config.commission) {
      // 使用配置的分成比例
      merchantAmount = escrow.config.amount * escrow.config.commission.merchant;
      agentAmount = escrow.config.amount * escrow.config.commission.agent;
      paymindAmount = escrow.config.amount * escrow.config.commission.paymind;
    } else {
      // 使用旧的commissionRate计算方式（兼容）
      const commission = escrow.config.commissionRate
        ? escrow.config.amount * escrow.config.commissionRate
        : 0;
      merchantAmount = escrow.config.amount - commission;
    }

    // 释放资金（实际应该调用智能合约）
    // 合约会自动分成：商家、Agent、PayMind
    await this.releaseFunds(
      escrowId, 
      escrow.config.merchantId, 
      merchantAmount, 
      agentAmount,
      paymindAmount,
    );

    escrow.status = EscrowStatus.RELEASED;
    escrow.releasedAt = new Date();

    // 更新支付记录
    const payment = await this.paymentRepository.findOne({
      where: { metadata: { escrowId } } as any,
    });

    if (payment) {
      payment.status = PaymentStatus.COMPLETED;
      payment.metadata = {
        ...payment.metadata,
        escrowStatus: EscrowStatus.RELEASED,
        merchantAmount,
        agentAmount,
        paymindAmount,
      };
      await this.paymentRepository.save(payment);
    }

    this.logger.log(`资金已释放: ${escrowId}, 商户: ${merchantAmount}, Agent: ${agentAmount}, PayMind: ${paymindAmount}`);
  }

  /**
   * 申请退款（争议）
   */
  async disputeEscrow(escrowId: string, userId: string, reason: string): Promise<void> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new NotFoundException('托管交易不存在');
    }

    if (escrow.config.userId !== userId) {
      throw new BadRequestException('无权操作此托管交易');
    }

    if (escrow.status !== EscrowStatus.FUNDED) {
      throw new BadRequestException(`托管交易状态错误: ${escrow.status}`);
    }

    escrow.status = EscrowStatus.DISPUTED;

    // 更新支付记录
    const payment = await this.paymentRepository.findOne({
      where: { metadata: { escrowId } } as any,
    });

    if (payment) {
      payment.metadata = {
        ...payment.metadata,
        escrowStatus: EscrowStatus.DISPUTED,
        disputeReason: reason,
      };
      await this.paymentRepository.save(payment);
    }

    this.logger.log(`托管交易争议: ${escrowId}, 原因: ${reason}`);
  }

  /**
   * 自动释放（超时自动释放）
   */
  async autoRelease(escrowId: string): Promise<void> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) return;

    if (escrow.status !== EscrowStatus.FUNDED) return;

    const autoReleaseDays = escrow.config.autoReleaseDays || 7;
    const releaseTime = new Date(escrow.createdAt);
    releaseTime.setDate(releaseTime.getDate() + autoReleaseDays);

    if (new Date() >= releaseTime) {
      await this.confirmDelivery(escrowId, escrow.config.userId);
      this.logger.log(`自动释放资金: ${escrowId}`);
    }
  }

  /**
   * 释放资金（调用智能合约）
   */
  private async releaseFunds(
    escrowId: string,
    merchantId: string,
    merchantAmount: number,
    agentAmount: number = 0,
    paymindAmount: number = 0,
  ): Promise<void> {
    // 实际应该调用智能合约释放资金
    // 合约会自动分成：商家、Agent、PayMind
    this.logger.log(
      `释放资金: ${escrowId}, 商户: ${merchantId}, 金额: ${merchantAmount}, Agent: ${agentAmount}, PayMind: ${paymindAmount}`,
    );
  }

  /**
   * 获取托管交易信息
   */
  async getEscrow(escrowId: string): Promise<any> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new NotFoundException('托管交易不存在');
    }

    return {
      escrowId,
      ...escrow,
    };
  }

  /**
   * 根据订单类型自动处理结算
   * NFT/虚拟资产：即时结算
   * 服务：等待服务开始
   * 实体商品：等待确认收货
   */
  async autoSettleByOrderType(escrowId: string): Promise<void> {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new NotFoundException('托管交易不存在');
    }

    if (escrow.status !== EscrowStatus.FUNDED) {
      return; // 只有已托管的交易才能结算
    }

    const settlementType = escrow.config.settlementType;
    const orderType = escrow.config.orderType;

    // NFT/虚拟资产：即时结算
    if (settlementType === 'instant' || orderType === 'nft' || orderType === 'virtual') {
      this.logger.log(`即时结算托管交易: ${escrowId} (订单类型: ${orderType})`);
      await this.confirmDelivery(escrowId, escrow.config.userId);
      return;
    }

    // 服务类：等待服务开始（需要用户确认）
    if (settlementType === 'service_started' || orderType === 'service') {
      this.logger.log(`服务类订单等待服务开始: ${escrowId}`);
      // 等待用户确认服务开始
      return;
    }

    // 实体商品：等待确认收货（7天自动确认）
    if (settlementType === 'delivery_confirmed' || orderType === 'product' || orderType === 'physical') {
      this.logger.log(`实体商品订单等待确认收货: ${escrowId} (7天后自动确认)`);
      // 等待用户确认收货或7天后自动确认
      return;
    }
  }

  /**
   * 自动确认收货（7天后）
   * 用于实体商品订单的自动确认
   */
  async autoConfirmDeliveryAfterDays(days: number): Promise<{ successCount: number; failCount: number }> {
    let successCount = 0;
    let failCount = 0;

    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // 遍历所有已托管的交易
    for (const [escrowId, escrow] of this.escrows.entries()) {
      if (escrow.status !== EscrowStatus.FUNDED) continue;
      if (escrow.createdAt > cutoffDate) continue; // 未到7天

      const settlementType = escrow.config.settlementType;
      const orderType = escrow.config.orderType;

      // 只处理需要确认收货的订单
      if (settlementType === 'delivery_confirmed' || 
          orderType === 'product' || 
          orderType === 'physical') {
        try {
          await this.confirmDelivery(escrowId, escrow.config.userId);
          successCount++;
          this.logger.log(`自动确认收货: ${escrowId}`);
        } catch (error) {
          failCount++;
          this.logger.error(`自动确认收货失败: ${escrowId}`, error);
        }
      }
    }

    return { successCount, failCount };
  }
}


