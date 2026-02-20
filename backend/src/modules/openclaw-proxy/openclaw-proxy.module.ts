import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpenClawInstance } from '../../entities/openclaw-instance.entity';
import { OpenClawProxyService } from './openclaw-proxy.service';
import { OpenClawProxyController } from './openclaw-proxy.controller';
import { OpenClawConnectionModule } from '../openclaw-connection/openclaw-connection.module';
import { TokenQuotaModule } from '../token-quota/token-quota.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OpenClawInstance]),
    OpenClawConnectionModule,
    TokenQuotaModule,
  ],
  providers: [OpenClawProxyService],
  controllers: [OpenClawProxyController],
  exports: [OpenClawProxyService],
})
export class OpenClawProxyModule {}
