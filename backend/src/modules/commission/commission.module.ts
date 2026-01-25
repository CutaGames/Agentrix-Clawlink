import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CommissionController } from './commission.controller';
import { CommissionService } from './commission.service';
import { CommissionCalculatorService } from './commission-calculator.service';
import { CommissionSchedulerService } from './commission-scheduler.service';
import { CommissionStrategyV4Service } from './commission-strategy-v4.service';
import { AttributionCommissionService } from './attribution-commission.service';
import { AuditProofService } from './audit-proof.service';
import { Commission } from '../../entities/commission.entity';
import { CommissionSettlement } from '../../entities/commission-settlement.entity';
import { CommissionAllocation } from '../../entities/commission-allocation.entity';
import { FundPath } from '../../entities/fund-path.entity';
import { Payment } from '../../entities/payment.entity';
import { Product } from '../../entities/product.entity';
import { User } from '../../entities/user.entity';
import { Order } from '../../entities/order.entity';
import { PayIntent } from '../../entities/pay-intent.entity';
import { AuditProof } from '../../entities/audit-proof.entity';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Commission,
      CommissionSettlement,
      CommissionAllocation,
      FundPath,
      Payment,
      Product,
      User,
      Order,
      PayIntent,
      AuditProof,
    ]),
    ScheduleModule.forRoot(),
    forwardRef(() => PaymentModule),
  ],
  controllers: [CommissionController],
  providers: [
    CommissionService,
    CommissionCalculatorService,
    CommissionSchedulerService,
    CommissionStrategyV4Service,
    AttributionCommissionService,
    AuditProofService,
  ],
  exports: [
    CommissionService,
    CommissionCalculatorService,
    CommissionStrategyV4Service,
    AttributionCommissionService,
    AuditProofService,
  ],
})
export class CommissionModule {}

