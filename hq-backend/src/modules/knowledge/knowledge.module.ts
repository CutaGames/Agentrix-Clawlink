/**
 * Knowledge Base Module
 * 
 * 项目知识库模块，用于存储和检索项目文档
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeDocument } from './entities/knowledge-document.entity';
import { HqAIModule } from '../ai/hq-ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeDocument]),
    HqAIModule,
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
