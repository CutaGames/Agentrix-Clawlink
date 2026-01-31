/**
 * HQ Core Module
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HqCoreController } from './hq-core.controller';
import { HqCoreService } from './hq-core.service';
import { HqAgent } from '../../entities/hq-agent.entity';
import { HqAlert } from '../../entities/hq-alert.entity';
import { MemoryModule } from '../memory/memory.module';
import { ProjectModule } from '../project/project.module';
import { HqAIModule } from '../ai/hq-ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HqAgent, HqAlert]),
    MemoryModule,
    ProjectModule,
    HqAIModule,
  ],
  controllers: [HqCoreController],
  providers: [HqCoreService],
  exports: [HqCoreService],
})
export class HqCoreModule {}
