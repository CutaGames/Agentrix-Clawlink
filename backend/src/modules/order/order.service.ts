import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { Order, AssetType, OrderStatus } from '../../entities/order.entity';
import { CreateOrderDto } from './dto/order.dto';

/**
 * 订单状态流转规则
 * PENDING -> PAID (支付成功)
 * PAID -> PROCESSING (商家确认/开始处理)
 * PROCESSING -> SHIPPED (已发货，实物商品)
 * PROCESSING -> DELIVERED (已完成，虚拟/服务类)
 * SHIPPED -> DELIVERED (买家确认收货)
 * DELIVERED -> SETTLED (结算完成)
 * 
 * 任意状态 -> CANCELLED (取消，有条件)
 * 任意状态 -> REFUNDED (退款)
 * 任意状态 -> FROZEN (冻结/争议)
 */
const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.FROZEN],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.FROZEN],
  [OrderStatus.PENDING_SHIPMENT]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.FROZEN],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.FROZEN, OrderStatus.REFUNDED],
  [OrderStatus.DELIVERED]: [OrderStatus.SETTLED, OrderStatus.REFUNDED, OrderStatus.FROZEN],
  [OrderStatus.SETTLED]: [OrderStatus.REFUNDED], // 结算后仍可退款
  [OrderStatus.FROZEN]: [OrderStatus.PROCESSING, OrderStatus.REFUNDED, OrderStatus.CANCELLED], // 解冻后可继续或取消
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.DISPUTED]: [OrderStatus.FROZEN, OrderStatus.REFUNDED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
};

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const order = this.orderRepository.create({
      userId,
      ...dto,
      assetType:
        dto.assetType ||
        (dto.metadata?.assetType as AssetType) ||
        AssetType.PHYSICAL,
      execAgentId: dto.execAgentId || dto.agentId,
      refAgentId: dto.refAgentId || dto.metadata?.refAgentId,
      promoterId: dto.promoterId || dto.metadata?.promoterId,
      platformTaxRate: dto.platformTaxRate,
      executorHasWallet:
        dto.executorHasWallet ?? dto.metadata?.executorHasWallet ?? true,
      metadata: {
        ...dto.metadata,
        assetType:
          dto.assetType ||
          dto.metadata?.assetType ||
          AssetType.PHYSICAL,
      },
    });
    return this.orderRepository.save(order);
  }

  async getOrders(
    userId?: string, 
    merchantId?: string,
    status?: OrderStatus,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = {};
    
    // 支持按userId查询（买家视角）
    if (userId) {
      where.userId = userId;
    }
    
    // 支持按merchantId查询（商户视角）
    if (merchantId) {
      where.merchantId = merchantId;
    }
    
    // 状态过滤
    if (status) {
      where.status = status;
    }
    
    // 日期范围过滤
    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    }
    
    return this.orderRepository.find({
      where,
      relations: ['user', 'product'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOrder(userId: string, id: string) {
    const order = await this.orderRepository.findOne({
      where: { id, userId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    return order;
  }

  async cancelOrder(userId: string, id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id, userId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 只有待支付或已支付的订单可以取消
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAID) {
      throw new BadRequestException(`订单状态为"${order.status}"，无法取消。只有待支付或已支付的订单可以取消。`);
    }

    order.status = OrderStatus.CANCELLED;
    return this.orderRepository.save(order);
  }

  /**
   * 通用状态流转方法
   */
  private canTransition(from: OrderStatus, to: OrderStatus): boolean {
    const allowed = ORDER_STATUS_TRANSITIONS[from] || [];
    return allowed.includes(to);
  }

  /**
   * 更新订单状态（带状态流转校验）
   */
  async updateOrderStatus(
    id: string,
    newStatus: OrderStatus,
    operatorId: string,
    operatorRole: 'user' | 'merchant' | 'admin',
    reason?: string,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 权限校验
    if (operatorRole === 'user' && order.userId !== operatorId) {
      throw new BadRequestException('无权操作此订单');
    }
    if (operatorRole === 'merchant' && order.merchantId !== operatorId) {
      throw new BadRequestException('无权操作此订单');
    }

    // 状态流转校验
    if (!this.canTransition(order.status, newStatus)) {
      throw new BadRequestException(
        `订单状态从 "${order.status}" 无法流转到 "${newStatus}"`,
      );
    }

    const oldStatus = order.status;
    order.status = newStatus;
    
    // 记录状态变更到 metadata
    const metadata = (order.metadata as any) || {};
    if (!metadata.statusHistory) {
      metadata.statusHistory = [];
    }
    metadata.statusHistory.push({
      from: oldStatus,
      to: newStatus,
      operatorId,
      operatorRole,
      reason,
      timestamp: new Date().toISOString(),
    });
    order.metadata = metadata as any;

    this.logger.log(`订单 ${id} 状态从 ${oldStatus} 变更为 ${newStatus}，操作人: ${operatorId}`);

    return this.orderRepository.save(order);
  }

  /**
   * 商家确认订单（PAID -> PROCESSING）
   */
  async confirmOrder(merchantId: string, id: string): Promise<Order> {
    return this.updateOrderStatus(id, OrderStatus.PROCESSING, merchantId, 'merchant', '商家确认订单');
  }

  /**
   * 商家发货（PROCESSING -> SHIPPED）
   */
  async shipOrder(merchantId: string, id: string, trackingInfo?: { carrier?: string; trackingNumber?: string }): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id, merchantId } });
    
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.assetType !== AssetType.PHYSICAL) {
      throw new BadRequestException('非实物商品无需发货，请直接标记为已完成');
    }

    // 保存物流信息
    if (trackingInfo) {
      const metadata = (order.metadata as any) || {};
      metadata.shipping = {
        ...trackingInfo,
        shippedAt: new Date().toISOString(),
      };
      order.metadata = metadata as any;
      await this.orderRepository.save(order);
    }

    return this.updateOrderStatus(id, OrderStatus.SHIPPED, merchantId, 'merchant', '商家已发货');
  }

  /**
   * 买家确认收货（SHIPPED -> DELIVERED）
   */
  async confirmDelivery(userId: string, id: string): Promise<Order> {
    return this.updateOrderStatus(id, OrderStatus.DELIVERED, userId, 'user', '买家确认收货');
  }

  /**
   * 完成订单（虚拟/服务类商品，PROCESSING -> DELIVERED）
   */
  async completeOrder(merchantId: string, id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id, merchantId } });
    
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 虚拟/服务类商品可以直接从 PROCESSING 到 DELIVERED
    if (order.assetType === AssetType.PHYSICAL) {
      throw new BadRequestException('实物商品请使用发货流程');
    }

    return this.updateOrderStatus(id, OrderStatus.DELIVERED, merchantId, 'merchant', '服务/虚拟商品已交付');
  }

  /**
   * 结算订单（DELIVERED -> SETTLED）
   * 通常由系统自动调用
   */
  async settleOrder(id: string, systemUserId: string = 'system'): Promise<Order> {
    return this.updateOrderStatus(id, OrderStatus.SETTLED, systemUserId, 'admin', '订单结算完成');
  }

  /**
   * 冻结订单（争议处理）
   */
  async freezeOrder(id: string, operatorId: string, reason: string): Promise<Order> {
    return this.updateOrderStatus(id, OrderStatus.FROZEN, operatorId, 'admin', reason);
  }

  /**
   * 解冻订单
   */
  async unfreezeOrder(id: string, operatorId: string, targetStatus: OrderStatus = OrderStatus.PROCESSING): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });
    
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.status !== OrderStatus.FROZEN) {
      throw new BadRequestException('订单未处于冻结状态');
    }

    return this.updateOrderStatus(id, targetStatus, operatorId, 'admin', '订单解冻');
  }

  /**
   * 获取待自动确认收货的订单（发货超过 N 天未确认）
   */
  async getOrdersForAutoDelivery(daysAfterShipped: number = 7): Promise<Order[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAfterShipped);

    return this.orderRepository
      .createQueryBuilder('order')
      .where('order.status = :status', { status: OrderStatus.SHIPPED })
      .andWhere('order.updatedAt < :cutoff', { cutoff: cutoffDate })
      .getMany();
  }

  /**
   * 获取待自动取消的订单（创建超过 N 分钟未支付）
   */
  async getOrdersForAutoCancel(minutesAfterCreated: number = 30): Promise<Order[]> {
    const cutoffDate = new Date();
    cutoffDate.setMinutes(cutoffDate.getMinutes() - minutesAfterCreated);

    return this.orderRepository.find({
      where: {
        status: OrderStatus.PENDING,
        createdAt: LessThan(cutoffDate),
      },
    });
  }

  /**
   * 批量自动确认收货
   */
  async autoConfirmDeliveries(): Promise<number> {
    const orders = await this.getOrdersForAutoDelivery();
    let count = 0;

    for (const order of orders) {
      try {
        await this.updateOrderStatus(
          order.id,
          OrderStatus.DELIVERED,
          'system',
          'admin',
          '系统自动确认收货（超时）',
        );
        count++;
      } catch (error) {
        this.logger.error(`自动确认收货失败: ${order.id}`, error);
      }
    }

    this.logger.log(`自动确认收货完成，共处理 ${count} 个订单`);
    return count;
  }

  /**
   * 批量自动取消超时订单
   */
  async autoCancelExpiredOrders(): Promise<number> {
    const orders = await this.getOrdersForAutoCancel();
    let count = 0;

    for (const order of orders) {
      try {
        await this.updateOrderStatus(
          order.id,
          OrderStatus.CANCELLED,
          'system',
          'admin',
          '系统自动取消（支付超时）',
        );
        count++;
      } catch (error) {
        this.logger.error(`自动取消订单失败: ${order.id}`, error);
      }
    }

    this.logger.log(`自动取消超时订单完成，共处理 ${count} 个订单`);
    return count;
  }
}

