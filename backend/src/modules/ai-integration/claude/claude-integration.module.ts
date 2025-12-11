import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../../entities/product.entity';
import { Order } from '../../../entities/order.entity';
import { ClaudeIntegrationService } from './claude-integration.service';
import { ClaudeIntegrationController } from './claude-integration.controller';
import { AiCapabilityModule } from '../../ai-capability/ai-capability.module';
import { SearchModule } from '../../search/search.module';
import { ProductModule } from '../../product/product.module';
import { OrderModule } from '../../order/order.module';
import { CartModule } from '../../cart/cart.module';
import { LogisticsModule } from '../../logistics/logistics.module';
import { PaymentModule } from '../../payment/payment.module';
import { ModelRouterModule } from '../model-router/model-router.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Order]),
    forwardRef(() => AiCapabilityModule),
    forwardRef(() => SearchModule),
    forwardRef(() => ProductModule),
    forwardRef(() => OrderModule),
    forwardRef(() => CartModule),
    forwardRef(() => LogisticsModule),
    forwardRef(() => PaymentModule),
    ModelRouterModule,
  ],
  controllers: [ClaudeIntegrationController],
  providers: [ClaudeIntegrationService],
  exports: [ClaudeIntegrationService],
})
export class ClaudeIntegrationModule {}

