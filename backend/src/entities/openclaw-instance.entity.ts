import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum OpenClawInstanceStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  PROVISIONING = 'provisioning',
  ERROR = 'error',
  UNLINKED = 'unlinked',
}

export enum OpenClawInstanceType {
  CLOUD = 'cloud',
  SELF_HOSTED = 'self_hosted',
  LOCAL = 'local',
}

@Entity('openclaw_instances')
export class OpenClawInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'enum', enum: OpenClawInstanceType, default: OpenClawInstanceType.SELF_HOSTED })
  instanceType: OpenClawInstanceType;

  @Column({ type: 'enum', enum: OpenClawInstanceStatus, default: OpenClawInstanceStatus.ACTIVE })
  status: OpenClawInstanceStatus;

  /** Base URL of the OpenClaw instance, e.g. https://my-claw.example.com */
  @Column({ type: 'text', nullable: true })
  instanceUrl?: string;

  /** Encrypted bearer token for authenticating to the instance */
  @Column({ type: 'text', nullable: true })
  instanceToken?: string;

  /** Cloud-provisioned instance ID (for Agentrix Cloud instances) */
  @Column({ nullable: true })
  cloudInstanceId?: string;

  /** Personality / role hint */
  @Column({ length: 100, nullable: true })
  personality?: string;

  @Column({ default: false })
  isPrimary: boolean;

  // ── Social relay fields ──────────────────────────────────────────────────

  /** Telegram chat_id bound to this instance (used for both cloud & local modes) */
  @Column({ type: 'bigint', nullable: true })
  telegramChatId?: string;

  /** Unique token the local agent sends on WS connect to identify itself */
  @Column({ length: 128, nullable: true, unique: true })
  relayToken?: string;

  /** Whether the local agent is currently WebSocket-connected to the relay */
  @Column({ default: false })
  relayConnected: boolean;

  // ── Subscription fields ──────────────────────────────────────────────────

  /** Stripe subscription ID for cloud paid tier */
  @Column({ nullable: true })
  subscriptionId?: string;

  /** active | trialing | past_due | canceled */
  @Column({ nullable: true })
  subscriptionStatus?: string;

  // ── Local agent metadata ─────────────────────────────────────────────────

  /** OS hint for download link (win | mac | linux) */
  @Column({ nullable: true })
  localOs?: string;

  // ── Generic metadata ─────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  capabilities?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
