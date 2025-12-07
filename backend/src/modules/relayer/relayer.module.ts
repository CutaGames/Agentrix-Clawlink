import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PayMindRelayerService } from './relayer.service';
import { RelayerController } from './relayer.controller';
import { Payment } from '../../entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    ConfigModule,
  ],
  controllers: [RelayerController],
  providers: [PayMindRelayerService],
  exports: [PayMindRelayerService],
})
export class RelayerModule {}

