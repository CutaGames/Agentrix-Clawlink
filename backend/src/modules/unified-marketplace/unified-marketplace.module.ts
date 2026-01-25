/**
 * Unified Marketplace Module
 * 
 * V2.0: 统一市场模块
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from '../../entities/skill.entity';
import { ExternalSkillMapping } from '../../entities/external-skill-mapping.entity';
import { SkillAnalytics } from '../../entities/skill-analytics.entity';
import { UnifiedMarketplaceService } from './unified-marketplace.service';
import { UnifiedMarketplaceController } from './unified-marketplace.controller';
import { SearchFallbackService } from './search-fallback.service';
import { SkillModule } from '../skill/skill.module';
import { UCPModule } from '../ucp/ucp.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Skill,
      ExternalSkillMapping,
      SkillAnalytics,
    ]),
    forwardRef(() => SkillModule),
    forwardRef(() => UCPModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [UnifiedMarketplaceController],
  providers: [UnifiedMarketplaceService, SearchFallbackService],
  exports: [UnifiedMarketplaceService, SearchFallbackService],
})
export class UnifiedMarketplaceModule {}
