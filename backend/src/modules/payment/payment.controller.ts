import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto, ProcessPaymentDto, CreateProviderPaymentSessionDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FiatToCryptoService } from './fiat-to-crypto.service';
import { EscrowService } from './escrow.service';
import { X402AuthorizationService } from './x402-authorization.service';
import { AgentPaymentService } from './agent-payment.service';
import { X402Service } from './x402.service';
import { FeeEstimationService } from './fee-estimation.service';
import { EstimateFeeDto, ComparePaymentCostsDto } from './dto/fee-estimation.dto';
import { RiskAssessmentService } from './risk-assessment.service';
import { PaymentMethod } from '../../entities/payment.entity';
import { ExchangeRateService } from './exchange-rate.service';
import { ConfigService } from '@nestjs/config';
import { ProviderManagerService } from './provider-manager.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly fiatToCryptoService: FiatToCryptoService,
    private readonly escrowService: EscrowService,
    private readonly x402AuthService: X402AuthorizationService,
    private readonly agentPaymentService: AgentPaymentService,
    private readonly x402Service: X402Service,
    private readonly feeEstimationService: FeeEstimationService,
    private readonly riskAssessmentService: RiskAssessmentService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly configService: ConfigService,
    private readonly providerManagerService: ProviderManagerService,
  ) {}

  @Post('create-intent')
  @ApiOperation({ summary: '创建支付意图（Stripe）' })
  @ApiResponse({ status: 201, description: '支付意图创建成功' })
  async createPaymentIntent(@Request() req, @Body() dto: CreatePaymentIntentDto) {
    return this.paymentService.createPaymentIntent(req.user.id, dto);
  }

  @Post('process')
  @ApiOperation({ summary: '处理支付' })
  @ApiResponse({ status: 201, description: '支付处理成功' })
  async processPayment(@Request() req, @Body() dto: ProcessPaymentDto) {
    return this.paymentService.processPayment(req.user.id, dto);
  }

  @Get('routing')
  @ApiOperation({ summary: '获取支付路由建议' })
  @ApiResponse({ status: 200, description: '返回路由建议' })
  async getPaymentRouting(
    @Request() req,
    @Query('amount') amount: number,
    @Query('currency') currency: string = 'CNY',
    @Query('isOnChain') isOnChain?: boolean,
    @Query('userCountry') userCountry?: string,
    @Query('merchantCountry') merchantCountry?: string,
    @Query('merchantPaymentConfig') merchantPaymentConfig?: 'fiat_only' | 'crypto_only' | 'both',
    @Query('orderType') orderType?: 'nft' | 'virtual' | 'service' | 'product' | 'physical', // V3.0新增：订单类型
    @Query('agentId') agentId?: string, // V3.0新增：Agent ID（用于判断是否有Agent）
    @Query('walletConnected') walletConnected?: string,
    @Query('scenario') scenario?: 'qr_pay' | 'micro_sub' | 'wallet_direct' | 'standard',
  ) {
    const parsedWalletConnected =
      typeof walletConnected === 'string' ? walletConnected === 'true' : undefined;

    return this.paymentService.getPaymentRouting(
      req.user.id,
      Number(amount),
      currency,
      isOnChain === true,
      {
        userCountry,
        merchantCountry,
        isCrossBorder: userCountry && merchantCountry && userCountry !== merchantCountry,
        merchantPaymentConfig: merchantPaymentConfig || 'both', // 默认两种都接受
        orderType: orderType || 'product', // V3.0新增：订单类型
        agentId, // V3.0新增：Agent ID
        walletConnected: parsedWalletConnected,
        scenario,
      } as any,
    );
  }

  @Post(':paymentId/update-status')
  @ApiOperation({ summary: '更新支付状态' })
  @ApiResponse({ status: 200, description: '状态更新成功' })
  async updatePaymentStatus(
    @Request() req,
    @Param('paymentId') paymentId: string,
    @Body() body: { transactionHash: string },
  ) {
    return this.paymentService.updatePaymentStatusByHash(
      req.user.id,
      paymentId,
      body.transactionHash,
    );
  }

  @Post('provider/session')
  @ApiOperation({ summary: '创建Provider支付会话' })
  @ApiResponse({ status: 201, description: 'Provider支付会话已创建' })
  async createProviderSession(@Request() req, @Body() dto: CreateProviderPaymentSessionDto) {
    return this.paymentService.createProviderPaymentSession(req.user.id, dto);
  }

  @Post('provider/transak/session')
  @ApiOperation({ summary: '创建 Transak Session（使用 Create Session API）' })
  @ApiResponse({ status: 201, description: 'Transak Session 已创建' })
  async createTransakSession(
    @Request() req,
    @Body() dto: {
      amount: number;
      fiatCurrency: string;
      cryptoCurrency?: string;
      network?: string;
      walletAddress?: string;
      orderId?: string;
      email?: string;
      redirectURL?: string;
      hideMenu?: boolean;
      disableWalletAddressForm?: boolean;
      disableFiatAmountEditing?: boolean;
      isKYCRequired?: boolean;
    },
  ) {
    const transakProvider = this.providerManagerService.getOnRampProviders().find(
      (p) => p.id === 'transak',
    ) as any;

    if (!transakProvider || !transakProvider.createSession) {
      throw new BadRequestException('Transak provider not available or createSession method not implemented');
    }

    // 获取用户信息
    const user = req.user;
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    return transakProvider.createSession({
      amount: dto.amount,
      fiatCurrency: dto.fiatCurrency,
      cryptoCurrency: dto.cryptoCurrency || 'USDC',
      network: dto.network || 'bsc',
      walletAddress: dto.walletAddress,
      orderId: dto.orderId,
      userId: user.id,
      email: dto.email || user.email,
      redirectURL: dto.redirectURL || `${frontendUrl}/payment/callback`,
      hideMenu: dto.hideMenu !== undefined ? dto.hideMenu : true,
      disableWalletAddressForm: dto.disableWalletAddressForm !== undefined ? dto.disableWalletAddressForm : true,
      disableFiatAmountEditing: dto.disableFiatAmountEditing !== undefined ? dto.disableFiatAmountEditing : true,
      isKYCRequired: dto.isKYCRequired !== undefined ? dto.isKYCRequired : true,
    });
  }

  @Get('provider/session/:sessionId')
  @ApiOperation({ summary: '查询Provider支付会话状态' })
  @ApiResponse({ status: 200, description: '返回会话状态' })
  async getProviderSession(@Request() req, @Param('sessionId') sessionId: string) {
    return this.paymentService.getProviderPaymentSession(req.user.id, sessionId);
  }

  @Post('provider/session/:sessionId/complete')
  @ApiOperation({ summary: '确认Provider会话已完成（回调/前端）' })
  @ApiResponse({ status: 200, description: '会话状态更新成功' })
  async completeProviderSession(
    @Request() req,
    @Param('sessionId') sessionId: string,
    @Body() body: { transactionHash?: string },
  ) {
    return this.paymentService.completeProviderPaymentSession(req.user.id, sessionId, body);
  }

  // 具体路由必须在参数路由之前定义
  @Get('compare-costs')
  @ApiOperation({ summary: '对比所有支付方式的总成本' })
  @ApiResponse({ status: 200, description: '返回所有支付方式的成本对比' })
  async comparePaymentCosts(
    @Query('amount') amount: number,
    @Query('currency') currency: string = 'USD',
    @Query('chain') chain?: string,
    @Query('targetCurrency') targetCurrency?: string,
  ) {
    return this.feeEstimationService.getAllPaymentCosts(
      Number(amount),
      currency,
      targetCurrency,
      chain,
    );
  }

  @Get('contract-address')
  @ApiOperation({ summary: '获取合约地址' })
  @ApiResponse({ status: 200, description: '返回合约地址信息' })
  async getContractAddress() {
    const commissionAddress = this.configService.get<string>('COMMISSION_CONTRACT_ADDRESS');
    const erc8004Address = this.configService.get<string>('ERC8004_CONTRACT_ADDRESS');
    const usdcAddress = this.configService.get<string>('USDC_ADDRESS');
    
    if (!commissionAddress) {
      throw new BadRequestException('Commission合约地址未配置，请联系管理员');
    }
    
    return {
      commissionContractAddress: commissionAddress,
      erc8004ContractAddress: erc8004Address,
      usdcAddress: usdcAddress,
    };
  }

  @Get()
  @ApiOperation({ summary: '获取用户的支付记录列表' })
  @ApiResponse({ status: 200, description: '返回支付记录列表' })
  async getUserPayments(
    @Request() req,
    @Query('status') status?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.paymentService.getUserPayments(req.user.id, {
      status,
      paymentMethod,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':paymentId')
  @ApiOperation({ summary: '查询支付状态' })
  @ApiResponse({ status: 200, description: '返回支付信息' })
  async getPayment(@Request() req, @Param('paymentId') paymentId: string) {
    return this.paymentService.getPayment(req.user.id, paymentId);
  }

  @Get('fiat-to-crypto/quotes')
  @ApiOperation({ summary: '获取法币转数字货币Provider报价' })
  @ApiResponse({ status: 200, description: '返回所有Provider报价' })
  async getFiatToCryptoQuotes(
    @Query('fromAmount') fromAmount: number,
    @Query('fromCurrency') fromCurrency: string,
    @Query('toCurrency') toCurrency: string,
    @Query('userCountry') userCountry?: string,
  ) {
    return this.fiatToCryptoService.getProviderQuotes(
      Number(fromAmount),
      fromCurrency,
      toCurrency,
      userCountry,
    );
  }

  @Post('fiat-to-crypto/lock')
  @ApiOperation({ summary: '锁定汇率' })
  @ApiResponse({ status: 201, description: '汇率锁定成功' })
  async lockQuote(@Body() body: { quoteId: string; quote: any }) {
    return this.fiatToCryptoService.lockQuote(body.quoteId, body.quote);
  }

  @Post('escrow/create')
  @ApiOperation({ summary: '创建托管交易' })
  @ApiResponse({ status: 201, description: '托管交易创建成功' })
  async createEscrow(@Request() req, @Body() body: any) {
    return this.escrowService.createEscrow({
      ...body,
      userId: req.user.id,
    });
  }

  @Post('escrow/:escrowId/confirm')
  @ApiOperation({ summary: '确认收货（释放资金）' })
  @ApiResponse({ status: 200, description: '资金释放成功' })
  async confirmDelivery(@Request() req, @Param('escrowId') escrowId: string) {
    return this.escrowService.confirmDelivery(escrowId, req.user.id);
  }

  @Get('escrow/:escrowId')
  @ApiOperation({ summary: '查询托管交易' })
  @ApiResponse({ status: 200, description: '返回托管交易信息' })
  async getEscrow(@Param('escrowId') escrowId: string) {
    return this.escrowService.getEscrow(escrowId);
  }

  @Get('x402/authorization')
  @ApiOperation({ summary: '检查X402授权状态' })
  @ApiResponse({ status: 200, description: '返回授权状态' })
  async checkX402Authorization(@Request() req) {
    return this.x402AuthService.checkAuthorization(req.user.id);
  }

  @Post('x402/authorization')
  @ApiOperation({ summary: '创建X402授权' })
  @ApiResponse({ status: 201, description: '授权创建成功' })
  async createX402Authorization(
    @Request() req,
    @Body() body: {
      singleLimit: number;
      dailyLimit: number;
      durationDays?: number;
    },
  ) {
    return this.x402AuthService.createAuthorization(
      req.user.id,
      body.singleLimit,
      body.dailyLimit,
      body.durationDays || 30,
    );
  }

  @Post('x402/session')
  @ApiOperation({ summary: '创建X402支付会话' })
  @ApiResponse({ status: 201, description: '会话创建成功' })
  async createX402Session(
    @Request() req,
    @Body() body: {
      paymentId: string;
      amount: number;
      currency: string;
      metadata?: any;
    },
  ) {
    return this.x402Service.createPaymentSession(
      body.paymentId,
      {
        amount: body.amount,
        currency: body.currency,
        paymentMethod: 'x402' as any,
        metadata: body.metadata,
      },
    );
  }

  @Post('x402/session/:sessionId/execute')
  @ApiOperation({ summary: '执行X402支付' })
  @ApiResponse({ status: 200, description: '支付执行成功' })
  async executeX402Payment(@Param('sessionId') sessionId: string) {
    return this.x402Service.executePayment(sessionId);
  }

  @Post('agent/create')
  @ApiOperation({ summary: '创建Agent代付' })
  @ApiResponse({ status: 201, description: 'Agent代付创建成功' })
  async createAgentPayment(
    @Request() req,
    @Body() body: {
      agentId: string;
      amount: number;
      currency: string;
      merchantId: string;
      description?: string;
      repaymentMethod?: 'offline' | 'system' | 'crypto';
    },
  ) {
    return this.agentPaymentService.createAgentPayment({
      ...body,
      userId: req.user.id,
    });
  }

  @Post('agent/:paymentId/confirm')
  @ApiOperation({ summary: 'Agent确认支付' })
  @ApiResponse({ status: 200, description: '支付确认成功' })
  async confirmAgentPayment(
    @Request() req,
    @Param('paymentId') paymentId: string,
    @Body() body: { transactionHash: string },
  ) {
    return this.agentPaymentService.confirmAgentPayment(
      paymentId,
      req.user.id,
      body.transactionHash,
    );
  }

  @Post('agent/:paymentId/repay')
  @ApiOperation({ summary: '用户还款给Agent' })
  @ApiResponse({ status: 200, description: '还款成功' })
  async repayToAgent(
    @Request() req,
    @Param('paymentId') paymentId: string,
    @Body() body?: { transactionHash?: string },
  ) {
    return this.agentPaymentService.repayToAgent(
      paymentId,
      req.user.id,
      body?.transactionHash,
    );
  }

  @Get('agent/list')
  @ApiOperation({ summary: '获取Agent代付记录' })
  @ApiResponse({ status: 200, description: '返回代付记录列表' })
  async getAgentPayments(@Request() req) {
    return this.agentPaymentService.getAgentPayments(req.user.id);
  }

  @Get('agent/user-list')
  @ApiOperation({ summary: '获取用户的Agent代付记录' })
  @ApiResponse({ status: 200, description: '返回用户的代付记录列表' })
  async getUserAgentPayments(@Request() req) {
    return this.agentPaymentService.getUserAgentPayments(req.user.id);
  }

  @Post('estimate-fee')
  @HttpCode(200)
  @ApiOperation({ summary: '估算支付手续费' })
  @ApiResponse({ status: 200, description: '返回手续费估算结果' })
  async estimateFee(@Body() dto: EstimateFeeDto) {
    const { amount, currency, paymentMethod, chain, targetCurrency } = dto;
    const { PaymentMethod } = await import('../../entities/payment.entity');

    if (paymentMethod === PaymentMethod.STRIPE) {
      return this.feeEstimationService.estimateStripeFee(amount, currency);
    } else if (paymentMethod === PaymentMethod.WALLET) {
      if (chain === 'solana') {
        return this.feeEstimationService.estimateSolanaGasFee(amount);
      } else {
        const chainType = (chain as 'ethereum' | 'bsc' | 'polygon' | 'base') || 'ethereum';
        return this.feeEstimationService.estimateWalletGasFee(chainType, amount);
      }
    } else if (paymentMethod === PaymentMethod.X402) {
      const chainType = (chain as 'ethereum' | 'solana' | 'bsc' | 'polygon') || 'ethereum';
      return this.feeEstimationService.estimateX402Fee(amount, chainType);
    }

    throw new BadRequestException('不支持的支付方式');
  }

  @Post('assess-risk')
  @HttpCode(200)
  @ApiOperation({ summary: '评估交易风险' })
  @ApiResponse({ status: 200, description: '返回风险评估结果' })
  async assessRisk(
    @Request() req,
    @Body() body: {
      amount: number;
      paymentMethod: PaymentMethod;
      metadata?: any;
    },
  ) {
    const assessment = await this.riskAssessmentService.assessRisk(
      req.user.id,
      body.amount,
      body.paymentMethod,
      body.metadata,
    );

    // 记录风险评估结果（如果有关联的支付ID）
    if (body.metadata?.paymentId) {
      await this.riskAssessmentService.recordRiskAssessment(
        body.metadata.paymentId,
        assessment,
      );
    }

    return assessment;
  }

  @Get('exchange-rate/quotes')
  @ApiOperation({ summary: '获取实时汇率' })
  @ApiResponse({ status: 200, description: '返回汇率信息' })
  async getExchangeRate(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const rate = await this.exchangeRateService.getExchangeRate(from, to);
    return {
      from,
      to,
      rate,
      timestamp: Date.now(),
      source: 'coingecko',
    };
  }

  @Post('exchange-rate/lock')
  @ApiOperation({ summary: '锁定汇率' })
  @ApiResponse({ status: 201, description: '汇率锁定成功' })
  async lockExchangeRate(
    @Body() body: {
      from: string;
      to: string;
      amount: number;
      expiresIn?: number; // 有效期（秒），默认600秒（10分钟）
    },
  ) {
    const lock = await this.exchangeRateService.lockExchangeRate(
      body.from,
      body.to,
      body.amount,
      body.expiresIn,
    );

    return lock;
  }

  @Get('exchange-rate/lock/:lockId')
  @ApiOperation({ summary: '验证锁定汇率' })
  @ApiResponse({ status: 200, description: '返回锁定汇率信息' })
  async getExchangeRateLock(@Param('lockId') lockId: string) {
    const validation = this.exchangeRateService.validateRateLock(lockId);

    if (!validation.lock) {
      return {
        valid: false,
        lockId,
        message: 'Lock not found or expired',
      };
    }

    return {
      valid: validation.valid,
      ...validation.lock,
    };
  }
}

