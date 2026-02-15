import { Module } from '@nestjs/common';
import { TickController } from './tick.controller';
import { TickModule as HqTickModule } from '../../hq/tick/tick.module';

@Module({
  imports: [HqTickModule],
  controllers: [TickController],
})
export class TickApiModule {}
