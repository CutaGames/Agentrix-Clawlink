import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

/**
 * API Key 状态
 */
export enum ApiKeyStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

/**
 * API Key 实体
 * 用于第三方应用（如 ChatGPT GPTs）访问 Agentrix API
 */
@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * API Key 值（哈希存储）
   * 实际 Key 只在创建时返回一次
   */
  @Column({ name: 'key_hash' })
  @Index()
  keyHash: string;

  /**
   * Key 前缀（用于识别，如 agx_xxx...）
   */
  @Column({ name: 'key_prefix', length: 20 })
  keyPrefix: string;

  /**
   * Key 名称（用户自定义）
   */
  @Column({ length: 100 })
  name: string;

  /**
   * 关联用户
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  /**
   * 状态
   */
  @Column({
    type: 'enum',
    enum: ApiKeyStatus,
    default: ApiKeyStatus.ACTIVE,
  })
  status: ApiKeyStatus;

  /**
   * 过期时间（null 表示永不过期）
   */
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  /**
   * 最后使用时间
   */
  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  /**
   * 使用次数
   */
  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  /**
   * 允许的来源（如 GPTs、自定义应用等）
   */
  @Column({ type: 'simple-array', nullable: true })
  allowedOrigins: string[] | null;

  /**
   * 权限范围
   */
  @Column({ type: 'simple-array', default: 'read,search,order,payment' })
  scopes: string[];

  /**
   * 速率限制（每分钟请求数）
   */
  @Column({ name: 'rate_limit', default: 60 })
  rateLimit: number;

  /**
   * 元数据
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
