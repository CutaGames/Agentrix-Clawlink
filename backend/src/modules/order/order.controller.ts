import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../../entities/user.entity';
import { OrderStatus } from '../../entities/order.entity';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: '创建订单' })
  @ApiResponse({ status: 201, description: '订单创建成功' })
  async createOrder(@Request() req, @Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取订单列表' })
  @ApiResponse({ status: 200, description: '返回订单列表' })
  async getOrders(
    @Request() req,
    @Query('merchantId') merchantId?: string,
    @Query('status') status?: OrderStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const user = req.user;
    
    // 如果用户是商户且没有指定merchantId，默认查询该商户的订单
    let finalMerchantId = merchantId;
    if (!finalMerchantId && user.roles?.includes(UserRole.MERCHANT)) {
      finalMerchantId = user.id;
    }
    
    // 如果用户不是商户，查询该用户购买的订单
    const userId = !finalMerchantId ? user.id : undefined;
    
    return this.orderService.getOrders(
      userId,
      finalMerchantId,
      status,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '获取订单详情' })
  @ApiResponse({ status: 200, description: '返回订单详情' })
  async getOrder(@Request() req, @Param('id') id: string) {
    return this.orderService.getOrder(req.user.id, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消订单' })
  @ApiResponse({ status: 200, description: '订单已取消' })
  async cancelOrder(@Request() req, @Param('id') id: string) {
    return this.orderService.cancelOrder(req.user.id, id);
  }
}

