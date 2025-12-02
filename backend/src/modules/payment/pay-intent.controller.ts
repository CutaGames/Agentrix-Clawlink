import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PayIntentService, CreatePayIntentDto } from './pay-intent.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('pay-intents')
@Controller('pay-intents')
export class PayIntentController {
  constructor(private readonly payIntentService: PayIntentService) {}

  @Post()
  @ApiOperation({ summary: '创建PayIntent（V3.0：统一支付意图规范）' })
  @ApiResponse({ status: 201, description: '返回创建的PayIntent' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createPayIntent(
    @Request() req: any,
    @Body() dto: CreatePayIntentDto,
  ) {
    return this.payIntentService.createPayIntent(req.user?.id, dto);
  }

  @Post(':payIntentId/authorize')
  @ApiOperation({ summary: '授权PayIntent' })
  @ApiResponse({ status: 200, description: '返回授权的PayIntent' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async authorizePayIntent(
    @Request() req: any,
    @Param('payIntentId') payIntentId: string,
    @Body() body: { authorizationType?: 'user' | 'agent' | 'quickpay'; quickPayGrantId?: string },
  ) {
    return this.payIntentService.authorizePayIntent(
      payIntentId,
      req.user?.id,
      body.authorizationType || 'user',
      body.quickPayGrantId,
    );
  }

  @Post(':payIntentId/execute')
  @ApiOperation({ summary: '执行PayIntent（创建实际支付）' })
  @ApiResponse({ status: 200, description: '返回执行的PayIntent' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async executePayIntent(
    @Request() req: any,
    @Param('payIntentId') payIntentId: string,
  ) {
    return this.payIntentService.executePayIntent(payIntentId, req.user?.id);
  }

  @Get(':payIntentId')
  @ApiOperation({ summary: '获取PayIntent详情' })
  @ApiResponse({ status: 200, description: '返回PayIntent详情' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getPayIntent(
    @Request() req: any,
    @Param('payIntentId') payIntentId: string,
  ) {
    return this.payIntentService.getPayIntent(payIntentId, req.user?.id);
  }

  @Put(':payIntentId/cancel')
  @ApiOperation({ summary: '取消PayIntent' })
  @ApiResponse({ status: 200, description: '返回取消的PayIntent' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async cancelPayIntent(
    @Request() req: any,
    @Param('payIntentId') payIntentId: string,
  ) {
    return this.payIntentService.cancelPayIntent(payIntentId, req.user?.id);
  }
}

