/**
 * Workspace Module
 * 
 * IDE 工作区模块，支持文件浏览、编辑和 Agent 协作
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceFile } from './entities/workspace-file.entity';
import { HqAIModule } from '../ai/hq-ai.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workspace, WorkspaceFile]),
    HqAIModule,
    KnowledgeModule,
  ],
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
