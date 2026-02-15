import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { AgentTask } from '../../entities/agent-task.entity';
import { HqAgent } from '../../entities/hq-agent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentTask, HqAgent]),
  ],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
