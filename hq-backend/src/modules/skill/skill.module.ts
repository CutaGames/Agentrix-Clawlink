/**
 * Skill Module
 * 
 * 技能管理模块 - Agent 技能包系统
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HqSkill } from '../../entities/hq-skill.entity';
import { HqAgent } from '../../entities/hq-agent.entity';
import { SkillService } from './skill.service';
import { SkillController } from './skill.controller';
import { SkillExecutorService } from './skill-executor.service';
import { SocialMediaService } from './social-media.service';
import { SocialMediaController } from './social-media.controller';
import { HqAIModule } from '../ai/hq-ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HqSkill, HqAgent]),
    ConfigModule,
    forwardRef(() => HqAIModule),
  ],
  controllers: [SkillController, SocialMediaController],
  providers: [SkillService, SkillExecutorService, SocialMediaService],
  exports: [SkillService, SkillExecutorService, SocialMediaService],
})
export class SkillModule {}
