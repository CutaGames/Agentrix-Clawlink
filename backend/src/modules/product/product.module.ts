import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductBatchImportController } from './product-batch-import.controller';
import { ProductBatchImportService } from './product-batch-import.service';
import { ProductReviewController } from './product-review.controller';
import { ProductReviewService } from './product-review.service';
import { EcommerceSyncController } from './ecommerce-sync.controller';
import { EcommerceSyncService } from './ecommerce-sync.service';
import { Product } from '../../entities/product.entity';
import { ProductReview } from '../../entities/product-review.entity';
import { EcommerceConnection } from '../../entities/ecommerce-connection.entity';
import { ProductSyncMapping } from '../../entities/product-sync-mapping.entity';
import { SearchModule } from '../search/search.module';
import { AiCapabilityModule } from '../ai-capability/ai-capability.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductReview,
      EcommerceConnection,
      ProductSyncMapping,
    ]),
    MulterModule.register({
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
    forwardRef(() => SearchModule),
    forwardRef(() => AiCapabilityModule),
  ],
  controllers: [
    ProductController,
    ProductBatchImportController,
    ProductReviewController,
    EcommerceSyncController,
  ],
  providers: [
    ProductService,
    ProductBatchImportService,
    ProductReviewService,
    EcommerceSyncService,
  ],
  exports: [
    ProductService,
    ProductBatchImportService,
    ProductReviewService,
    EcommerceSyncService,
  ],
})
export class ProductModule {}

