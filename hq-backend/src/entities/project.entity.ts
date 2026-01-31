/**
 * HQ Project Entity
 * 
 * 管理接入 HQ 的多个项目
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ProjectStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
}

export enum ProjectCapability {
  USER_MANAGEMENT = 'user_management',
  PAYMENT = 'payment',
  RISK_CONTROL = 'risk_control',
  PRODUCT_CATALOG = 'product_catalog',
  ANALYTICS = 'analytics',
  ORDER_MANAGEMENT = 'order_management',
  DEVELOPER_TOOLS = 'developer_tools',
}

@Entity('hq_projects')
@Index(['status'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'api_url' })
  apiUrl: string;

  @Column({ name: 'api_key', nullable: true })
  apiKey: string;

  @Column({ name: 'webhook_url', nullable: true })
  webhookUrl: string;

  @Column({ name: 'webhook_secret', nullable: true })
  webhookSecret: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PENDING,
  })
  status: ProjectStatus;

  @Column({ type: 'simple-array', nullable: true })
  capabilities: ProjectCapability[];

  @Column({ type: 'jsonb', nullable: true })
  config: {
    healthCheckPath?: string;
    metricsPath?: string;
    eventsPath?: string;
    authType?: 'api_key' | 'oauth2' | 'jwt';
    customHeaders?: Record<string, string>;
  };

  @Column({ type: 'jsonb', nullable: true, name: 'last_health_check' })
  lastHealthCheck: {
    status: 'healthy' | 'degraded' | 'down';
    checkedAt: string;
    responseTime?: number;
    error?: string;
  };

  @Column({ type: 'jsonb', nullable: true, name: 'metrics_snapshot' })
  metricsSnapshot: {
    revenue24h?: number;
    activeUsers?: number;
    orderCount?: number;
    capturedAt?: string;
  };

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// 别名导出，兼容 HqProject 命名
export { Project as HqProject };
