/**
 * Memory Module
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentMemoryService } from './agent-memory.service';
import { VectorSearchService } from './vector-search.service';
import { MemoryController } from './memory.controller';
import { AgentMemory, MemoryAssociation, MemorySession } from '../../entities/agent-memory.entity';
import { HqAIModule } from '../ai/hq-ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentMemory, MemoryAssociation, MemorySession]),
    forwardRef(() => HqAIModule),
  ],
  controllers: [MemoryController],
  providers: [AgentMemoryService, VectorSearchService],
  exports: [AgentMemoryService, VectorSearchService],
})
export class MemoryModule {}
