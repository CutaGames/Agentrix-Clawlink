import { Module } from '@nestjs/common';
import { TickController } from './tick.controller';
import { TickService } from './tick.service';
import { AgentSchedulerService } from './agent-scheduler.service';
import { AgentTriggerService } from './agent-trigger.service';
import { BudgetMonitorService } from './budget-monitor.service';

@Module({
  controllers: [TickController],
  providers: [
    TickService,
    AgentSchedulerService,
    AgentTriggerService,
    BudgetMonitorService,
  ],
  exports: [
    TickService,
    AgentSchedulerService,
    AgentTriggerService,
    BudgetMonitorService,
  ],
})
export class TickModule {}
