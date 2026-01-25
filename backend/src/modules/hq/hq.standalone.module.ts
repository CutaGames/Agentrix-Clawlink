import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HqController } from './hq.controller';
import { HqService } from './hq.service';
import { RagService } from './rag.service';
import { DeveloperService } from './developer.service';
import { AgentAccount } from '../../entities/agent-account.entity';
import { OpenAIIntegrationModule } from '../ai-integration/openai/openai-integration.module';
import { ClaudeIntegrationModule } from '../ai-integration/claude/claude-integration.module';
import { BedrockIntegrationModule } from '../ai-integration/bedrock/bedrock-integration.module';
import { GeminiIntegrationModule } from '../ai-integration/gemini/gemini-integration.module';
import { GroqIntegrationModule } from '../ai-integration/groq/groq-integration.module';
import { DeepSeekIntegrationModule } from '../ai-integration/deepseek/deepseek-integration.module';
import { ModelRouterModule } from '../ai-integration/model-router/model-router.module';
import { DatabaseConfig } from '../../config/database.config';
import { AiCapabilityModule } from '../ai-capability/ai-capability.module';
import { SearchModule } from '../search/search.module';
import { ProductModule } from '../product/product.module';
import { OrderModule } from '../order/order.module';
import { CartModule } from '../cart/cart.module';
import { LogisticsModule } from '../logistics/logistics.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),
    TypeOrmModule.forFeature([AgentAccount]),
    // AI Integration modules
    OpenAIIntegrationModule,
    ClaudeIntegrationModule,
    BedrockIntegrationModule,
    GeminiIntegrationModule, // 恢复Gemini用于Growth/BD agents
    GroqIntegrationModule,
    DeepSeekIntegrationModule,
    ModelRouterModule,
  ],
  controllers: [HqController],
  providers: [HqService, RagService, DeveloperService],
  exports: [HqService, RagService, DeveloperService],
})
export class HqStandaloneModule {}
