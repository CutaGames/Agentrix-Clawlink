import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommerceService } from './commerce.service';
import { CommerceController } from './commerce.controller';
import { SplitPlanService } from './split-plan.service';
import { BudgetPoolService } from './budget-pool.service';
import { UsagePatternService } from './usage-pattern.service';
import { SplitPlan } from '../../entities/split-plan.entity';
import { BudgetPool } from '../../entities/budget-pool.entity';
import { Milestone } from '../../entities/milestone.entity';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SplitPlan, BudgetPool, Milestone]),
    forwardRef(() => PaymentModule),
  ],
  providers: [CommerceService, SplitPlanService, BudgetPoolService, UsagePatternService],
  controllers: [CommerceController],
  exports: [CommerceService, SplitPlanService, BudgetPoolService, UsagePatternService],
})
export class CommerceModule {}
