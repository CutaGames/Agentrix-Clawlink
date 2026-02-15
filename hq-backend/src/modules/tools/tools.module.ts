import { Module } from '@nestjs/common';
import { ToolService } from './tool.service';

@Module({
  providers: [ToolService],
  exports: [ToolService],
})
export class ToolsModule {}
