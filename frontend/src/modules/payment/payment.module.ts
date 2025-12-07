import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { ProviderWebhookController } from './provider-webhook.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { CryptoPaymentController } from './crypto-payment.controller';
import { PayIntentController } from './pay-intent.controller';
import { QuickPayGrantController } from './quick-pay-grant.controller';
import { RefundController } from './refund.controller';
import { PaymentService } from './payment.service';
import { StripeService } from './stripe.service';
import { StripeWebhookService } from './stripe-webhook.service';
import { X402Service } from './x402.service';
import { SmartRouterService } from './smart-router.service';
import { FiatToCryptoService } from './fiat-to-crypto.service';
import { EscrowService } from './escrow.service';
import { RefundService } from './refund.service';
import { X402AuthorizationService } from './x402-authorization.service';
import { AgentPaymentService } from './agent-payment.service';
import { CryptoPaymentService } from './crypto-payment.service';
import { Payment } from '../../entities/payment.entity';
import { User } from '../../entities/user.entity';
import { AutoPayGrant } from '../../entities/auto-pay-grant.entity';
import { PayIntent } from '../../entities/pay-intent.entity';
import { QuickPayGrant } from '../../entities/quick-pay-grant.entity';
import { Order } from '../../entities/order.entity';
import { CommissionModule } from '../commission/commission.module';
import { UserModule } from '../user/user.module';
import { PayIntentService } from './pay-intent.service';
import { QuickPayGrantService } from './quick-pay-grant.service';
import { PayIntentSchedulerService } from './pay-intent-scheduler.service';
import { PaymentAggregatorService } from './payment-aggregator.service';
import { EscrowSchedulerService } from './escrow-scheduler.service';
import { WithdrawalController } from './withdrawal.controller';
import { WithdrawalService } from './withdrawal.service';
import { Withdrawal } from '../../entities/withdrawal.entity';
import { ExchangeRateService } from './exchange-rate.service';
import { ProviderIntegrationService } from './provider-integration.service';
import { ProviderPaymentFlowService } from './provider-payment-flow.service';
import { MockProviderService } from './mock-provider.service';
import { TransakProviderService } from './transak-provider.service';
import { OSLProviderService } from './osl-provider.service';
import { TransakWebhookController } from './transak-webhook.controller';
import { ProviderManagerService } from './provider-manager.service';
import { ReferralModule } from '../referral/referral.module';
import { PricingModule } from '../pricing/pricing.module';
import { TaxModule } from '../tax/tax.module';
import { RelayerModule } from '../relayer/relayer.module';
import { FeeEstimationService } from './fee-estimation.service';
import { RiskAssessmentService } from './risk-assessment.service';
import { RiskAssessment } from '../../entities/risk-assessment.entity';
import { PreflightCheckService } from './preflight-check.service';
import { PreflightCheckController } from './preflight-check.controller';
import { CryptoRailService } from './crypto-rail.service';
import { WalletConnection } from '../../entities/wallet-connection.entity';
import { AgentSession } from '../../entities/agent-session.entity';
import { OffRampCommissionService } from './off-ramp-commission.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, User, AutoPayGrant, PayIntent, QuickPayGrant, Order, Withdrawal, RiskAssessment, WalletConnection, AgentSession]),
    forwardRef(() => CommissionModule),
    forwardRef(() => UserModule),
    forwardRef(() => ReferralModule),
    forwardRef(() => RelayerModule),
    PricingModule,
    TaxModule,
  ],
  controllers: [
    PaymentController,
    ProviderWebhookController,
    StripeWebhookController,
    CryptoPaymentController,
    PayIntentController,
    QuickPayGrantController,
    RefundController,
    WithdrawalController,
    PreflightCheckController,
    TransakWebhookController,
  ],
  providers: [
    PaymentService,
    StripeService,
    StripeWebhookService,
    X402Service,
    SmartRouterService,
    FiatToCryptoService,
    EscrowService,
    RefundService,
    X402AuthorizationService,
    AgentPaymentService,
    CryptoPaymentService,
    PayIntentService,
    QuickPayGrantService,
    PayIntentSchedulerService,
    EscrowSchedulerService,
    PaymentAggregatorService,
    WithdrawalService,
    ExchangeRateService,
    ProviderIntegrationService,
    ProviderPaymentFlowService,
    FeeEstimationService,
    RiskAssessmentService,
    PreflightCheckService,
    CryptoRailService,
    MockProviderService,
    TransakProviderService,
    OSLProviderService,
    ProviderManagerService,
    OffRampCommissionService,
  ],
  exports: [
    PaymentService,
    SmartRouterService,
    FiatToCryptoService,
    EscrowService,
    RefundService,
    PayIntentService,
    QuickPayGrantService,
    PaymentAggregatorService,
    ExchangeRateService,
    FeeEstimationService,
    RiskAssessmentService,
    PreflightCheckService,
    CryptoRailService,
    ProviderManagerService,
    OffRampCommissionService,
  ],
})
export class PaymentModule {}

