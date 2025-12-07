import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order, AssetType, OrderStatus } from '../../entities/order.entity';
import { CreateOrderDto } from './dto/order.dto';

@Injectable()
export class OrderService {
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
      throw new Error(`订单状态为"${order.status}"，无法取消。只有待支付或已支付的订单可以取消。`);
    }

    order.status = OrderStatus.CANCELLED;
    return this.orderRepository.save(order);
  }
}

