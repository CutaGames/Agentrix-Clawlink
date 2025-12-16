import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EcommerceConnection, EcommercePlatform } from './ecommerce-connection.entity';
import { Product } from './product.entity';

/**
 * 商品同步映射实体
 * 用于追踪Agentrix商品与外部电商平台商品的对应关系
 */
@Entity('product_sync_mappings')
@Index(['connectionId', 'externalProductId'], { unique: true })
@Index(['productId'])
export class ProductSyncMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 关联的电商连接
   */
  @Column({ name: 'connection_id' })
  connectionId: string;

  @ManyToOne(() => EcommerceConnection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'connection_id' })
  connection: EcommerceConnection;

  /**
   * Agentrix商品ID
   */
  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  /**
   * 外部平台商品ID
   */
  @Column({ name: 'external_product_id' })
  externalProductId: string;

  /**
   * 外部平台类型
   */
  @Column({
    type: 'enum',
    enum: EcommercePlatform,
  })
  platform: EcommercePlatform;

  /**
   * 外部商品数据快照
   */
  @Column({ type: 'jsonb', name: 'external_data', nullable: true })
  externalData: {
    title: string;
    price: number;
    sku?: string;
    barcode?: string;
    inventoryQuantity?: number;
    status?: string;
    images?: string[];
    variants?: Array<{
      id: string;
      title: string;
      price: number;
      sku?: string;
    }>;
  };

  /**
   * 同步方向
   */
  @Column({ name: 'sync_direction', default: 'import' })
  syncDirection: 'import' | 'export';

  /**
   * 最后同步时间
   */
  @Column({ name: 'last_synced_at', type: 'timestamp' })
  lastSyncedAt: Date;

  /**
   * 同步版本号（用于检测变更）
   */
  @Column({ name: 'sync_version', default: 1 })
  syncVersion: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
