/**
 * Tool Module
 * 
 * Phase 2.1 + 2.2: Tool Registry + Agent Executor with ReAct loop
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ToolService } from './tool.service';
import { AgentExecutorService } from './agent-executor.service';
import { HqAIModule } from '../ai/hq-ai.module';

@Module({
  imports: [ConfigModule, HqAIModule],
  providers: [ToolService, AgentExecutorService],
  exports: [ToolService, AgentExecutorService],
})
export class ToolModule {}
