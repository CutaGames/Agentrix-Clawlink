import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HqAgent } from '../../entities/hq-agent.entity';
import { AgentTask } from '../../entities/agent-task.entity';
import { AgentMessageEntity } from '../../entities/agent-message.entity';
import { AgentCommunicationService } from '../../hq/tick/agent-communication.service';
import { AgentCommunicationController } from './agent-communication.controller';
import { HqCoreModule } from '../core/hq-core.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HqAgent, AgentTask, AgentMessageEntity]),
    HqCoreModule,
  ],
  providers: [AgentCommunicationService],
  controllers: [AgentCommunicationController],
  exports: [AgentCommunicationService],
})
export class CommunicationModule {}
