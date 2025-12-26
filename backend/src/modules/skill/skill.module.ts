import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from '../../entities/skill.entity';
import { SkillService } from './skill.service';
import { SkillController } from './skill.controller';
import { SkillConverterService } from './skill-converter.service';
import { SkillExecutorService } from './skill-executor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Skill])],
  controllers: [SkillController],
  providers: [SkillService, SkillConverterService, SkillExecutorService],
  exports: [SkillService, SkillExecutorService],
})

export class SkillModule {}
