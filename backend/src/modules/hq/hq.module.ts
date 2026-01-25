import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HqController } from './hq.controller';
import { HqService } from './hq.service';
import { RagService } from './rag.service';
import { DeveloperService } from './developer.service';
import { AgentAccount } from '../../entities/agent-account.entity';
import { GeminiIntegrationModule } from '../ai-integration/gemini/gemini-integration.module';
import { OpenAIIntegrationModule } from '../ai-integration/openai/openai-integration.module';
import { ClaudeIntegrationModule } from '../ai-integration/claude/claude-integration.module';
import { BedrockIntegrationModule } from '../ai-integration/bedrock/bedrock-integration.module';
import { ModelRouterModule } from '../ai-integration/model-router/model-router.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentAccount]),
    GeminiIntegrationModule,
    OpenAIIntegrationModule,
    ClaudeIntegrationModule,
    BedrockIntegrationModule,
    ModelRouterModule,
  ],
  controllers: [HqController],
  providers: [HqService, RagService, DeveloperService],
  exports: [HqService, RagService, DeveloperService],
})
export class HqModule {}
