/**
 * HQ AI Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HqAIService } from './hq-ai.service';

@Module({
  imports: [ConfigModule],
  providers: [HqAIService],
  exports: [HqAIService],
})
export class HqAIModule {}
