/**
 * Tick Module (Phase 4)
 * 
 * Agent 自主运行系统 - 包含 Tick 引擎、任务队列、预算监控、
 * 自动任务生成、Agent 通信、指标收集、学习系统、工作排班
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HqAgent } from '../../entities/hq-agent.entity';
import { AgentTask } from '../../entities/agent-task.entity';
import { TickExecution } from '../../entities/tick-execution.entity';
import { HqSkill } from '../../entities/hq-skill.entity';
import { AgentMessageEntity } from '../../entities/agent-message.entity';
import { HqCoreModule } from '../../modules/core/hq-core.module';
import { HqAIModule } from '../../modules/ai/hq-ai.module';
import { MemoryModule } from '../../modules/memory/memory.module';
import { ToolsModule } from '../../modules/tools/tools.module';

import { TickService } from './tick.service';
import { TaskQueueService } from './task-queue.service';
import { TaskContextService } from './task-context.service';
import { AgentTriggerService } from './agent-trigger.service';
import { BudgetMonitorService } from './budget-monitor.service';
import { AgentSchedulerService } from './agent-scheduler.service';
import { AutoTaskGeneratorService } from './auto-task-generator.service';
import { AgentCommunicationService } from './agent-communication.service';
import { AgentMetricsService } from './agent-metrics.service';
import { AgentLearningService } from './agent-learning.service';
import { WorkScheduleService } from './work-schedule.service';
import { TaskManagementController } from './task-management.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HqAgent,
      AgentTask,
      TickExecution,
      HqSkill,
      AgentMessageEntity,
    ]),
    ConfigModule,
    HqCoreModule,
    HqAIModule,
    MemoryModule,
    ToolsModule,
  ],
  controllers: [TaskManagementController],
  providers: [
    TickService,
    TaskQueueService,
    TaskContextService,
    AgentTriggerService,
    BudgetMonitorService,
    AgentSchedulerService,
    AutoTaskGeneratorService,
    AgentCommunicationService,
    AgentMetricsService,
    AgentLearningService,
    WorkScheduleService,
  ],
  exports: [
    TickService,
    TaskQueueService,
    BudgetMonitorService,
    AgentTriggerService,
    AutoTaskGeneratorService,
    AgentCommunicationService,
    AgentMetricsService,
    AgentLearningService,
    WorkScheduleService,
  ],
})
export class TickModule {}
