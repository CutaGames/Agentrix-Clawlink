import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProviderConfig } from '../../entities/user-provider-config.entity';
import { AiProviderService } from './ai-provider.service';
import { AiProviderController } from './ai-provider.controller';
import { AuthModule } from '../auth/auth.module';
import { BedrockIntegrationModule } from '../ai-integration/bedrock/bedrock-integration.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserProviderConfig]), AuthModule, BedrockIntegrationModule],
  controllers: [AiProviderController],
  providers: [AiProviderService],
  exports: [AiProviderService],
})
export class AiProviderModule {}
