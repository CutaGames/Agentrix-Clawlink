/**
 * CLI Module
 * 
 * IDE/命令行接口模块
 */

import { Module, forwardRef } from '@nestjs/common';
import { CLIController } from './cli.controller';
import { SkillModule } from '../skill/skill.module';
import { HqCoreModule } from '../core/hq-core.module';

@Module({
  imports: [
    forwardRef(() => SkillModule),
    forwardRef(() => HqCoreModule),
  ],
  controllers: [CLIController],
  providers: [],
  exports: [],
})
export class CLIModule {}
