import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HqCoreService } from './hq-core.service';
import { HqCoreController } from './hq-core.controller';
import { PromptBuilderService } from './prompt-builder.service';
import { UnifiedChatService } from './unified-chat.service';
import { HqAgent } from '../../entities/hq-agent.entity';
import { HqAlert } from '../../entities/hq-alert.entity';
import { ChatSession } from '../../entities/chat-session.entity';
import { MemoryModule } from '../memory/memory.module';
import { ProjectModule } from '../project/project.module';
import { AIModule } from '../ai/ai.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HqAgent, HqAlert, ChatSession]),
    ConfigModule,
    MemoryModule,
    ProjectModule,
    AIModule,
    KnowledgeModule,
  ],
  controllers: [HqCoreController],
  providers: [
    HqCoreService,
    PromptBuilderService,
    UnifiedChatService,
  ],
  exports: [
    HqCoreService,
    PromptBuilderService,
    UnifiedChatService,
  ],
})
export class HqCoreModule {}
